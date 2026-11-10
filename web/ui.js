import {render,previewItem,preloadCues,protectCues,prepareCues,renderNativeFrame} from './render.js';
import {inspectVideo,videoPosition} from './video.mjs';
import {parseCSV} from './csv.mjs';
import {formatTimecode,parseTimecode,elapsedClock} from './timecode.mjs';
const $=s=>document.querySelector(s);const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPES={scene:['Scène multicouche','▦','Un GO pour plusieurs couches'],note:['Note régie','✎','Un repère, sans diffusion'],lowerthird:['Titre intervenant','T','Nom et fonction'],title:['Titre de chapitre','Aa','Annonce et sous-titre'],video:['Vidéo WebM','▶','Habillage animé avec alpha'],image:['Habillage PNG','▧','Votre création, avec alpha'],logo:['Logo / signature','◈','Image ou signature texte'],ticker:['Bandeau défilant','≋','Le fil d’informations'],timer:['Compte à rebours','◷','Un rendez-vous en direct'],score:['Tableau de score','2:1','Deux équipes, un match'],fullscreen:['Plein écran','▣','Pause ou interlude']};
let state,viewMode='alpha',offset=0,toastTimer,connected=false,lastInspectorId=null,lastListKey='',outputDialog=false,replaceMediaId=null,dragDepth=0;
let lastInspectorKey='',dragCueId=null,dragBeforeId=null,dragScroll=0,dragY=0,transportBusy=false,lastDropAt=0;
let replaceVideoId=null,assetImportBusy=false,lastVideoControls='',lastAssetView='',clearPending=false;
const drafts=new Map(),debounces=new Map();let chain=Promise.resolve();
function toast(message,error=false){$('#toast').textContent=message;$('#toast').className='show'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').className='',error?6500:3000);}
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw new Error(data.error||'Le moteur ne répond pas.');return data;}
function command(action,transportToken=state?.transportToken){
 const request={...action,requestId:crypto.randomUUID()};
 if(['go','advance','updateLive'].includes(action.type))request.transportToken=transportToken;
 const task=chain.then(()=>{
  if(request.transportToken!==undefined&&(clearPending||request.transportToken!==state?.transportToken))throw Error('Commande annulée par le retrait d’urgence.');
  return api('/api/action',request);
 });
 chain=task.catch(()=>{});return task.catch(e=>{toast(e.message,true);throw e;});
}
async function clearProgram(){
 if(clearPending)return;
 clearPending=true;
 try{
  const result=await api('/api/action',{type:'clear',requestId:crypto.randomUUID()});
  if(state&&result.transportToken&&result.revision>=state.revision)state.transportToken=result.transportToken;
  toast('Toutes les couches ont été retirées.');
 }catch(e){toast('Retrait non confirmé. Vérifie l’antenne. '+e.message,true);}
 finally{clearPending=false;}
}
function fire(action){command(action).catch(()=>{});}
function selected(){const c=state?.project.cues.find(x=>x.id===state.selectedId);return c?{...c,...drafts.get(c.id)}:null;}
function onAir(id){return state?.live.some(x=>(x.cue.id===id||x.sceneId===id)&&!x.exitingAt);}
function field(label,key,value,type='text',extra=''){return `<label class="field"><span>${label}</span><input data-field="${key}" type="${type}" value="${escape(value)}" ${extra}></label>`;}
function options(key,items,value){return `<select data-field="${key}">${items.map(([v,label])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${label}</option>`).join('')}</select>`;}
function fieldSelect(label,key,items,value){return `<label class="field"><span>${label}</span>${options(key,items,value)}</label>`;}
function colorField(label,key,value){return `<label class="field"><span>${label}</span><div class="color-row"><input data-field="${key}" type="color" value="${value}"><span>${value.toUpperCase()}</span></div></label>`;}
function range(label,key,value,min,max,step,suffix){return `<label class="field"><div class="range-head"><span>${label}</span><output data-range="${key}">${Math.round(value*100)}${suffix}</output></div><input data-field="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;}
function inspector(force=false){
 const c=selected(),el=$('#inspector-content');if(!c){el.innerHTML='<p class="footnote">Ajoute un graphique ou glisse un PNG dans le conducteur pour commencer.</p>';lastInspectorId=null;return;}
 const inspectorKey=JSON.stringify([c,onAir(c.id),state.project.assetSlots]);
 if(!force&&lastInspectorId===c.id&&(lastInspectorKey===inspectorKey||(el.contains(document.activeElement)&&document.activeElement.matches('input,textarea,select'))||el.matches(':has(input:active)')))return;
 lastInspectorKey=inspectorKey;
 lastInspectorId=c.id;const t=TYPES[c.type];const live=onAir(c.id);
 let content='';
 if(c.type==='image'||c.type==='logo')content+=`<button class="image-import-zone full" id="replace-image">${c.media?`<img src="/media/${c.media}" alt="Image importée">`:'<strong>↥</strong>'}${c.media?'Remplacer l’image':'Importer un PNG transparent'}</button>`;
 if(['image','video'].includes(c.type)){
  const slots=state.project.assetSlots||[],slot=slots.indexOf(c.id)+1;
  content+=`<label class="modal-field"><span>Emplacement Stream Deck</span><select id="cue-asset-slot"><option value="0">Aucun</option>${Array.from({length:8},(_,i)=>`<option value="${i+1}" ${i+1===slot?'selected':''}>${i+1}${slots[i]&&slots[i]!==c.id?' · occupé':''}</option>`).join('')}</select></label>`;
 }
 if(c.type==='video')content+=`<div class="inspector-section"><h4>VIDÉO</h4><button class="button full" id="replace-video">${c.media?'Remplacer la vidéo':'Importer une vidéo WebM'}</button><p class="footnote">${c.videoDurationMs?'Durée · '+clipTime(c.videoDurationMs):'WebM avec alpha · 1920 × 1080 maximum'}</p><label class="scene-member"><input data-field="videoLoop" type="checkbox" ${c.videoLoop?'checked':''}> Boucler jusqu’au OUT</label></div>`;
 if(!['image','video','scene','note'].includes(c.type)){
  if(c.type==='ticker')content+=`<label class="field"><span>Texte défilant</span><textarea data-field="title">${escape(c.title)}</textarea></label>`;
  else content+=field(c.type==='score'?'Équipe à domicile':c.type==='timer'?'Message':'Texte principal','title',c.title);
  if(!['ticker','timer'].includes(c.type))content+=field(c.type==='score'?'Équipe visiteuse':'Sous-titre','subtitle',c.subtitle);
 }
 if(c.type==='timer')content+=field('Durée du compte à rebours (secondes)','timerSeconds',c.timerSeconds,'number','min="1" max="86400"')+(live?'<div class="inspector-actions"><button class="button" id="timer-toggle">Pause / Reprendre</button><button class="button" id="timer-reset">Réinitialiser</button></div>':'');
 if(c.type==='score')content+=`<div class="field-grid">${field('Score domicile','scoreHome',c.scoreHome,'number','min="0" max="999"')}${field('Score visiteur','scoreAway',c.scoreAway,'number','min="0" max="999"')}</div>`;
 if(!['image','video','scene','note'].includes(c.type))content+=`<div class="inspector-section"><h4>IDENTITÉ VISUELLE</h4><div class="field-grid">${colorField('Accent','accent',c.accent)}${colorField('Fond','background',c.background)}</div>${colorField('Texte','textColor',c.textColor)}</div>`;
 if(!['scene','note'].includes(c.type))content+=`<div class="inspector-section"><h4>POSITION & COUCHE</h4><div class="field-grid">${fieldSelect('Position','position',[['bottom-left','Bas gauche'],['bottom-right','Bas droite'],['top-left','Haut gauche'],['top-right','Haut droite'],['center','Centre']],c.position)}${fieldSelect('Couche','layer',Array.from({length:8},(_,i)=>[i+1,`${i+1} · ${state.project.layerNames?.[i]||''}`]),c.layer)}</div>${range('Taille','scale',c.scale,.5,1.6,.01,'%')}<div class="field-grid">${field('Décalage X (px)','x',c.x,'number','min="-1920" max="1920"')}${field('Décalage Y (px)','y',c.y,'number','min="-1080" max="1080"')}</div>${range('Opacité','opacity',c.opacity,0,1,.01,'%')}</div>`;
 if(!['scene','note'].includes(c.type))content+=`<div class="inspector-section"><h4>ANIMATION</h4><div class="field-grid">${fieldSelect('Entrée / sortie','animation',[['slide','Glissement'],['fade','Fondu'],['cut','Cut']],c.animation)}${field('Transition (ms)','transition',c.transition,'number','min="0" max="2000" step="50"')}</div>${c.type==='video'?'':field('Retrait automatique (s, 0 = manuel)','duration',c.duration,'number','min="0" max="3600"')}</div>`;
 if(c.type==='scene')content+=`<div class="inspector-section"><h4>COMPOSITION · 8 COUCHES MAXIMUM</h4><p class="footnote">Une couche différente par graphique. Le GO est commun ; les autres couches restent à l’antenne.</p>${state.project.cues.filter(x=>!['scene','note'].includes(x.type)).map(x=>`<label class="scene-member"><input type="checkbox" data-member="${x.id}" ${c.sceneCueIds.includes(x.id)?'checked':''}> <span>C${x.layer} · ${escape(x.label)}</span></label>`).join('')}</div>`;
 content+=`<div class="inspector-section"><h4>CONDUITE</h4>${field('Groupe','group',c.group||'')}<label class="field"><span>Notes pour la régie</span><textarea data-field="notes">${escape(c.notes||'')}</textarea></label><label class="scene-member"><input data-field="skip" type="checkbox" ${c.skip?'checked':''}> Ignorer pendant l’enchaînement (SKIP)</label><label class="scene-member"><input data-field="favorite" type="checkbox" ${c.favorite?'checked':''}> Favori</label></div>`;
 el.innerHTML=`<div class="inspector-kind"><div class="cue-icon">${t[1]}</div><div><h3>${t[0]}</h3><small>${live?'À L’ANTENNE · COPIE DE TRAVAIL':'PRÉPARATION · HORS ANTENNE'}</small></div></div>${field('Nom dans le conducteur','label',c.label)}<label class="field"><span>Repère conducteur · HH:MM:SS:FF</span><input id="cue-timecode" value="${c.timecodeMs==null?'':formatTimecode(c.timecodeMs,state.project.settings.fps)}" placeholder="00:00:00:00" inputmode="numeric" aria-describedby="timecode-hint"><small id="timecode-hint">Repère indicatif, sans déclenchement automatique.</small></label>${content}<div class="inspector-note"><span>↗</span><div>${c.type==='image'?'L’alpha de votre PNG devient le key. Les pixels transparents restent transparents.':'Les modifications restent en préparation. Envoyez le graphique quand vous êtes prêt.'}</div></div>${live?'<button class="button full update" id="update-live">Mettre à jour à l’antenne ↗</button>':''}<div class="inspector-actions"><button class="button" id="duplicate">Dupliquer</button><button class="button delete" id="remove">Supprimer</button></div><div class="inspector-actions"><button class="button" id="move-up">↑ Monter</button><button class="button" id="move-down">↓ Descendre</button></div>`;
 el.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',()=>{
  const key=input.dataset.field;const numeric=['layer','scale','opacity','duration','transition','timerSeconds','scoreHome','scoreAway','x','y'].includes(key);const value=input.type==='checkbox'?input.checked:numeric?Number(input.value):input.value;
  drafts.set(c.id,{...drafts.get(c.id),[key]:value});if(input.type==='color')input.nextElementSibling.textContent=value.toUpperCase();const range=el.querySelector(`[data-range="${key}"]`);if(range)range.textContent=Math.round(value*100)+'%';
  const k=c.id+key;clearTimeout(debounces.get(k));debounces.set(k,setTimeout(()=>{debounces.delete(k);command({type:'edit',id:c.id,patch:{[key]:value}}).then(()=>{const draft=drafts.get(c.id);if(draft?.[key]===value){delete draft[key];if(!Object.keys(draft).length)drafts.delete(c.id);}}).catch(()=>{});},input.type==='range'?80:220));
 }));
 el.querySelectorAll('[data-member]').forEach(input=>input.onchange=()=>fire({type:'edit',id:c.id,patch:{sceneCueIds:[...el.querySelectorAll('[data-member]:checked')].map(x=>x.dataset.member)}}));
 $('#cue-timecode').oninput=e=>{try{const timecodeMs=parseTimecode(e.target.value,state.project.settings.fps);e.target.setCustomValidity('');drafts.set(c.id,{...drafts.get(c.id),timecodeMs});const k=c.id+'timecodeMs';clearTimeout(debounces.get(k));debounces.set(k,setTimeout(()=>{debounces.delete(k);command({type:'edit',id:c.id,patch:{timecodeMs}}).then(()=>{const draft=drafts.get(c.id);if(draft?.timecodeMs===timecodeMs){delete draft.timecodeMs;if(!Object.keys(draft).length)drafts.delete(c.id);}}).catch(()=>{});},220));}catch{}};
 $('#cue-timecode').onchange=e=>{try{const timecodeMs=parseTimecode(e.target.value,state.project.settings.fps);e.target.setCustomValidity('');fire({type:'edit',id:c.id,patch:{timecodeMs}});}catch(error){e.target.setCustomValidity(error.message);e.target.reportValidity();toast(error.message,true);}};
 $('#duplicate').onclick=()=>fire({type:'duplicate',id:c.id});$('#remove').onclick=()=>confirmRemove(c);$('#move-up').onclick=()=>fire({type:'move',id:c.id,direction:-1});$('#move-down').onclick=()=>fire({type:'move',id:c.id,direction:1});
 if($('#cue-asset-slot'))$('#cue-asset-slot').onchange=e=>{
  const slot=Number(e.target.value),previous=(state.project.assetSlots||[]).indexOf(c.id)+1;
  if(!slot&&!previous)return;
  if(slot&&state.project.assetSlots?.[slot-1]&&state.project.assetSlots[slot-1]!==c.id){
   toast('Libère cet emplacement dans le bac régie avant de le réattribuer.',true);e.target.value=previous;return;
  }
  command({type:'assetSlot',slot:slot||previous,id:slot?c.id:null,...(slot?{}:{expectedId:c.id})}).then(()=>inspector(true)).catch(()=>{});
 };
 if($('#replace-video'))$('#replace-video').onclick=()=>videoPicker(c.id);
 if($('#replace-image'))$('#replace-image').onclick=()=>{replaceMediaId=c.id;$('#png-input').click();};
 if($('#update-live'))$('#update-live').onclick=async()=>{const token=state.transportToken;try{await flushDrafts();await command({type:'updateLive',id:c.id},token);toast('Graphique mis à jour à l’antenne.');}catch{}};
 if($('#timer-toggle'))$('#timer-toggle').onclick=()=>fire({type:'timerToggle',id:c.id});if($('#timer-reset'))$('#timer-reset').onclick=()=>fire({type:'timerReset',id:c.id});
}
async function flushDrafts(){for(const timer of debounces.values())clearTimeout(timer);debounces.clear();const entries=[...drafts];for(const [id,patch]of entries){await command({type:'edit',id,patch});drafts.delete(id);}await chain;}
let filterText='',filterGroup='',filterFavorites=false;
function clipTime(ms){const total=Math.ceil(Math.max(0,ms)/1000);return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');}
function updateVideoControls(live){
 const clips=live.filter(item=>item.cue.type==='video'),panel=$('#video-controls');
 const key=JSON.stringify(clips.map(x=>[x.key,x.cue.label,x.cue.videoLoop,x.videoPausedAt!==null]));
 if(key===lastVideoControls)return;
 lastVideoControls=key;panel.hidden=!clips.length;
 panel.innerHTML=clips.map(x=>`<div class="video-transport" data-video="${x.key}"><strong>${escape(x.cue.label)}</strong><progress aria-label="Progression vidéo" max="${x.cue.videoDurationMs}" value="0"></progress><span class="video-remaining"><small>${x.cue.videoLoop?'RESTE AVANT BOUCLE':'TEMPS RESTANT'}</small><b>—</b></span><button class="button" data-operation="toggle">${x.videoPausedAt===null?'Pause':'Reprendre'}</button><button class="button" data-operation="restart">Repartir</button><button class="button" data-operation="out">OUT</button></div>`).join('');
 panel.querySelectorAll('[data-operation]').forEach(button=>button.onclick=()=>{
  const key=button.closest('[data-video]').dataset.video,operation=button.dataset.operation;
  fire(operation==='out'?{type:'outInstance',key}:{type:'videoTransport',key,operation});
 });
}
function tickVideoControls(now){
 const panel=$('#video-controls');
 for(const row of panel.children){
  const item=state.live.find(x=>x.key===row.dataset.video);
  if(!item)continue;
  const position=videoPosition(item,now);
  row.querySelector('progress').value=position;
  row.querySelector('b').textContent=clipTime(item.cue.videoDurationMs-position);
 }
}
async function preflightMedia(id){
 if(state.status.mode!=='web')return;
 const cue=state.project.cues.find(c=>c.id===id);
 const failures=(await prepareCues(expandPreview(cue))).filter(result=>result.state==='error');
 if(failures.length){const error=failures.map(result=>result.message).join(' · ');toast(error,true);throw Error(error);}
}
function readiness(c){const r=state.status.preparation?.[c.id];return c.type==='note'?'NOTE':c.skip?'SKIP':({ready:'PRÊT',available:'FICHIER PRÉSENT',loading:'CHARGEMENT',error:'ERREUR',idle:'À PRÉPARER'})[r?.state]||'À PRÉPARER';}
async function launchCue(id){
 const token=state.transportToken;
 try{await flushDrafts();await preflightMedia(id);await command({type:'go',id},token);}catch{}
}
function updateAssets(){
 const ids=[state.project.lastAssetId,...(state.project.assetSlots||Array(8).fill(null))];
 const entries=ids.map(id=>{
  const cue=state.project.cues.find(c=>c.id===id),phase=state.status.preparation?.[id]?.state;
  return cue?{id,label:cue.label,phase,live:onAir(id)}:null;
 });
 const key=JSON.stringify([entries,state.selectedId]);if(key===lastAssetView)return;lastAssetView=key;
 $('#assets-count').textContent=entries.slice(1).filter(Boolean).length+' / 8';
 const renderEntry=(entry,i)=>`<div class="asset-row"><span>${i===0?'DERNIER IMPORT':'MÉDIA '+i}</span><strong>${entry?escape(entry.label):'Libre'}</strong>${entry?`<small>${entry.live?'À L’ANTENNE':({ready:'PRÊT',available:'FICHIER PRÉSENT',loading:'CHARGEMENT',error:'ERREUR'})[entry.phase]||'À PRÉPARER'}</small><button class="button" data-asset-select="${entry.id}">Préparer</button><button class="button" data-asset-go="${entry.id}">GO</button><button class="button" data-asset-out="${entry.id}" ${entry.live?'':'disabled'}>OUT</button>${i?`<button class="button" data-slot-free="${i}" data-slot-owner="${entry.id}">Libérer</button>`:''}`:''}</div>`;
 const panel=$('#asset-rows');
 panel.innerHTML=entries.map(renderEntry).join('');
 panel.querySelectorAll('[data-asset-select]').forEach(b=>b.onclick=()=>fire({type:'select',id:b.dataset.assetSelect}));
 panel.querySelectorAll('[data-asset-go]').forEach(b=>b.onclick=()=>launchCue(b.dataset.assetGo));
 panel.querySelectorAll('[data-asset-out]').forEach(b=>b.onclick=()=>fire({type:'out',id:b.dataset.assetOut}));
 panel.querySelectorAll('[data-slot-free]').forEach(b=>b.onclick=()=>fire({type:'assetSlot',slot:Number(b.dataset.slotFree),id:null,expectedId:b.dataset.slotOwner}));
}
function renderList(){if(dragCueId)return;const key=JSON.stringify([state.project.cues,state.selectedId,state.playback,state.status.preparation,filterText,filterGroup,filterFavorites,state.live.map(x=>[x.cue.id,x.sceneId,x.exitingAt])]);if(key===lastListKey)return;lastListKey=key;
 const shown=state.project.cues.filter(c=>(!filterGroup||c.group===filterGroup)&&(!filterFavorites||c.favorite)&&(!filterText||[c.label,c.title,c.subtitle,c.group,c.notes].join(' ').toLocaleLowerCase().includes(filterText)));
 $('#cue-list').innerHTML=shown.length?shown.map(c=>{const i=state.project.cues.indexOf(c),live=onAir(c.id),selected=c.id===state.selectedId,r=state.status.preparation?.[c.id];return `<div class="cue-row ${selected?'selected':''} ${c.skip?'skipped':''} ${state.playback.enabled&&state.playback.nextId===c.id?'queued':''}" data-id="${c.id}" role="option" aria-selected="${selected}" tabindex="0"><span class="row-num" title="Glisser pour déplacer">⠿ <small>${String(i+1).padStart(2,'0')}</small></span><div class="cue-name"><span class="cue-icon">${TYPES[c.type][1]}</span><span class="cue-label"><strong>${c.favorite?'★ ':''}${escape(c.label)}</strong><small>${escape([c.group,c.type==='note'?c.notes:c.type==='scene'?`${c.sceneCueIds.length} graphiques`:c.title].filter(Boolean).join(' · '))}</small></span></div><span class="cue-timecode">${c.timecodeMs==null?'—':formatTimecode(c.timecodeMs,state.project.settings.fps)}</span><span class="layer-chip">${['scene','note'].includes(c.type)?'—':'C'+c.layer}</span><span title="${escape(r?.message||'')}" class="state-chip ${live?'live':r?.state==='error'?'error':r?.state==='ready'?'ready':''}">${live?'● ON AIR':(state.playback.enabled&&state.playback.nextId===c.id?'▶ ':'')+readiness(c)}</span><button class="row-go" data-go="${c.id}" ${c.type==='note'?'disabled':''} aria-label="Jouer ${escape(c.label)}">↗</button></div>`;}).join(''):'<div class="empty-list">Aucun élément dans cette vue.</div>';
 $('#filter-count').textContent=`${shown.length} / ${state.project.cues.length}`;
 $('#cue-list').querySelectorAll('.cue-row').forEach(row=>{row.onclick=e=>{if(!dragCueId&&Date.now()-lastDropAt>200&&!e.target.closest('[data-go]'))fire({type:'select',id:row.dataset.id});};row.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();fire({type:'select',id:row.dataset.id});}};});
 $('#cue-list').querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>launchCue(b.dataset.go));
}
function update(value){state=value;offset=value.serverTime-performance.now();const previewCues=expandPreview(selected());protectCues(previewCues);preloadCues(previewCues);
 const c=selected(),name=state.project.name;$('#project-title').innerHTML=escape(name)+'<span>.</span>';$('#project-breadcrumb').textContent=name;
 $('#cue-count').textContent=String(state.project.cues.length).padStart(2,'0');$('#rundown-count').textContent=state.project.cues.length;
 $('#preview-name').textContent=c?.label||'Aucun graphique';$('#preview-type').textContent=c?TYPES[c.type][0]:'Prévisualisation';$('#ready-label').textContent=c?.label||'Ajoutez un graphique';$('#go-button').disabled=!c||!connected;$('#out-button').disabled=!c||!onAir(c.id);$('#next-button').disabled=!c;
 const live=state.live.filter(x=>!x.exitingAt);$('#live-dot').className='dot'+(live.length?' live':'');$('#program-status').textContent=live.length?`${live.length} GRAPHIQUE${live.length>1?'S':''} EN DIRECT`:'HORS ANTENNE';$('#empty-program').hidden=state.live.length>0;$('#layer-status').textContent=live.length?`Couches ${live.map(x=>x.cue.layer).sort((a,b)=>a-b).join(' · ')} actives`:'Aucune couche active';$('#program-format').textContent='1080p'+state.project.settings.fps;
 const native=state.status.mode==='native';$('#engine-dot').className='dot'+(connected?' mint':'');$('#engine-label').innerHTML=(native?'Engine connecté':'Aperçu web')+`<small>1080p${state.project.settings.fps} · ${state.status.output.error?'DÉFAUT SDI':state.status.output.running?'SDI ACTIF':native?'SDI ARRÊTÉ':'SANS SORTIE SDI'}</small>`;
 $('#save-status').innerHTML='<i></i>'+escape(state.status.saveError?'Sauvegarde impossible':state.status.savedAt?'Enregistré sur ce Mac':'Sauvegarde locale prête');
 updateVideoControls(live);if(!$('#video-controls').hidden)tickVideoControls(value.serverTime);updateWorkflow();updateTransport();updateAssets();renderList();inspector();if(outputDialog)updateOutputStatus();
}
const events=new EventSource('/api/events');events.onmessage=e=>{connected=true;update(JSON.parse(e.data));};events.onerror=()=>{connected=false;$('#engine-dot').className='dot';$('#engine-label').innerHTML='Moteur déconnecté<small>RECONNEXION EN COURS</small>';$('#go-button').disabled=true;};
let lastFrame=0,nativeImage=null,monitorBusy=false,monitorAt=0;
function expandPreview(c){return !c||c.type==='note'?[]:c.type==='scene'?c.sceneCueIds.map(id=>state.project.cues.find(x=>x.id===id)).filter(x=>x&&!['scene','note'].includes(x.type)):[c];}
async function pollMonitor(){if(monitorBusy||!connected||state?.status.mode!=='native')return;monitorBusy=true;try{const r=await fetch('/api/monitor.png',{signal:AbortSignal.timeout(2500)});if(!r.ok)throw Error();const bitmap=await createImageBitmap(await r.blob());nativeImage?.close();nativeImage=bitmap;monitorAt=Number(r.headers.get('X-GraphX-Frame-Time'));}catch{}finally{monitorBusy=false;}}
setInterval(pollMonitor,200);
function animate(time){if(state&&time-lastFrame>=1000/60){lastFrame=time;const c=selected(),now=performance.now()+offset;render($('#preview'),expandPreview(c).map(previewItem),now,{preview:true});if(state.status.mode==='native'){if(nativeImage)renderNativeFrame($('#program'),nativeImage,{key:viewMode==='key',fill:viewMode==='fill'});const age=monitorAt?now-monitorAt:Infinity;$('#return-status').textContent=age<2000?'RETOUR DU MOTEUR · 5 IMAGES/S':'RETOUR MOTEUR ABSENT OU FIGÉ';$('#return-status').classList.toggle('warning',age>=2000);}else{render($('#program'),state.live,now,{key:viewMode==='key',fill:viewMode==='fill'});$('#return-status').textContent='APERÇU WEB · SANS MOTEUR NATIF';}if(!$('#video-controls').hidden)tickVideoControls(now);updateClock();$('#clock').textContent=new Date().toLocaleTimeString('fr-CH',{hour12:false});}requestAnimationFrame(animate);}requestAnimationFrame(animate);
function modal(title,description,content){outputDialog=false;$('#modal-content').innerHTML=`<div class="modal-header"><h2>${title}</h2><button class="icon-btn" id="modal-close" aria-label="Fermer">×</button></div>${description?`<p class="modal-description">${description}</p>`:''}${content}`;$('#modal-close').onclick=closeModal;if(!$('#modal').open)$('#modal').showModal();}
function closeModal(){outputDialog=false;$('#modal').close();}$('#modal').addEventListener('close',()=>outputDialog=false);$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function addModal(){modal('Une idée à l’antenne.','Choisissez un modèle. Le style et les contenus restent entièrement personnalisables.',`<div class="modal-grid">${Object.entries(TYPES).map(([key,t])=>`<button class="template-card" data-add="${key}"><span class="symbol">${t[1]}</span><span><strong>${t[0]}</strong><small>${t[2]}</small></span></button>`).join('')}</div>`);document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{closeModal();if(b.dataset.add==='image')importPicker();else if(b.dataset.add==='video')videoPicker();else fire({type:'add',kind:b.dataset.add});});}
function videoPicker(id=null){replaceVideoId=id;$('#video-input').click();}
function importPicker(){replaceMediaId=null;$('#png-input').click();}
function assetPicker(){$('#asset-input').click();}
const assetMime=new Map([['png','image/png'],['jpeg','image/jpeg'],['jpg','image/jpeg'],['webp','image/webp'],['webm','video/webm']]);
async function importFiles(files,{replaceId=null,staged=false}={}){
 const list=[...files];if(!list.length)return;
 if(assetImportBusy){toast('Un import est déjà en cours.',true);return;}
 assetImportBusy=true;
 const liveAtStart=state.live.length>0||state.status.output.running||state.status.output.starting;
 try{
  const entries=[];
  for(const [i,file] of list.entries()){
   const mime=assetMime.get(file.name.split('.').at(-1).toLowerCase())||file.type,video=mime==='video/webm';
   if(!video&&!['image/png','image/jpeg','image/webp'].includes(mime))throw Error('Format non pris en charge · '+file.name);
   if(file.size>(video?250:25)*1024*1024)throw Error('Fichier trop volumineux · '+file.name);
   toast(`Import ${i+1}/${list.length} · ${file.name}`);
   let videoDurationMs;
   if(video)videoDurationMs=await inspectVideo(file);
   else{
    const source=URL.createObjectURL(file),decoded=new Image();decoded.src=source;
    try{
     await decoded.decode();
     if(decoded.naturalWidth>8192||decoded.naturalHeight>8192||decoded.naturalWidth*decoded.naturalHeight>33554432)throw Error('Image trop grande.');
    }catch(e){throw Error(file.name+' · '+e.message);}
    finally{URL.revokeObjectURL(source);}
   }
   const response=await fetch(video?'/api/video':'/api/media',{method:'POST',headers:{'Content-Type':mime},body:file});
   const result=await response.json();if(!response.ok)throw Error(result.error);
   entries.push({type:video?'video':'image',media:result.name,label:file.name.replace(/\.[^.]+$/,''),...(video?{videoDurationMs}:{title:file.name})});
  }
  if(replaceId){
   const {type,media,videoDurationMs}=entries[0],cue=state.project.cues.find(c=>c.id===replaceId);
   if(!cue||type!==(cue.type==='video'?'video':'image'))throw Error('Ce fichier ne correspond plus au graphique à remplacer.');
   await command({type:'edit',id:replaceId,patch:{media,videoDurationMs}});
  }
  else await command({type:'importAssets',cues:entries,staged:staged||liveAtStart});
  if(staged||liveAtStart)$('#asset-bin').open=true;
  toast(entries.length===1?'Média importé.':`${entries.length} médias importés.`);
 }catch(e){toast(e.message,true);}
 finally{assetImportBusy=false;}
}
$('#video-input').onchange=e=>{const files=[...e.target.files],id=replaceVideoId;replaceVideoId=null;e.target.value='';importFiles(files,{replaceId:id});};
$('#png-input').onchange=e=>{const files=[...e.target.files],id=replaceMediaId;replaceMediaId=null;e.target.value='';importFiles(id?files.slice(0,1):files,{replaceId:id});};
$('#asset-input').onchange=e=>{const files=[...e.target.files];e.target.value='';importFiles(files,{staged:true});};
$('#asset-import').onclick=assetPicker;
function confirmRemove(c){modal('Retirer du conducteur ?',`« ${escape(c.label)} » sera retiré du projet.${onAir(c.id)?' Sa copie à l’antenne continuera jusqu’au retrait global.':''}`,`<div class="modal-actions"><button class="button" id="cancel-remove">Annuler</button><button class="button delete" id="confirm-remove">Retirer</button></div>`);$('#cancel-remove').onclick=closeModal;$('#confirm-remove').onclick=()=>{fire({type:'remove',id:c.id});closeModal();};}
function projectModal(){modal('Votre production.','Le projet est enregistré automatiquement sur ce Mac. L’export emporte les images et les vidéos avec le conducteur.',`<label class="modal-field"><span>Nom du projet</span><input id="project-name-input" value="${escape(state.project.name)}" maxlength="120"></label><div class="modal-actions"><button class="button" id="show-backups">Sauvegardes datées</button><button class="button" id="load-project">Ouvrir un projet</button><a class="button" href="/api/archive" download="graphX-project.graphx">Exporter .graphx ↗</a><button class="button update" id="save-name">Enregistrer</button></div><p class="footnote">Un projet s’ouvre uniquement hors antenne et sortie SDI arrêtée. Les médias sont inclus dans le fichier exporté.</p>`);$('#save-name').onclick=()=>{fire({type:'rename',name:$('#project-name-input').value});closeModal();};$('#load-project').onclick=()=>$('#project-input').click();$('#show-backups').onclick=backupsModal;}
$('#project-input').onchange=async()=>{try{const file=$('#project-input').files[0];if(!file)return;const magic=await file.slice(0,8).text();if(magic==='GRAPHX2\n'){const r=await fetch('/api/archive',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:file});const data=await r.json();if(!r.ok)throw Error(data.error);}else await api('/api/import',JSON.parse(await file.text()));closeModal();toast('Projet chargé. Vérification des ressources en cours.');}catch(e){toast(e.message,true);}$('#project-input').value='';};
async function outputModal(){
 const s=state.project.settings;const devices=state.status.hardware.devices;
 modal('Du pixel au SDI.','Le moteur garde le programme actif indépendamment de cette fenêtre. Branchez l’UltraStudio, choisissez le format, puis activez la sortie.',`
 <div id="output-status"></div><button class="button full" id="open-obs-settings">Configurer aussi la sortie OBS ↗</button>
 <label class="modal-field"><span>Périphérique Blackmagic</span><select id="output-device"><option value="">Choisir un périphérique…</option>${devices.map(d=>`<option value="${escape(d.id)}" ${d.id===s.deviceId?'selected':''}>${escape(d.name)}${d.externalKey?'':' · sans key externe'}</option>`).join('')}</select></label>
 <div class="field-grid"><label class="modal-field"><span>Format de sortie</span><select id="output-fps">${[25,30,50,59.94,60].map(f=>`<option value="${f}" ${f===s.fps?'selected':''}>1920 × 1080p${f}</option>`).join('')}</select></label><label class="modal-field"><span>Alpha du fill</span><select id="output-alpha"><option value="premultiplied" ${s.alpha==='premultiplied'?'selected':''}>Prémultiplié</option><option value="straight" ${s.alpha==='straight'?'selected':''}>Droit / Straight</option></select></label></div>
 <label class="modal-field"><span>Transport SDI 3G</span><select id="output-level"><option value="true" ${s.levelA?'selected':''}>Level A</option><option value="false" ${!s.levelA?'selected':''}>Level B</option></select></label>
 <p class="footnote">Le key provient du canal alpha. Réglez le mélangeur sur la même cadence et le même type d’alpha. L’aperçu dans graphX montre le rendu logiciel ; il ne remplace pas le contrôle des deux SDI.</p>
 <div id="output-stats"></div><div class="modal-actions"><button class="button" id="rescan">↻ Actualiser</button><button class="button" id="stop-output">Arrêter</button><button class="button update" id="start-output">Activer Key + Fill ↗</button></div>
 <div class="modal-actions"><a class="text-button" href="/program.html" target="_blank">Sortie navigateur transparente ↗</a><a class="text-button" href="/api/diagnostics" target="_blank">Diagnostic JSON ↗</a></div>`);
 outputDialog=true;updateOutputStatus();$('#open-obs-settings').onclick=obsModal;$('#rescan').onclick=async()=>{try{await api('/api/scan',{});await outputModal();toast('Périphériques actualisés.');}catch(e){toast(e.message,true);}};
 $('#start-output').onclick=async()=>{try{await command({type:'settings',settings:{deviceId:$('#output-device').value,fps:Number($('#output-fps').value),alpha:$('#output-alpha').value,levelA:$('#output-level').value==='true'}});await api('/api/output',{action:'start'});}catch(e){toast(e.message,true);}};
 $('#stop-output').onclick=async()=>{try{await api('/api/output',{action:'stop'});}catch(e){toast(e.message,true);}};
}
function updateOutputStatus(){if(!$('#output-status'))return;const o=state.status.output;$('#output-status').innerHTML=`<div class="status-banner ${o.error?'error':o.running?'success':''}">${escape(o.message)}${!state.status.hardware.devices.length?'<br>Aucun périphérique détecté. Branchez votre UltraStudio puis actualisez.':''}</div>`;
 const running=o.running||o.starting;for(const id of ['output-device','output-fps','output-alpha','output-level'])$('#'+id).disabled=running;$('#start-output').disabled=running||state.status.mode!=='native';$('#stop-output').disabled=!running;
 $('#output-stats').innerHTML=`<div class="diagnostic-row"><span>Rendu graphique</span><strong>${state.status.render.fps||0} images/s</strong></div><div class="diagnostic-row"><span>Images SDI terminées / tardives / perdues</span><strong>${o.stats.completed||0} / ${o.stats.late||0} / ${o.stats.dropped||0}</strong></div><div class="diagnostic-row"><span>Images non transférées (charge moteur)</span><strong>${o.stats.transferSkipped||0}</strong></div>`;
}
function obsModal(){
 const url=new URL('/obs.html',location.origin).href,fps=state.project.settings.fps;
 modal('graphX dans OBS.','Votre programme avec transparence, directement dans une source Navigateur. OBS et graphX doivent tourner sur ce même Mac.',`
 <div class="status-banner success">1920 × 1080 · Alpha transparent · Même programme que le Key + Fill</div>
 <label class="modal-field"><span>URL à coller dans OBS</span><input id="obs-url" readonly value="${escape(url)}" spellcheck="false"></label>
 <div class="modal-actions"><button class="button update" id="copy-obs-url">Copier le lien OBS</button><a class="button" href="${escape(url)}" target="_blank" rel="noopener">Ouvrir la sortie ↗</a></div>
 <ol class="obs-steps"><li>Dans OBS, ajoutez une source <strong>Navigateur</strong> au-dessus de votre caméra ou de votre fond.</li><li>Laissez <strong>Fichier local</strong> décoché, puis collez cette URL.</li><li>Réglez la largeur sur <strong>1920</strong> et la hauteur sur <strong>1080</strong>.</li><li>${fps===59.94?'Réglez la cadence vidéo globale d’OBS sur <strong>59,94 images/s</strong> et laissez la cadence personnalisée de la source décochée.':`Activez la cadence personnalisée de la source : <strong>${fps} images/s</strong>. Réglez aussi la vidéo d’OBS à cette cadence pour un mouvement régulier.`}</li><li>Laissez décochés <strong>Arrêter la source lorsqu’elle n’est pas visible</strong> et <strong>Actualiser le navigateur lorsque la scène devient active</strong>.</li><li>Conservez le CSS transparent par défaut. Revenez dans graphX et envoyez un graphique avec <strong>GO / Espace</strong>.</li></ol>
 <p class="footnote">La sortie transmet le programme à l’antenne, avec vos PNG et leurs alphas. Aucun fond vert ni filtre chroma key nécessaire. La prévisualisation et les repères du conducteur ne sont pas envoyés.</p>
 <p class="footnote">Gardez graphX Engine ouvert. La sortie OBS fonctionne sans activer les SDI et peut rester ouverte pendant le Key + Fill. Les deux rendus suivent les mêmes commandes ; leur synchronisation image par image n’est pas garantie. Cette adresse locale ne fonctionne pas depuis un autre ordinateur.</p>
 <a class="text-button" href="https://obsproject.com/kb/browser-source" target="_blank" rel="noopener">Documentation officielle OBS ↗</a>`);
 $('#copy-obs-url').onclick=async()=>{try{await navigator.clipboard.writeText(url);toast('Lien OBS copié.');$('#copy-obs-url').textContent='Lien copié ✓';}catch{$('#obs-url').focus();$('#obs-url').select();toast('Lien sélectionné : utilisez ⌘C pour le copier.');}};
 $('#obs-url').onclick=e=>e.target.select();
}
function helpModal(){modal('Les mains sur le direct.','Mode conducteur : Espace joue le prochain élément, puis prépare le suivant. La sélection reste libre. G recale le prochain sur votre sélection. Les raccourcis sont suspendus dans les champs de saisie.',`<ul class="help-list"><li>Jouer / enchaîner en mode conducteur<kbd>ESPACE</kbd></li><li>Recaler le prochain sur la sélection<kbd>G</kbd></li><li>Déplacer la sélection dans le conducteur<kbd>MAJ + ↑ / ↓</kbd></li><li>Démarrer / mettre en pause l’horloge<kbd>T</kbd></li><li>Jouer puis sélectionner le suivant<kbd>MAJ + ESPACE</kbd></li><li>Retirer le dernier envoyé en mode conducteur<kbd>O</kbd></li><li>Naviguer dans le conducteur<kbd>↑ / ↓</kbd></li><li>Tout retirer immédiatement<kbd>ÉCHAP</kbd></li></ul><p class="footnote">Chaque couche accueille un graphique à la fois, avec transition lors du remplacement. Le conducteur reste modifiable sans changer l’antenne : utilisez « Mettre à jour à l’antenne » pour appliquer vos modifications.</p><p class="footnote">Import PNG : les fichiers 1920 × 1080 centrés à 100 % retrouvent leur placement d’origine. L’export .graphx contient les médias. Cette version locale est disponible sur ce Mac uniquement.</p>`);}
function updateTransport(){
 const p=state.playback,next=state.project.cues.find(c=>c.id===p.nextId),last=state.project.cues.find(c=>c.id===p.lastId),c=selected();
 $('#follow-mode').checked=p.enabled;
 $('#ready-caption').textContent=p.enabled?'PROCHAIN DANS LE CONDUCTEUR':'SÉLECTION PRÊTE À JOUER';
 $('#ready-label').textContent=p.enabled?(next?.label||'Fin du conducteur'):c?.label||'Ajoutez un graphique';
 $('#go-title').textContent=p.enabled?'ENCHAÎNER':'GO';
 $('#go-button').disabled=!connected||transportBusy||!(p.enabled?next:c)||(p.enabled?next:c)?.type==='note';
 $('#out-button').disabled=!connected||!onAir(p.enabled?p.lastId:c?.id);
 $('#arm-button').hidden=!p.enabled;$('#arm-button').disabled=!connected||!c||c.skip||c.type==='note';
 $('#next-button').hidden=p.enabled;
 $('#last-played').textContent=p.enabled?`Dernier envoyé : ${last?.label||'—'}`:'Espace · jouer / Maj + Espace · jouer et avancer';
 $('#clock-toggle').textContent=p.clockStartedAt===null?'▶ Démarrer':'Ⅱ Pause';
}
function updateClock(){
 const p=state.playback,ms=elapsedClock(p,performance.now()+offset),fps=state.project.settings.fps;
 $('#show-timecode').textContent=formatTimecode(ms,fps);
 const next=state.project.cues.find(c=>c.id===(p.enabled?p.nextId:state.selectedId));
 const delta=next?.timecodeMs==null?null:next.timecodeMs-ms;
 $('#cue-countdown').textContent=delta===null?'Aucun repère sur le prochain élément':`${delta>=0?'Repère dans':'Repère dépassé de'} ${formatTimecode(Math.abs(delta),fps)}`;
 $('#cue-countdown').classList.toggle('late',delta!==null&&delta<0);
}
async function take(advance=false){
 if(transportBusy||!connected)return;
 const intent={follow:state.playback.enabled,nextId:state.playback.nextId,selectedId:state.selectedId,token:state.transportToken};
 transportBusy=true;updateTransport();
 try{await flushDrafts();await preflightMedia(intent.follow?intent.nextId:intent.selectedId);if(intent.follow)await command({type:'advance',expectedId:intent.nextId},intent.token);else{await command({type:'go',id:intent.selectedId},intent.token);if(advance)await command({type:'next',id:intent.selectedId});}}
 catch{}finally{transportBusy=false;updateTransport();}
}
function outCurrent(){const id=state.playback.enabled?state.playback.lastId:state.selectedId;if(id)fire({type:'out',id});}
$('#go-button').onclick=()=>take();$('#out-button').onclick=outCurrent;$('#next-button').onclick=()=>fire({type:'next'});
$('#follow-mode').onchange=e=>{fire({type:'followMode',enabled:e.target.checked});e.target.blur();};
$('#arm-button').onclick=()=>fire({type:'arm'});
$('#clock-toggle').onclick=()=>fire({type:'clockToggle'});$('#clock-reset').onclick=()=>fire({type:'clockReset'});
$('#clear-button').onclick=clearProgram;
$('#add-button').onclick=addModal;$('#import-png').onclick=importPicker;$('#nav-import').onclick=importPicker;$('#nav-video').onclick=()=>videoPicker();$('#project-menu').onclick=projectModal;$('#nav-project').onclick=projectModal;$('#nav-output').onclick=outputModal;$('#nav-obs').onclick=obsModal;$('#nav-rundown').onclick=()=>$('.rundown').scrollIntoView({behavior:'smooth'});$('#shortcuts').onclick=helpModal;$('#help-button').onclick=helpModal;
$('#safe-toggle').onclick=()=>{$('.safe-area').hidden=!$('.safe-area').hidden;};$('#view-mode').querySelectorAll('button').forEach(b=>b.onclick=()=>{viewMode=b.dataset.mode;$('#view-mode').querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&!$('#modal').open&&!e.repeat&&!e.metaKey&&!e.ctrlKey&&!e.altKey){e.preventDefault();clearProgram();return;}
 if($('#modal').open||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable||e.metaKey||e.ctrlKey||e.altKey||!connected)return;
 // Prevent native Space/Enter activation on a focused button from sending a second command.
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)take(e.shiftKey);return;}
 if(e.repeat){if(['o','t','g'].includes(e.key.toLowerCase()))e.preventDefault();return;}
 if(e.key.toLowerCase()==='o'){e.preventDefault();outCurrent();}
 else if(e.key.toLowerCase()==='g'&&state.playback.enabled){e.preventDefault();fire({type:'arm'});}
 else if(e.key.toLowerCase()==='t'){e.preventDefault();fire({type:'clockToggle'});}
 else if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  e.preventDefault();const direction=e.key==='ArrowDown'?1:-1;
  if(e.shiftKey){fire({type:'move',direction});return;}
  const i=state.project.cues.findIndex(x=>x.id===state.selectedId),next=Math.max(0,Math.min(state.project.cues.length-1,i+direction));if(state.project.cues[next])fire({type:'select',id:state.project.cues[next].id});
 }
});
const list=$('#cue-list');
function clearDropMark(){list.querySelectorAll('.drop-before,.drop-after').forEach(row=>row.classList.remove('drop-before','drop-after'));}
function endDrag(){cancelAnimationFrame(dragScroll);dragCueId=null;dragBeforeId=null;clearDropMark();lastListKey='';renderList();}
function markDropTarget(){
 clearDropMark();const rows=[...list.querySelectorAll('.cue-row')],target=rows.find(item=>dragY<item.getBoundingClientRect().top+item.getBoundingClientRect().height/2);
 dragBeforeId=target?.dataset.id||null;
 if(target)target.classList.add('drop-before');else rows.at(-1)?.classList.add('drop-after');
}
function scrollDrag(){
 if(!dragCueId)return;const main=document.querySelector('main'),rect=main.getBoundingClientRect();
 const top=Math.max(rect.top,0)+70,bottom=Math.min(rect.bottom,window.innerHeight)-70;
 const dy=dragY<top?-Math.min(22,(top-dragY)/3):dragY>bottom?Math.min(22,(dragY-bottom)/3):0;
 if(dy){if(main.scrollHeight>main.clientHeight)main.scrollTop+=dy;else window.scrollBy(0,dy);markDropTarget();}
 dragScroll=requestAnimationFrame(scrollDrag);
}
list.addEventListener('pointerdown',e=>{
 const handle=e.target.closest('.row-num');if(!handle||e.button!==0)return;
 e.preventDefault();const row=handle.closest('.cue-row'),startY=e.clientY,startX=e.clientX;
 handle.setPointerCapture(e.pointerId);
 const move=event=>{
  if(!dragCueId&&Math.hypot(event.clientY-startY,event.clientX-startX)<5)return;
  if(!dragCueId){dragCueId=row.dataset.id;dragBeforeId=dragCueId;row.classList.add('dragging');dragScroll=requestAnimationFrame(scrollDrag);}
  dragY=event.clientY;markDropTarget();
 };
 const finish=event=>{
  handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',finish);
  if(dragCueId){const id=dragCueId,beforeId=dragBeforeId;lastDropAt=Date.now();endDrag();if(event.type!=='pointercancel')fire({type:'reorder',id,beforeId});}
  else fire({type:'select',id:row.dataset.id});
 };
 handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
});
document.addEventListener('dragover',e=>{if(dragCueId)dragY=e.clientY;if(e.dataTransfer?.types.includes('Files'))e.preventDefault();});
document.addEventListener('dragenter',e=>{if(e.dataTransfer?.types.includes('Files')){e.preventDefault();dragDepth++;$('#drop-overlay').hidden=false;}});
document.addEventListener('dragleave',e=>{if(e.dataTransfer?.types.includes('Files')&&--dragDepth<=0){dragDepth=0;$('#drop-overlay').hidden=true;}});
document.addEventListener('drop',e=>{if(!e.dataTransfer?.types.includes('Files'))return;e.preventDefault();dragDepth=0;$('#drop-overlay').hidden=true;importFiles(e.dataTransfer.files);});
window.addEventListener('beforeunload',()=>{for(const [id,patch]of drafts)fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'edit',id,patch}),keepalive:true});});

let lastGroups='',lastLayers='';
function updateWorkflow(){
 const groups=[...new Set(state.project.cues.map(c=>c.group).filter(Boolean))],signature=JSON.stringify(groups);
 if(signature!==lastGroups){lastGroups=signature;if(!groups.includes(filterGroup))filterGroup='';$('#filter-group').innerHTML='<option value="">Tous les groupes</option>'+groups.map(g=>`<option value="${escape(g)}" ${g===filterGroup?'selected':''}>${escape(g)}</option>`).join('');}
 $('#undo').disabled=!state.history?.undo;$('#redo').disabled=!state.history?.redo;$('#arm-group').disabled=!filterGroup;
 const active=state.live.filter(x=>!x.exitingAt),key=JSON.stringify([active,state.project.layerNames]);$('#live-layer-count').textContent=active.length;
 if(key!==lastLayers){lastLayers=key;$('#live-layers').innerHTML=Array.from({length:8},(_,i)=>{const items=active.filter(x=>x.cue.layer===i+1);return `<div class="live-layer"><span>C${i+1} · ${escape(state.project.layerNames?.[i]||'')}</span><strong>${items.map(x=>escape(x.cue.label)).join(' / ')||'Libre'}</strong>${items.map(x=>`<button class="button" data-out-instance="${x.key}">OUT</button>`).join('')}</div>`;}).join('');$('#live-layers').querySelectorAll('[data-out-instance]').forEach(b=>b.onclick=()=>fire({type:'outInstance',key:b.dataset.outInstance}));}
}
async function historyAction(type){try{await flushDrafts();await command({type});inspector(true);}catch{}}
$('#undo').onclick=()=>historyAction('undo');$('#redo').onclick=()=>historyAction('redo');
$('#search-cues').oninput=e=>{filterText=e.target.value.trim().toLocaleLowerCase();renderList();};
$('#filter-group').onchange=e=>{filterGroup=e.target.value;$('#arm-group').disabled=!filterGroup;renderList();};
$('#filter-favorites').onclick=()=>{filterFavorites=!filterFavorites;$('#filter-favorites').setAttribute('aria-pressed',String(filterFavorites));renderList();};
$('#reset-filters').onclick=()=>{filterText='';filterGroup='';filterFavorites=false;$('#search-cues').value='';$('#filter-group').value='';$('#filter-favorites').setAttribute('aria-pressed','false');$('#arm-group').disabled=true;renderList();};
$('#arm-group').onclick=()=>fire({type:'groupArm',group:filterGroup});
document.addEventListener('keydown',e=>{if(!connected||$('#modal').open||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable)return;if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(!e.repeat)historyAction(e.shiftKey?'redo':'undo');}});
$('#name-layers').onclick=()=>{modal('Vos huit couches.','Les noms sont communs à toutes les scènes.',`<div class="field-grid">${state.project.layerNames.map((n,i)=>`<label class="field"><span>Couche ${i+1}</span><input data-layer-name value="${escape(n)}" maxlength="40"></label>`).join('')}</div><button class="button update" id="save-layers">Enregistrer</button>`);$('#save-layers').onclick=async()=>{try{await command({type:'layerNames',names:[...document.querySelectorAll('[data-layer-name]')].map(x=>x.value)});closeModal();}catch{}};};
function csvModal(){
 modal('Des intervenants, en quelques lignes.','Importez un CSV avec les colonnes nom, fonction, groupe, notes. Virgule ou point-virgule acceptés. Relisez et corrigez les lignes avant de les ajouter.',`<input type="file" id="csv-file" accept=".csv,text/csv"><label class="field"><span>Ou collez votre tableau CSV</span><textarea id="csv-source" rows="6" placeholder="nom;fonction;groupe&#10;Alex Morgan;Présentation;Ouverture"></textarea></label><button class="button" id="csv-preview">Préparer l’import</button><div id="csv-preview-list"></div><button class="button update" id="csv-confirm" hidden>Ajouter au conducteur</button>`);
 let rows=[];$('#csv-file').onchange=async e=>{try{const file=e.target.files[0];if(file){if(file.size>1024*1024)throw Error('CSV limité à 1 Mo.');$('#csv-source').value=await file.text();$('#csv-preview').click();}}catch(e){toast(e.message,true);}};
 $('#csv-source').oninput=()=>{$('#csv-confirm').hidden=true;};
 $('#csv-preview').onclick=()=>{try{rows=parseCSV($('#csv-source').value);$('#csv-preview-list').innerHTML=`<p>${rows.length} éléments · modifications possibles avant l’import</p>`+rows.map((c,i)=>`<div class="csv-row"><span>${i+1}</span>${['title','subtitle','group'].map(k=>`<input data-csv-row="${i}" data-csv-key="${k}" aria-label="${k} ligne ${i+1}" value="${escape(c[k]||'')}">`).join('')}</div>`).join('');$('#csv-preview-list').querySelectorAll('input').forEach(input=>input.oninput=()=>{rows[Number(input.dataset.csvRow)][input.dataset.csvKey]=input.value;});$('#csv-confirm').hidden=false;}catch(e){rows=[];$('#csv-confirm').hidden=true;toast(e.message,true);}};
 $('#csv-confirm').onclick=async()=>{const button=$('#csv-confirm');button.disabled=true;try{if(rows.some(c=>!c.title.trim()))throw Error('Chaque ligne doit avoir un nom.');await flushDrafts();await command({type:'batchAdd',cues:rows});closeModal();toast(`${rows.length} éléments ajoutés.`);}catch(e){toast(e.message,true);button.disabled=false;}};
}
$('#import-csv').onclick=csvModal;
async function libraryModal(){
 try{const items=await api('/api/media-library');modal('Vos habillages.','Réutilisez une image déjà importée. La transparence reste conservée.',`<input type="search" id="media-search" placeholder="Rechercher un habillage…" aria-label="Rechercher un média"><div class="media-library" id="media-library"></div>`);
 const draw=()=>{const q=$('#media-search').value.toLowerCase();$('#media-library').innerHTML=items.filter(x=>(x.label+' '+x.uses.join(' ')).toLowerCase().includes(q)).map(x=>`<button class="media-card" data-media="${x.name}"><img src="/media/${x.name}" loading="lazy" alt="${escape(x.label)}"><strong>${escape(x.label)}</strong><small>${(x.bytes/1024/1024).toFixed(1)} Mo · ${x.uses.length} utilisation(s)</small></button>`).join('')||'<p class="footnote">Aucune image. Importez un PNG pour commencer.</p>';$('#media-library').querySelectorAll('[data-media]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{const item=items.find(x=>x.name===b.dataset.media);await flushDrafts();await command({type:'batchAdd',cues:[{type:'image',media:item.name,label:item.label,position:'center'}]});closeModal();}catch{b.disabled=false;}});};$('#media-search').oninput=draw;draw();
 }catch(e){toast(e.message,true);}
}
$('#nav-library').onclick=libraryModal;
function themesModal(){
 const c=selected();if(!c)return;const themes=[{id:'studio',name:'Studio',accent:'#ff704d',background:'#142328',textColor:'#ffffff'},{id:'mint',name:'Menthe',accent:'#b5f4d6',background:'#142328',textColor:'#ffffff'},{id:'blue',name:'Bleu nuit',accent:'#78aaff',background:'#101e38',textColor:'#ffffff'},...(state.project.themes||[])];
 modal('Une identité commune.','Le thème modifie la préparation. Les copies déjà à l’antenne gardent leur aspect.',`<label class="field"><span>Appliquer à</span><select id="theme-scope"><option value="selected">Sélection</option>${c.group?`<option value="group">Groupe · ${escape(c.group)}</option>`:''}<option value="all">Tout le conducteur</option></select></label><div class="theme-grid">${themes.map((t,i)=>`<button class="button theme-card" data-theme="${i}" style="border-left:8px solid ${t.accent}">${escape(t.name)}</button>`).join('')}</div><label class="field"><span>Créer un thème depuis la sélection</span><input id="theme-name" placeholder="Nom de mon thème" maxlength="80"></label><button class="button" id="save-theme">Enregistrer ces couleurs</button>`);
 document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=async()=>{try{await flushDrafts();const scope=$('#theme-scope').value,ids=state.project.cues.filter(x=>scope==='all'||(scope==='group'?x.group===c.group:x.id===c.id)).map(x=>x.id);await command({type:'themeApply',theme:themes[Number(b.dataset.theme)],ids});closeModal();inspector(true);toast('Thème appliqué à la préparation.');}catch{}});
 $('#save-theme').onclick=async()=>{try{await flushDrafts();const current=selected(),name=$('#theme-name').value.trim();if(!name)throw Error('Donne un nom au thème.');await command({type:'themeSave',theme:{id:crypto.randomUUID(),name,accent:current.accent,background:current.background,textColor:current.textColor}});themesModal();}catch(e){toast(e.message,true);}};
}
$('#themes').onclick=themesModal;
async function backupsModal(){try{const names=await api('/api/backups');modal('Retrouver une préparation.','Les 30 dernières sauvegardes datées sont conservées sur ce Mac, au maximum une par minute. Restauration hors antenne et SDI arrêté.',`<label class="field"><span>Sauvegarde</span><select id="backup-name">${names.map(n=>`<option value="${escape(n)}">${escape(n.replace('.json',''))}</option>`).join('')}</select></label><button class="button update" id="restore-backup" ${names.length?'':'disabled'}>Restaurer cette préparation</button><p class="footnote">Les médias restent dans la médiathèque locale. Exportez une archive .graphx pour une copie transportable.</p>`);$('#restore-backup').onclick=async()=>{try{await api('/api/restore',{name:$('#backup-name').value});closeModal();toast('Sauvegarde restaurée.');}catch(e){toast(e.message,true);}};}catch(e){toast(e.message,true);}}
function diagnosticsModal(){
 const s=state.status,health=s.health||[],age=(s.render.lastTick||s.render.lastPaint)?Math.max(0,performance.now()+offset-(s.render.lastTick||s.render.lastPaint)):null,errors=Object.entries(s.preparation||{}).filter(([,r])=>r.state==='error');
 modal('Santé de la production.','Le retour image provient du moteur natif. Il confirme le rendu logiciel ; le contrôle physique des sorties Key + Fill reste à effectuer avec l’UltraStudio.',`<div class="diagnostic-row"><span>Rendu</span><strong>${s.render.fps||0} nouvelles images/s · ${age===null?'sans image':Math.round(age)+' ms'}</strong></div><div class="diagnostic-row"><span>Retards / pertes SDI</span><strong>${s.output.stats.late||0} / ${s.output.stats.dropped||0}</strong></div><div class="diagnostic-row"><span>Sauvegarde</span><strong>${escape(s.saveError||'OK')}</strong></div><p class="footnote">${health.length} mesures en mémoire (jusqu’à 2 minutes). ${s.recovered?'Projet récupéré depuis sa sauvegarde de secours.':''}</p>${errors.map(([id,r])=>`<div class="status-banner error">${escape(state.project.cues.find(c=>c.id===id)?.label||id)} : ${escape(r.message)}</div>`).join('')}<div class="modal-actions"><a class="button" href="/api/journal" download>Exporter le diagnostic</a><button class="button" id="refresh-health">Actualiser</button></div>`);$('#refresh-health').onclick=diagnosticsModal;
}
$('#nav-diagnostics').onclick=diagnosticsModal;
// Move the working copy directly in the preview, without changing the on-air copy.
$('#preview').addEventListener('pointerdown',e=>{const c=selected();if(!c||['scene','note'].includes(c.type)||e.button!==0)return;e.preventDefault();const canvas=e.currentTarget,rect=canvas.getBoundingClientRect(),startX=e.clientX,startY=e.clientY;canvas.setPointerCapture(e.pointerId);const move=ev=>{drafts.set(c.id,{...drafts.get(c.id),x:Math.round(Math.max(-1920,Math.min(1920,c.x+(ev.clientX-startX)*1920/rect.width))),y:Math.round(Math.max(-1080,Math.min(1080,c.y+(ev.clientY-startY)*1080/rect.height)))});};const finish=async ev=>{canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',finish);canvas.removeEventListener('pointercancel',finish);if(ev.type==='pointercancel')drafts.delete(c.id);else try{await flushDrafts();}catch{}inspector(true);};canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);});
