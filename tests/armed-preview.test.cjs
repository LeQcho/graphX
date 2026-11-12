const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createState,act}=require('../app/model.cjs');const {armedPreview}=require('../app/armed-preview.cjs');const {createServer}=require('../app/server.cjs');
test('preview follows actual first GO, then the armed cue independently of selection',()=>{
 const s=createState();s.project.cues[0].skip=true;
 const first=armedPreview(s);assert.equal(first.id,s.project.cues[1].id);
 act(s,{type:'followMode',enabled:true},0);const next=armedPreview(s);
 act(s,{type:'select',id:s.project.cues[3].id},0);assert.equal(armedPreview(s).id,next.id);
 const before=armedPreview(s);s.project.cues.find(c=>c.id===before.id).title='Changed';assert.notEqual(armedPreview(s).key,before.key);
 s.playback.nextId=null;assert.equal(armedPreview(s),null);
});
test('scene thumbnail contains every member and changes when a member changes',()=>{
 const s=createState();act(s,{type:'add',kind:'scene'},0);const scene=s.project.cues.find(c=>c.id===s.selectedId);
 scene.sceneCueIds=s.project.cues.filter(c=>c.type!=='scene').slice(0,2).map(c=>c.id);
 const p=armedPreview(s);assert.equal(p.id,scene.id);assert.equal(p.cues.length,2);
 s.project.cues[0].title='Member edited';assert.notEqual(armedPreview(s).key,p.key);
});
test('preview endpoint rejects stale frames and never changes program, transport or output',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'graphx-preview-'));let release;
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
 let capture=async()=>png;const server=createServer({dataDir:dir,onArmedPreview:p=>capture(p)});const url=await server.listen();
 try{
  const before=structuredClone(server.state),token=server.snapshot().transportToken,key=server.snapshot().armedPreview.key;
  const r=await fetch(url+'/api/armed-preview.png?key='+key);assert.equal(r.status,200);assert.equal(r.headers.get('X-GraphX-Preview-Key'),key);assert.deepEqual(Buffer.from(await r.arrayBuffer()),png);
  assert.deepEqual(server.state,before);assert.equal(server.snapshot().transportToken,token);assert.equal(server.status.output.running,false);
  assert.equal((await fetch(url+'/api/armed-preview.png?key=old')).status,409);
  let started;const waiting=new Promise(resolve=>started=resolve);capture=()=>{started();return new Promise(resolve=>release=resolve);};
  const pending=fetch(url+'/api/armed-preview.png?key='+key);await waiting;
  server.state.project.cues[0].title='Changed during render';release(png);assert.equal((await pending).status,409);
  server.state.playback.enabled=true;server.state.playback.nextId=null;assert.equal((await fetch(url+'/api/armed-preview.png')).status,204);
 }finally{release?.(png);await server.close();fs.rmSync(dir,{recursive:true,force:true});}
});
