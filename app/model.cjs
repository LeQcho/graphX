'use strict';
const { randomUUID } = require('node:crypto');
const TYPES = ['lowerthird', 'title', 'ticker', 'logo', 'timer', 'score', 'fullscreen', 'image'];
const FPS = [25, 30, 50, 59.94, 60];
const DEFAULTS = {image: ['Habillage PNG',''], lowerthird: ['Alex Morgan','Direction de production'], title: ['Les idées prennent vie.','RENCONTRES • ÉDITION 2026'], ticker: ['Bienvenue en direct • Retrouvez toutes les informations sur notre site • Merci de votre présence',''], logo: ['graphX','LIVE GRAPHICS'], timer: ['On se retrouve dans',''], score: ['HOME','AWAY'], fullscreen: ['À tout de suite.','Le direct reprend dans quelques instants.']};
function cue(type='lowerthird', overrides={}) {
  if (!TYPES.includes(type)) throw new Error('Type de graphique inconnu.');
  return {id:randomUUID(),type,label:({image:'Habillage PNG',lowerthird:'Titre intervenant',title:'Titre de chapitre',ticker:'Bandeau défilant',logo:'Logo / signature',timer:'Compte à rebours',score:'Tableau de score',fullscreen:'Plein écran'})[type],title:DEFAULTS[type][0],subtitle:DEFAULTS[type][1],accent:'#ff704d',background:'#142328',textColor:'#ffffff',layer:({image:3,lowerthird:3,title:2,ticker:5,logo:6,timer:2,score:4,fullscreen:1})[type],position:type==='logo'?'top-right':type==='image'?'center':'bottom-left',animation:'slide',transition:500,duration:0,timerSeconds:300,scoreHome:0,scoreAway:0,opacity:1,scale:1,x:0,y:0,timecodeMs:null,media:'',...overrides};
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
  c.animation=['slide','fade','cut'].includes(value.animation)?value.animation:'slide';
  c.media=/^[a-f0-9]{64}\.(png|jpg|webp)$/.test(value.media||'')?value.media:'';
  return c;
}
function validateProject(value) {
  if(!value||value.schema!==1||!Array.isArray(value.cues)||value.cues.length>250)throw new Error('Projet graphX non valide (version 1, maximum 250 éléments).');
  const ids=new Set(); const settings=value.settings||{};
  return {schema:1,id:/^[\w-]{1,80}$/.test(value.id||'')?value.id:randomUUID(),name:text(value.name,120)||'Sans titre',settings:{fps:FPS.includes(settings.fps)?settings.fps:50,alpha:settings.alpha==='straight'?'straight':'premultiplied',deviceId:text(settings.deviceId,120),levelA:settings.levelA!==false},cues:value.cues.map(c=>validateCue(c,ids))};
}
function createState(project=createProject()) {project=validateProject(project);return {project,selectedId:project.cues[0]?.id||null,live:[],playback:{enabled:false,nextId:project.cues[0]?.id||null,lastId:null,clockMs:0,clockStartedAt:null},revision:0};}
function cleanup(state,now=Date.now()) {
  let changed=false;
  for(const item of state.live)if(!item.exitingAt&&item.cue.duration>0&&now>=item.enteredAt+item.cue.duration*1000){item.exitingAt=item.enteredAt+item.cue.duration*1000;changed=true;}
  const before=state.live.length;state.live=state.live.filter(x=>!x.exitingAt||now<x.exitingAt+(x.cue.animation==='cut'?0:x.cue.transition));
  return changed||before!==state.live.length;
}
function act(state,action,now=Date.now()) {
  const p=state.project;const id=action.id||state.selectedId;const index=p.cues.findIndex(x=>x.id===id);const found=p.cues[index];
  const requireCue=()=>{if(!found)throw new Error('Sélectionne un graphique.');return found;};
  let save=true;
  switch(action.type){
    case 'select':requireCue();state.selectedId=id;save=false;break;
    case 'add':{if(p.cues.length>=250)throw new Error('250 graphiques maximum.');const c=cue(action.kind);p.cues.splice(index<0?p.cues.length:index+1,0,c);state.selectedId=c.id;break;}
    case 'edit':{requireCue();const merged={...found,...action.patch,id:found.id,type:found.type};p.cues[index]=validateCue(merged);break;}
    case 'duplicate':{requireCue();if(p.cues.length>=250)throw new Error('250 graphiques maximum.');const c={...structuredClone(found),id:randomUUID(),label:found.label+' · copie'};p.cues.splice(index+1,0,c);state.selectedId=c.id;break;}
    case 'remove':requireCue();if(state.playback.nextId===id)state.playback.nextId=p.cues[index+1]?.id||null;p.cues.splice(index,1);state.selectedId=p.cues[Math.min(index,p.cues.length-1)]?.id||null;break;
    case 'move':{requireCue();const target=Math.max(0,Math.min(p.cues.length-1,index+(action.direction===-1?-1:1)));p.cues.splice(index,1);p.cues.splice(target,0,found);break;}
    case 'reorder':{
      requireCue();if(action.beforeId===id)break;
      const target=action.beforeId==null?null:p.cues.find(c=>c.id===action.beforeId);
      if(action.beforeId!=null&&!target)throw new Error('Destination absente du conducteur.');
      p.cues.splice(index,1);p.cues.splice(target?p.cues.indexOf(target):p.cues.length,0,found);break;
    }
    case 'followMode':state.playback.enabled=action.enabled===true;if(state.playback.enabled)state.playback.nextId=state.selectedId;save=false;break;
    case 'arm':requireCue();state.playback.nextId=id;save=false;break;
    case 'advance':{
      if(!state.playback.enabled)throw new Error('Active le mode conducteur.');
      const next=p.cues.find(c=>c.id===state.playback.nextId);
      if(!next)throw new Error('Fin du conducteur. Recale sur un élément pour reprendre.');
      if(action.expectedId!==undefined&&action.expectedId!==next.id)throw new Error('Le prochain élément a changé. Vérifie le conducteur avant de rejouer.');
      const followSelection=state.selectedId===next.id;
      act(state,{type:'go',id:next.id},now);state.revision--;
      state.playback.lastId=next.id;state.playback.nextId=p.cues[p.cues.indexOf(next)+1]?.id||null;
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
      requireCue();state.playback.lastId=found.id; for(const item of state.live)if(item.cue.layer===found.layer&&!item.exitingAt)item.exitingAt=now;
      state.live.push({key:randomUUID(),cue:structuredClone(found),enteredAt:now,exitingAt:null,timerEndAt:now+found.timerSeconds*1000,timerPausedAt:null}); save=false;break;
    }
    case 'out': for(const item of state.live)if(item.cue.id===id&&!item.exitingAt)item.exitingAt=now; save=false;break;
    case 'outAll':for(const item of state.live)if(!item.exitingAt)item.exitingAt=now;save=false;break;
    case 'clear':state.live=[];save=false;break;
    case 'updateLive':{requireCue();for(const item of state.live)if(item.cue.id===id&&!item.exitingAt){const layer=item.cue.layer;item.cue=structuredClone(found);item.cue.layer=layer;}save=false;break;}
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
module.exports={TYPES,FPS,cue,createProject,validateCue,validateProject,createState,cleanup,act};
