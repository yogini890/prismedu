import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins:[react()],
  server:{host:'127.0.0.1',proxy:{'/api':{target:'http://127.0.0.1:3001',configure(proxy){proxy.on('error',(_error,_request,response)=>{if(!response.headersSent&&response.writeHead){response.writeHead(503,{'Content-Type':'application/json'});response.end(JSON.stringify({error:'Unable to connect to the server. Please try again.'}));}});}}}},
  build:{rolldownOptions:{output:{codeSplitting:{groups:[{
    name(id){
      if(!id.includes('node_modules'))return null;
      if(id.includes('react-dom')||id.includes('scheduler'))return 'react-dom';
      if(id.includes('lucide-react'))return 'icons';
      return 'vendor';
    },
  }]}}}},
});

