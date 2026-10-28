'use strict';
const {app,BrowserWindow,Menu,Tray,nativeImage,shell,dialog}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {createServer}=require('./server.cjs');const {NativeOutput}=require('./native.cjs');
app.setName('graphX');if(process.env.GRAPHX_DATA_DIR)app.setPath('userData',path.resolve(process.env.GRAPHX_DATA_DIR));
app.commandLine.appendSwitch('force-device-scale-factor','1');app.commandLine.appendSwitch('force-color-profile','srgb');app.commandLine.appendSwitch('disable-renderer-backgrounding');
if(!app.requestSingleInstanceLock()){app.quit();}else{
 let server,output,renderer,launcher,tray,url,lastImage,quitting=false,frames=0,lastFrames=0,lastStats=Date.now(),renderTimer,healthTimer,paintTime=0;
 function control(){if(url)shell.openExternal(url);}
 function showLauncher(){if(launcher&&!launcher.isDestroyed()){launcher.show();launcher.focus();return;}launcher=new BrowserWindow({width:440,height:535,resizable:false,title:'graphX Engine',backgroundColor:'#111b16',autoHideMenuBar:true,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});launcher.loadURL(url+'/engine.html');launcher.webContents.setWindowOpenHandler(({url:target})=>{if(target.startsWith(url+'/')||target===url)shell.openExternal(target);return {action:'deny'};});launcher.on('close',e=>{if(!quitting){e.preventDefault();launcher.hide();}});}
 function requestQuit(){if(!server)return app.quit();if((server.state.live.length||server.status.output.running)&&!process.env.GRAPHX_QA){const choice=dialog.showMessageBoxSync({type:'warning',buttons:['Continuer le direct','Quitter graphX'],defaultId:0,cancelId:0,title:'Arrêter le moteur ?',message:'Quitter graphX arrêtera le rendu et la sortie vidéo.',detail:'Fermer le navigateur conserve le direct. Quitter le moteur l’arrête.'});if(choice===0)return;}quitting=true;app.quit();}
 app.on('second-instance',()=>{showLauncher();control();});app.on('activate',()=>{if(url)showLauncher();});app.on('window-all-closed',()=>{});
 app.whenReady().then(async()=>{
  const dataDir=app.getPath('userData');const binary=app.isPackaged?path.join(process.resourcesPath,'bin/graphx-output'):path.join(__dirname,'../build/graphx-output');
  output=new NativeOutput(binary,s=>server?.updateStatus({output:s}));
  server=createServer({dataDir,mode:'native',onScan:()=>output.scan(),onFrame:()=>lastImage?.toPNG()||null,onOutput:async(action,settings)=>{if(action==='stop')await output.stop();else{renderer.webContents.setFrameRate(Math.round(settings.fps));output.start(settings);}},onChange:s=>{if(renderer&&!renderer.isDestroyed())renderer.webContents.setFrameRate(Math.round(s.project.settings.fps));}});
  try{url=await server.listen(Number(process.env.GRAPHX_PORT)||4318);}catch(e){if(e.code==='EADDRINUSE')url=await server.listen(0);else throw e;}
  console.log('graphX Engine: '+url);if(process.env.GRAPHX_URL_FILE)fs.writeFileSync(process.env.GRAPHX_URL_FILE,url);
  renderer=new BrowserWindow({width:1920,height:1080,useContentSize:true,show:false,frame:false,transparent:true,backgroundColor:'#00000000',webPreferences:{offscreen:true,backgroundThrottling:false,nodeIntegration:false,contextIsolation:true,sandbox:true,zoomFactor:1}});
  renderer.webContents.setFrameRate(Math.round(server.state.project.settings.fps));
  renderer.webContents.on('paint',(event,dirty,image)=>{
   const size=image.getSize();if(size.width!==1920||size.height!==1080){server.updateStatus({render:{fps:0,error:`Taille de rendu incorrecte : ${size.width} × ${size.height}`}});return;}
   lastImage=image;paintTime=Date.now();frames++;if(output.running)output.frame(image.toBitmap());
  });
  renderer.webContents.on('render-process-gone',(_,details)=>{server.updateStatus({render:{fps:0,error:'Rendu interrompu : '+details.reason}});output.stop();});
  renderer.webContents.on('did-fail-load',(_,code,description)=>server.updateStatus({render:{fps:0,error:description}}));
  await renderer.loadURL(url+'/program.html?native=1');renderer.webContents.startPainting();
  renderTimer=setInterval(()=>{const now=Date.now(),fps=Math.round((frames-lastFrames)*1000/(now-lastStats));lastFrames=frames;lastStats=now;server.updateStatus({render:{fps,frames,width:1920,height:1080,lastPaint:paintTime}});},1000);
  // Keep the app awake during an intentional SDI output. Static frames still repeat in the hardware scheduler.
  const {powerSaveBlocker}=require('electron');let blocker=null;
  healthTimer=setInterval(()=>{if(output.running&&blocker===null)blocker=powerSaveBlocker.start('prevent-app-suspension');else if(!output.running&&blocker!==null){powerSaveBlocker.stop(blocker);blocker=null;}},1000);
  const menu=[{label:'graphX',submenu:[{label:'À propos de graphX',click:showLauncher},{label:'Ouvrir le studio',accelerator:'CmdOrCtrl+O',click:control},{type:'separator'},{label:'Masquer',role:'hide'},{type:'separator'},{label:'Quitter graphX',accelerator:'CmdOrCtrl+Q',click:requestQuit}]},{label:'Édition',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]}];Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
  const trayPath=path.join(__dirname,'../web/tray.png');if(fs.existsSync(trayPath)){const icon=nativeImage.createFromPath(trayPath);icon.setTemplateImage(true);tray=new Tray(icon);tray.setToolTip('graphX Engine · contrôle web');tray.setContextMenu(Menu.buildFromTemplate([{label:'Ouvrir graphX Studio',click:control},{label:'État du moteur',click:showLauncher},{type:'separator'},{label:'Quitter graphX',click:requestQuit}]));}
  const hardware=await output.scan();server.updateStatus({hardware});
  if(!process.env.GRAPHX_NO_OPEN){showLauncher();control();}
  if(process.env.GRAPHX_QA){const {runQA}=require('./qa.cjs');await runQA({app,server,renderer,getImage:()=>lastImage,url});quitting=true;app.quit();}
 }).catch(e=>{console.error(e);dialog.showErrorBox('graphX ne peut pas démarrer',e.message);quitting=true;app.exit(1);});
 app.on('before-quit',event=>{
  if(!quitting&&(server?.state.live.length||output?.running)){event.preventDefault();requestQuit();return;}
  if(server){event.preventDefault();quitting=true;const current=server;server=null;clearInterval(renderTimer);clearInterval(healthTimer);(async()=>{await output?.stop();await current.close();app.exit(0);})();}
 });
}
