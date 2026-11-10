'use strict';
const {resolveCue,isLive,variables,dispatch,assetId,activeVideo}=require('./control');
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
  try{
   if(kind==='clear')await instance.client.clear();
   else{
    if(state&&kind==='asset')intent.assetId=assetId(state,o.slot)??null;
    if(state&&kind==='video')intent.videoKey=activeVideo(state,o.target)?.key??null;
    await instance.client.execute((s,send)=>dispatch(s,send,kind,transform(o),intent),{transportToken:state?.transportToken});
   }
   instance.setVariableValues({last_error:''});
  }catch(e){instance.log('warn',e.message);instance.setVariableValues({last_error:e.message});}
 }});
 const slots=[['last','Dernier import'],...Array.from({length:8},(_,i)=>[String(i+1),'Média '+(i+1)])];
 const assetTarget=()=>drop('slot','Emplacement',slots,'last');
 const videoTarget=()=>{const field=target();return {...field,default:'@activeVideo',choices:[{id:'@activeVideo',label:'Dernière vidéo à l’antenne'},...field.choices]};};
 const groupChoices=[...new Set(cues.map(c=>c.group).filter(Boolean))];
 const actions={
  asset:action('Média régie · préparer / afficher / retirer',[assetTarget(),drop('operation','Opération',[['toggle','Afficher / retirer'],['go','Afficher'],['out','Retirer'],['select','Préparer']],'toggle')],'asset'),
  video:action('Vidéo à l’antenne · pause / repartir / retirer',[videoTarget(),drop('operation','Opération',[['toggle','Pause / reprise'],['restart','Repartir du début'],['out','Retirer']],'toggle')],'video'),
  groupArm:action('Groupe · armer le premier élément (0.4+)',[{type:'dropdown',id:'group',label:'Groupe',allowCustom:true,default:groupChoices[0]||'',choices:groupChoices.map(g=>({id:g,label:g}))}],'groupArm'),
  skip:action('Conducteur · ignorer / réintégrer (0.4+)',[target(),drop('mode','Ignorer',[['toggle','Basculer'],['on','Ignorer'],['off','Réintégrer']],'toggle')],'skip'),
  history:action('Préparation · annuler / rétablir (0.4+)',[drop('operation','Opération',[['undo','Annuler'],['redo','Rétablir']],'undo')],'history'),
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
  assetOnAir:bool('Média régie · à l’antenne',[assetTarget()],(s,o)=>isLive(s,assetId(s,o.slot))),
  assetPhase:bool('Média régie · préparation',[assetTarget(),drop('phase','État',[['ready','Prêt'],['available','Fichier présent'],['loading','Chargement'],['error','Erreur']],'ready')],(s,o)=>s.status.preparation?.[assetId(s,o.slot)]?.state===o.phase),
  videoActive:bool('Vidéo à l’antenne',[videoTarget()],(s,o)=>!!activeVideo(s,o.target),COLORS.red),
  videoPaused:bool('Vidéo en pause',[videoTarget()],(s,o)=>{const item=activeVideo(s,o.target);return !!item&&item.videoPausedAt!==null;},COLORS.amber),
  outputError:bool('Sortie SDI en défaut',[],s=>!!s.status.output.error,COLORS.amber),
  preparation:bool('Préparation · état du graphique ou de la scène (0.4+)',[target(),drop('state','État',[['ready','Prêt'],['available','Fichier présent'],['loading','Chargement'],['error','Erreur'],['idle','À préparer']],'ready')],(s,o)=>s.status.preparation?.[resolveCue(s,o.target).id]?.state===o.state,COLORS.amber),
  skipped:bool('Conducteur · élément ignoré (0.4+)',[target()],(s,o)=>resolveCue(s,o.target).skip===true,COLORS.muted),
  renderStale:bool('Moteur · rendu natif absent ou figé (0.4+)',[],s=>s.status.mode==='native'&&(!(s.status.render?.lastTick||s.status.render?.lastPaint)||instance.client.now()-(s.status.render.lastTick||s.status.render.lastPaint)>2000),COLORS.amber),
  saveError:bool('Projet · erreur de sauvegarde',[],s=>!!s.status.saveError,COLORS.amber),
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
 button('run',cat,'GO suivant','GO\n'+v('next'),'run',{},[fb('end',{},COLORS.amber),fb('preparation',{target:'@next',state:'loading'},COLORS.amber),fb('preparation',{target:'@next',state:'error'},COLORS.red)],0x245b42);
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
 const assetCategory='11 · Bac régie — médias dynamiques';
 const assetFeedback=slot=>[fb('assetPhase',{slot,phase:'ready'},COLORS.mint),fb('assetPhase',{slot,phase:'loading'},COLORS.amber),fb('assetPhase',{slot,phase:'error'},COLORS.amber),fb('assetOnAir',{slot},COLORS.red)];
 for(const [slot,label] of slots.slice(1))button('asset_'+slot,assetCategory,label,slot+' · '+v(`asset_${slot}_name`)+'\n'+v(`asset_${slot}_status`),'asset',{slot,operation:'toggle'},assetFeedback(slot),0x174950);
 button('asset_last_prepare',assetCategory,'Préparer le dernier média','PRÉP MÉDIA\n'+v('asset_last_name'),'asset',{slot:'last',operation:'select'},assetFeedback('last'),0x174950);
 button('asset_last_go',assetCategory,'GO dernier média','GO MÉDIA\n'+v('asset_last_name'),'asset',{slot:'last',operation:'go'},assetFeedback('last'),0x245b42);
 button('asset_last_out',assetCategory,'OUT dernier média','OUT MÉDIA\n'+v('asset_last_name'),'asset',{slot:'last',operation:'out'},assetFeedback('last'));
 const videoCategory='12 · Vidéo — transport';
 const videoFeedback=target=>[fb('videoActive',{target},COLORS.red),fb('videoPaused',{target},COLORS.amber)];
 button('video_pause',videoCategory,'Pause / reprise vidéo','PAUSE / ▶\n'+v('video_remaining'),'video',{target:'@activeVideo',operation:'toggle'},videoFeedback('@activeVideo'),0x36305e);
 button('video_restart',videoCategory,'Repartir du début','REPARTIR\n'+v('video_remaining'),'video',{target:'@activeVideo',operation:'restart'},videoFeedback('@activeVideo'),0x36305e);
 button('video_out',videoCategory,'Retirer la vidéo active','OUT VIDÉO\n'+v('video_name'),'video',{target:'@activeVideo',operation:'out'},videoFeedback('@activeVideo'));
 button('video_monitor',videoCategory,'Temps restant vidéo',v('video_remaining')+'\n'+v('video_status'),null,{},videoFeedback('@activeVideo'),0x36305e);
 for(const c of cues){const target={target:c.id};const states=[fb('preparation',{...target,state:'ready'},COLORS.mint),fb('selected',target,COLORS.mint),fb('next',target,COLORS.amber),fb('preparation',{...target,state:'loading'},COLORS.amber),fb('preparation',{...target,state:'error'},COLORS.amber),fb('onAir',target,COLORS.red)];
  if(c.type!=='note')button('toggle_'+c.id,'02 · Graphiques — afficher / masquer',c.label,v(`cue_${c.id}_name`)+'\n'+v(`cue_${c.id}_ready`),'graphic',{...target,operation:'toggle'},states);
  button('select_'+c.id,'03 · Graphiques — préparer',c.label,v(`cue_${c.id}_name`),'graphic',{...target,operation:'select'},states);
  if(c.type==='scene')button('scene_'+c.id,'07 · Scènes multicouches',c.label,'SCÈNE\n'+v(`cue_${c.id}_name`),'graphic',{...target,operation:'toggle'},states);
  if(c.type!=='note')button('skip_'+c.id,'08 · SKIP',c.label,'SKIP\n'+v(`cue_${c.id}_name`),'skip',{...target,mode:'toggle'},[fb('skipped',target,COLORS.amber)]);
  if(c.type==='video')button('video_'+c.id,videoCategory,c.label+' · pause / reprise',v(`cue_${c.id}_name`)+'\n'+v(`cue_${c.id}_video_remaining`),'video',{...target,operation:'toggle'},videoFeedback(c.id),0x36305e);
  if(c.type==='timer'){
   button('timer_'+c.id,'04 · Comptes à rebours',c.label+' · pause',v(`cue_${c.id}_name`)+'\n'+v(`cue_${c.id}_timer_text`),'timer',{...target,operation:'toggle'},[...states,fb('timerPaused',target,COLORS.amber)]);
   for(const seconds of [-30,30])button('timer_'+c.id+'_'+seconds,'04 · Comptes à rebours',c.label+' '+seconds+' s',v(`cue_${c.id}_name`)+`\n${seconds>0?'+':''}${seconds}s`,'timerAdjust',{...target,seconds});
   button('timer_reset_'+c.id,'04 · Comptes à rebours',c.label+' · reset','RESET\n'+v(`cue_${c.id}_name`),'timer',{...target,operation:'reset'});
  }
  if(c.type==='score')for(const side of ['home','away'])for(const amount of [-1,1])button(`score_${c.id}_${side}_${amount}`,'05 · Scores',c.label+' '+side+' '+amount,v(`cue_${c.id}_${side==='home'?'title':'subtitle'}`)+'\n'+v(`cue_${c.id}_score_${side}`)+`\n${amount>0?'+':''}${amount}`,'score',{...target,side,amount});
 }
 for(let layer=1;layer<=8;layer++)button('layer_'+layer,'06 · Couches','Retirer couche '+layer,'OUT '+v(`layer_${layer}_name`)+'\n'+v(`layer_${layer}_live`),'outLayer',{layer},[fb('layer',{layer})]);
 for(const group of groupChoices)button('group_'+Buffer.from(group).toString('hex'),'09 · Groupes',group,'ARMER\n'+group,'groupArm',{group});
 button('undo','10 · Préparation','Annuler la préparation','ANNULER','history',{operation:'undo'});button('redo','10 · Préparation','Rétablir la préparation','RÉTABLIR','history',{operation:'redo'});
 button('readiness','10 · Préparation','Préparation du prochain',v('next')+'\n'+v('next_ready'),null,{},[fb('preparation',{target:'@next',state:'error'},COLORS.amber)]);
 button('engine','10 · Préparation','Santé du moteur',v('output_status')+'\n'+v('render_fps')+' fps',null,{},[fb('renderStale',{},COLORS.amber),fb('saveError',{},COLORS.amber),fb('outputError',{},COLORS.amber)]);
 instance.setPresetDefinitions([...groups].sort(([a],[b])=>a.localeCompare(b)).map(([name,ids])=>({id:'section'+(Number(name.slice(0,2))-1),name,definitions:ids})),presets);
 const sample=variables(instance.client?.state||{project:{cues:[],name:'',settings:{}},playback:{clockMs:0,clockStartedAt:null},live:[],status:{mode:'web',output:{}}},Date.now());
 instance.setVariableDefinitions(Object.fromEntries([...Object.keys(sample),...('last_error'in sample?[]:['last_error'])].map(variableId=>[variableId,{name:variableId.replaceAll('_',' ')}])));
 return {actions,feedbacks,presets};
}
module.exports={definitions};
