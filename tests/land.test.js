import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {openDatabase,findListing} from '../server/db.js';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/auth.js';
import {defaults,isVisible,privateFields} from '../shared/land-schema.js';
import {deliverNotifications} from '../server/notifications.js';

test('persistent School Land lifecycle, auth, privacy, filtering, uploads and notifications',async()=>{
  process.env.APP_ORIGIN='http://localhost:5173';
  process.env.PRISM_WHATSAPP_NUMBER='919518963309';
  const folder=mkdtempSync(path.join(tmpdir(),'prism-land-'));
  const filename=path.join(folder,'test.sqlite');
  let db=openDatabase(filename);
  db.prepare('INSERT INTO admins VALUES (?,?,?)').run(randomUUID(),'test-admin',await hashPassword('test-only-password-2026'));
  const server=createApp(db).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  let cookie='',csrf='';
  async function request(url,{method='GET',body,auth=false,origin='http://localhost:5173',key}={}){
    const headers={Origin:origin};
    if(auth){headers.Cookie=cookie;headers['X-CSRF-Token']=csrf;}
    if(key)headers['Idempotency-Key']=key;
    if(body&&!(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body);}
    const response=await fetch(base+url,{method,headers,body});
    const data=await response.json().catch(()=>null);
    return {status:response.status,data,response};
  }
  const draft={...defaults,title:'Verified Pune Campus',location:'Ravet, Pune',city:'Pune',state:'Maharashtra',district:'Pune',area:3000,description:'Spacious educational property near the main road.',contactName:'Test Owner',ownerName:'Test School',email:'applicant@example.test',phone:'9876543210',whatsapp:'9876543210',consent:true,authorization:true,internalNotes:'PRIVATE-NOTE'};
  const image=await sharp({create:{width:30,height:30,channels:3,background:'#227755'}}).png().toBuffer();
  const multipart=(record,images=[])=>{const body=new FormData();body.append('data',JSON.stringify(record));images.forEach(bytes=>body.append('images',new Blob([bytes],{type:'image/png'}),'property.png'));return body;};
  try{
    for(const [url,method] of [['/api/admin/session','GET'],['/api/admin/listings','GET'],['/api/admin/listings','POST'],['/api/admin/listings/x','PUT'],['/api/admin/listings/x','DELETE']]) assert.equal((await request(url,{method})).status,401);
    assert.equal((await request('/api/admin/login',{method:'POST',body:{username:'test-admin',password:'wrong'}})).status,401);
    let login=await request('/api/admin/login',{method:'POST',body:{username:'test-admin',password:'test-only-password-2026'}});
    assert.equal(login.status,200);cookie=login.response.headers.get('set-cookie').split(';')[0];csrf=login.data.csrf;
    assert.match(login.response.headers.get('set-cookie'),/HttpOnly/);assert.match(login.response.headers.get('set-cookie'),/SameSite=Strict/);
    assert.equal((await request('/api/admin/listings',{method:'POST',auth:true,origin:'https://evil.test',body:draft})).status,403);
    const savedCsrf=csrf;csrf='wrong';assert.equal((await request('/api/admin/listings',{method:'POST',auth:true,body:draft})).status,403);csrf=savedCsrf;
    let created=await request('/api/admin/listings',{method:'POST',auth:true,body:multipart(draft,[image,image])});
    assert.equal(created.status,201);let item=created.data;assert.equal(item.images.length,2);
    assert.equal((await request('/api/land/'+item.id)).status,404);
    assert.equal((await fetch(base+'/api/media/'+item.images[0])).status,404);
    async function update(changes){const response=await request('/api/admin/listings/'+item.id,{method:'PUT',auth:true,body:{...item,...changes}});assert.equal(response.status,200,JSON.stringify(response.data));item=response.data;}
    await update({approvalStatus:'Approved',adminStatus:'Active',publicationStatus:'Published',featured:true});
    assert.equal((await request('/api/land?featured=true')).data.total,1);
    let publicItem=(await request('/api/land/'+item.slug)).data;
    for(const field of privateFields)assert.equal(publicItem[field],undefined);
    assert.equal((await fetch(base+'/api/media/'+item.images[0])).status,200);
    for(const q of ['PUNE','verified',item.reference.toLowerCase(),'main road'])assert.equal((await request('/api/land?q='+encodeURIComponent(' '+q+' '))).data.total,1);
    assert.equal((await request('/api/land?location=Pune&type=Land%20Available&transaction=For%20Sale')).data.total,1);
    assert.equal((await request('/api/land?location=Pune&urgent=true')).data.total,0);
    assert.equal((await request('/api/land?minArea=4000')).data.total,0);
    await update({area:4500,description:'Edited description',urgent:true});
    assert.equal((await request('/api/land/'+item.id)).data.area,4500);
    await update({adminStatus:'Inactive'});assert.equal((await request('/api/land')).data.total,0);
    await update({adminStatus:'Active',dealStatus:'Sold'});assert.equal((await request('/api/land')).data.total,0);assert.equal((await request('/api/land/'+item.id)).status,404);
    await update({keepCompletedVisible:true});assert.equal((await request('/api/land/'+item.id)).data.dealStatus,'Sold');assert.equal((await request('/api/land')).data.total,0);assert.equal((await request('/api/land?featured=true')).data.total,1);
    await update({dealStatus:'Open'});
    const key=randomUUID();
    let submitted=await request('/api/submissions',{method:'POST',key,body:multipart({...draft,type:'Land Required',title:'School Land Requirement',approvalStatus:'Approved',adminStatus:'Active',publicationStatus:'Published'})});
    assert.equal(submitted.status,201);assert.equal(submitted.data.status,'Pending Admin Review');
    assert.ok(submitted.data.whatsappUrl.includes('919518963309'));
    assert.ok(decodeURIComponent(submitted.data.whatsappUrl).includes(submitted.data.reference));
    const duplicate=await request('/api/submissions',{method:'POST',key,body:multipart(draft)});assert.equal(duplicate.data.reference,submitted.data.reference);
    let all=(await request('/api/admin/listings',{auth:true})).data;
    let pending=all.items.find(x=>x.reference===submitted.data.reference);
    assert.equal(pending.approvalStatus,'Pending');assert.equal(pending.publicationStatus,'Draft');assert.equal(pending.internalNotes,'');
    assert.equal(all.counts.pending,1);
    const invalid=await request('/api/submissions',{method:'POST',key:randomUUID(),body:multipart({...draft,email:'bad',consent:false})});
    assert.equal(invalid.status,422);assert.ok(invalid.data.fields.email);assert.ok(invalid.data.fields.consent);
    assert.equal((await request('/api/submissions',{method:'POST',key:randomUUID(),body:multipart(draft,[Buffer.from('not an image')])})).status,422);
    const property=await request('/api/submissions',{method:'POST',key:randomUUID(),body:multipart(draft,[image,image])});
    assert.equal(property.status,201);
    let pendingProperty=(await request('/api/admin/listings',{auth:true})).data.items.find(x=>x.reference===property.data.reference);
    assert.equal(pendingProperty.images.length,2);
    assert.equal((await fetch(base+'/api/media/'+pendingProperty.images[0])).status,404);
    pending=(await request('/api/admin/listings/'+pending.id,{method:'PUT',auth:true,body:{...pending,approvalStatus:'Approved',adminStatus:'Active',publicationStatus:'Published'}})).data;
    assert.equal((await request('/api/land?type=Land%20Required')).data.total,1);
    const stale={...item};await update({terms:'Updated budget'});
    assert.equal((await request('/api/admin/listings/'+item.id,{method:'PUT',auth:true,body:stale})).status,409);
    for(const changes of [{approvalStatus:'Rejected'},{approvalStatus:'Approved',publicationStatus:'Unpublished'},{publicationStatus:'Published',adminStatus:'Archived'}]){await update(changes);assert.equal((await request('/api/land/'+item.id)).status,404);}
    await update({adminStatus:'Inactive'});assert.equal((await request('/api/land/'+item.id)).status,404);
    await update({adminStatus:'Active'});
    const oldImage=item.images[0];await update({images:[item.images[1]]});assert.equal((await fetch(base+'/api/media/'+oldImage)).status,404);
    const copy=await request('/api/admin/listings/'+item.id+'/duplicate',{method:'POST',auth:true});
    assert.equal(copy.status,201);assert.notEqual(copy.data.reference,item.reference);assert.equal(copy.data.publicationStatus,'Draft');assert.equal(copy.data.images.length,1);
    assert.equal((await request('/api/admin/listings/'+copy.data.id,{method:'DELETE',auth:true})).status,200);
    assert.equal((await request('/api/admin/listings/'+copy.data.id,{auth:true})).status,404);
    const stored=findListing(db,item.id);assert.equal(stored.area,4500);
    process.env.SMTP_HOST='test';process.env.MAIL_FROM='sender@example.test';process.env.PRISM_NOTIFICATION_EMAIL='recipient@example.test';
    let sent=[];
    await deliverNotifications(db,{sendMail:async message=>{sent.push(message);},close(){}});
    assert.equal(sent.length,2);assert.ok(sent[0].text.includes('Admin review:'));
    assert.equal(db.prepare("SELECT count(*) AS n FROM notifications WHERE status='sent'").get().n,2);
    db.prepare("UPDATE notifications SET status='pending',attempts=0,next_attempt=0").run();
    await deliverNotifications(db,{sendMail:async()=>{throw Error('test');},close(){}});
    assert.equal(db.prepare("SELECT count(*) AS n FROM notifications WHERE status='failed'").get().n,2);
    assert.ok(findListing(db,pending.id));
    delete process.env.SMTP_HOST;
    assert.equal((await request('/api/admin/logout',{method:'POST',auth:true})).status,200);
    assert.equal((await request('/api/admin/listings',{auth:true})).status,401);
    await new Promise(resolve=>server.close(resolve));db.close();
    db=openDatabase(filename);assert.equal(findListing(db,item.id).area,4500);assert.equal(findListing(db,pending.id).approvalStatus,'Approved');
  }finally{server.close();db.close();rmSync(folder,{recursive:true,force:true});}
});
test('every visibility status combination is enforced',()=>{
  const record={...defaults,approvalStatus:'Approved',adminStatus:'Active',publicationStatus:'Published',dealStatus:'Open'};
  assert.equal(isVisible(record),true);
  for(const [key,values] of Object.entries({approvalStatus:['Pending','Rejected'],adminStatus:['Inactive','Archived'],publicationStatus:['Draft','Unpublished']}))for(const value of values)assert.equal(isVisible({...record,[key]:value}),false);
  for(const status of ['Sold','Rented','Leased','Requirement Fulfilled','Closed']){assert.equal(isVisible({...record,dealStatus:status}),false);assert.equal(isVisible({...record,dealStatus:status,keepCompletedVisible:true}),true);assert.equal(isVisible({...record,dealStatus:status,keepCompletedVisible:true},true),false);}
  assert.equal(isVisible({...record,expiryDate:'2000-01-01'}),false);
});

