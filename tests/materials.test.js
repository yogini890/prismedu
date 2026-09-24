import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {openDatabase} from '../server/db.js';
import {createApp} from '../server/app.js';
import {hashPassword} from '../server/auth.js';
import {migrateMaterials,readMaterials} from '../server/material-db.js';
import {materialDefaults,validateMaterial} from '../shared/material-schema.js';

test('material migration preserves all existing records and never modifies School Land',()=>{
  const db=openDatabase(':memory:');
  try{
    db.prepare('INSERT INTO listings VALUES (?,?,?,?,?)').run('land-test','land-test','PL-TEST',JSON.stringify({title:'Untouched land'}),null);
    const before=db.prepare('SELECT * FROM listings').all();
    migrateMaterials(db);const records=readMaterials(db);
    assert.equal(records.length,12);assert.ok(records.every(x=>x.status==='Active'));
    assert.ok(records.some(x=>x.id==='student-benches-50'));
    for(const x of records)assert.deepEqual(validateMaterial(x),{},x.id);
    const snapshot=JSON.stringify(records);migrateMaterials(db);assert.equal(JSON.stringify(readMaterials(db)),snapshot);
    assert.deepEqual(db.prepare('SELECT * FROM listings').all(),before);
  }finally{db.close();}
});

test('material CRUD, filters, status, stale carts, media, auth and persistence',async()=>{
  process.env.APP_ORIGIN='http://localhost:5173';process.env.PRISM_WHATSAPP_NUMBER='919518963309';
  const directory=mkdtempSync(path.join(tmpdir(),'prism-materials-')),filename=path.join(directory,'db.sqlite');
  let db=openDatabase(filename);db.prepare('INSERT INTO admins VALUES (?,?,?)').run(randomUUID(),'material-admin',await hashPassword('material-test-password-only'));
  const server=createApp(db).listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;let cookie='',csrf='';
  async function request(url,{method='GET',body,auth=false,key,origin='http://localhost:5173',token=csrf}={}){
    const headers={Origin:origin};if(auth){headers.Cookie=cookie;headers['X-CSRF-Token']=token;}if(key)headers['Idempotency-Key']=key;
    if(body&&!(body instanceof FormData)){headers['Content-Type']='application/json';body=JSON.stringify(body);}
    const response=await fetch(base+url,{method,body,headers});return {status:response.status,data:await response.json().catch(()=>null),response};
  }
  const draft={...materialDefaults,title:'Campus desks',summary:'Adjustable desks for classrooms.',description:'Durable desks with storage shelves.',quantity:'20',unit:'Desks',location:'Pune',contactName:'Private owner',email:'owner@example.test',phone:'9876543210'};
  const bytes=await sharp({create:{width:40,height:40,channels:3,background:'#447755'}}).png().toBuffer();
  const multipart=(item,images=[])=>{const form=new FormData();form.append('data',JSON.stringify(item));for(const image of images)form.append('images',new Blob([image],{type:'image/png'}),'material.png');return form;};
  try{
    for(const [url,method] of [['/api/admin/materials','GET'],['/api/admin/materials','POST'],['/api/admin/materials/x','PUT'],['/api/admin/materials/x','DELETE']])assert.equal((await request(url,{method})).status,401);
    const login=await request('/api/admin/login',{method:'POST',body:{username:'material-admin',password:'material-test-password-only'}});assert.equal(login.status,200);cookie=login.response.headers.get('set-cookie').split(';')[0];csrf=login.data.csrf;
    assert.equal((await request('/api/admin/materials',{method:'POST',auth:true,body:draft,key:randomUUID(),token:'wrong'})).status,403);
    assert.equal((await request('/api/admin/materials',{method:'POST',auth:true,body:draft,key:randomUUID(),origin:'https://evil.test'})).status,403);
    assert.equal((await request('/api/admin/materials',{method:'POST',auth:true,body:{...draft,title:''},key:randomUUID()})).status,422);
    assert.equal((await request('/api/admin/materials',{method:'POST',auth:true,body:{...draft,nature:'Required'},key:randomUUID()})).status,422);
    assert.equal((await request('/api/admin/materials',{method:'POST',auth:true,body:multipart(draft,[Buffer.from('not a PNG')]),key:randomUUID()})).status,422);
    const key=randomUUID();let result=await request('/api/admin/materials',{method:'POST',auth:true,body:multipart(draft,[bytes,bytes]),key});assert.equal(result.status,201,JSON.stringify(result.data));let item=result.data;
    const duplicate=await request('/api/admin/materials',{method:'POST',auth:true,body:draft,key});assert.equal(duplicate.data.id,item.id);
    assert.equal((await request('/api/admin/materials',{auth:true})).data.total,1);
    const publicResult=await request('/api/materials/'+item.id);assert.equal(publicResult.status,200);assert.equal(publicResult.data.email,undefined);assert.equal(publicResult.data.phone,undefined);assert.equal(publicResult.data.contactName,undefined);
    const image=await fetch(base+'/api/material-images/'+item.images[0]);assert.equal(image.status,200);assert.match(image.headers.get('content-type'),/image\/webp/);
    for(const params of [{q:'desks'},{q:'for sale'},{nature:'Available'},{transaction:'For Sale'},{condition:'New'},{category:'Classroom Furniture'},{location:'Pune'},{q:'campus',nature:'Available',transaction:'For Sale',condition:'New',category:'Classroom Furniture',location:'Pune'}])assert.equal((await request('/api/materials?'+new URLSearchParams(params))).data.total,1);
    assert.equal((await request('/api/materials?location=Mumbai&nature=Available')).data.total,0);
    assert.equal((await request('/api/materials?home=true')).data.total,1);
    const quote='/api/materials/quotation?items='+item.id+':2';assert.equal((await request(quote)).status,200);
    assert.match((await request(quote)).data.whatsappUrl,/wa.me\/919518963309/);
    const initial={...item};
    async function update(changes){const result=await request('/api/admin/materials/'+item.id,{method:'PUT',auth:true,body:{...item,...changes}});assert.equal(result.status,200,JSON.stringify(result.data));item=result.data;}
    await update({title:'Updated desks',priceOnRequest:false,price:'1500'});assert.equal((await request('/api/materials/'+item.id)).data.title,'Updated desks');
    assert.equal((await request('/api/admin/materials/'+item.id,{method:'PUT',auth:true,body:initial})).status,409);
    for(const status of ['Sold Out','Rented']){await update({status});assert.equal((await request('/api/materials/'+item.id)).data.status,status);assert.equal((await request('/api/materials')).data.total,1);assert.equal((await request('/api/materials?home=true')).data.total,0);assert.equal((await request(quote)).status,409);assert.equal((await request('/api/materials/'+item.id+'/enquiry')).status,409);}
    await update({status:'Inactive'});assert.equal((await request('/api/materials')).data.total,0);assert.equal((await request('/api/materials/'+item.id)).status,404);assert.equal((await fetch(base+'/api/material-images/'+item.images[0])).status,404);assert.equal((await fetch(base+'/api/material-images/'+item.images[0],{headers:{Cookie:cookie}})).status,200);
    await update({status:'Active',nature:'Required',transaction:'Required'});assert.equal((await request(quote)).status,409);assert.equal((await request('/api/materials/'+item.id+'/enquiry')).status,200);
    await update({nature:'Available',transaction:'For Sale',images:[item.images[1]]});assert.equal((await fetch(base+'/api/material-images/'+initial.images[0])).status,404);
    const secondDb=openDatabase(filename);assert.equal(readMaterials(secondDb)[0].title,'Updated desks');secondDb.close();
    assert.equal((await request('/api/admin/materials/'+item.id,{method:'DELETE',auth:true})).status,200);assert.equal((await request('/api/materials/'+item.id)).status,404);assert.equal((await request('/api/admin/materials',{auth:true})).data.total,0);assert.equal((await fetch(base+'/api/material-images/'+item.images[0])).status,404);
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close();rmSync(directory,{recursive:true,force:true});}
});
