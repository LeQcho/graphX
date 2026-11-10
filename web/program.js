import {render,preloadCues,prepareCues,protectCues} from './render.js';
const canvas=document.querySelector('canvas'),params=new URLSearchParams(location.search);let live=[],clockBase=0,clockAt=0,ready=false,lastMessageAt=0;const mode=params.get('mode');
const now=()=>clockBase+performance.now()-clockAt;
function update(state){
 live=state.live;clockBase=state.serverTime;clockAt=performance.now();
 const active=live.map(i=>i.cue),cues=state.project.cues;
 protectCues(active);
 const upcoming=cues.filter(c=>c.id===state.selectedId||c.id===state.playback.nextId).flatMap(c=>c.type==='scene'?cues.filter(x=>c.sceneCueIds.includes(x.id)):[c]);
 preloadCues([...active.filter(c=>c.type!=='video'),...upcoming.filter(c=>c.type==='video')]);
 ready=true;lastMessageAt=performance.now();
}
window.graphXNative?.onPrepare(cues=>prepareCues(cues));
function connect(){
 const events=new EventSource('/api/events?heartbeat=1');
 events.onmessage=e=>update(JSON.parse(e.data));
 events.addEventListener('heartbeat',()=>{lastMessageAt=performance.now();});
 return events;
}
let events=connect(),lastTick=0;
function frame(time){
 if(ready&&time-lastMessageAt>5000){
  ready=false;live=[];protectCues([]);
  render(canvas,[],now(),{key:mode==='key',fill:mode==='fill'});
  events.close();events=connect();
 }
 if(ready)render(canvas,live,now(),{key:mode==='key',fill:mode==='fill'});
 if(ready&&time-lastTick>250){lastTick=time;window.graphXNative?.frameTick();}
 requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
