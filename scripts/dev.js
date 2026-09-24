import {spawn} from 'node:child_process';
const commands=[['--env-file-if-exists=.env','--watch','server/index.js'],['node_modules/vite/bin/vite.js']];
const children=commands.map(args=>spawn(process.execPath,args,{stdio:'inherit',env:process.env}));
let stopped=false;
function stop(code=0){if(stopped)return;stopped=true;children.forEach(child=>child.kill());process.exitCode=code;}
children.forEach(child=>child.on('exit',code=>stop(code||0)));
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());

