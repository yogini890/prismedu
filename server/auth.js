import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHmac} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(24).toString('hex');
  return `${salt}:${(await scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024})).toString('hex')}`;
}
export async function checkPassword(password, stored) {
  const [salt,hash] = stored.split(':');
  const actual = await scrypt(password,salt,64,{N:32768,r:8,p:3,maxmem:64*1024*1024});
  return timingSafeEqual(actual,Buffer.from(hash,'hex'));
}
export const tokenHash = token => createHmac('sha256',process.env.SESSION_SECRET || 'local-development-only').update(token).digest('hex');
export function sessionFor(db,req) {
  const token = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith('prism_admin='))?.slice(12);
  if (!token) return null;
  return db.prepare("SELECT sessions.*, admins.username FROM sessions JOIN admins ON admins.id=sessions.admin_id WHERE token_hash=? AND expires>? AND admins.active=1 AND admins.role='admin'").get(tokenHash(token),Date.now());
}
export function cookie(value, maxAge) { return `prism_admin=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV==='production'?'; Secure':''}`; }


