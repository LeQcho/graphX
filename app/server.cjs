'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createState,validateProject,act,cleanup}=require('./model.cjs');
const {Storage}=require('./storage.cjs');
const MAX=40*1024*1024;
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req){let n=0,chunks=[];for await(const c of req){n+=c.length;if(n>MAX)throw new Error('Fichier trop volumineux (40 Mo maximum).');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
function imageType(buffer){if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'png';if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'jpg';if(buffer.toString('ascii',0,4)==='RIFF'&&buffer.toString('ascii',8,12)==='WEBP')return 'webp';return null;}
function createServer({dataDir,webDir=path.join(__dirname,'../web'),onChange=()=>{},onOutput=async()=>{},onScan=async()=>({driver:false,devices:[]}),onFrame=()=>null,mode='web'}={}){
 const storage=new Storage(dataDir);const state=createState(storage.load());const clients=new Set();let saveTimer;let shutdown=false;let port=0;
 const status={mode,output:{running:false,starting:false,message:mode==='web'?'Aperçu web · moteur natif non démarré':'Sortie SDI arrêtée',stats:{}},render:{fps:0,frames:0},hardware:{driver:false,devices:[]},savedAt:0,saveError:null,recovered:storage.recovered};
 function snapshot(){return {...state,status,serverTime:Date.now()};}
 function broadcast(){if(shutdown)return;const message=`data: ${JSON.stringify(snapshot())}\n\n`;for(const c of clients){if(c.writableLength>1024*1024){c.destroy();clients.delete(c);}else c.write(message);}onChange(snapshot());}
 function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{try{storage.save(state.project);status.savedAt=Date.now();status.saveError=null;}catch(e){status.saveError=e.message;}broadcast();},180);}
 function updateStatus(patch){Object.assign(status,patch);broadcast();}
 function storeImage(data){if(typeof data!=='string'||data.length>MAX)throw new Error('Image trop volumineuse.');const bytes=Buffer.from(data.replace(/^data:image\/[\w+.-]+;base64,/,''),'base64');const type=imageType(bytes);if(!type)throw new Error('Utilise une image PNG, JPEG ou WebP.');if(bytes.length>25*1024*1024)throw new Error('Image limitée à 25 Mo.');if(type==='png'&&(bytes.length<24||bytes.readUInt32BE(16)>8192||bytes.readUInt32BE(20)>8192))throw new Error('PNG limité à 8192 × 8192 pixels.');const name=crypto.createHash('sha256').update(bytes).digest('hex')+'.'+type;const file=path.join(storage.dir,'media',name);if(!fs.existsSync(file))fs.writeFileSync(file,bytes);return name;}
 const server=http.createServer(async(req,res)=>{
  try{
   const host=req.headers.host||'';if(!['127.0.0.1:'+port,'localhost:'+port].includes(host)){json(res,403,{error:'Accès local uniquement.'});return;}
   if(req.method!=='GET'&&req.method!=='HEAD'){
    const origin=req.headers.origin;if(origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(origin)){json(res,403,{error:'Origine non autorisée.'});return;}
    if(!String(req.headers['content-type']||'').startsWith('application/json')){json(res,415,{error:'Content-Type application/json requis.'});return;}
   }
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
   const url=new URL(req.url,'http://127.0.0.1');const p=url.pathname;
   if(req.method==='GET'&&p==='/api/state'){json(res,200,snapshot());return;}
   if(req.method==='GET'&&p==='/api/events'){
    if(clients.size>=32){json(res,429,{error:'Trop de connexions.'});return;}
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(`data: ${JSON.stringify(snapshot())}\n\n`);clients.add(res);req.on('close',()=>clients.delete(res));return;
   }
   if(req.method==='POST'&&p==='/api/action'){
    const a=await body(req);if(a.type==='settings'&&(status.output.running||status.output.starting))throw new Error('Arrête la sortie avant de changer son format.');
    if(act(state,a)){persist();}broadcast();json(res,200,{ok:true,revision:state.revision,selectedId:state.selectedId});return;
   }
   if(req.method==='POST'&&p==='/api/media'){
    const b=await body(req);const name=storeImage(b.data);json(res,200,{name,url:'/media/'+name});return;
   }
   if(req.method==='GET'&&p==='/api/export'){
    const media={};for(const c of state.project.cues)if(c.media&&!media[c.media]){const file=path.join(storage.dir,'media',c.media);if(!fs.existsSync(file))throw new Error('Média manquant : '+c.label);media[c.media]=fs.readFileSync(file).toString('base64');}
    res.setHeader('Content-Disposition','attachment; filename="graphX-project.graphx"');json(res,200,{...state.project,media});return;
   }
   if(req.method==='POST'&&p==='/api/import'){
    if(state.live.length)throw new Error('Retire tous les graphiques avant de charger un projet.');if(status.output.running||status.output.starting)throw new Error('Arrête la sortie SDI avant de charger un projet.');
    const b=await body(req);const project=validateProject(b);const missing=[];
    for(const c of project.cues)if(c.media){if(b.media?.[c.media]){const name=storeImage(b.media[c.media]);if(name!==c.media)throw new Error('Média corrompu : '+c.label);}else if(!fs.existsSync(path.join(storage.dir,'media',c.media)))missing.push(c.label);}
    if(missing.length)throw new Error('Médias absents : '+missing.join(', '));state.project=project;state.selectedId=project.cues[0]?.id||null;state.live=[];state.playback=createState(project).playback;state.revision++;persist();broadcast();json(res,200,{ok:true});return;
   }
   if(req.method==='POST'&&p==='/api/scan'){const scan=await onScan();status.hardware=scan;broadcast();json(res,200,scan);return;}
   if(req.method==='POST'&&p==='/api/output'){
    const b=await body(req);if(mode==='web')throw new Error('Lance graphX.app pour accéder à la sortie Blackmagic.');if(!['start','stop'].includes(b.action))throw new Error('Commande de sortie invalide.');
    await onOutput(b.action,state.project.settings);json(res,200,{ok:true});return;
   }
   if(req.method==='GET'&&p==='/api/program.png'){const frame=onFrame();if(!frame){json(res,503,{error:'Rendu en préparation.'});return;}res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store'});res.end(frame);return;}
   if(req.method==='GET'&&p==='/api/diagnostics'){json(res,200,{app:'graphX',version:'0.3.0',...status,project:{name:state.project.name,cues:state.project.cues.length},settings:state.project.settings,platform:process.platform,arch:process.arch,versions:process.versions});return;}
   if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'Méthode non autorisée.'});return;}
   let file;
   if(p.startsWith('/media/')){const name=p.slice(7);if(!/^[a-f0-9]{64}\.(png|jpg|webp)$/.test(name)){json(res,404,{error:'Introuvable'});return;}file=path.join(storage.dir,'media',name);}
   else {const relative=p==='/'?'index.html':p.slice(1);file=path.resolve(webDir,relative);if(!file.startsWith(path.resolve(webDir)+path.sep)){json(res,403,{error:'Accès refusé'});return;}}
   if(!fs.existsSync(file)||!fs.statSync(file).isFile()){json(res,404,{error:'Introuvable'});return;}
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch(e){if(!res.headersSent)json(res,400,{error:e.message});else res.end();}
 });
 server.requestTimeout=30000;server.headersTimeout=10000;
 const tick=setInterval(()=>{if(cleanup(state)){state.revision++;broadcast();}},50);
 const keep=setInterval(()=>{for(const c of clients)c.write(': heartbeat\n\n');},15000);
 return {state,status,storage,snapshot,broadcast,updateStatus,
  async listen(wanted=0){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(wanted,'127.0.0.1',()=>{port=server.address().port;server.removeListener('error',reject);resolve();});});return `http://127.0.0.1:${port}`;},
  async close(){shutdown=true;clearTimeout(saveTimer);clearInterval(tick);clearInterval(keep);try{storage.save(state.project);}catch{}for(const c of clients)c.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 };
}
module.exports={createServer,imageType};
