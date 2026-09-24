import {openDatabase} from './db.js';
import {createApp} from './app.js';
import {deliverNotifications} from './notifications.js';
if (process.env.NODE_ENV==='production') {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length<48) throw Error('Production requires SESSION_SECRET of at least 48 characters.');
  if (!process.env.APP_ORIGIN?.startsWith('https://')) throw Error('Production requires an HTTPS APP_ORIGIN.');
  if (!process.env.DATABASE_PATH) throw Error('Production requires DATABASE_PATH on persistent storage.');
}
const db=openDatabase();
const server=createApp(db).listen(Number(process.env.PORT||3001),'0.0.0.0',()=>console.log('Prism server ready.'));
server.requestTimeout=30000;
let delivering=false;
const deliver=async()=>{if(delivering)return;delivering=true;try{await deliverNotifications(db);}catch{console.error('Notification worker could not complete.');}finally{delivering=false;}};
const timer=setInterval(deliver,30000);timer.unref();deliver();
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(timer);server.close(()=>process.exit(0));});

