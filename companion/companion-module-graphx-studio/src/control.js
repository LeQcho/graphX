'use strict';
function resolveCue(s,target){
 const cues=s.project.cues;let found;
 if(!target||target==='@selected')found=cues.find(c=>c.id===s.selectedId);
 else if(target==='@next')found=cues.find(c=>c.id===s.playback.nextId);
 else if(target==='@last')found=cues.find(c=>c.id===s.playback.lastId);
 else{found=cues.find(c=>c.id===target);if(!found){const matches=cues.filter(c=>c.label===target);if(matches.length>1)throw Error('Plusieurs graphiques portent ce nom : utilise leur identifiant.');found=matches[0];}}
 if(!found)throw Error('Graphique introuvable : '+target);return found;
}
function isLive(s,id){return s.live.some(x=>x.cue.id===id&&!x.exitingAt);}
async function dispatch(s,send,kind,o={},intent={}){
 const targeted=['graphic','text','appearance','score','timer','timerAdjust','updateLive'];const c=targeted.includes(kind)?resolveCue(s,String(o.target||'@selected')):null;
 if(kind==='run'){
  const expected=intent.nextId;if(expected!==undefined&&(s.playback.enabled?s.playback.nextId:s.selectedId)!==expected)throw Error('Le prochain graphique a changé. Vérifie le conducteur.');
  if(!s.playback.enabled)await send({type:'followMode',enabled:true});await send({type:'advance',expectedId:expected??s.playback.nextId});
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
 else if(kind==='outLayer'){for(const item of s.live)if(item.cue.layer===Number(o.layer)&&!item.exitingAt)await send({type:'out',id:item.cue.id});}
 else throw Error('Action inconnue.');
}
function timecode(ms,fps=50){const rate=Math.round(fps),frames=Math.max(0,Math.floor(ms*fps/1000+1e-6)),sec=Math.floor(frames/rate);return [Math.floor(sec/3600),Math.floor(sec/60)%60,sec%60,frames%rate].map(v=>String(v).padStart(2,'0')).join(':');}
function variables(s,now){const cues=s.project.cues,p=s.playback,live=s.live.filter(x=>!x.exitingAt),byId=id=>cues.find(c=>c.id===id),ms=p.clockMs+(p.clockStartedAt===null?0:Math.max(0,now-p.clockStartedAt));const result={connected:1,project:s.project.name,selected:byId(s.selectedId)?.label||'—',next:byId(p.nextId)?.label||'FIN',last:byId(p.lastId)?.label||'—',selected_id:s.selectedId||'',next_id:p.nextId||'',live_count:live.length,live_names:live.map(x=>x.cue.label).join(' / '),clock:timecode(ms,s.project.settings.fps),clock_running:p.clockStartedAt!==null?1:0,follow:p.enabled?1:0,fps:s.project.settings.fps,sdi:s.status.output.running?1:0};
 for(const [i,c]of cues.entries()){const item=live.find(x=>x.cue.id===c.id),remaining=item&&c.type==='timer'?Math.max(0,Math.ceil((item.timerEndAt-(item.timerPausedAt??now))/1000)):c.timerSeconds;
  const values={name:c.label,title:c.title,subtitle:c.subtitle,on_air:item?1:0,selected:s.selectedId===c.id?1:0,next:p.nextId===c.id?1:0,layer:c.layer,score_home:c.scoreHome,score_away:c.scoreAway,timer_remaining:remaining,timer_text:[Math.floor(remaining/3600),Math.floor(remaining/60)%60,remaining%60].map(n=>String(n).padStart(2,'0')).join(':'),timecode:c.timecodeMs==null?'—':timecode(c.timecodeMs,s.project.settings.fps)};
  for(const [key,value]of Object.entries(values)){result[`cue_${c.id}_${key}`]=value;result[`slot_${i+1}_${key}`]=value;}
 }
 return result;
}
module.exports={resolveCue,isLive,dispatch,variables,timecode};
