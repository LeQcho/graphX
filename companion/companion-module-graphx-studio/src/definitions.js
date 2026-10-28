'use strict';
const {resolveCue,isLive,variables}=require('./control');
const COLORS={dark:0x182021,mint:0xb5f4d6,red:0xe85839,white:0xffffff,amber:0xf4be61,muted:0x596463};
function definitions(instance){
 const cues=instance.client?.state?.project.cues||[];
 const target=()=>({type:'dropdown',id:'target',label:'Graphique (ID stable, nom exact ou variable)',default:'@selected',allowCustom:true,choices:[{id:'@selected',label:'Sélection de travail'},{id:'@next',label:'Prochain du conducteur'},{id:'@last',label:'Dernier envoyé'},...cues.map((c,i)=>({id:c.id,label:`${i+1}. ${c.label}`}))]});
 const drop=(id,label,choices,def)=>({type:'dropdown',id,label,default:def,choices:choices.map(([id,label])=>({id,label}))});
 const number=(id,label,def,min,max)=>({type:'number',id,label,default:def,min,max});
 const live=()=>({type:'checkbox',id:'live',label:'Appliquer aussi à l’antenne',default:false});
 const action=(name,options,kind,transform=o=>o)=>({name,options,callback:async(event)=>{
  const o={...event.options};
  const state=instance.client?.state,intent={nextId:state?.playback.enabled?state?.playback.nextId:state?.selectedId};
  try{await instance.client.execute((s,send)=>require('./control').dispatch(s,send,kind,transform(o),intent));}catch(e){instance.log('warn',e.message);instance.setVariableValues({last_error:e.message});}
 }});
 const actions={
  run:action('Conducteur · GO suivant (active le mode conducteur)',[],'run'),
  graphic:action('Graphique · afficher / masquer / basculer / sélectionner',[target(),drop('operation','Opération',[['toggle','Afficher / masquer'],['go','Afficher'],['out','Masquer'],['select','Sélectionner'],['arm','Armer comme prochain']],'toggle')],'graphic'),
  outLast:action('Antenne · retirer le dernier envoyé',[],'outLast'),hideAll:action('Antenne · tout retirer avec transition',[],'hideAll'),clear:action('Antenne · tout retirer immédiatement',[],'clear'),
  navigate:action('Conducteur · sélectionner précédent / suivant',[drop('direction','Direction',[[-1,'Précédent'],[1,'Suivant']],1)],'navigate'),
  follow:action('Conducteur · activer / désactiver le suivi',[drop('mode','Mode',[['on','Activer'],['off','Désactiver'],['toggle','Basculer']],'toggle')],'follow'),
  arm:action('Conducteur · recaler le prochain sur un graphique',[target()],'arm'),
  clock:action('Horloge conducteur · pause / reprise / zéro',[drop('operation','Opération',[['toggle','Départ / pause / reprise'],['reset','Zéro et arrêt']],'toggle')],'clock'),
  timer:action('Compte à rebours · pause / reprise / réinitialiser',[target(),drop('operation','Opération',[['toggle','Pause / reprise'],['reset','Réinitialiser']],'toggle')],'timer'),
  timerAdjust:action('Compte à rebours · ajouter / retirer du temps (graphX 0.3+)',[target(),number('seconds','Secondes (+ ou −)',30,-86400,86400)],'timerAdjust'),
  score:action('Score · ajouter / retirer des points (graphX 0.3+)',[target(),drop('side','Équipe',[['home','Domicile'],['away','Visiteur']],'home'),number('amount','Points (+ ou −)',1,-999,999)],'score'),
  text:action('Contenu · remplacer un texte (variables Companion acceptées)',[target(),drop('field','Champ',[['title','Texte principal / équipe domicile'],['subtitle','Sous-titre / équipe visiteuse'],['label','Nom dans le conducteur']],'title'),{type:'textinput',id:'value',label:'Texte',default:'',useVariables:true},live()],'text'),
  transform:action('Aspect · position, taille, opacité',[target(),number('x','Décalage X',0,-1920,1920),number('y','Décalage Y',0,-1080,1080),number('scale','Échelle (1 = 100 %)',1,.5,1.6),number('opacity','Opacité (1 = 100 %)',1,0,1),live()],'appearance'),
  position:action('Aspect · ancrage',[target(),drop('position','Position',[['bottom-left','Bas gauche'],['bottom-right','Bas droite'],['top-left','Haut gauche'],['top-right','Haut droite'],['center','Centre']],'bottom-left'),live()],'appearance'),
  theme:action('Aspect · couleurs',[target(),...['accent','background','textColor'].map((id,i)=>({type:'colorpicker',id,label:['Accent','Fond','Texte'][i],default:[0xff704d,0x142328,0xffffff][i]})),live()],'appearance',o=>({...o,...Object.fromEntries(['accent','background','textColor'].map(k=>[k,typeof o[k]==='string'&&o[k].startsWith('#')?o[k]:'#'+Number(o[k]).toString(16).padStart(6,'0')]))})),
  animation:action('Aspect · animation, transition et retrait automatique',[target(),drop('animation','Animation',[['slide','Glissement'],['fade','Fondu'],['cut','Cut']],'slide'),number('transition','Transition en ms',500,0,2000),number('duration','Retrait automatique en s (0 = manuel)',0,0,3600),live()],'appearance'),
  updateLive:action('Graphique · appliquer la préparation à l’antenne',[target()],'updateLive'),
  outLayer:action('Couche · retirer les graphiques de cette couche',[number('layer','Couche',3,1,8)],'outLayer'),
 };
 const bool=(name,options,callback,color=COLORS.mint)=>({type:'boolean',name,options,defaultStyle:{bgcolor:color,color:COLORS.dark},callback:f=>{try{return instance.client.online&&callback(instance.client.state,f.options);}catch{return false;}}});
 const feedbacks={
  offline:{type:'boolean',name:'Moteur déconnecté',options:[],defaultStyle:{bgcolor:COLORS.muted,color:COLORS.white},callback:()=>!instance.client?.online},
  onAir:bool('Graphique à l’antenne',[target()],(s,o)=>isLive(s,resolveCue(s,o.target).id),COLORS.red),
  selected:bool('Graphique sélectionné',[target()],(s,o)=>resolveCue(s,o.target).id===s.selectedId),
  next:bool('Graphique armé comme prochain',[target()],(s,o)=>s.playback.enabled&&resolveCue(s,o.target).id===s.playback.nextId,COLORS.amber),
  follow:bool('Mode conducteur actif',[],s=>s.playback.enabled),clock:bool('Horloge en marche',[],s=>s.playback.clockStartedAt!==null),
  end:bool('Fin du conducteur',[],s=>s.playback.enabled&&!s.playback.nextId,COLORS.amber),
  anyLive:bool('Au moins un graphique à l’antenne',[],s=>s.live.some(x=>!x.exitingAt),COLORS.red),
  sdi:bool('Sortie SDI active',[],s=>s.status.output.running,COLORS.red),
  layer:bool('Couche à l’antenne',[number('layer','Couche',3,1,8)],(s,o)=>s.live.some(x=>x.cue.layer===Number(o.layer)&&!x.exitingAt),COLORS.red),
  timerPaused:bool('Compte à rebours en pause',[target()],(s,o)=>s.live.some(x=>x.cue.id===resolveCue(s,o.target).id&&!x.exitingAt&&x.timerPausedAt!==null),COLORS.amber),
 };
 instance.setActionDefinitions(actions);instance.setFeedbackDefinitions(feedbacks);
 const v=name=>`$(${instance.label}:${name})`,presets={},groups=new Map();
 const fb=(feedbackId,options={},bgcolor=COLORS.red)=>({feedbackId,options,style:{bgcolor,color:COLORS.dark}});
 function button(id,category,name,text,actionId,options={},feedback=[],color=COLORS.dark){if(!groups.has(category))groups.set(category,[]);groups.get(category).push(id);presets[id]={type:'simple',name,style:{text,size:'auto',color:COLORS.white,bgcolor:color},steps:[{down:actionId?[{actionId,options}]:[],up:[]}],feedbacks:[...feedback,fb('offline',{},COLORS.muted)]};}
 const cat='01 · Régie — kit Stream Deck';
 button('run',cat,'GO suivant','GO\n'+v('next'),'run',{},[fb('end',{},COLORS.amber)],0x245b42);
 button('outLast',cat,'OUT dernier','OUT\n'+v('last'),'outLast');button('hideAll',cat,'Tout retirer avec transition','OUT ALL','hideAll',{},[fb('anyLive')]);
 button('previous',cat,'Sélection précédente','↑\nPRÉCÉDENT','navigate',{direction:-1});button('next',cat,'Sélection suivante','↓\nSUIVANT','navigate',{direction:1});
 button('arm',cat,'Recaler sur la sélection','ARMER\n'+v('selected'),'arm',{target:'@selected'});button('follow',cat,'Mode conducteur','MODE\nCONDUCTEUR','follow',{mode:'toggle'},[fb('follow',{},COLORS.mint)]);
 button('clock',cat,'Horloge pause / reprise',v('clock'),'clock',{operation:'toggle'},[fb('clock',{},COLORS.mint)]);button('clockReset',cat,'Horloge remise à zéro','HORLOGE\nZÉRO','clock',{operation:'reset'});
 button('selectedGo',cat,'Jouer la sélection','GO SÉLECTION\n'+v('selected'),'graphic',{target:'@selected',operation:'go'});
 button('selectedOut',cat,'Retirer la sélection','OUT SÉLECTION','graphic',{target:'@selected',operation:'out'});
 button('updateLive',cat,'Appliquer les modifications','ACTUALISER\nANTENNE','updateLive',{target:'@selected'});
 button('status',cat,'État de connexion','graphX\n'+v('live_count')+' À L’ANTENNE',null);
 button('project',cat,'Nom du projet',v('project'),null);
 button('panic',cat,'Retrait immédiat — urgence','TOUT\nCOUPER','clear',{},[],0x9b2b26);
 for(const c of cues){const target={target:c.id};const states=[fb('selected',target,COLORS.mint),fb('next',target,COLORS.amber),fb('onAir',target,COLORS.red)];
  button('toggle_'+c.id,'02 · Graphiques — afficher / masquer',c.label,v(`cue_${c.id}_name`),'graphic',{...target,operation:'toggle'},states);
  button('select_'+c.id,'03 · Graphiques — préparer',c.label,v(`cue_${c.id}_name`),'graphic',{...target,operation:'select'},states);
  if(c.type==='timer'){
   button('timer_'+c.id,'04 · Comptes à rebours',c.label+' · pause',v(`cue_${c.id}_name`)+'\n'+v(`cue_${c.id}_timer_text`),'timer',{...target,operation:'toggle'},[...states,fb('timerPaused',target,COLORS.amber)]);
   for(const seconds of [-30,30])button('timer_'+c.id+'_'+seconds,'04 · Comptes à rebours',c.label+' '+seconds+' s',v(`cue_${c.id}_name`)+`\n${seconds>0?'+':''}${seconds}s`,'timerAdjust',{...target,seconds});
   button('timer_reset_'+c.id,'04 · Comptes à rebours',c.label+' · reset','RESET\n'+v(`cue_${c.id}_name`),'timer',{...target,operation:'reset'});
  }
  if(c.type==='score')for(const side of ['home','away'])for(const amount of [-1,1])button(`score_${c.id}_${side}_${amount}`,'05 · Scores',c.label+' '+side+' '+amount,v(`cue_${c.id}_${side==='home'?'title':'subtitle'}`)+'\n'+v(`cue_${c.id}_score_${side}`)+`\n${amount>0?'+':''}${amount}`,'score',{...target,side,amount});
 }
 for(let layer=1;layer<=8;layer++)button('layer_'+layer,'06 · Couches','Retirer couche '+layer,'OUT\nCOUCHE '+layer,'outLayer',{layer},[fb('layer',{layer})]);
 instance.setPresetDefinitions([...groups].map(([name,ids],i)=>({id:'section'+i,name,definitions:ids})),presets);
 const sample=instance.client?.state?variables(instance.client.state,Date.now()):{connected:0,project:'',selected:'',next:'',last:'',live_count:0,clock:'',last_error:''};
 instance.setVariableDefinitions(Object.fromEntries([...Object.keys(sample),...('last_error'in sample?[]:['last_error'])].map(variableId=>[variableId,{name:variableId.replaceAll('_',' ')}])));
 return {actions,feedbacks,presets};
}
module.exports={definitions};
