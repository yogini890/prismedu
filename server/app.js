import {registerMaterials} from './materials.js';
import express from 'express';
import helmet from 'helmet';
import {rateLimit} from 'express-rate-limit';
import multer from 'multer';
import sharp from 'sharp';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import path from 'node:path';
import {openDatabase,readListings,findListing,saveListing} from './db.js';
import {hashPassword,checkPassword,tokenHash,sessionFor,cookie} from './auth.js';
import {defaults,options,textFields,validate,isVisible,publicRecord} from '../shared/land-schema.js';
import {mailConfigured,whatsappNumber,whatsappLink} from './notifications.js';

// Strip control characters from stored text; React escapes text at render time.
// eslint-disable-next-line no-control-regex
const clean = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim();
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:8*1024*1024,files:10,fields:2,fieldSize:100000},fileFilter:(_req,file,done)=>['image/jpeg','image/png','image/webp'].includes(file.mimetype)?done(null,true):done(Object.assign(Error('Use JPEG, PNG or WebP images.'),{status:422,fields:{images:'Unsupported image type.'}}))}).array('images',10);
export function createApp(db = openDatabase()) {
  const app=express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY==='1') app.set('trust proxy',1);
  app.use(helmet({contentSecurityPolicy:false}));
  app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  app.use(express.json({limit:'120kb'}));
  app.use('/api',(req,res,next)=>{
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      const allowed=process.env.APP_ORIGIN || 'http://localhost:5173';
      if (req.headers.origin!==allowed) return res.status(403).json({error:'Request origin is not permitted.'});
    }
    next();
  });
  const auth=(req,res,next)=>{
    req.session=sessionFor(db,req);
    if (!req.session) return res.status(401).json({error:'Please sign in.'});
    if (!['GET','HEAD'].includes(req.method) && req.headers['x-csrf-token']!==req.session.csrf) return res.status(403).json({error:'Session verification failed. Refresh and try again.'});
    next();
  };
  const limiter=(limit,windowMs)=>rateLimit({windowMs,limit,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many requests. Please try again later.'}});
  const dummyHash=hashPassword(randomBytes(32).toString('hex'));
  app.post('/api/admin/login',limiter(10,15*60000),async(req,res)=>{
    const username=clean(req.body?.email ?? req.body?.username).toLowerCase();
    const password=typeof req.body?.password==='string'?req.body.password:'';
    if (!password || !username || password.length>256 || username.length>150) return res.status(400).json({error:'Enter your email and password.'});
    const admin=db.prepare('SELECT * FROM admins WHERE username=?').get(username);
    const valid=await checkPassword(password,admin?.password_hash || await dummyHash);
    if (!admin || !valid) return res.status(401).json({error:'Invalid email or password.'});
    if (!admin.active || admin.role!=='admin') return res.status(403).json({error:'This account is not authorized.'});
    const previous=sessionFor(db,req);
    if (previous) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(previous.token_hash);
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
    const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
    db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(tokenHash(token),admin.id,csrf,Date.now()+8*3600000);
    res.set('Set-Cookie',cookie(token,8*3600)).json({username,csrf});
  });
  app.get('/api/admin/session',auth,(req,res)=>res.json({username:req.session.username,csrf:req.session.csrf}));
  app.post('/api/admin/logout',auth,(req,res)=>{
    db.prepare('DELETE FROM sessions WHERE token_hash=?').run(req.session.token_hash);
    res.set('Set-Cookie',cookie('',0)).json({ok:true});
  });
  app.get('/api/land/config',(_req,res)=>res.json({whatsappNumber:whatsappNumber(),emailConfigured:Boolean(mailConfigured()),options}));
  app.get('/api/land',(req,res)=>{
    let records=readListings(db).filter(x=>isVisible(x,req.query.featured!=='true'));
    if (req.query.featured==='true') records=records.filter(x=>x.featured);
    const locations=[...new Set(records.map(x=>x.city).filter(Boolean))].sort();
    records=filter(records,req.query);
    records.sort((a,b)=>a.displayOrder-b.displayOrder || b.createdAt.localeCompare(a.createdAt));
    const limit=Math.min(60,Math.max(1,Number(req.query.limit)||6)),page=Math.max(1,Number(req.query.page)||1);
    res.json({items:records.slice((page-1)*limit,page*limit).map(publicRecord),total:records.length,page,limit,locations});
  });
  app.get('/api/land/:id',(req,res)=>{
    const item=findListing(db,req.params.id);
    if (!item || !isVisible(item)) return res.status(404).json({error:'Land listing not found or no longer available.'});
    res.json(publicRecord(item));
  });
  app.get('/api/media/:id',(req,res)=>{
    const media=db.prepare('SELECT * FROM media WHERE id=?').get(req.params.id);
    if (!media) return res.sendStatus(404);
    const record=findListing(db,media.listing_id);
    if (!isVisible(record) && !sessionFor(db,req)) return res.sendStatus(404);
    res.set('Content-Type',media.mime).set('X-Content-Type-Options','nosniff').send(Buffer.from(media.bytes));
  });
  app.post('/api/submissions',limiter(12,3600000),upload,async(req,res)=>{
    const key=req.headers['idempotency-key'];
    if (typeof key!=='string' || !/^[a-f0-9-]{36}$/i.test(key)) return res.status(400).json({error:'A valid submission key is required.'});
    const keyHash=createHash('sha256').update(key).digest('hex');
    const existing=db.prepare('SELECT data FROM listings WHERE submission_key=?').get(keyHash);
    if (existing) return submitted(res,JSON.parse(existing.data),db,200);
    const data=parseData(req);
    if (data.website) return res.status(400).json({error:'Unable to accept this submission.'});
    const item=prepare(data,null,true);
    const errors=validate(item,{publicSubmission:true});
    if (Object.keys(errors).length) return res.status(422).json({error:'Please correct the highlighted fields.',fields:errors});
    const images=await prepareImages(req.files);
    try { persist(db,item,images,keyHash,true); } catch (error) {
      const retry=db.prepare('SELECT data FROM listings WHERE submission_key=?').get(keyHash);
      if (retry) return submitted(res,JSON.parse(retry.data),db,200);
      throw error;
    }
    return submitted(res,item,db,201);
  });
  registerMaterials(app,db,{auth,upload,parseData,prepareImages});
  app.use('/api/admin',auth);
  app.get('/api/admin/listings',(req,res)=>{
    let records=readListings(db);
    const counts={total:records.length};
    for (const [label,key,value] of [['active','adminStatus','Active'],['inactive','adminStatus','Inactive'],['pending','approvalStatus','Pending'],['available','type','Land Available'],['required','type','Land Required'],['sold','dealStatus','Sold'],['rented','dealStatus','Rented'],['leased','dealStatus','Leased'],['fulfilled','dealStatus','Requirement Fulfilled'],['archived','adminStatus','Archived']]) counts[label]=records.filter(x=>x[key]===value).length;
    const locations=[...new Set(records.map(x=>x.city).filter(Boolean))].sort();
    records=filter(records,req.query);
    for (const key of ['adminStatus','approvalStatus','publicationStatus','dealStatus']) if (req.query[key]) records=records.filter(x=>x[key]===req.query[key]);
    records.sort((a,b)=>(req.query.sort==='oldest'?1:-1)*a.createdAt.localeCompare(b.createdAt));
    const page=Math.max(1,Number(req.query.page)||1),limit=12;
    const items=records.slice((page-1)*limit,page*limit).map(item=>({...item,notification:db.prepare('SELECT status, attempts, error FROM notifications WHERE listing_id=?').get(item.id)}));
    res.json({items,total:records.length,page,limit,counts,locations,mailConfigured:Boolean(mailConfigured()),whatsappConfigured:Boolean(whatsappNumber())});
  });
  app.get('/api/admin/listings/:id',(req,res)=>{
    const item=findListing(db,req.params.id);
    if (!item) return res.status(404).json({error:'Listing not found.'});
    res.json(item);
  });
  app.post('/api/admin/listings',upload,async(req,res)=>{
    const item=prepare(parseData(req));
    const errors=validate(item);
    if (Object.keys(errors).length) return res.status(422).json({error:'Please correct the highlighted fields.',fields:errors});
    persist(db,item,await prepareImages(req.files));
    res.status(201).json(item);
  });
  app.put('/api/admin/listings/:id',upload,async(req,res)=>{
    const previous=findListing(db,req.params.id);
    if (!previous) return res.status(404).json({error:'Listing not found.'});
    const data=parseData(req);
    if (data.updatedAt!==previous.updatedAt) return res.status(409).json({error:'This listing changed since you opened it. Reload before saving.'});
    const item=prepare(data,previous);
    const errors=validate(item);
    if (Object.keys(errors).length) return res.status(422).json({error:'Please correct the highlighted fields.',fields:errors});
    persist(db,item,await prepareImages(req.files));
    res.json(item);
  });
  app.post('/api/admin/listings/:id/duplicate',(req,res)=>{
    const source=findListing(db,req.params.id);
    if (!source) return res.status(404).json({error:'Listing not found.'});
    const item=prepare({...source,title:source.title+' (copy)',adminStatus:'Inactive',publicationStatus:'Draft',featured:false,images:[]});
    const images=source.images.map(id=>db.prepare('SELECT bytes,mime FROM media WHERE id=?').get(id)).filter(Boolean).map(x=>({...x,id:randomUUID()}));
    persist(db,item,images);
    res.status(201).json(item);
  });
  app.post('/api/admin/listings/:id/retry-email',(req,res)=>{
    db.prepare("UPDATE notifications SET status='pending',attempts=0,next_attempt=0 WHERE listing_id=?").run(req.params.id);
    res.json({ok:true});
  });
  app.delete('/api/admin/listings/:id',(req,res)=>{
    const result=db.prepare('DELETE FROM listings WHERE id=?').run(req.params.id);
    res.status(result.changes?200:404).json(result.changes?{ok:true}:{error:'Listing not found.'});
  });
  app.use('/api',(_req,res)=>res.status(404).json({error:'API route not found.'}));
  app.use('/admin',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
  app.use(express.static(path.resolve('dist')));
  app.get('/{*path}',(_req,res)=>res.sendFile(path.resolve('dist/index.html')));
  app.use((error,_req,res,_next)=>{
    if (error instanceof multer.MulterError) return res.status(422).json({error:'Upload up to 10 JPEG, PNG or WebP images, at most 8 MB each.',fields:{images:'Check image count and sizes.'}});
    if (error.status) return res.status(error.status).json({error:error.message,fields:error.fields});
    console.error('School Land request failed:',error.code || error.name);
    res.status(500).json({error:'The request could not be completed. Please retry.'});
  });
  return app;
}
function filter(records,query) {
  const keyword=clean(query.q).toLowerCase(),location=clean(query.location).toLowerCase();
  return records.filter(x=>(!keyword||[x.title,x.reference,x.location,x.city,x.district,x.description].join(' ').toLowerCase().includes(keyword))&&(!location||[x.location,x.city,x.district].join(' ').toLowerCase().includes(location))&&(!query.type||x.type===query.type)&&(!query.propertyType||x.propertyType===query.propertyType)&&(!query.transaction||x.transaction.toLowerCase().includes(clean(query.transaction).replace(/^For /,'').toLowerCase()))&&(query.urgent!=='true'||x.urgent)&&(!query.minArea||x.area>=Number(query.minArea))&&(!query.maxArea||x.area<=Number(query.maxArea))&&(!query.areaUnit||x.areaUnit===query.areaUnit));
}
function parseData(req) {
  try { const value=typeof req.body?.data==='string'?JSON.parse(req.body.data):req.body; if (!value || typeof value!=='object' || Array.isArray(value)) throw Error(); return value; }
  catch { throw Object.assign(Error('Invalid form data.'),{status:400}); }
}
function prepare(data,previous=null,isPublic=false) {
  const id=previous?.id || randomUUID();
  const item={...defaults,...previous,id,slug:previous?.slug || id,reference:previous?.reference || 'PL-'+randomBytes(6).toString('hex').toUpperCase(),createdAt:previous?.createdAt || new Date().toISOString(),updatedAt:new Date().toISOString()};
  for (const key of textFields) if (data[key]!==undefined) item[key]=clean(data[key]);
  for (const key of Object.keys(options)) if (data[key]!==undefined) item[key]=clean(data[key]);
  item.area=Number(data.area ?? item.area);
  for (const key of ['urgent','featured','keepCompletedVisible','consent','authorization']) if (data[key]!==undefined) item[key]=data[key]===true;
  item.displayOrder=Number(data.displayOrder ?? item.displayOrder);
  item.images=Array.isArray(data.images)?data.images.filter(id=>previous?.images.includes(id)):previous?.images || [];
  item.listingDate=item.listingDate || new Date().toISOString().slice(0,10);
  if (isPublic) Object.assign(item,{approvalStatus:'Pending',adminStatus:'Inactive',publicationStatus:'Draft',dealStatus:'Open',featured:false,keepCompletedVisible:false,displayOrder:0,internalNotes:'',video:'',images:[]});
  return item;
}
async function prepareImages(files=[]) {
  const result=[];
  for (const file of files) {
    try {
      const image=sharp(file.buffer,{limitInputPixels:24000000,animated:false});
      const meta=await image.metadata();
      if (!['jpeg','png','webp'].includes(meta.format)) throw Error();
      result.push({id:randomUUID(),bytes:await image.rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer(),mime:'image/webp'});
    } catch { throw Object.assign(Error('One of the images is invalid. Use JPEG, PNG or WebP images under 24 megapixels.'),{status:422,fields:{images:'Invalid image content.'}}); }
  }
  return result;
}
function persist(db,item,images=[],key=null,notify=false) {
  if (item.images.length+images.length>10) throw Object.assign(Error('Use no more than 10 images.'),{status:422});
  item.images=[...new Set([...item.images,...images.map(x=>x.id)])];
  db.exec('BEGIN IMMEDIATE');
  try {
    saveListing(db,item,key);
    for (const image of images) db.prepare('INSERT INTO media VALUES (?,?,?,?)').run(image.id,item.id,image.bytes,image.mime);
    for (const media of db.prepare('SELECT id FROM media WHERE listing_id=?').all(item.id)) if (!item.images.includes(media.id)) db.prepare('DELETE FROM media WHERE id=?').run(media.id);
    if (notify) db.prepare('INSERT INTO notifications (id,listing_id) VALUES (?,?)').run(randomUUID(),item.id);
    db.exec('COMMIT');
  } catch(error) { db.exec('ROLLBACK'); throw error; }
}
function submitted(res,item,db,status) {
  const notification=db.prepare('SELECT status FROM notifications WHERE listing_id=?').get(item.id)?.status || 'pending';
  return res.status(status).json({reference:item.reference,status:'Pending Admin Review',notification:mailConfigured()?notification:'awaiting_configuration',whatsappUrl:whatsappLink(item)});
}

