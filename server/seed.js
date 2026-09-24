import {migrateMaterials} from './material-db.js';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {openDatabase,saveListing} from './db.js';
import {defaults} from '../shared/land-schema.js';
const db=openDatabase(),name='002-import-existing-land';
migrateMaterials(db);
if(db.prepare('SELECT name FROM migrations WHERE name=?').get(name)){console.log('Existing land migration already applied.');db.close();}
else {
  const records=JSON.parse(readFileSync(new URL('./legacy-land.json',import.meta.url),'utf8'));
  db.exec('BEGIN IMMEDIATE');
  try {
    records.forEach((record,index)=>{
      const city=record.location.split(',')[0];
      const area=Number(record.area.replaceAll(',','').match(/[\d.]+/)[0]);
      const item={...defaults,id:randomUUID(),slug:record.id,reference:'PL-LEGACY-'+String(index+1).padStart(4,'0'),title:record.title,type:record.type==='required'?'Land Required':'Land Available',location:record.location,city,district:record.location.includes('Pune')?'Pune':city,state:'Maharashtra',area,areaUnit:record.area.includes('Acres')?'Acres':'sq. ft.',transaction:['Sale','Rent','Lease'].includes(record.transaction)?'For '+record.transaction:record.transaction,suitability:record.suitability,description:record.description,summary:record.description,connectivity:record.roadConnectivity,terms:record.price||'',urgent:!!record.urgent,featured:record.featured,displayOrder:index,propertyType:record.title.includes('Campus')?'Existing School Campus':'Open Land',listingDate:new Date().toISOString().slice(0,10),internalNotes:'Imported from the previous website. Verify availability and content, then approve, activate and publish. Previous active/featured flags preserved in the migration source.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      saveListing(db,item);
    });
    db.prepare('INSERT INTO migrations VALUES (?,?)').run(name,new Date().toISOString());
    db.exec('COMMIT');console.log('Six existing listings imported as pending drafts. Original slugs preserved.');
  }catch(e){db.exec('ROLLBACK');throw e;}finally{db.close();}
}

