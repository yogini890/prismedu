import {randomUUID} from 'node:crypto';
import {openDatabase} from './db.js';
import {hashPassword} from './auth.js';
const username=(process.env.ADMIN_USERNAME || process.argv[2])?.trim().toLowerCase();
if(!username || !/^[\w@.+-]{3,150}$/.test(username)) throw Error('Set ADMIN_USERNAME in .env (3–150 letters, digits, _, @, ., + or -), then run npm run admin:setup.');
if(process.stdin.isTTY) throw Error('Use npm run admin:setup for a hidden password prompt, or supply the password through stdin.');
let password='';for await(const chunk of process.stdin) password+=chunk;
password=password.replace(/[\r\n]+$/,'');
if(password.length<14 || password.length>256) throw Error('Use a password of 14–256 characters.');
const db=openDatabase();
try {
 const hash=await hashPassword(password);password='';
 db.exec('BEGIN IMMEDIATE');
 try {
  const existing=db.prepare('SELECT id FROM admins WHERE username=?').get(username);
  const id=existing?.id || randomUUID();
  db.prepare('INSERT INTO admins (id,username,password_hash) VALUES (?,?,?) ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash').run(id,username,hash);
  db.prepare("UPDATE admins SET role='admin',active=1 WHERE id=?").run(id);
  db.prepare('DELETE FROM sessions WHERE admin_id=?').run(id);
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}finally{password='';db.close();}
console.log('Admin account saved. Existing sessions revoked.');
