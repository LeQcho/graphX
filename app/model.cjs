'use strict';
const { randomUUID } = require('node:crypto');
const { IMAGE_NAME, VIDEO_NAME, MAX_VIDEO_MS } = require('./media.cjs');
const TYPES = ['lowerthird', 'title', 'ticker', 'logo', 'timer', 'score', 'fullscreen', 'image', 'video', 'scene', 'note'];
const FPS = [25, 30, 50, 59.94, 60];
const DEFAULTS = {scene:['Scène',''],note:['Note régie',''],image: ['Habillage PNG',''], video: ['Vidéo',''], lowerthird: ['Alex Morgan','Direction de production'], title: ['Les idées prennent vie.','RENCONTRES • ÉDITION 2026'], ticker: ['Bienvenue en direct • Retrouvez toutes les informations sur notre site • Merci de votre présence',''], logo: ['graphX','LIVE GRAPHICS'], timer: ['On se retrouve dans',''], score: ['HOME','AWAY'], fullscreen: ['À tout de suite.','Le direct reprend dans quelques instants.']};
function cue(type='lowerthird', overrides={}) {
  if (!TYPES.includes(type)) throw new Error('Type de graphique inconnu.');
  return {id:randomUUID(),type,label:({scene:'Scène multicouche',note:'Note régie',image:'Habillage PNG',video:'Vidéo',lowerthird:'Titre intervenant',title:'Titre de chapitre',ticker:'Bandeau défilant',logo:'Logo / signature',timer:'Compte à rebours',score:'Tableau de score',fullscreen:'Plein écran'})[type],title:DEFAULTS[type][0],subtitle:DEFAULTS[type][1],accent:'#ff704d',background:'#142328',textColor:'#ffffff',layer:({scene:1,note:1,image:3,video:1,lowerthird:3,title:2,ticker:5,logo:6,timer:2,score:4,fullscreen:1})[type],position:type==='logo'?'top-right':['image','video'].includes(type)?'center':'bottom-left',animation:type==='video'?'cut':'slide',transition:500,duration:0,timerSeconds:300,scoreHome:0,scoreAway:0,opacity:1,scale:1,x:0,y:0,timecodeMs:null,media:'',group:'',notes:'',skip:false,favorite:false,sceneCueIds:[],...(type==='video'?{videoDurationMs:0,videoLoop:false}:{}),...overrides};
}
function createProject() {
  return {schema:1,id:randomUUID(),name:'Première lumière',settings:{fps:50,alpha:'premultiplied',deviceId:'',levelA:true},cues:[
    cue('lowerthird',{label:'01 · Présentation',title:'Quentin Cholier',subtitle:'RÉALISATION & PRODUCTION'}),
    cue('title',{label:'02 · Ouverture',title:'Place au direct.',subtitle:'UNE NOUVELLE FAÇON DE RACONTER',accent:'#b5f4d6'}),
    cue('logo',{label:'03 · Signature',title:'graphX',subtitle:'EN DIRECT',accent:'#ff704d'}),
    cue('ticker',{label:'04 · Le fil',title:'BIENVENUE EN DIRECT   /   Des idées, des images et des histoires.   /   Votre prochain événement commence ici.   /   ',accent:'#b5f4d6'}),
    cue('timer',{label:'05 · Dans un instant',timerSeconds:300,accent:'#b5f4d6',position:'center'}),
    cue('score',{label:'06 · Le match',title:'LAUSANNE',subtitle:'GENÈVE',scoreHome:2,scoreAway:1,position:'top-left'}),
    cue('fullscreen',{label:'07 · Interlude',title:'On revient.',subtitle:'Merci de rester avec nous.'})
  ]};
}
function number(value,min,max,fallback) {const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function text(value,max=300) {return typeof value==='string'?value.slice(0,max):'';}
function color(value,fallback) {return /^#[\da-fA-F]{6}$/.test(value)?value:fallback;}
function validateCue(value, ids=new Set()) {
  if (!value || typeof value!=='object' || !TYPES.includes(value.type)) throw new Error('Graphique invalide.');
  const c=cue(value.type); c.id=/^[\w-]{1,80}$/.test(value.id||'')&&!ids.has(value.id)?value.id:randomUUID(); ids.add(c.id);
  for(const key of ['label','title','subtitle'])c[key]=text(value[key],key==='title'?2000:300)||c[key];
  // Empty subtitle/title are intentionally supported.
  for(const key of ['title','subtitle']) if(value[key]==='') c[key]='';
  for(const key of ['accent','background','textColor'])c[key]=color(value[key],c[key]);
  c.layer=Math.round(number(value.layer,1,8,c.layer)); c.transition=number(value.transition,0,2000,500); c.duration=number(value.duration,0,3600,0);
  c.timerSeconds=number(value.timerSeconds,1,86400,300); c.scoreHome=Math.round(number(value.scoreHome,0,999,0)); c.scoreAway=Math.round(number(value.scoreAway,0,999,0));
  c.timecodeMs=value.timecodeMs==null?null:number(value.timecodeMs,0,360000000,null);
  c.x=number(value.x,-1920,1920,0); c.y=number(value.y,-1080,1080,0);
  c.opacity=number(value.opacity,0,1,1); c.scale=number(value.scale,0.5,1.6,1);
  c.position=['bottom-left','bottom-right','top-left','top-right','center'].includes(value.position)?value.position:c.position;
  c.animation=['slide','fade','cut'].includes(value.animation)?value.animation:c.animation;
  c.media=(c.type==='video'?VIDEO_NAME:IMAGE_NAME).test(value.media||'')?value.media:'';
  if(c.type==='video'){
    c.videoDurationMs=Number.isInteger(value.videoDurationMs)&&value.videoDurationMs>0&&value.videoDurationMs<=MAX_VIDEO_MS?value.videoDurationMs:0;
    c.videoLoop=value.videoLoop===true;
  }
  c.group=text(value.group,80).trim();c.notes=text(value.notes,2000);c.skip=value.skip===true;c.favorite=value.favorite===true;
  c.sceneCueIds=Array.isArray(value.sceneCueIds)?[...new Set(value.sceneCueIds.filter(id=>typeof id==='string'&&/^[\w-]{1,80}$/.test(id)))].slice(0,8):[];
  return c;
}
function validateProject(value) {
  if(!value||![1,2].includes(value.schema)||!Array.isArray(value.cues)||value.cues.length>250)throw new Error('Projet graphX non valide (version 1, maximum 250 éléments).');
  const ids=new Set(); const settings=value.settings||{};
  const cues=value.cues.map(c=>validateCue(c,ids));
  const assetIds=new Set(cues.filter(c=>['image','video'].includes(c.type)).map(c=>c.id)),usedSlots=new Set();
  const assetSlots=Array.from({length:8},(_,i)=>{
    const id=value.assetSlots?.[i];if(!assetIds.has(id)||usedSlots.has(id))return null;usedSlots.add(id);return id;
  });
  return {schema:2,assetSlots,lastAssetId:assetIds.has(value.lastAssetId)?value.lastAssetId:null,themes:validateThemes(value.themes),layerNames:Array.from({length:8},(_,i)=>text(value.layerNames?.[i],40)||['Fond','Titres','Intervenants','Scores','Bandeau','Logo','Libre','Dessus'][i]),id:/^[\w-]{1,80}$/.test(value.id||'')?value.id:randomUUID(),name:text(value.name,120)||'Sans titre',settings:{fps:FPS.includes(settings.fps)?settings.fps:50,alpha:settings.alpha==='straight'?'straight':'premultiplied',deviceId:text(settings.deviceId,120),levelA:settings.levelA!==false},cues};
}
function validateThemes(values){return Array.isArray(values)?values.slice(0,30).map(t=>({id:/^[\w-]{1,80}$/.test(t.id||'')?t.id:randomUUID(),name:text(t.name,80)||'Thème',accent:color(t.accent,'#ff704d'),background:color(t.background,'#142328'),textColor:color(t.textColor,'#ffffff')})):[];}
function playable(c){return !!c&&c.type!=='note'&&!c.skip;}
function nextPlayable(project,start=0){return project.cues.slice(Math.max(0,start)).find(playable)?.id||null;}
function expandCue(project,c){
 if(!c||c.type==='note')throw Error('Une note de régie ne se joue pas.');
 if(c.type!=='scene')return [c];
 if(!c.sceneCueIds.length)throw Error('Ajoute des graphiques à cette scène.');
 const members=c.sceneCueIds.map(id=>project.cues.find(x=>x.id===id));
 if(members.some(x=>!x||['scene','note'].includes(x.type)))throw Error('Scène invalide : un graphique est absent ou incompatible.');
 if(new Set(members.map(x=>x.layer)).size!==members.length)throw Error('Chaque graphique de la scène doit occuper une couche différente.');
 return members;
}
function createState(project=createProject()) {project=validateProject(project);return {project,selectedId:project.cues[0]?.id||null,live:[],playback:{enabled:false,nextId:nextPlayable(project),lastId:null,clockMs:0,clockStartedAt:null},revision:0};}
function cleanup(state,now=Date.now()) {
  let changed=false;
  for(const item of state.live)if(!item.exitingAt&&item.cue.duration>0&&now>=item.enteredAt+item.cue.duration*1000){item.exitingAt=item.enteredAt+item.cue.duration*1000;changed=true;}
  for(const item of state.live){
    if(item.cue.type!=='video'||item.cue.videoLoop||item.exitingAt||item.videoPausedAt!==null)continue;
    const endsAt=item.videoStartedAt+item.cue.videoDurationMs;
    if(now>=endsAt){item.exitingAt=endsAt;changed=true;}
  }
  const before=state.live.length;state.live=state.live.filter(x=>!x.exitingAt||now<x.exitingAt+(x.cue.animation==='cut'?0:x.cue.transition));
  return changed||before!==state.live.length;
}
function applyAction(state,action,now=Date.now()) {
  const p=state.project;const id=action.id||state.selectedId;const index=p.cues.findIndex(x=>x.id===id);const found=p.cues[index];
  const requireCue=()=>{if(!found)throw new Error('Sélectionne un graphique.');return found;};
  let save=true;
  switch(action.type){
    case 'select':requireCue();state.selectedId=id;save=false;break;
    case 'add':{if(p.cues.length>=250)throw new Error('250 graphiques maximum.');const c=cue(action.kind);p.cues.splice(index<0?p.cues.length:index+1,0,c);state.selectedId=c.id;break;}
    case 'edit':{requireCue();const merged={...found,...action.patch,id:found.id,type:found.type};p.cues[index]=validateCue(merged);if(state.playback.nextId===id&&!playable(p.cues[index]))state.playback.nextId=nextPlayable(p,index+1);break;}
    case 'duplicate':{requireCue();if(p.cues.length>=250)throw new Error('250 graphiques maximum.');const c={...structuredClone(found),id:randomUUID(),label:found.label+' · copie'};p.cues.splice(index+1,0,c);state.selectedId=c.id;break;}
    case 'remove':requireCue();p.assetSlots=p.assetSlots.map(target=>target===id?null:target);if(p.lastAssetId===id)p.lastAssetId=null;if(state.playback.nextId===id)state.playback.nextId=nextPlayable(p,index+1);p.cues.splice(index,1);state.selectedId=p.cues[Math.min(index,p.cues.length-1)]?.id||null;break;
    case 'move':{requireCue();const target=Math.max(0,Math.min(p.cues.length-1,index+(action.direction===-1?-1:1)));p.cues.splice(index,1);p.cues.splice(target,0,found);break;}
    case 'reorder':{
      requireCue();if(action.beforeId===id)break;
      const target=action.beforeId==null?null:p.cues.find(c=>c.id===action.beforeId);
      if(action.beforeId!=null&&!target)throw new Error('Destination absente du conducteur.');
      p.cues.splice(index,1);p.cues.splice(target?p.cues.indexOf(target):p.cues.length,0,found);break;
    }
    case 'followMode':state.playback.enabled=action.enabled===true;if(state.playback.enabled)state.playback.nextId=nextPlayable(p,Math.max(0,p.cues.findIndex(c=>c.id===state.selectedId)));save=false;break;
    case 'arm':requireCue();if(!playable(found))throw Error('Choisis un élément non ignoré.');state.playback.nextId=id;save=false;break;
    case 'advance':{
      if(!state.playback.enabled)throw new Error('Active le mode conducteur.');
      const next=p.cues.find(c=>c.id===state.playback.nextId);
      if(!next)throw new Error('Fin du conducteur. Recale sur un élément pour reprendre.');
      if(action.expectedId!==undefined&&action.expectedId!==next.id)throw new Error('Le prochain élément a changé. Vérifie le conducteur avant de rejouer.');
      const followSelection=state.selectedId===next.id;
      applyAction(state,{type:'go',id:next.id},now);state.revision--;
      state.playback.lastId=next.id;state.playback.nextId=nextPlayable(p,p.cues.indexOf(next)+1);
      if(followSelection&&state.playback.nextId)state.selectedId=state.playback.nextId;
      save=false;break;
    }
    case 'clockToggle':{
      const clock=state.playback;
      if(clock.clockStartedAt!==null){clock.clockMs+=Math.max(0,now-clock.clockStartedAt);clock.clockStartedAt=null;}
      else clock.clockStartedAt=now;
      save=false;break;
    }
    case 'clockReset':state.playback.clockMs=0;state.playback.clockStartedAt=null;save=false;break;
    case 'go':{
      requireCue();const members=expandCue(p,found),layers=new Set(members.map(c=>c.layer));
      if(members.some(c=>c.type==='video'&&(!c.media||!c.videoDurationMs)))throw Error('Vidéo absente ou durée invalide.');
      state.playback.lastId=found.id;for(const item of state.live)if(layers.has(item.cue.layer)&&!item.exitingAt)item.exitingAt=now;
      const sceneId=found.type==='scene'?found.id:null;
      for(const c of members)state.live.push({key:randomUUID(),sceneId,cue:structuredClone(c),enteredAt:now,exitingAt:null,timerEndAt:now+c.timerSeconds*1000,timerPausedAt:null,...(c.type==='video'?{videoStartedAt:now,videoPausedAt:null}:{})});save=false;break;
    }
    case 'videoTransport':{
      const video=state.live.find(item=>item.key===action.key&&item.cue.type==='video'&&!item.exitingAt);
      if(!video)throw Error('Cette vidéo n’est plus à l’antenne.');
      if(action.operation==='restart'){video.videoStartedAt=now;video.videoPausedAt=null;}
      else if(action.operation==='toggle'){
        if(video.videoPausedAt===null)video.videoPausedAt=now;
        else{video.videoStartedAt+=now-video.videoPausedAt;video.videoPausedAt=null;}
      }else throw Error('Commande vidéo inconnue.');
      save=false;break;
    }
    case 'outInstance':for(const item of state.live)if(item.key===action.key&&!item.exitingAt)item.exitingAt=now;save=false;break;
    case 'outLayer':for(const item of state.live)if(item.cue.layer===Number(action.layer)&&!item.exitingAt)item.exitingAt=now;save=false;break;
    case 'groupArm':{const first=p.cues.find(c=>c.group===action.group&&playable(c));if(!first)throw Error('Aucun départ disponible dans ce groupe.');state.playback.nextId=first.id;state.selectedId=first.id;save=false;break;}
    case 'batchAdd':{if(!Array.isArray(action.cues)||!action.cues.length||p.cues.length+action.cues.length>250)throw Error('Import limité à 250 éléments au total.');const entries=action.cues.map(c=>validateCue({...c,id:randomUUID()}));p.cues.splice(index<0?p.cues.length:index+1,0,...entries);state.selectedId=entries[0].id;break;}
    case 'importAssets':{
      if(!Array.isArray(action.cues)||!action.cues.length||p.cues.length+action.cues.length>250)throw Error('Import limité à 250 éléments au total.');
      const staged=action.staged===true||state.live.length>0;
      const entries=action.cues.map(value=>{
        const entry=validateCue({...value,id:randomUUID(),skip:staged});
        if(!['image','video'].includes(entry.type)||!entry.media||(entry.type==='video'&&!entry.videoDurationMs))throw Error('Média d’import invalide.');
        return entry;
      });
      if(staged){
        p.cues.push(...entries);
        for(const entry of entries){const slot=p.assetSlots.indexOf(null);if(slot>=0)p.assetSlots[slot]=entry.id;}
      }else{
        p.cues.splice(index<0?p.cues.length:index+1,0,...entries);
        state.selectedId=entries.at(-1).id;
      }
      p.lastAssetId=entries.at(-1).id;
      break;
    }
    case 'assetSlot':{
      if(!Number.isInteger(action.slot)||action.slot<1||action.slot>8)throw Error('Choisis un emplacement entre 1 et 8.');
      const occupant=p.assetSlots[action.slot-1];
      if(action.expectedId!==undefined&&occupant!==action.expectedId)throw Error('Cet emplacement a changé.');
      if(action.id!==null){
        if(occupant&&occupant!==action.id)throw Error('Libère cet emplacement avant de le réattribuer.');
        if(typeof action.id!=='string'||!['image','video'].includes(found?.type))throw Error('Choisis une image ou une vidéo.');
        p.assetSlots=p.assetSlots.map(target=>target===id?null:target);
      }
      p.assetSlots[action.slot-1]=action.id;
      break;
    }
    case 'themeSave':{const theme=validateThemes([action.theme])[0];if(!theme)throw Error('Thème invalide.');const at=p.themes.findIndex(t=>t.id===theme.id);if(at>=0)p.themes[at]=theme;else{if(p.themes.length>=30)throw Error('30 thèmes maximum.');p.themes.push(theme);}break;}
    case 'themeApply':{const theme=validateThemes([action.theme])[0];if(!theme||!Array.isArray(action.ids))throw Error('Thème ou sélection invalide.');for(const c of p.cues)if(action.ids.includes(c.id))for(const key of ['accent','background','textColor'])c[key]=theme[key];break;}
    case 'layerNames':p.layerNames=Array.from({length:8},(_,i)=>text(action.names?.[i],40)||p.layerNames[i]);break;
    case 'out': for(const item of state.live)if((item.cue.id===id||item.sceneId===id)&&!item.exitingAt)item.exitingAt=now; save=false;break;
    case 'outAll':for(const item of state.live)if(!item.exitingAt)item.exitingAt=now;save=false;break;
    case 'clear':state.live=[];save=false;break;
    case 'updateLive':{requireCue();const members=expandCue(p,found);if(found.type==='scene'){const active=state.live.filter(i=>i.sceneId===id&&!i.exitingAt);if(active.length!==members.length||members.some(c=>!active.some(i=>i.cue.id===c.id)))throw Error('La composition a changé : rejoue la scène avec GO.');}
      for(const item of state.live)if((item.cue.id===id||item.sceneId===id)&&!item.exitingAt){const source=members.find(c=>c.id===item.cue.id);if(source){const previous=item.cue;item.cue=structuredClone(source);item.cue.layer=previous.layer;
        if(previous.type==='video')for(const key of ['media','videoDurationMs','videoLoop'])item.cue[key]=previous[key];}}save=false;break;}
    case 'scoreAdjust':{
      requireCue();if(found.type!=='score')throw new Error('Choisis un tableau de score.');
      if(!['home','away'].includes(action.side)||!Number.isFinite(action.amount))throw new Error('Équipe ou variation invalide.');
      const field=action.side==='home'?'scoreHome':'scoreAway';found[field]=Math.round(number(found[field]+action.amount,0,999,0));
      for(const item of state.live)if(item.cue.id===id&&!item.exitingAt)item.cue[field]=found[field];break;
    }
    case 'timerAdjust':{
      requireCue();if(found.type!=='timer'||!Number.isFinite(action.seconds))throw new Error('Compte à rebours ou durée invalide.');
      const seconds=number(action.seconds,-86400,86400,0),active=state.live.filter(item=>item.cue.id===id&&!item.exitingAt);
      if(active.length){for(const item of active){const reference=item.timerPausedAt??now;item.timerEndAt=reference+number(item.timerEndAt-reference+seconds*1000,0,86400000,0);}save=false;}
      else found.timerSeconds=number(found.timerSeconds+seconds,1,86400,300);break;
    }
    case 'timerToggle':for(const item of state.live)if(item.cue.id===id&&item.cue.type==='timer'&&!item.exitingAt){if(item.timerPausedAt){item.timerEndAt+=now-item.timerPausedAt;item.timerPausedAt=null;}else item.timerPausedAt=now;}save=false;break;
    case 'timerReset':for(const item of state.live)if(item.cue.id===id&&item.cue.type==='timer'&&!item.exitingAt){item.timerEndAt=now+item.cue.timerSeconds*1000;item.timerPausedAt=null;}save=false;break;
    case 'rename':p.name=text(action.name,120).trim()||'Sans titre';break;
    case 'settings':p.settings=validateProject({...p,settings:{...p.settings,...action.settings}}).settings;break;
    case 'next':{const next=p.cues[Math.min(index+1,p.cues.length-1)];state.selectedId=next?.id||null;save=false;break;}
    default:throw new Error('Commande inconnue.');
  }
  cleanup(state,now);state.revision++;return save;
}
const histories=new WeakMap();
function historyFor(s){if(!histories.has(s))histories.set(s,{undo:[],redo:[],lastKey:'',lastAt:0});return histories.get(s);}
function historyStatus(s){const h=historyFor(s);return {undo:h.undo.length,redo:h.redo.length};}
function resetHistory(s){histories.delete(s);}
function act(state,action,now=Date.now()){
 const h=historyFor(state);
 if(['undo','redo'].includes(action.type)){
  const source=h[action.type],dest=h[action.type==='undo'?'redo':'undo'];if(!source.length)throw Error('Aucune modification à '+(action.type==='undo'?'annuler.':'rétablir.'));
  dest.push(structuredClone(state.project));const settings=state.project.settings;state.project=source.pop();state.project.settings=settings;
  if(!state.project.cues.some(c=>c.id===state.selectedId))state.selectedId=state.project.cues[0]?.id||null;
  if(state.playback.nextId!==null&&!state.project.cues.some(c=>c.id===state.playback.nextId&&playable(c)))state.playback.nextId=nextPlayable(state.project);
  h.lastKey='';state.revision++;return true;
 }
 const tracked=['add','edit','duplicate','remove','move','reorder','rename','batchAdd','importAssets','assetSlot','themeSave','themeApply','layerNames'];
 const before=tracked.includes(action.type)?structuredClone(state.project):null;
 const save=applyAction(state,action,now);
 if(before&&JSON.stringify(before)!==JSON.stringify(state.project)){
  const key=action.type==='edit'?'edit:'+(action.id||state.selectedId)+':'+Object.keys(action.patch||{}).sort().join(','):'';
  if(!key||key!==h.lastKey||now-h.lastAt>1200){h.undo.push(before);if(h.undo.length>50)h.undo.shift();}
  h.redo=[];h.lastKey=key;h.lastAt=now;
 }return save;
}
module.exports={expandCue,nextPlayable,playable,historyStatus,resetHistory,TYPES,FPS,cue,createProject,validateCue,validateProject,createState,cleanup,act};
