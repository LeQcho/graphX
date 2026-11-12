'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createState,validateProject,act,cleanup,expandCue,historyStatus,resetHistory}=require('./model.cjs');
const {Storage}=require('./storage.cjs');
const {exportArchive,importArchive,manifest}=require('./archive.cjs');
const {createClock}=require('./clock.cjs');
const {Journal}=require('./journal.cjs');
const {armedPreview}=require('./armed-preview.cjs');
const {pipeline}=require('node:stream/promises');
const {IMAGE_NAME,VIDEO_NAME,MAX_IMAGE,MAX_VIDEO,imageType,imageHeaderValid,storeAsset}=require('./media.cjs');
const MAX=40*1024*1024;
const TAKES=new Set(['go','advance','updateLive']);
function untilAborted(work,signal){
 if(!signal)return work;
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(signal.reason);
  signal.addEventListener('abort',abort,{once:true});
  Promise.resolve(work).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  if(signal.aborted)abort();
 });
}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function body(req){let n=0,chunks=[];for await(const c of req){n+=c.length;if(n>MAX)throw new Error('Fichier trop volumineux (40 Mo maximum).');chunks.push(c);}return JSON.parse(Buffer.concat(chunks).toString()||'{}');}
const IMAGE_TYPES=new Map([['image/png','png'],['image/jpeg','jpg'],['image/webp','webp']]);
async function serveVideo(req,res,file){
 const stat=await fs.promises.stat(file).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 if(!stat?.isFile()){json(res,404,{error:'Vidéo introuvable.'});return;}
 const size=stat.size,headers={'Content-Type':'video/webm','Cache-Control':'no-store','Accept-Ranges':'bytes'};
 let start=0,end=size-1,status=200;
 if(req.headers.range){
  const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if(range&&(range[1]||range[2])){
   start=range[1]?Number(range[1]):Math.max(0,size-Number(range[2]));
   end=range[1]&&range[2]?Math.min(end,Number(range[2])):end;
  }
  if(!range||(!range[1]&&!range[2])||!Number.isSafeInteger(start)||start>end){
   res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;
  }
  status=206;headers['Content-Range']=`bytes ${start}-${end}/${size}`;
 }
 res.writeHead(status,{...headers,'Content-Length':end-start+1});
 if(req.method==='HEAD'){res.end();return;}
 await pipeline(fs.createReadStream(file,{start,end}),res).catch(e=>{if(!res.destroyed)throw e;});
}
function createServer({dataDir,webDir=path.join(__dirname,'../web'),onChange=()=>{},onOutput=async()=>{},onScan=async()=>({driver:false,devices:[]}),onFrame=()=>null,onMonitor=onFrame,onArmedPreview=null,onPrepare=null,mode='web'}={}){
 const storage=new Storage(dataDir);const state=createState(storage.load());const clients=new Set(),pulseClients=new Set();let transportToken=crypto.randomUUID(),transport=new AbortController();let saveTimer;let shutdown=false;let port=0;const now=createClock(),journal=new Journal(dataDir);let actionChain=Promise.resolve(),saveChain=Promise.resolve(),prepareTimer;const results=new Map();let prepareEpoch=0;
 function exclusive(fn){const next=actionChain.then(fn);actionChain=next.catch(()=>{});return next;}
 const status={mode,output:{running:false,starting:false,message:mode==='web'?'Aperçu web · moteur natif non démarré':'Sortie SDI arrêtée',stats:{}},render:{fps:0,frames:0},hardware:{driver:false,devices:[]},savedAt:0,saveError:null,recovered:storage.recovered,preparation:{},health:[]};
 function snapshot(){const preview=armedPreview(state);return {...state,armedPreview:preview?{id:preview.id,label:preview.label,key:preview.key}:null,history:historyStatus(state),status,transportToken,serverTime:now()};}
 function broadcast(){if(shutdown)return;const message=`data: ${JSON.stringify(snapshot())}\n\n`;for(const c of clients){if(c.writableLength>1024*1024){c.destroy();clients.delete(c);pulseClients.delete(c);}else c.write(message);}onChange(snapshot());}
 function saveProject(){const project=structuredClone(state.project);saveChain=saveChain.then(()=>storage.saveAsync(project)).then(()=>{status.savedAt=Date.now();status.saveError=null;}).catch(e=>{status.saveError=e.message;journal.add({kind:'save-error',message:e.message});});return saveChain;}
 function persist(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>{saveProject().then(broadcast);},180);}
 function fingerprint(c){return JSON.stringify([c.type,c.media,c.videoDurationMs,c.sceneCueIds,c.type==='scene'?c.sceneCueIds.map(id=>{const x=state.project.cues.find(c=>c.id===id);return x?[x.id,x.type,x.media,x.videoDurationMs,x.layer]:null;}):null]);}
 async function prepare(cues,signal){
  const epoch=prepareEpoch,members=[...new Map(cues.flatMap(c=>expandCue(state.project,c)).map(c=>[c.id,c])).values()];
  for(const c of members){if(c.type==='image'&&!c.media)throw Error('Image absente : '+c.label);if(c.type==='video'&&(!c.media||!c.videoDurationMs))throw Error('Vidéo absente ou durée invalide : '+c.label);if(c.media)await fs.promises.access(path.join(storage.dir,'media',c.media)).catch(()=>{throw Error('Média absent : '+c.label);});}
  signal?.throwIfAborted();
  const checked=onPrepare?await untilAborted(onPrepare(members,signal),signal):members.map(c=>({id:c.id,state:'ready'}));
  signal?.throwIfAborted();
  if(!Array.isArray(checked)||members.some(c=>!checked.some(r=>r.id===c.id)))throw Error('Réponse de préparation incomplète.');
  const failures=checked.filter(r=>r.state!=='ready');
  if(onPrepare)for(const c of members){
   const result=checked.find(r=>r.id===c.id);
   if(c.type==='video'&&result.state==='ready'&&Math.abs((result.videoDurationMs||0)-c.videoDurationMs)>50)failures.push({message:'Durée vidéo incorrecte : '+c.label+'. Réimporte le fichier.'});
  }
  if(epoch===prepareEpoch)for(const c of cues){
   const verified=onPrepare||!expandCue(state.project,c).some(member=>member.media);
   status.preparation[c.id]={state:failures.length?'error':verified?'ready':'available',message:failures.map(r=>r.message).join(' · '),fingerprint:fingerprint(c)};
  }
  if(failures.length)throw Error(failures.map(r=>r.message).join(' · '));
 }
 function schedulePreparation(){
  clearTimeout(prepareTimer);const epoch=++prepareEpoch;
  const ids=new Set(state.project.cues.map(c=>c.id));for(const id of Object.keys(status.preparation))if(!ids.has(id))delete status.preparation[id];
  for(const c of state.project.cues){const old=status.preparation[c.id];if(!old||old.fingerprint!==fingerprint(c))status.preparation[c.id]={state:c.type==='note'?'note':'idle',fingerprint:fingerprint(c)};}
  prepareTimer=setTimeout(async()=>{for(const id of new Set([state.selectedId,state.playback.nextId,state.project.lastAssetId])){if(epoch!==prepareEpoch)return;const c=state.project.cues.find(c=>c.id===id);if(!c||c.type==='note')continue;status.preparation[id]={state:'loading',fingerprint:fingerprint(c)};broadcast();try{await prepare([c]);}catch(e){if(epoch===prepareEpoch)status.preparation[id]={state:'error',message:e.message,fingerprint:fingerprint(c)};}}if(epoch===prepareEpoch)broadcast();},100);
 }
 function assertOffline(){if(state.live.length)throw Error('Retire tous les graphiques avant de charger un projet.');if(status.output.running||status.output.starting)throw Error('Arrête la sortie SDI avant de charger un projet.');}
 function loadProject(project){invalidateTakes('Le projet a changé.');state.project=project;state.selectedId=project.cues[0]?.id||null;state.live=[];state.playback=createState(project).playback;state.revision++;resetHistory(state);persist();schedulePreparation();broadcast();journal.add({kind:'project-import',project:project.name});}
 function invalidateTakes(reason){
  transport.abort(Error(reason));transport=new AbortController();transportToken=crypto.randomUUID();
 }
 function emergencyClear(){
  invalidateTakes('GO annulé par le retrait d’urgence.');
  act(state,{type:'clear'},now());
  schedulePreparation();broadcast();
  journal.add({kind:'command',action:'clear',revision:state.revision,result:'accepted'});
  return {ok:true,revision:state.revision,selectedId:state.selectedId,transportToken};
 }
 async function execute(a,signal){
  if(a.type==='settings'&&(status.output.running||status.output.starting))throw Error('Arrête la sortie avant de changer son format.');
  const start=performance.now();
  try{
   signal?.throwIfAborted();
   if(TAKES.has(a.type)){const id=a.type==='advance'?state.playback.nextId:(a.id||state.selectedId),c=state.project.cues.find(c=>c.id===id);if(c){try{await prepare([c],signal);}catch(e){if(signal?.aborted)throw e;status.preparation[id]={state:'error',message:e.message,fingerprint:fingerprint(c)};broadcast();throw e;}}}
   signal?.throwIfAborted();
   if(a.type==='importAssets'){
    if(!Array.isArray(a.cues)||!a.cues.length||a.cues.length+state.project.cues.length>250)throw Error('Import limité à 250 éléments au total.');
    await Promise.all(a.cues.map(async c=>{
     if(!c||!((c.type==='image'&&IMAGE_NAME.test(c.media))||(c.type==='video'&&VIDEO_NAME.test(c.media))))throw Error('Média d’import invalide.');
     const stat=await fs.promises.stat(path.join(storage.dir,'media',c.media)).catch(()=>null);
     if(!stat?.isFile())throw Error('Un média de l’import est introuvable.');
    }));
    if(status.output.running||status.output.starting)a={...a,staged:true};
   }
   const save=act(state,a,now());if(save)persist();schedulePreparation();broadcast();
   if(!['select','edit','move','reorder'].includes(a.type))journal.add({kind:'command',action:a.type,cueId:a.id||state.playback.lastId,revision:state.revision,milliseconds:Math.round(performance.now()-start),result:'accepted'});
   return {ok:true,revision:state.revision,selectedId:state.selectedId};
  }catch(e){journal.add({kind:'command-error',action:a.type,message:e.message});throw e;}
 }
 function updateStatus(patch){Object.assign(status,patch);broadcast();}
 async function storeImage(data){
  if(typeof data!=='string'||data.length>MAX)throw Error('Image trop volumineuse.');
  const bytes=Buffer.from(data.replace(/^data:image\/[\w+.-]+;base64,/,''),'base64'),type=imageType(bytes);
  if(!type)throw Error('Utilise une image PNG, JPEG ou WebP.');
  if(bytes.length>MAX_IMAGE)throw Error('Image limitée à 25 Mo.');
  if(!imageHeaderValid(bytes,type))throw Error('Image invalide ou trop grande.');
  const name=crypto.createHash('sha256').update(bytes).digest('hex')+'.'+type;
  const file=path.join(storage.dir,'media',name),temp=file+'.'+crypto.randomUUID()+'.tmp';
  if(!fs.existsSync(file)){try{await fs.promises.writeFile(temp,bytes);await fs.promises.rename(temp,file);}finally{await fs.promises.rm(temp,{force:true});}}
  return name;
 }
 const server=http.createServer(async(req,res)=>{
  try{
   const host=req.headers.host||'';if(!['127.0.0.1:'+port,'localhost:'+port].includes(host)){json(res,403,{error:'Accès local uniquement.'});return;}
   if(req.method!=='GET'&&req.method!=='HEAD'){
    const origin=req.headers.origin;if(origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(origin)){json(res,403,{error:'Origine non autorisée.'});return;}
    if(!String(req.headers['content-type']||'').startsWith('application/json')&&!(req.url==='/api/archive'&&String(req.headers['content-type']||'').startsWith('application/octet-stream'))&&!(req.url==='/api/video'&&req.headers['content-type']==='video/webm')&&!(req.url==='/api/media'&&IMAGE_TYPES.has(req.headers['content-type']))){json(res,415,{error:'Content-Type application/json requis.'});return;}
   }
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
   const url=new URL(req.url,'http://127.0.0.1');const p=url.pathname;
   if(req.method==='GET'&&p==='/api/state'){json(res,200,snapshot());return;}
   if(req.method==='GET'&&p==='/api/events'){
    if(clients.size>=32){json(res,429,{error:'Trop de connexions.'});return;}
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(`data: ${JSON.stringify(snapshot())}\n\n`);clients.add(res);if(url.searchParams.get('heartbeat')==='1')pulseClients.add(res);req.on('close',()=>{clients.delete(res);pulseClients.delete(res);});return;
   }
   if(req.method==='POST'&&p==='/api/action'){
    const requestTransport=transport.signal,token=transportToken;
    const a=await body(req);const requestId=typeof a.requestId==='string'&&/^[\w-]{1,80}$/.test(a.requestId)?a.requestId:null;
    const payload=JSON.stringify({...a,requestId:undefined});
    const previous=()=>{if(!requestId||!results.has(requestId))return null;const saved=results.get(requestId);if(saved.payload!==payload)throw Error('Identifiant de commande déjà utilisé.');return saved.result;};
    const remember=result=>{if(requestId){results.set(requestId,{payload,result});if(results.size>500)results.delete(results.keys().next().value);}return result;};
    if(a.type==='clear'){json(res,200,previous()||remember(emergencyClear()));return;}
    const signal=TAKES.has(a.type)?requestTransport:undefined;
    const result=await exclusive(async()=>{
     const saved=previous();if(saved)return saved;
     if(signal&&a.transportToken!==undefined&&a.transportToken!==token)throw Error('Commande annulée : le retrait d’urgence ou le moteur a changé.');
     return remember(await execute(a,signal));
    });
    json(res,200,result);return;
   }
   if(req.method==='GET'&&p==='/api/command-result'){const result=results.get(url.searchParams.get('id'));json(res,result?200:404,result?.result||{error:'Résultat inconnu.'});return;}
   if(req.method==='GET'&&p==='/api/archive'){await exportArchive(res,structuredClone(state.project),storage.dir);return;}
   if(req.method==='POST'&&p==='/api/archive'){await exclusive(async()=>{assertOffline();const project=await importArchive(req,storage.dir);assertOffline();loadProject(project);});json(res,200,{ok:true});return;}
   if(req.method==='GET'&&p==='/api/journal'){res.setHeader('Content-Disposition','attachment; filename="graphX-diagnostic.json"');json(res,200,{version:'0.4.0',status,events:journal.events,journalError:journal.error});return;}
   if(req.method==='GET'&&p==='/api/backups'){const dir=path.join(storage.dir,'backups');const names=await fs.promises.readdir(dir).catch(()=>[]);json(res,200,names.filter(n=>/^[\dTZ-]+\.json$/.test(n)).sort().reverse());return;}
   if(req.method==='POST'&&p==='/api/restore'){const b=await body(req);if(!/^[\dTZ-]+\.json$/.test(b.name||''))throw Error('Sauvegarde invalide.');await exclusive(async()=>{assertOffline();const project=validateProject(JSON.parse(await fs.promises.readFile(path.join(storage.dir,'backups',b.name),'utf8')));for(const c of project.cues)if(c.media)await fs.promises.access(path.join(storage.dir,'media',c.media));loadProject(project);});json(res,200,{ok:true});return;}
   if(req.method==='GET'&&p==='/api/media-library'){const names=(await fs.promises.readdir(path.join(storage.dir,'media'))).filter(n=>/^[a-f0-9]{64}\.(png|jpg|webp)$/.test(n));const items=await Promise.all(names.map(async name=>{const cues=state.project.cues.filter(c=>c.media===name),stat=await fs.promises.stat(path.join(storage.dir,'media',name));return {name,label:cues[0]?.label||name.slice(0,12),bytes:stat.size,uses:cues.map(c=>c.label)};}));json(res,200,items);return;}
   if(req.method==='POST'&&p==='/api/video'){
    if(req.headers['content-type']!=='video/webm'){json(res,415,{error:'Choisis une vidéo WebM.'});return;}
    if(Number(req.headers['content-length'])>MAX_VIDEO){json(res,413,{error:'Vidéo limitée à 250 Mio.'});return;}
    const name=await storeAsset(req,storage.dir,'webm');json(res,200,{name});return;
   }
   if(req.method==='POST'&&p==='/api/media'){
    const extension=IMAGE_TYPES.get(req.headers['content-type']);
    if(extension&&Number(req.headers['content-length'])>MAX_IMAGE){json(res,413,{error:'Image limitée à 25 Mio.'});return;}
    const name=extension?await storeAsset(req,storage.dir,extension):await storeImage((await body(req)).data);json(res,200,{name,url:'/media/'+name});return;
   }
   if(req.method==='GET'&&p==='/api/export'){
    if(state.project.cues.some(c=>c.type==='video'))throw Error('Utilise l’archive graphX pour exporter les vidéos.');
    const size=await manifest(state.project,storage.dir);if(size.media.reduce((n,m)=>n+Math.ceil(m.bytes/3)*4,0)+size.json.length>MAX-1024)throw Error('Utilise l’archive graphX pour ce projet volumineux.');
    const media={};for(const c of state.project.cues)if(c.media&&!media[c.media]){const file=path.join(storage.dir,'media',c.media);if(!fs.existsSync(file))throw new Error('Média manquant : '+c.label);media[c.media]=fs.readFileSync(file).toString('base64');}
    const exported={...state.project,media};if(Buffer.byteLength(JSON.stringify(exported))>MAX)throw Error('Utilise l’archive graphX pour ce projet volumineux.');res.setHeader('Content-Disposition','attachment; filename="graphX-project.graphx"');json(res,200,exported);return;
   }
   if(req.method==='POST'&&p==='/api/import'){
    const b=await body(req);await exclusive(async()=>{assertOffline();const project=validateProject(b);const missing=[];
    for(const c of project.cues)if(c.media){if(b.media?.[c.media]){const name=await storeImage(b.media[c.media]);if(name!==c.media)throw Error('Média corrompu : '+c.label);}else if(!fs.existsSync(path.join(storage.dir,'media',c.media)))missing.push(c.label);}
    if(missing.length)throw Error('Médias absents : '+missing.join(', '));loadProject(project);});json(res,200,{ok:true});return;
   }
   if(req.method==='POST'&&p==='/api/scan'){const scan=await onScan();status.hardware=scan;broadcast();json(res,200,scan);return;}
   if(req.method==='POST'&&p==='/api/output'){
    const b=await body(req);if(mode==='web')throw new Error('Lance graphX.app pour accéder à la sortie Blackmagic.');if(!['start','stop'].includes(b.action))throw new Error('Commande de sortie invalide.');
    await exclusive(()=>onOutput(b.action,state.project.settings));journal.add({kind:'output',action:b.action});json(res,200,{ok:true});return;
   }
   if(req.method==='GET'&&p==='/api/armed-preview.png'){
    const preview=armedPreview(state);if(!preview){res.writeHead(204,{'Cache-Control':'no-store'});res.end();return;}
    const requested=url.searchParams.get('key');if(requested&&requested!==preview.key){json(res,409,{error:'Le prochain élément a changé.'});return;}
    if(!onArmedPreview){json(res,503,{error:'Aperçu armé disponible dans le moteur Mac.'});return;}
    const png=await onArmedPreview(preview);
    if(armedPreview(state)?.key!==preview.key){json(res,409,{error:'Le prochain élément a changé.'});return;}
    if(!png){json(res,503,{error:'Aperçu en préparation.'});return;}
    res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store','X-GraphX-Preview-Key':preview.key});res.end(png);return;
   }
   if(req.method==='GET'&&p==='/api/monitor.png'){if(status.render.error)throw Error(status.render.error);const frame=onMonitor();if(!frame){json(res,503,{error:'Rendu en préparation.'});return;}res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store','X-GraphX-Frame-Time':String(status.render.lastTick||status.render.lastPaint||0)});res.end(frame);return;}
   if(req.method==='GET'&&p==='/api/program.png'){const frame=onFrame();if(!frame){json(res,503,{error:'Rendu en préparation.'});return;}res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'no-store'});res.end(frame);return;}
   if(req.method==='GET'&&p==='/api/diagnostics'){json(res,200,{app:'graphX',version:'0.4.0',...status,project:{name:state.project.name,cues:state.project.cues.length},settings:state.project.settings,platform:process.platform,arch:process.arch,versions:process.versions});return;}
   if(!['GET','HEAD'].includes(req.method)){json(res,405,{error:'Méthode non autorisée.'});return;}
   let file;
   if(p.startsWith('/media/')){const name=p.slice(7);if(!IMAGE_NAME.test(name)&&!VIDEO_NAME.test(name)){json(res,404,{error:'Introuvable'});return;}file=path.join(storage.dir,'media',name);if(VIDEO_NAME.test(name)){await serveVideo(req,res,file);return;}}
   else {const relative=p==='/'?'index.html':p.slice(1);file=path.resolve(webDir,relative);if(!file.startsWith(path.resolve(webDir)+path.sep)){json(res,403,{error:'Accès refusé'});return;}}
   if(!fs.existsSync(file)||!fs.statSync(file).isFile()){json(res,404,{error:'Introuvable'});return;}
   const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
   res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; media-src 'self' blob:; font-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  }catch(e){if(!res.headersSent)json(res,400,{error:e.message});else res.end();}
 });
 server.requestTimeout=30000;server.headersTimeout=10000;
 const tick=setInterval(()=>{if(cleanup(state,now())){state.revision++;broadcast();}},50);
 const keep=setInterval(()=>{for(const c of clients)c.write(': heartbeat\n\n');},15000);
 const pulse=setInterval(()=>{for(const c of pulseClients){if(c.writableLength>1024*1024)c.destroy();else c.write('event: heartbeat\ndata: {}\n\n');}},1000);
 const health=setInterval(()=>{status.health.push({time:now(),fps:status.render.fps||0,frameAge:(status.render.lastTick||status.render.lastPaint)?Math.max(0,now()-(status.render.lastTick||status.render.lastPaint)):null,output:status.output.running,stats:status.output.stats});if(status.health.length>120)status.health.shift();},1000);
 return {state,status,storage,snapshot,broadcast,updateStatus,now,prepareProject:schedulePreparation,
  async listen(wanted=0){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(wanted,'127.0.0.1',()=>{port=server.address().port;server.removeListener('error',reject);resolve();});});if(mode==='web')schedulePreparation();return `http://127.0.0.1:${port}`;},
  async close(){shutdown=true;clearTimeout(saveTimer);clearTimeout(prepareTimer);prepareEpoch++;clearInterval(tick);clearInterval(keep);clearInterval(pulse);clearInterval(health);transport.abort(Error('Moteur arrêté.'));await actionChain;await saveProject();await journal.close();for(const c of clients)c.end();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 };
}
module.exports={createServer,imageType};
