'use strict';
const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('graphXNative',{
 onPreview:handler=>ipcRenderer.on('graphx:preview',async(_event,request)=>{
  try{ipcRenderer.send('graphx:previewed',{id:request.id,png:await handler(request.preview)});}
  catch(error){ipcRenderer.send('graphx:previewed',{id:request.id,error:String(error.message||error)});}
 }),
 frameTick:()=>ipcRenderer.send('graphx:tick'),
 onPrepare:handler=>ipcRenderer.on('graphx:prepare',async(_event,request)=>{
  try{ipcRenderer.send('graphx:prepared',{id:request.id,results:await handler(request.cues)});}
  catch(error){ipcRenderer.send('graphx:prepared',{id:request.id,error:String(error.message||error)});}
 })
});
