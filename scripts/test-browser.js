import {spawn} from 'node:child_process';
import {startBrowserTestServer} from './browser-test-server.js';
const stop=await startBrowserTestServer();
const child=spawn(process.execPath,['node_modules/@playwright/test/cli.js','test',...process.argv.slice(2)],{stdio:'inherit',env:process.env});
const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
await stop();
process.exitCode=code ?? 1;

