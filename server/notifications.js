import nodemailer from 'nodemailer';
import {findListing} from './db.js';
export const mailConfigured = () => ['SMTP_HOST','MAIL_FROM','PRISM_NOTIFICATION_EMAIL','APP_ORIGIN'].every(key=>process.env[key]);
export const whatsappNumber = () => /^\d{8,15}$/.test(process.env.PRISM_WHATSAPP_NUMBER || '') ? process.env.PRISM_WHATSAPP_NUMBER : '';
export function whatsappLink(record) {
  if (!whatsappNumber()) return null;
  const message=`Hello Prism Edu Consultancy,\n\nI have submitted a ${record.type==='Land Required'?'School Land Requirement':'Property Listing'}.\n\nReference Number: ${record.reference}\nName: ${record.contactName}\nOrganization: ${record.ownerName || ''}\nLocation: ${record.location}\nRequired/Available Area: ${record.area} ${record.areaUnit}\nTransaction Preference: ${record.transaction}\nPhone Number: ${record.phone}\nShort Description: ${(record.summary || record.description).slice(0,180)}\n\nPlease review my submission and contact me.`;
  return `https://wa.me/${whatsappNumber()}?text=${encodeURIComponent(message)}`;
}
export async function deliverNotifications(db, testTransport) {
  if (!mailConfigured()) return;
  const transport=testTransport || nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT || 587),secure:process.env.SMTP_SECURE==='true',requireTLS:process.env.SMTP_SECURE!=='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:10000,socketTimeout:15000});
  const jobs=db.prepare("SELECT * FROM notifications WHERE status IN ('pending','failed') AND attempts<5 AND next_attempt<=? LIMIT 10").all(Date.now());
  for (const job of jobs) {
    const item=findListing(db,job.listing_id); if (!item) continue;
    try {
      const fields=['type','reference','createdAt','contactName','ownerName','phone','whatsapp','email','location','city','district','state','area','areaUnit','propertyType','transaction','terms','description'];
      const text=fields.map(key=>`${key}: ${item[key] || ''}`).join('\n')+`\n\nAdmin review: ${process.env.APP_ORIGIN}/admin/school-land?edit=${item.id}\n\nImages (admin login required until published):\n`+item.images.map(id=>`${process.env.APP_ORIGIN}/api/media/${id}`).join('\n');
      await transport.sendMail({from:process.env.MAIL_FROM,to:process.env.PRISM_NOTIFICATION_EMAIL,subject:`School Land ${item.reference} — ${item.type}`,text});
      db.prepare("UPDATE notifications SET status='sent', attempts=attempts+1, updated_at=?, error=NULL WHERE id=?").run(new Date().toISOString(),job.id);
    } catch {
      db.prepare("UPDATE notifications SET status='failed',attempts=attempts+1,next_attempt=?,updated_at=?,error='Email delivery failed; check server mail configuration.' WHERE id=?").run(Date.now()+60000*2**job.attempts,new Date().toISOString(),job.id);
    }
  }
  transport.close();
}
