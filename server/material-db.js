import {readFileSync} from 'node:fs';
import {materialDefaults} from '../shared/material-schema.js';
export function materialTables(db){
  db.exec(`CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, data TEXT NOT NULL, creation_key TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS material_media (id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES materials(id) ON DELETE CASCADE, bytes BLOB NOT NULL, mime TEXT NOT NULL);`);
}
export const readMaterials=db=>db.prepare('SELECT data FROM materials').all().map(x=>JSON.parse(x.data));
export const findMaterial=(db,id)=>{const row=db.prepare('SELECT data FROM materials WHERE id=?').get(id);return row?JSON.parse(row.data):null;};
export function migrateMaterials(db){
  materialTables(db);
  if(db.prepare('SELECT name FROM migrations WHERE name=?').get('003-school-materials'))return;
  const old=JSON.parse(readFileSync(new URL('./legacy-materials.json',import.meta.url),'utf8'));
  db.exec('BEGIN IMMEDIATE');
  try{
    old.forEach((x,index)=>{
      const split=x.quantity.indexOf(' '),now=new Date().toISOString();
      const item={...materialDefaults,id:x.id,title:x.title,summary:x.description,description:x.description,nature:x.type==='required'?'Required':'Available',transaction:x.transaction==='Second-Hand Required'?'Required':x.transaction,category:x.category,quantity:split<0?x.quantity:x.quantity.slice(0,split),unit:split<0?'Units':x.quantity.slice(split+1),condition:x.condition,location:x.location,status:x.active?'Active':'Inactive',tags:x.badges.filter(t=>['NEW','URGENT','BULK'].includes(t)).map(t=>t[0]+t.slice(1).toLowerCase()),createdAt:now,updatedAt:now,displayOrder:index};
      db.prepare('INSERT OR IGNORE INTO materials (id,data) VALUES (?,?)').run(item.id,JSON.stringify(item));
    });
    db.prepare('INSERT INTO migrations VALUES (?,?)').run('003-school-materials',new Date().toISOString());db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
}
