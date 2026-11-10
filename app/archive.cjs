'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');

const {validateProject}=require('./model.cjs');
const {IMAGE_NAME,VIDEO_NAME,MAX_VIDEO,isWebM}=require('./media.cjs');
const MAGIC=Buffer.from('GRAPHX2\n'),MAX_ARCHIVE=2*1024*1024*1024,MAX_IMAGE=25*1024*1024;
const mediaLimit=name=>VIDEO_NAME.test(name)?MAX_VIDEO:MAX_IMAGE;
async function manifest(project,dir){
 const media=[];for(const name of new Set(project.cues.map(c=>c.media).filter(Boolean))){const stat=await fs.promises.stat(path.join(dir,'media',name));if(!stat.isFile()||stat.size>mediaLimit(name))throw Error('Média invalide : '+name);media.push({name,bytes:stat.size});}
 const json=Buffer.from(JSON.stringify({project,media}));if(json.length>2*1024*1024||json.length+12+media.reduce((n,m)=>n+m.bytes,0)>MAX_ARCHIVE)throw Error('Archive limitée à 2 Gio. Réduis la taille des médias.');
 return {media,json};
}
async function exportArchive(res,project,dir){
 const {media,json}=await manifest(project,dir),length=Buffer.alloc(4);length.writeUInt32BE(json.length);
 res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="graphX-project.graphx"','Cache-Control':'no-store'});
 async function write(data){if(res.destroyed)throw Error('Export interrompu.');if(!res.write(data))await new Promise((resolve,reject)=>{const clean=()=>{res.off('drain',drain);res.off('close',close);res.off('error',error);},drain=()=>{clean();resolve();},close=()=>{clean();reject(Error('Export interrompu.'));},error=e=>{clean();reject(e);};res.once('drain',drain);res.once('close',close);res.once('error',error);});}
 await write(MAGIC);await write(length);await write(json);
 for(const m of media)for await(const chunk of fs.createReadStream(path.join(dir,'media',m.name)))await write(chunk);
 res.end();
}
async function importArchive(stream,dir){
 const iterator=stream[Symbol.asyncIterator]();let pending=Buffer.alloc(0),total=0;
 async function read(n){const chunks=[];let remaining=n;while(remaining){if(!pending.length){const item=await iterator.next();if(item.done)throw Error('Archive tronquée.');pending=Buffer.from(item.value);total+=pending.length;if(total>MAX_ARCHIVE)throw Error('Archive limitée à 2 Gio.');}const take=Math.min(remaining,pending.length);chunks.push(pending.subarray(0,take));pending=pending.subarray(take);remaining-=take;}return Buffer.concat(chunks,n);}
 if(!(await read(MAGIC.length)).equals(MAGIC))throw Error('Ce fichier n’est pas une archive graphX 2.');
 const length=(await read(4)).readUInt32BE();if(length>2*1024*1024||!length)throw Error('Manifeste invalide.');
 const data=JSON.parse((await read(length)).toString()),project=validateProject(data.project);
 if(!Array.isArray(data.media)||data.media.length>250)throw Error('Liste des médias invalide.');
 const expected=new Set(project.cues.map(c=>c.media).filter(Boolean)),seen=new Set();let size=length+12;
 for(const m of data.media){if((!IMAGE_NAME.test(m.name)&&!VIDEO_NAME.test(m.name))||!expected.has(m.name)||seen.has(m.name)||!Number.isInteger(m.bytes)||m.bytes<1||m.bytes>mediaLimit(m.name))throw Error('Média d’archive invalide.');seen.add(m.name);size+=m.bytes;}
 if(size>MAX_ARCHIVE||seen.size!==expected.size)throw Error('Archive incomplète ou trop volumineuse.');
 const stage=await fs.promises.mkdtemp(path.join(dir,'import-'));
 try{
  for(const m of data.media){
   if(VIDEO_NAME.test(m.name)){
    const file=await fs.promises.open(path.join(stage,m.name),'wx'),hash=crypto.createHash('sha256');
    try{
     for(let remaining=m.bytes;remaining;){
      const bytes=await read(Math.min(remaining,64*1024));
      if(remaining===m.bytes&&!isWebM(bytes))throw Error('Format de vidéo invalide.');
      hash.update(bytes);await file.writeFile(bytes);remaining-=bytes.length;
     }
     if(m.name!==hash.digest('hex')+'.webm')throw Error('Média corrompu : '+m.name);
    }finally{await file.close();}
    continue;
   }
   const bytes=await read(m.bytes),hash=crypto.createHash('sha256').update(bytes).digest('hex');if(!m.name.startsWith(hash+'.'))throw Error('Média corrompu : '+m.name);const type=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))?'png':bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'jpg':bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'?'webp':null;if(!type||!m.name.endsWith('.'+type))throw Error('Format de média invalide.');if(type==='png'&&(bytes.length<24||bytes.readUInt32BE(16)>8192||bytes.readUInt32BE(20)>8192||bytes.readUInt32BE(16)*bytes.readUInt32BE(20)>33554432))throw Error('PNG trop grand ou invalide.');await fs.promises.writeFile(path.join(stage,m.name),bytes);}
  if(pending.length||!(await iterator.next()).done)throw Error('Données inattendues après l’archive.');
  for(const m of data.media)await fs.promises.rename(path.join(stage,m.name),path.join(dir,'media',m.name));
  return project;
 }finally{await fs.promises.rm(stage,{recursive:true,force:true});}
}
module.exports={exportArchive,importArchive,manifest,MAGIC,MAX_ARCHIVE};
