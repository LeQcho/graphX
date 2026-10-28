import {render,preloadCues} from './render.js';
const canvas=document.querySelector('canvas'),params=new URLSearchParams(location.search);let live=[],offset=0,ready=false;const mode=params.get('mode');
function update(state){live=state.live;offset=state.serverTime-Date.now();preloadCues(state.project.cues);ready=true;}
const events=new EventSource('/api/events');events.onmessage=e=>update(JSON.parse(e.data));
let last=0;function frame(time){if(ready){render(canvas,live,Date.now()+offset,{key:mode==='key',fill:mode==='fill'});last=time;}requestAnimationFrame(frame);}requestAnimationFrame(frame);
