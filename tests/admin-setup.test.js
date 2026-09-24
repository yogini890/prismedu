import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {chromium} from '@playwright/test';
import {openDatabase} from '../server/db.js';
import {checkPassword} from '../server/auth.js';
import {createApp} from '../server/app.js';

test('Admin seed, browser login, logout and password reset revoke sessions', {timeout:240000}, async()=>{
 const folder=mkdtempSync(path.join(tmpdir(),'prism-admin-'));
 const database=path.join(folder,'test.sqlite');
 const username='setup-test-admin';
 const seed=password=>spawnSync(process.execPath,['server/admin.js'],{input:password,encoding:'utf8',env:{...process.env,ADMIN_USERNAME:username,DATABASE_PATH:database},timeout:30000});
 let db,server,browser;
 const previousOrigin=process.env.APP_ORIGIN;
 try {
  assert.notEqual(seed('short').status,0);
  const password=randomBytes(32).toString('base64url');
  assert.equal(seed(password).status,0,'Seed command should succeed');
  db=openDatabase(database);
  const original=db.prepare('SELECT id,password_hash FROM admins WHERE username=?').get(username);
  assert.ok(original.password_hash!==password,'Only a hash is stored');
  assert.ok(await checkPassword(password,original.password_hash));
  server=createApp(db).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  process.env.APP_ORIGIN=origin;
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({reducedMotion:'reduce'});
  page.setDefaultTimeout(45000);
  await page.addInitScript(()=>sessionStorage.setItem('prism-principals-school-leadership-award-seen','true'));
  await page.goto(origin+'/admin',{waitUntil:'domcontentloaded'});
  await page.waitForURL('**/admin/login');
  assert.equal((await page.request.get(origin+'/api/admin/listings')).status(),401);
  const login=async secret=>{
   await page.getByLabel('Email or username').fill(username);
   await page.getByLabel('Password',{exact:true}).fill(secret);
   await page.getByRole('button',{name:'Login',exact:true}).click();
  };
  await login('incorrect-password');
  await page.getByRole('alert').filter({hasText:'Invalid email or password'}).waitFor();
  await login(password);
  await page.waitForURL('**/admin/school-land');
  await page.getByRole('button',{name:'Add New Land Listing'}).waitFor();
  assert.equal((await page.request.get(origin+'/api/admin/listings')).status(),200);
  const cookie=(await page.context().cookies()).find(c=>c.name==='prism_admin');
  assert.ok(cookie.httpOnly&&cookie.sameSite==='Strict');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Add New Land Listing'}).waitFor();
  const replacement=randomBytes(32).toString('base64url');
  assert.equal(seed(replacement).status,0,'Reset command should succeed');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM admins').get().n,1);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM sessions').get().n,0);
  assert.equal((await page.request.get(origin+'/api/admin/session')).status(),401);
  assert.ok(!(await checkPassword(password,db.prepare('SELECT password_hash FROM admins').get().password_hash)));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForURL('**/admin/login');
  await login(password);
  await page.getByRole('alert').filter({hasText:'Invalid email or password'}).waitFor();
  await login(replacement);
  await page.waitForURL('**/admin/school-land');
  await page.getByRole('button',{name:'Logout',exact:true}).click();
  await page.waitForURL('**/admin/login');
  assert.equal((await page.request.get(origin+'/api/admin/session')).status(),401);
 } finally {
  await browser?.close();
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  db?.close();rmSync(folder,{recursive:true,force:true});
  if(previousOrigin===undefined)delete process.env.APP_ORIGIN;else process.env.APP_ORIGIN=previousOrigin;
 }
});

