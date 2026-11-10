'use strict';
function resolveCue(s,target){
 const cues=s.project.cues;let found;
 if(!target||target==='@selected')found=cues.find(c=>c.id===s.selectedId);
 else if(target==='@next')found=cues.find(c=>c.id===s.playback.nextId);
 else if(target==='@last')found=cues.find(c=>c.id===s.playback.lastId);
 else{found=cues.find(c=>c.id===target);if(!found){const matches=cues.filter(c=>c.label===target);if(matches.length>1)throw Error('Plusieurs graphiques portent ce nom : utilise leur identifiant.');found=matches[0];}}
 if(!found)throw Error('Graphique introuvable : '+target);return found;
}
function isLive(s,id){return !!id&&s.live.some(x=>(x.cue.id===id||x.sceneId===id)&&!x.exitingAt);}
function assetId(s,slot){return slot==='last'?s.project.lastAssetId:s.project.assetSlots?.[Number(slot)-1];}
function activeVideo(s,target='@activeVideo'){
 const items=s.live.filter(x=>!x.exitingAt&&x.cue.type==='video');
 return target==='@activeVideo'?items.at(-1):items.find(x=>x.cue.id===resolveCue(s,target).id);
}
function videoRemaining(item,now){
 if(!item)return '—';
 const duration=item.cue.videoDurationMs;
 if(!duration)return '—';
 const elapsed=Math.max(0,(item.videoPausedAt??now)-item.videoStartedAt);
 const remaining=Math.ceil(Math.max(0,duration-(item.cue.videoLoop?elapsed%duration:elapsed))/1000);
 return [Math.floor(remaining/60),remaining%60].map(n=>String(n).padStart(2,'0')).join(':');
}
async function dispatch(s,send,kind,o={},intent={}){
 const targeted=['graphic','text','appearance','score','timer','timerAdjust','updateLive','skip'];const c=targeted.includes(kind)?resolveCue(s,String(o.target||'@selected')):null;
 if(kind==='run'){
  const expected=intent.nextId;if(expected!==undefined&&(s.playback.enabled?s.playback.nextId:s.selectedId)!==expected)throw Error('Le prochain graphique a changé. Vérifie le conducteur.');
  let next=expected??s.playback.nextId;if(!s.playback.enabled){next=s.project.cues.slice(Math.max(0,s.project.cues.findIndex(c=>c.id===s.selectedId))).find(c=>c.type!=='note'&&!c.skip)?.id;if(!next)throw Error('Aucun élément à jouer depuis la sélection.');await send({type:'followMode',enabled:true});}await send({type:'advance',expectedId:next});
 }else if(kind==='asset'){
  const id=assetId(s,o.slot);
  if(intent.assetId!==undefined&&(id??null)!==intent.assetId)throw Error('Le média de cette touche a changé. Vérifie son nom.');
  if(!id)throw Error('Aucun média dans cet emplacement.');
  const operation=o.operation==='toggle'?(isLive(s,id)?'out':'go'):o.operation;
  if(!['go','out','select'].includes(operation))throw Error('Commande média inconnue.');
  await send({type:operation,id});
 }else if(kind==='video'){
  const item=activeVideo(s,o.target);
  if(intent.videoKey!==undefined&&(item?.key??null)!==intent.videoKey)throw Error('La vidéo active a changé.');
  if(!item)throw Error('Aucune vidéo à l’antenne.');
  await send(o.operation==='out'?{type:'outInstance',key:item.key}:{type:'videoTransport',key:item.key,operation:o.operation});
 }else if(kind==='graphic'){
  const op=o.operation||'toggle';if(op==='toggle')await send({type:isLive(s,c.id)?'out':'go',id:c.id});else await send({type:op,id:c.id});
 }else if(kind==='outLast'){if(s.playback.lastId)await send({type:'out',id:s.playback.lastId});}
 else if(kind==='hideAll')await send({type:'outAll'});
 else if(kind==='clear')await send({type:'clear'});
 else if(kind==='navigate'){const i=s.project.cues.findIndex(c=>c.id===s.selectedId),next=s.project.cues[Math.max(0,Math.min(s.project.cues.length-1,i+Number(o.direction)))];if(next)await send({type:'select',id:next.id});}
 else if(kind==='follow')await send({type:'followMode',enabled:o.mode==='toggle'?!s.playback.enabled:o.mode==='on'});
 else if(kind==='arm')await send({type:'arm',id:resolveCue(s,o.target||'@selected').id});
 else if(kind==='clock')await send({type:o.operation==='reset'?'clockReset':'clockToggle'});
 else if(kind==='timer')await send({type:o.operation==='reset'?'timerReset':'timerToggle',id:c.id});
 else if(kind==='timerAdjust')await send({type:'timerAdjust',id:c.id,seconds:Number(o.seconds)});
 else if(kind==='score')await send({type:'scoreAdjust',id:c.id,side:o.side,amount:Number(o.amount)});
 else if(kind==='text'){
  await send({type:'edit',id:c.id,patch:{[o.field]:String(o.value)}});if(o.live)await send({type:'updateLive',id:c.id});
 }else if(kind==='appearance'){
  const patch={};for(const key of ['x','y','scale','opacity','transition','duration'])if(o[key]!==undefined)patch[key]=Number(o[key]);for(const key of ['accent','background','textColor','position','animation'])if(o[key]!==undefined)patch[key]=o[key];
  await send({type:'edit',id:c.id,patch});if(o.live)await send({type:'updateLive',id:c.id});
 }else if(kind==='updateLive')await send({type:'updateLive',id:c.id});
 else if(kind==='groupArm')await send({type:'groupArm',group:String(o.group)});
 else if(kind==='skip')await send({type:'edit',id:c.id,patch:{skip:o.mode==='toggle'?!c.skip:o.mode==='on'}});
 else if(kind==='history')await send({type:o.operation==='redo'?'redo':'undo'});
 else if(kind==='outLayer'){
  if(s.project.layerNames)await send({type:'outLayer',layer:Number(o.layer)});
  else for(const item of s.live)if(item.cue.layer===Number(o.layer)&&!item.exitingAt)await send({type:'out',id:item.cue.id});
 }
 else throw Error('Action inconnue.');
}
function timecode(ms,fps=50){const rate=Math.round(fps),frames=Math.max(0,Math.floor(ms*fps/1000+1e-6)),sec=Math.floor(frames/rate);return [Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60,frames%rate].map(v=>String(v).padStart(2,'0')).join(':');}
function variables(s,now){const cues=s.project.cues,p=s.playback,live=s.live.filter(x=>!x.exitingAt),byId=id=>cues.find(c=>c.id===id),ms=p.clockMs+(p.clockStartedAt===null?0:Math.max(0,now-p.clockStartedAt));const result={connected:1,project:s.project.name,selected:byId(s.selectedId)?.label||'—',next:byId(p.nextId)?.label||'FIN',last:byId(p.lastId)?.label||'—',selected_id:s.selectedId||'',next_id:p.nextId||'',live_count:live.length,live_names:live.map(x=>x.cue.label).join(' / '),clock:timecode(ms,s.project.settings.fps),clock_running:p.clockStartedAt!==null?1:0,follow:p.enabled?1:0,fps:s.project.settings.fps,sdi:s.status.output.running?1:0,selected_ready:s.status.preparation?.[s.selectedId]?.state||'unknown',next_ready:s.status.preparation?.[p.nextId]?.state||'unknown',selected_error:s.status.preparation?.[s.selectedId]?.message||'',next_error:s.status.preparation?.[p.nextId]?.message||'',render_fps:s.status.render?.fps||0,render_age_ms:(s.status.render?.lastTick||s.status.render?.lastPaint)?Math.max(0,Math.round(now-(s.status.render.lastTick||s.status.render.lastPaint))):-1,save_error:s.status.saveError||'',undo_count:s.history?.undo||0,redo_count:s.history?.redo||0};
 const video=activeVideo(s);
 Object.assign(result,{video_name:video?.cue.label||'—',video_remaining:videoRemaining(video,now),video_status:video?(video.videoPausedAt!==null?'PAUSE':video.cue.videoLoop?'BOUCLE':'LECTURE'):'HORS ANTENNE',output_status:s.status.output.error?'ERREUR SDI':s.status.output.running?'SDI ACTIF':s.status.mode==='web'?'APERÇU WEB':'SDI ARRÊTÉ'});
 for(const slot of ['last','1','2','3','4','5','6','7','8']){
  const id=assetId(s,slot),asset=byId(id),phase=s.status.preparation?.[id]?.state;
  result[`asset_${slot}_name`]=asset?.label||'LIBRE';
  result[`asset_${slot}_status`]=asset?(isLive(s,id)?'ON AIR':({ready:'PRÊT',available:'FICHIER OK',loading:'CHARGE',error:'ERREUR'})[phase]||'À PRÉPARER'):'—';
 }
 for(let layer=1;layer<=8;layer++){
  result[`layer_${layer}_name`]=s.project.layerNames?.[layer-1]||'C'+layer;
  result[`layer_${layer}_live`]=live.filter(x=>x.cue.layer===layer).map(x=>x.cue.label).join(' / ')||'LIBRE';
 }
 for(const [i,c]of cues.entries()){const item=live.find(x=>x.cue.id===c.id),remaining=item&&c.type==='timer'?Math.max(0,Math.ceil((item.timerEndAt-(item.timerPausedAt??now))/1000)):c.timerSeconds;
  const values={name:c.label,title:c.title,subtitle:c.subtitle,on_air:isLive(s,c.id)?1:0,group:c.group||'',skip:c.skip?1:0,ready:s.status.preparation?.[c.id]?.state||'unknown',error:s.status.preparation?.[c.id]?.message||'',selected:s.selectedId===c.id?1:0,next:p.nextId===c.id?1:0,layer:c.layer,score_home:c.scoreHome,score_away:c.scoreAway,timer_remaining:remaining,timer_text:[Math.floor(remaining/3600),Math.floor(remaining/60)%60,remaining%60].map(n=>String(n).padStart(2,'0')).join(':'),timecode:c.timecodeMs==null?'—':timecode(c.timecodeMs,s.project.settings.fps)};
  if(c.type==='video')values.video_remaining=videoRemaining(item,now);
  for(const [key,value]of Object.entries(values)){result[`cue_${c.id}_${key}`]=value;result[`slot_${i+1}_${key}`]=value;}
 }
 return result;
}
module.exports={resolveCue,isLive,dispatch,variables,timecode,assetId,activeVideo};
