'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('graphXNative',{
 frameTick:()=>ipcRenderer.send('graphx:tick'),
 onPrepare:handler=>ipcRenderer.on('graphx:prepare',async(_event,request)=>{
  try{ipcRenderer.send('graphx:prepared',{id:request.id,results:await handler(request.cues)});}
  catch(error){ipcRenderer.send('graphx:prepared',{id:request.id,error:String(error.message||error)});}
 })
});
