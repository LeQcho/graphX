'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function runQA({server,renderer,getImage,url}){
 const dir=path.resolve(process.env.GRAPHX_QA_DIR||path.join(__dirname,'../.runtime/qa'));fs.mkdirSync(dir,{recursive:true});
 const checks=[];async function action(a){const r=await fetch(url+'/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(a)});if(!r.ok)throw new Error(await r.text());return r.json();}
 async function settled(){await wait(850);const im=getImage();assert.ok(im,'native frame exists');assert.deepEqual(im.getSize(),{width:1920,height:1080});return im;}
 function pixel(im,x,y){const b=im.toBitmap();return [...b.subarray((y*1920+x)*4,(y*1920+x)*4+4)];}
 await action({type:'clear'});let image=await settled();assert.equal(pixel(image,0,0)[3],0);assert.equal(pixel(image,960,540)[3],0);checks.push('Transparent startup: full HD, alpha zero.');
 await action({type:'go',id:server.state.project.cues[0].id});image=await settled();assert.equal(pixel(image,0,0)[3],0);assert.equal(pixel(image,200,830)[3],255);fs.writeFileSync(path.join(dir,'native-title.png'),image.toPNG());const original=crypto.createHash('sha256').update(image.toPNG()).digest('hex');checks.push('Native animated title settles with correct opaque and transparent pixels.');
 await action({type:'edit',id:server.state.project.cues[0].id,patch:{title:'DRAFT MUST NOT REACH AIR'}});image=await settled();assert.equal(crypto.createHash('sha256').update(image.toPNG()).digest('hex'),original);checks.push('Changing a draft does not change the native program frame.');
 await action({type:'updateLive',id:server.state.project.cues[0].id});image=await settled();assert.notEqual(crypto.createHash('sha256').update(image.toPNG()).digest('hex'),original);checks.push('Explicit live update changes the native frame.');
 await action({type:'clear'});const data=fs.readFileSync(path.join(__dirname,'../examples/Mire-alpha-1080.png')).toString('base64');
 const upload=await (await fetch(url+'/api/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})})).json();const added=await action({type:'add',kind:'image'});await action({type:'edit',id:added.selectedId,patch:{media:upload.name,animation:'cut'}});await action({type:'go',id:added.selectedId});image=await settled();
 const samples=[0,1,2,3,4].map(i=>pixel(image,220+i*340,450));assert.deepEqual(samples.map(x=>x[3]),[0,64,128,192,255]);
 // NativeImage.toBitmap is BGRA premultiplied. This is the contract the native helper expects.
 for(let i=1;i<samples.length;i++){const alpha=samples[i][3];assert.ok(Math.abs(samples[i][2]-alpha)<=1,JSON.stringify(samples));assert.ok(Math.abs(samples[i][1]-alpha*128/255)<=1);assert.ok(Math.abs(samples[i][0]-alpha*64/255)<=1);}
 fs.writeFileSync(path.join(dir,'native-alpha-ramp.png'),image.toPNG());fs.writeFileSync(path.join(dir,'native-alpha-ramp.bgra'),image.toBitmap());checks.push('PNG alpha 0/64/128/192/255 preserved exactly; raw BGRA premultiplication verified.');
 for(const type of ['lowerthird','title','logo','ticker','timer','score','fullscreen']){await action({type:'clear'});const id=server.state.project.cues.find(c=>c.type===type).id;await action({type:'go',id});image=await settled();fs.writeFileSync(path.join(dir,`template-${type}.png`),image.toPNG());}checks.push('All seven built-in template types rendered in the native full-HD window.');
 await action({type:'clear'});for(const type of ['lowerthird','logo','ticker','score'])await action({type:'go',id:server.state.project.cues.find(c=>c.type===type).id});await wait(3000);const render={...server.status.render};image=await settled();fs.writeFileSync(path.join(dir,'native-multilayer.png'),image.toPNG());assert.equal(server.state.live.length,4);checks.push('Four independent active layers render together.');
 await action({type:'clear'});image=await settled();const bytes=image.toBitmap();for(let i=3;i<bytes.length;i+=4)assert.equal(bytes[i],0);checks.push('Emergency clear returns all 2,073,600 pixels to alpha zero.');
 const report={date:new Date().toISOString(),result:'PASS',checks,samplesBGRA:samples,renderUnderFourLayers:render,hardware:server.status.hardware,limits:['No SDI device connected: physical key/fill, genlock, driver scheduling and end-to-end latency not verified.']};fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify(report,null,2));console.log('GRAPHX_QA '+JSON.stringify(report));
}
module.exports={runQA};
