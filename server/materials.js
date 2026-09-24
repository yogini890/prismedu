import {randomUUID} from 'node:crypto';
import {materialDefaults,validateMaterial,materialVisible,canOrder,filterMaterialRecords,categoryName} from '../shared/material-schema.js';
import {readMaterials,findMaterial} from './material-db.js';
import {sessionFor} from './auth.js';
import {whatsappNumber} from './notifications.js';
const fail=(message,status=422)=>Object.assign(Error(message),{status});
const publicItem=x=>{const {contactName:_name,email:_email,phone:_phone,...item}=x;return item;};
export function registerMaterials(app,db,{auth,upload,parseData,prepareImages}){
  const listing=(req)=>{const item=findMaterial(db,req.params.id);if(!item)throw fail('Material listing not found.',404);return item;};
  app.get('/api/materials',(req,res)=>{
    const all=readMaterials(db).filter(materialVisible);
    let items=filterMaterialRecords(all,req.query);
    if(req.query.home==='true')items=items.filter(x=>x.status==='Active');
    items.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||(a.displayOrder??0)-(b.displayOrder??0)||a.id.localeCompare(b.id));
    const total=items.length,limit=Math.min(60,Math.max(1,Number(req.query.limit)||12)),page=Math.max(1,Number(req.query.page)||1);
    res.json({items:items.slice((page-1)*limit,page*limit).map(publicItem),total,page,limit,categories:[...new Set(all.map(categoryName))].sort(),locations:[...new Set(all.map(x=>x.location))].sort()});
  });
  app.get('/api/materials/quotation',(req,res)=>{
    const entries=String(req.query.items||'').split(',').filter(Boolean);
    if(!entries.length||entries.length>50)throw fail('Choose between 1 and 50 materials.');
    const selected=entries.map(entry=>{const [id,quantity]=entry.split(':');const item=findMaterial(db,id);const count=Number(quantity);if(!canOrder(item)||!Number.isSafeInteger(count)||count<1||count>10000)throw fail('Your cart contains an unavailable item or invalid quantity. Review it before requesting a quotation.',409);return {...publicItem(item),cartQty:count};});
    const number=whatsappNumber();
    if(!number)throw fail('Quotation contact is not configured. Please contact Prism.',503);
    res.json({items:selected,whatsappUrl:'https://wa.me/'+number+'?text='+encodeURIComponent('Hello Prism Edu, please quote for:\n'+selected.map(x=>`${x.title} (${x.id}) — ${x.cartQty} requested pack(s); listing quantity: ${x.quantity} ${x.unit}`).join('\n'))});
  });
  app.get('/api/materials/:id/enquiry',(req,res)=>{
    const item=listing(req);if(!materialVisible(item))throw fail('Material listing not found.',404);
    if(item.status!=='Active')throw fail('This material is no longer available.',409);
    const number=whatsappNumber();res.json({whatsappUrl:number?'https://wa.me/'+number+'?text='+encodeURIComponent(`Hello Prism Edu, I am enquiring about ${item.title} (${item.id}), ${item.nature}, ${item.transaction}.`):null,email:process.env.PRISM_NOTIFICATION_EMAIL||''});
  });
  app.get('/api/materials/:id',(req,res)=>{const item=listing(req);if(!materialVisible(item))throw fail('Material listing not found.',404);res.json(publicItem(item));});
  app.get('/api/material-images/:id',(req,res)=>{
    const media=db.prepare('SELECT * FROM material_media WHERE id=?').get(req.params.id);
    if(!media||(!materialVisible(findMaterial(db,media.listing_id))&&!sessionFor(db,req)))return res.sendStatus(404);
    res.type(media.mime).send(Buffer.from(media.bytes));
  });
  app.get('/api/admin/materials',auth,(req,res)=>{
    let items=filterMaterialRecords(readMaterials(db),req.query);
    items.sort((a,b)=>req.query.sort==='title'?a.title.localeCompare(b.title):(req.query.sort==='oldest'?1:-1)*a.createdAt.localeCompare(b.createdAt));
    res.json({items,total:items.length});
  });
  app.get('/api/admin/materials/:id',auth,(req,res)=>res.json(listing(req)));
  const save=async(req,res)=>{
    const previous=req.method==='PUT'?listing(req):null,data=parseData(req);
    const key=req.headers['idempotency-key'];
    if(!previous){
      if(typeof key!=='string'||!/^[a-f\d-]{36}$/i.test(key))throw fail('A valid creation key is required.',400);
      const existing=db.prepare('SELECT data FROM materials WHERE creation_key=?').get(key);if(existing)return res.json(JSON.parse(existing.data));
    }
    if(previous&&data.updatedAt!==previous.updatedAt)throw fail('This listing changed. Reload it before saving.',409);
    const now=new Date().toISOString(),item={...materialDefaults,...previous,id:previous?.id||randomUUID(),createdAt:previous?.createdAt||now,updatedAt:now};
    for(const key of Object.keys(materialDefaults))if(data[key]!==undefined){
      if(['tags','images'].includes(key))item[key]=Array.isArray(data[key])?[...new Set(data[key])]:[];
      else if(key==='priceOnRequest')item[key]=data[key]===true;
      else item[key]=String(data[key]).trim();
    }
    item.images=item.images.filter(id=>previous?.images.includes(id));
    const fields=validateMaterial(item);if(Object.keys(fields).length)throw Object.assign(fail('Please correct the highlighted fields.'),{fields});
    const images=await prepareImages(req.files);
    if(item.images.length+images.length>10)throw fail('Use up to 10 images.');
    // Recheck after image processing to prevent concurrent edits overwriting each other.
    if(previous&&findMaterial(db,previous.id)?.updatedAt!==previous.updatedAt)throw fail('This listing changed. Reload it before saving.',409);
    if(!previous){const existing=db.prepare('SELECT data FROM materials WHERE creation_key=?').get(key);if(existing)return res.json(JSON.parse(existing.data));}
    item.images.push(...images.map(x=>x.id));
    item.updatedAt=new Date(Math.max(Date.now(),Date.parse(previous?.updatedAt||0)+1)).toISOString();
    db.exec('BEGIN IMMEDIATE');
    try{
      db.prepare('INSERT INTO materials (id,data,creation_key) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(item.id,JSON.stringify(item),previous?null:key);
      for(const image of images)db.prepare('INSERT INTO material_media VALUES (?,?,?,?)').run(image.id,item.id,image.bytes,image.mime);
      for(const media of db.prepare('SELECT id FROM material_media WHERE listing_id=?').all(item.id))if(!item.images.includes(media.id))db.prepare('DELETE FROM material_media WHERE id=?').run(media.id);
      db.exec('COMMIT');
    }catch(error){db.exec('ROLLBACK');throw error;}
    res.status(previous?200:201).json(item);
  };
  app.post('/api/admin/materials',auth,upload,save);
  app.put('/api/admin/materials/:id',auth,upload,save);
  app.delete('/api/admin/materials/:id',auth,(req,res)=>{listing(req);db.prepare('DELETE FROM materials WHERE id=?').run(req.params.id);res.json({ok:true});});
}
