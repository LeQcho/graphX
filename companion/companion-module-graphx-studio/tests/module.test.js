'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const {createState,act}=require('../../../app/model.cjs');const {createServer}=require('../../../app/server.cjs');
const {dispatch,resolveCue,variables}=require('../src/control');const {GraphXClient}=require('../src/client');const {definitions}=require('../src/definitions');
function fixture(){const s=createState();s.status={output:{running:false}};return {s,send:async a=>act(s,a,1000)};}
function waitState(client,predicate,timeout=5000){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{client.off('state',handler);reject(Error('State timeout'));},timeout);function handler(s){if(predicate(s)){clearTimeout(timer);client.off('state',handler);resolve(s);}}client.on('state',handler);});}
test('RUN arms selected on first press, follows order and rejects a stale expected cue',async()=>{const {s,send}=fixture();await dispatch(s,send,'run',{}, {nextId:s.selectedId});assert.equal(s.live.length,1);assert.equal(s.playback.nextId,s.project.cues[1].id);await assert.rejects(dispatch(s,send,'run',{}, {nextId:s.project.cues[0].id}));assert.equal(s.live.length,1);});
test('graphic toggle targets stable ID after reorder, leaves the next cue alone',async()=>{const {s,send}=fixture(),id=s.project.cues[3].id,next=s.playback.nextId;await send({type:'reorder',id,beforeId:s.project.cues[0].id});await dispatch(s,send,'graphic',{target:id,operation:'toggle'});assert.equal(s.live[0].cue.id,id);assert.equal(s.playback.nextId,next);await dispatch(s,send,'graphic',{target:id,operation:'toggle'});assert.equal(s.live[0].exitingAt,1000);});
test('duplicate names and removed IDs fail instead of playing a different graphic',()=>{const {s}=fixture();s.project.cues[1].label=s.project.cues[0].label;assert.throws(()=>resolveCue(s,s.project.cues[0].label),/Plusieurs/);assert.throws(()=>resolveCue(s,'deleted-id'),/introuvable/);assert.equal(resolveCue(s,s.project.cues[0].id).id,s.project.cues[0].id);});
test('content edits remain in preview unless live update explicitly requested',async()=>{const {s,send}=fixture();await send({type:'go'});await dispatch(s,send,'text',{target:'@selected',field:'title',value:'Draft',live:false});assert.notEqual(s.live[0].cue.title,'Draft');await dispatch(s,send,'text',{target:'@selected',field:'title',value:'On air',live:true});assert.equal(s.live[0].cue.title,'On air');});
test('per-layer OUT leaves other layers active',async()=>{const {s,send}=fixture();await send({type:'go'});await send({type:'go',id:s.project.cues[2].id});await dispatch(s,send,'outLayer',{layer:3});assert.equal(s.live.find(x=>x.cue.layer===3).exitingAt,1000);assert.equal(s.live.find(x=>x.cue.layer===6).exitingAt,null);});
test('timer variables hold on pause and score actions update on-air and prepared values',async()=>{const {s,send}=fixture(),timer=s.project.cues.find(c=>c.type==='timer'),score=s.project.cues.find(c=>c.type==='score');await send({type:'go',id:timer.id});await send({type:'timerToggle',id:timer.id});assert.equal(variables(s,90000)[`cue_${timer.id}_timer_remaining`],300);await dispatch(s,send,'score',{target:score.id,side:'home',amount:1});assert.equal(score.scoreHome,3);});
test('all API 2 presets refer to defined actions, feedbacks and variables',()=>{const {s}=fixture();let stored;const mock={label:'graphx',client:{state:s,online:true},setActionDefinitions(){},setFeedbackDefinitions(){},setPresetDefinitions(structure,presets){stored={structure,presets};},setVariableDefinitions(v){this.vars=v;}};const result=definitions(mock);assert.equal(Object.keys(result.actions).length,24);assert.ok(stored.structure.length>=6);for(const preset of Object.values(stored.presets)){assert.equal(preset.type,'simple');for(const step of preset.steps)for(const a of step.down)assert.ok(result.actions[a.actionId],a.actionId);for(const f of preset.feedbacks)assert.ok(result.feedbacks[f.feedbackId],f.feedbackId);for(const match of preset.style.text.matchAll(/\$\(graphx:([^)]*)\)/g))assert.ok(mock.vars[match[1]],match[1]);}assert.equal(stored.structure[0].definitions.length,15);});
test('real SSE follows live changes, rejects offline commands and reconnects without replay',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'graphx-companion-'));let server=createServer({dataDir:dir}),client;
 try{const url=await server.listen(),port=Number(new URL(url).port);client=new GraphXClient({port});const initial=waitState(client,()=>true);client.start();await initial;
 await client.execute((s,send)=>dispatch(s,send,'run',{}, {nextId:s.selectedId}));assert.equal(server.state.live.length,1);
 const offline=new Promise(resolve=>client.once('status',resolve));await server.close();await offline;await assert.rejects(client.execute(()=>{}),/déconnecté/);
 server=createServer({dataDir:dir});const reconnected=waitState(client,()=>true);await server.listen(port);await reconnected;assert.equal(server.state.live.length,0);
 }finally{client?.stop();await server.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('a lost mutation response is never retried automatically',async()=>{
 let mutations=0;const {s}=fixture();s.serverTime=Date.now();const api=http.createServer((req,res)=>{if(req.url==='/api/action'){mutations++;req.resume();req.on('end',()=>res.destroy());}else{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(s));}});
 await new Promise(r=>api.listen(0,'127.0.0.1',r));const client=new GraphXClient({port:api.address().port});client.stopped=false;client.online=true;
 try{await assert.rejects(client.execute((state,send)=>send({type:'go'})));assert.equal(mutations,1);}finally{client.stop();await new Promise(r=>api.close(r));}
});
test('scene toggle, group arm and skip expose the same state as Studio',async()=>{const {s,send}=fixture();await send({type:'add',kind:'scene'});const scene=s.project.cues.find(c=>c.id===s.selectedId);await send({type:'edit',id:scene.id,patch:{group:'Opening',sceneCueIds:[s.project.cues[0].id,s.project.cues.find(c=>c.type==='logo').id]}});await dispatch(s,send,'groupArm',{group:'Opening'});assert.equal(s.playback.nextId,scene.id);await dispatch(s,send,'graphic',{target:scene.id,operation:'toggle'});s.status.preparation={[scene.id]:{state:'ready'}};const values=variables(s,1200);assert.equal(values[`cue_${scene.id}_on_air`],1);assert.equal(values[`cue_${scene.id}_ready`],'ready');assert.equal(values[`cue_${scene.id}_group`],'Opening');await dispatch(s,send,'graphic',{target:scene.id,operation:'toggle'});assert.ok(s.live.every(x=>x.exitingAt));await dispatch(s,send,'skip',{target:scene.id,mode:'on'});assert.equal(variables(s,1300)[`cue_${scene.id}_skip`],1);});
test('new presets retain existing action IDs and expose loading/error feedback for scenes',()=>{const {s}=fixture();act(s,{type:'add',kind:'scene'});act(s,{type:'edit',patch:{group:'Opening'}});const scene=s.project.cues.find(c=>c.id===s.selectedId);s.status.preparation={[scene.id]:{state:'error',message:'Missing asset'}};const mock={label:'graphx',client:{state:s,online:true,now:()=>1000},setActionDefinitions(){},setFeedbackDefinitions(){},setPresetDefinitions(){},setVariableDefinitions(){}};const {actions,feedbacks,presets}=definitions(mock);for(const id of ['run','graphic','outLast','hideAll','clear','navigate','follow','arm','clock','timer','timerAdjust','score','text','transform','position','theme','animation','updateLive','outLayer'])assert.ok(actions[id]);assert.ok(presets['scene_'+scene.id]);assert.ok(Object.keys(presets).some(k=>k.startsWith('group_')));assert.equal(feedbacks.preparation.callback({options:{target:scene.id,state:'error'}}),true);assert.equal(variables(s,1000).selected_error,'Missing asset');});
test('first RUN from a skipped selection plays the next eligible cue in one press',async()=>{const {s,send}=fixture();s.project.cues[0].skip=true;s.project.cues[1].type='note';await dispatch(s,send,'run',{}, {nextId:s.selectedId});assert.equal(s.live[0].cue.id,s.project.cues[2].id);});
test('static native image stays healthy while render heartbeat advances',()=>{const {s}=fixture();s.status.mode='native';s.status.render={fps:0,lastPaint:100,lastTick:9500};const mock={label:'graphx',client:{state:s,online:true,now:()=>10000},setActionDefinitions(){},setFeedbackDefinitions(){},setPresetDefinitions(){},setVariableDefinitions(){}};const {feedbacks}=definitions(mock);assert.equal(feedbacks.renderStale.callback({options:{}}),false);assert.equal(variables(s,10000).render_age_ms,500);s.status.render.lastTick=7000;assert.equal(feedbacks.renderStale.callback({options:{}}),true);});

test('dynamic media pads keep the press target and video controls track the live instance',async()=>{
 const {s,send}=fixture();
 const video={type:'video',media:'a'.repeat(64)+'.webm',videoDurationMs:4100,label:'Stinger'};
 await send({type:'importAssets',staged:true,cues:[video]});
 const id=s.project.lastAssetId;
 assert.equal(variables(s,1000).asset_1_name,'Stinger');
 await dispatch(s,send,'asset',{slot:'1',operation:'go'},{assetId:id});
 assert.equal(variables(s,2200).video_remaining,'00:03');
 const key=s.live[0].key;
 await dispatch(s,send,'video',{target:'@activeVideo',operation:'toggle'},{videoKey:key});
 assert.equal(variables(s,9000).video_status,'PAUSE');
 await dispatch(s,send,'video',{target:'@activeVideo',operation:'out'},{videoKey:key});
 await send({type:'importAssets',staged:true,cues:[{...video,label:'Nouveau clip'}]});
 await assert.rejects(dispatch(s,send,'asset',{slot:'last',operation:'go'},{assetId:id}),/a changé/);
 assert.equal(variables(s,9000).asset_3_status,'—');
});

test('Companion can clear during an in-flight take',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'graphx-companion-panic-'));
 let release,started;
 const gate=new Promise(resolve=>{release=resolve;}),waiting=new Promise(resolve=>{started=resolve;});
 const server=createServer({dataDir:dir,mode:'native',async onPrepare(cues,signal){
  if(signal){started();await gate;}
  return cues.map(c=>({id:c.id,state:'ready'}));
 }});
 let client;
 try{
  const url=await server.listen();client=new GraphXClient({port:Number(new URL(url).port)});
  const initial=waitState(client,()=>true);client.start();await initial;
  const pending=client.execute((s,send)=>send({type:'go',id:s.selectedId}));
  await waiting;
  assert.equal((await client.clear()).ok,true);
  await assert.rejects(pending,/retrait d’urgence/);
  assert.equal(server.state.live.length,0);
 }finally{release();client?.stop();await server.close();fs.rmSync(dir,{recursive:true,force:true});}
});
