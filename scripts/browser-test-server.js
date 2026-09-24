import {migrateMaterials} from '../server/material-db.js';
import {mkdirSync} from 'node:fs';
import {openDatabase} from '../server/db.js';
import {hashPassword} from '../server/auth.js';
import {createApp} from '../server/app.js';
import sharp from 'sharp';
export async function startBrowserTestServer() {
  process.env.APP_ORIGIN='http://127.0.0.1:3101';
  process.env.NODE_ENV='test';
  process.env.PRISM_WHATSAPP_NUMBER='919518963309';
  delete process.env.SMTP_HOST;
  const db=openDatabase(':memory:');
  migrateMaterials(db);
  db.prepare('INSERT INTO admins VALUES (?,?,?)').run('browser-admin','browser-admin',await hashPassword('browser-test-only-password'));
  mkdirSync('tmp',{recursive:true});
  await sharp({create:{width:800,height:500,channels:3,background:'#266a57'}}).png().toFile('tmp/test-property.png');
  const server=createApp(db).listen(3101,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  return async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));db.close();};
}

