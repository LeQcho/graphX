'use strict';
const {app,BrowserWindow,Menu,Tray,nativeImage,shell,dialog,ipcMain}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {createServer}=require('./server.cjs');const {NativeOutput}=require('./native.cjs');
app.setName('graphX');if(process.env.GRAPHX_DATA_DIR)app.setPath('userData',path.resolve(process.env.GRAPHX_DATA_DIR));
app.commandLine.appendSwitch('force-device-scale-factor','1');app.commandLine.appendSwitch('force-color-profile','srgb');app.commandLine.appendSwitch('disable-renderer-backgrounding');
if(!app.requestSingleInstanceLock()){app.quit();}else{
 let server,output,renderer,launcher,tray,url,lastImage,quitting=false,frames=0,lastFrames=0,lastStats=performance.now(),renderTimer,healthTimer,paintTime=0,frameTickTime=0;
 const preparations=new Map();let preparationId=0;
 let previewRenderer,previewJob,previewCache;const previewRequests=new Map();let previewRequestId=0;
 function captureArmedPreview(preview){
  if(previewCache?.key===preview.key)return Promise.resolve(previewCache.png);
  if(previewJob)return previewJob.key===preview.key?previewJob.promise:Promise.reject(Error('Aperçu en préparation.'));
  if(!previewRenderer||previewRenderer.isDestroyed())return Promise.reject(Error('Moteur d’aperçu indisponible.'));
  const id=++previewRequestId;
  const promise=new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{previewRequests.delete(id);reject(Error('Délai de l’aperçu dépassé.'));},8000);
   previewRequests.set(id,{resolve:png=>{clearTimeout(timer);previewRequests.delete(id);resolve(png);},reject:error=>{clearTimeout(timer);previewRequests.delete(id);reject(error);}});
   previewRenderer.webContents.send('graphx:preview',{id,preview});
  }).then(png=>{previewCache={key:preview.key,png};return png;}).finally(()=>{previewJob=null;});
  previewJob={key:preview.key,promise};return promise;
 }
 ipcMain.on('graphx:previewed',(event,message)=>{
  if(event.sender!==previewRenderer?.webContents)return;
  const request=previewRequests.get(message.id);if(!request)return;
  if(message.error)return request.reject(Error(message.error));
  if(typeof message.png!=='string'||message.png.length>256*1024)return request.reject(Error('Aperçu invalide.'));
  const png=Buffer.from(message.png,'base64');
  if(!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return request.reject(Error('Aperçu PNG invalide.'));
  request.resolve(png);
 });
 function prepareResources(cues,signal){return new Promise((resolve,reject)=>{
  if(!renderer||renderer.isDestroyed())return reject(Error('Moteur de rendu indisponible.'));
  const id=++preparationId;
  const finish=(callback,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);preparations.delete(id);callback(value);};
  const abort=()=>finish(reject,signal.reason);
  const timer=setTimeout(()=>finish(reject,Error('Chargement des ressources dépassé (8 s).')),8000);
  preparations.set(id,{resolve:value=>finish(resolve,value),reject:error=>finish(reject,error)});
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted){abort();return;}
  try{renderer.webContents.send('graphx:prepare',{id,cues});}
  catch(error){finish(reject,error);}
 });}
 ipcMain.on('graphx:tick',event=>{if(server&&event.sender===renderer?.webContents)frameTickTime=server.now();});
 ipcMain.on('graphx:prepared',(event,message)=>{if(event.sender!==renderer?.webContents)return;const pending=preparations.get(message.id);if(!pending)return;if(message.error)pending.reject(Error(message.error));else pending.resolve(message.results);});
 function control(){if(url)shell.openExternal(url);}
 function showLauncher(){if(launcher&&!launcher.isDestroyed()){launcher.show();launcher.focus();return;}launcher=new BrowserWindow({width:440,height:535,resizable:false,title:'graphX Engine',backgroundColor:'#111b16',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});launcher.loadURL(url+'/engine.html');launcher.webContents.setWindowOpenHandler(({url:target})=>{if(target.startsWith(url+'/')||target===url)shell.openExternal(target);return {action:'deny'};});launcher.on('close',e=>{if(!quitting){e.preventDefault();launcher.hide();}});}
 function requestQuit(){if(!server)return app.quit();if((server.state.live.length||server.status.output.running)&&!process.env.GRAPHX_QA){const choice=dialog.showMessageBoxSync({type:'warning',buttons:['Continuer le direct','Quitter graphX'],defaultId:0,cancelId:0,title:'Arrêter le moteur ?',message:'Quitter graphX arrêtera le rendu et la sortie vidéo.',detail:'Fermer le navigateur conserve le direct. Quitter le moteur l’arrête.'});if(choice===0)return;}quitting=true;app.quit();}
 app.on('second-instance',()=>{showLauncher();control();});app.on('activate',()=>{if(url)showLauncher();});app.on('window-all-closed',()=>{});
 app.whenReady().then(async()=>{
  const dataDir=app.getPath('userData');const binary=app.isPackaged?path.join(process.resourcesPath,'bin/graphx-output'):path.join(__dirname,'../build/graphx-output');
  output=new NativeOutput(binary,s=>server?.updateStatus({output:s}));
  server=createServer({dataDir,mode:'native',onScan:()=>output.scan(),onFrame:()=>lastImage?.toPNG()||null,onMonitor:()=>lastImage?.resize({width:960,height:540}).toPNG()||null,onArmedPreview:captureArmedPreview,onPrepare:prepareResources,onOutput:async(action,settings)=>{if(action==='stop')await output.stop();else{renderer.webContents.setFrameRate(Math.round(settings.fps));output.start(settings);}},onChange:s=>{if(renderer&&!renderer.isDestroyed())renderer.webContents.setFrameRate(Math.round(s.project.settings.fps));}});
  try{url=await server.listen(Number(process.env.GRAPHX_PORT)||4318);}catch(e){if(e.code==='EADDRINUSE')url=await server.listen(0);else throw e;}
  console.log('graphX Engine: '+url);if(process.env.GRAPHX_URL_FILE)fs.writeFileSync(process.env.GRAPHX_URL_FILE,url);
  renderer=new BrowserWindow({width:1920,height:1080,useContentSize:true,show:false,frame:false,transparent:true,backgroundColor:'#00000000',webPreferences:{preload:path.join(__dirname,'render-preload.cjs'),offscreen:true,backgroundThrottling:false,nodeIntegration:false,contextIsolation:true,sandbox:true,zoomFactor:1}});
  renderer.webContents.setFrameRate(Math.round(server.state.project.settings.fps));
  renderer.webContents.on('paint',(event,dirty,image)=>{
   if(!server||quitting)return;
   const size=image.getSize();if(size.width!==1920||size.height!==1080){server.updateStatus({render:{fps:0,error:`Taille de rendu incorrecte : ${size.width} × ${size.height}`}});return;}
   lastImage=image;paintTime=server.now();frames++;if(output.running)output.frame(image.toBitmap());
  });
  renderer.webContents.on('render-process-gone',(_,details)=>{for(const pending of preparations.values()){pending.reject(Error('Moteur de rendu interrompu.'));}preparations.clear();lastImage=null;server.updateStatus({render:{fps:0,error:'Rendu interrompu : '+details.reason}});output.stop();});
  renderer.webContents.on('did-fail-load',(_,code,description)=>server.updateStatus({render:{fps:0,error:description}}));
  await renderer.loadURL(url+'/program.html?native=1');renderer.webContents.startPainting();server.prepareProject();
  // Independent renderer: requesting a thumbnail never changes the program or SDI.
  previewRenderer=new BrowserWindow({width:144,height:144,useContentSize:true,show:false,webPreferences:{preload:path.join(__dirname,'render-preload.cjs'),backgroundThrottling:false,nodeIntegration:false,contextIsolation:true,sandbox:true}});
  previewRenderer.webContents.on('render-process-gone',()=>{previewCache=null;for(const request of previewRequests.values())request.reject(Error('Moteur d’aperçu interrompu.'));});
  await previewRenderer.loadURL(url+'/armed-preview.html');
  renderTimer=setInterval(()=>{const now=performance.now(),fps=Math.round((frames-lastFrames)*1000/(now-lastStats));lastFrames=frames;lastStats=now;server.updateStatus({render:{fps,frames,width:1920,height:1080,lastPaint:paintTime,lastTick:frameTickTime}});},1000);
  // Keep the app awake during an intentional SDI output. Static frames still repeat in the hardware scheduler.
  const {powerSaveBlocker}=require('electron');let blocker=null;
  healthTimer=setInterval(()=>{output.checkHealth();if(output.running&&blocker===null)blocker=powerSaveBlocker.start('prevent-app-suspension');else if(!output.running&&blocker!==null){powerSaveBlocker.stop(blocker);blocker=null;}},1000);
  const menu=[{label:'graphX',submenu:[{label:'À propos de graphX',click:showLauncher},{label:'Ouvrir le studio',accelerator:'CmdOrCtrl+O',click:control},{type:'separator'},{label:'Masquer',role:'hide'},{type:'separator'},{label:'Quitter graphX',accelerator:'CmdOrCtrl+Q',click:requestQuit}]},{label:'Édition',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]}];Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
  const trayPath=path.join(__dirname,'../web/tray.png');if(fs.existsSync(trayPath)){const icon=nativeImage.createFromPath(trayPath);icon.setTemplateImage(true);tray=new Tray(icon);tray.setToolTip('graphX Engine · contrôle web');tray.setContextMenu(Menu.buildFromTemplate([{label:'Ouvrir graphX Studio',click:control},{label:'État du moteur',click:showLauncher},{type:'separator'},{label:'Quitter graphX',click:requestQuit}]));}
  const hardware=await output.scan();server.updateStatus({hardware});
  if(!process.env.GRAPHX_NO_OPEN){showLauncher();control();}
  if(process.env.GRAPHX_QA){const {runQA}=require('./qa.cjs');await runQA({app,server,renderer,getImage:()=>lastImage,url});quitting=true;app.quit();}
 }).catch(e=>{console.error(e);dialog.showErrorBox('graphX ne peut pas démarrer',e.message);quitting=true;app.exit(1);});
 app.on('before-quit',event=>{
  if(!quitting&&(server?.state.live.length||output?.running)){event.preventDefault();requestQuit();return;}
  if(server){event.preventDefault();quitting=true;const current=server;if(renderer&&!renderer.isDestroyed())renderer.webContents.stopPainting();server=null;clearInterval(renderTimer);clearInterval(healthTimer);(async()=>{await output?.stop();await current.close();app.exit(0);})();}
 });
}
