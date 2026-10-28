import {render,previewItem,preloadCues} from './render.js';
import {formatTimecode,parseTimecode,elapsedClock} from './timecode.mjs';
const $=s=>document.querySelector(s);const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const TYPES={lowerthird:['Titre intervenant','T','Nom et fonction'],title:['Titre de chapitre','Aa','Annonce et sous-titre'],image:['Habillage PNG','▧','Votre création, avec alpha'],logo:['Logo / signature','◈','Image ou signature texte'],ticker:['Bandeau défilant','≋','Le fil d’informations'],timer:['Compte à rebours','◷','Un rendez-vous en direct'],score:['Tableau de score','2:1','Deux équipes, un match'],fullscreen:['Plein écran','▣','Pause ou interlude']};
let state,viewMode='alpha',offset=0,toastTimer,connected=false,lastInspectorId=null,lastListKey='',outputDialog=false,replaceMediaId=null,dragDepth=0;
let lastInspectorKey='',dragCueId=null,dragBeforeId=null,dragScroll=0,dragY=0,transportBusy=false,lastDropAt=0;
const drafts=new Map(),debounces=new Map();let chain=Promise.resolve();
function toast(message,error=false){$('#toast').textContent=message;$('#toast').className='show'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').className='',error?6500:3000);}
async function api(path,body){const r=await fetch(path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw new Error(data.error||'Le moteur ne répond pas.');return data;}
function command(action){const task=chain.then(()=>api('/api/action',action));chain=task.catch(()=>{});return task.catch(e=>{toast(e.message,true);throw e;});}
function fire(action){command(action).catch(()=>{});}
function selected(){const c=state?.project.cues.find(x=>x.id===state.selectedId);return c?{...c,...drafts.get(c.id)}:null;}
function onAir(id){return state?.live.some(x=>x.cue.id===id&&!x.exitingAt);}
function field(label,key,value,type='text',extra=''){return `<label class="field"><span>${label}</span><input data-field="${key}" type="${type}" value="${escape(value)}" ${extra}></label>`;}
function options(key,items,value){return `<select data-field="${key}">${items.map(([v,label])=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${label}</option>`).join('')}</select>`;}
function fieldSelect(label,key,items,value){return `<label class="field"><span>${label}</span>${options(key,items,value)}</label>`;}
function colorField(label,key,value){return `<label class="field"><span>${label}</span><div class="color-row"><input data-field="${key}" type="color" value="${value}"><span>${value.toUpperCase()}</span></div></label>`;}
function range(label,key,value,min,max,step,suffix){return `<label class="field"><div class="range-head"><span>${label}</span><output data-range="${key}">${Math.round(value*100)}${suffix}</output></div><input data-field="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"></label>`;}
function inspector(force=false){
 const c=selected(),el=$('#inspector-content');if(!c){el.innerHTML='<p class="footnote">Ajoute un graphique ou glisse un PNG dans le conducteur pour commencer.</p>';lastInspectorId=null;return;}
 const inspectorKey=JSON.stringify([c,onAir(c.id)]);
 if(!force&&lastInspectorId===c.id&&(lastInspectorKey===inspectorKey||(el.contains(document.activeElement)&&document.activeElement.matches('input,textarea,select'))||el.matches(':has(input:active)')))return;
 lastInspectorKey=inspectorKey;
 lastInspectorId=c.id;const t=TYPES[c.type];const live=onAir(c.id);
 let content='';
 if(c.type==='image'||c.type==='logo')content+=`<button class="image-import-zone full" id="replace-image">${c.media?`<img src="/media/${c.media}" alt="Image importée">`:'<strong>↥</strong>'}${c.media?'Remplacer l’image':'Importer un PNG transparent'}</button>`;
 if(c.type!=='image'){
  if(c.type==='ticker')content+=`<label class="field"><span>Texte défilant</span><textarea data-field="title">${escape(c.title)}</textarea></label>`;
  else content+=field(c.type==='score'?'Équipe à domicile':c.type==='timer'?'Message':'Texte principal','title',c.title);
  if(!['ticker','timer'].includes(c.type))content+=field(c.type==='score'?'Équipe visiteuse':'Sous-titre','subtitle',c.subtitle);
 }
 if(c.type==='timer')content+=field('Durée du compte à rebours (secondes)','timerSeconds',c.timerSeconds,'number','min="1" max="86400"')+(live?'<div class="inspector-actions"><button class="button" id="timer-toggle">Pause / Reprendre</button><button class="button" id="timer-reset">Réinitialiser</button></div>':'');
 if(c.type==='score')content+=`<div class="field-grid">${field('Score domicile','scoreHome',c.scoreHome,'number','min="0" max="999"')}${field('Score visiteur','scoreAway',c.scoreAway,'number','min="0" max="999"')}</div>`;
 if(c.type!=='image')content+=`<div class="inspector-section"><h4>IDENTITÉ VISUELLE</h4><div class="field-grid">${colorField('Accent','accent',c.accent)}${colorField('Fond','background',c.background)}</div>${colorField('Texte','textColor',c.textColor)}</div>`;
 content+=`<div class="inspector-section"><h4>POSITION & COUCHE</h4><div class="field-grid">${fieldSelect('Position','position',[['bottom-left','Bas gauche'],['bottom-right','Bas droite'],['top-left','Haut gauche'],['top-right','Haut droite'],['center','Centre']],c.position)}${fieldSelect('Couche','layer',Array.from({length:8},(_,i)=>[i+1,`${i+1} ${i===0?'· fond':i===7?'· dessus':''}`]),c.layer)}</div>${range('Taille','scale',c.scale,.5,1.6,.01,'%')}<div class="field-grid">${field('Décalage X (px)','x',c.x,'number','min="-1920" max="1920"')}${field('Décalage Y (px)','y',c.y,'number','min="-1080" max="1080"')}</div>${range('Opacité','opacity',c.opacity,0,1,.01,'%')}</div>`;
 content+=`<div class="inspector-section"><h4>ANIMATION</h4><div class="field-grid">${fieldSelect('Entrée / sortie','animation',[['slide','Glissement'],['fade','Fondu'],['cut','Cut']],c.animation)}${field('Transition (ms)','transition',c.transition,'number','min="0" max="2000" step="50"')}</div>${field('Retrait automatique (s, 0 = manuel)','duration',c.duration,'number','min="0" max="3600"')}</div>`;
 el.innerHTML=`<div class="inspector-kind"><div class="cue-icon">${t[1]}</div><div><h3>${t[0]}</h3><small>${live?'À L’ANTENNE · COPIE DE TRAVAIL':'PRÉPARATION · HORS ANTENNE'}</small></div></div>${field('Nom dans le conducteur','label',c.label)}<label class="field"><span>Repère conducteur · HH:MM:SS:FF</span><input id="cue-timecode" value="${c.timecodeMs==null?'':formatTimecode(c.timecodeMs,state.project.settings.fps)}" placeholder="00:00:00:00" inputmode="numeric" aria-describedby="timecode-hint"><small id="timecode-hint">Repère indicatif, sans déclenchement automatique.</small></label>${content}<div class="inspector-note"><span>↗</span><div>${c.type==='image'?'L’alpha de votre PNG devient le key. Les pixels transparents restent transparents.':'Les modifications restent en préparation. Envoyez le graphique quand vous êtes prêt.'}</div></div>${live?'<button class="button full update" id="update-live">Mettre à jour à l’antenne ↗</button>':''}<div class="inspector-actions"><button class="button" id="duplicate">Dupliquer</button><button class="button delete" id="remove">Supprimer</button></div><div class="inspector-actions"><button class="button" id="move-up">↑ Monter</button><button class="button" id="move-down">↓ Descendre</button></div>`;
 el.querySelectorAll('[data-field]').forEach(input=>input.addEventListener('input',()=>{
  const key=input.dataset.field;const numeric=['layer','scale','opacity','duration','transition','timerSeconds','scoreHome','scoreAway','x','y'].includes(key);const value=numeric?Number(input.value):input.value;
  drafts.set(c.id,{...drafts.get(c.id),[key]:value});if(input.type==='color')input.nextElementSibling.textContent=value.toUpperCase();const range=el.querySelector(`[data-range="${key}"]`);if(range)range.textContent=Math.round(value*100)+'%';
  const k=c.id+key;clearTimeout(debounces.get(k));debounces.set(k,setTimeout(()=>{debounces.delete(k);command({type:'edit',id:c.id,patch:{[key]:value}}).then(()=>{const draft=drafts.get(c.id);if(draft?.[key]===value){delete draft[key];if(!Object.keys(draft).length)drafts.delete(c.id);}}).catch(()=>{});},input.type==='range'?80:220));
 }));
 $('#cue-timecode').oninput=e=>{try{const timecodeMs=parseTimecode(e.target.value,state.project.settings.fps);e.target.setCustomValidity('');drafts.set(c.id,{...drafts.get(c.id),timecodeMs});const k=c.id+'timecodeMs';clearTimeout(debounces.get(k));debounces.set(k,setTimeout(()=>{debounces.delete(k);command({type:'edit',id:c.id,patch:{timecodeMs}}).then(()=>{const draft=drafts.get(c.id);if(draft?.timecodeMs===timecodeMs){delete draft.timecodeMs;if(!Object.keys(draft).length)drafts.delete(c.id);}}).catch(()=>{});},220));}catch{}};
 $('#cue-timecode').onchange=e=>{try{const timecodeMs=parseTimecode(e.target.value,state.project.settings.fps);e.target.setCustomValidity('');fire({type:'edit',id:c.id,patch:{timecodeMs}});}catch(error){e.target.setCustomValidity(error.message);e.target.reportValidity();toast(error.message,true);}};
 $('#duplicate').onclick=()=>fire({type:'duplicate',id:c.id});$('#remove').onclick=()=>confirmRemove(c);$('#move-up').onclick=()=>fire({type:'move',id:c.id,direction:-1});$('#move-down').onclick=()=>fire({type:'move',id:c.id,direction:1});
 if($('#replace-image'))$('#replace-image').onclick=()=>{replaceMediaId=c.id;$('#png-input').click();};
 if($('#update-live'))$('#update-live').onclick=async()=>{await flushDrafts();fire({type:'updateLive',id:c.id});toast('Graphique mis à jour à l’antenne.');};
 if($('#timer-toggle'))$('#timer-toggle').onclick=()=>fire({type:'timerToggle',id:c.id});if($('#timer-reset'))$('#timer-reset').onclick=()=>fire({type:'timerReset',id:c.id});
}
async function flushDrafts(){for(const timer of debounces.values())clearTimeout(timer);debounces.clear();const entries=[...drafts];for(const [id,patch]of entries){await command({type:'edit',id,patch});drafts.delete(id);}await chain;}
function renderList(){if(dragCueId)return;const key=JSON.stringify([state.project.cues,state.selectedId,state.playback,state.live.map(x=>[x.cue.id,x.exitingAt])]);if(key===lastListKey)return;lastListKey=key;
 $('#cue-list').innerHTML=state.project.cues.length?state.project.cues.map((c,i)=>{const live=onAir(c.id),selected=c.id===state.selectedId;return `<div class="cue-row ${selected?'selected':''} ${state.playback.enabled&&state.playback.nextId===c.id?'queued':''}" data-id="${c.id}" role="option" aria-selected="${selected}" tabindex="0"><span class="row-num" draggable="false" title="Glisser pour déplacer" aria-label="Déplacer ${escape(c.label)}">⠿ <small>${String(i+1).padStart(2,'0')}</small></span><div class="cue-name"><span class="cue-icon">${TYPES[c.type][1]}</span><span class="cue-label"><strong>${escape(c.label)}</strong><small>${escape(c.type==='image'?(c.media?'PNG / IMAGE · ALPHA':'Aucune image importée'):c.title)}</small></span></div><span class="cue-timecode">${c.timecodeMs==null?'—':formatTimecode(c.timecodeMs,state.project.settings.fps)}</span><span class="layer-chip">C${c.layer}</span><span class="state-chip ${live?'live':selected?'ready':''}">${live?'● ON AIR':state.playback.enabled&&state.playback.nextId===c.id?'▶ SUIVANT':selected?'● PRÊT':'EN ATTENTE'}</span><button class="row-go" data-go="${c.id}" aria-label="Jouer ${escape(c.label)}">↗</button></div>`;}).join(''):'<div class="empty-list">Votre conducteur est prêt à accueillir ses premiers graphiques.</div>';
 $('#cue-list').querySelectorAll('.cue-row').forEach(row=>{row.onclick=e=>{if(!dragCueId&&Date.now()-lastDropAt>200&&!e.target.closest('[data-go]'))fire({type:'select',id:row.dataset.id});};row.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();fire({type:'select',id:row.dataset.id});}};});
 $('#cue-list').querySelectorAll('[data-go]').forEach(b=>b.onclick=async()=>{await flushDrafts();fire({type:'go',id:b.dataset.go});});
}
function update(value){state=value;offset=value.serverTime-Date.now();preloadCues(state.project.cues);
 const c=selected(),name=state.project.name;$('#project-title').innerHTML=escape(name)+'<span>.</span>';$('#project-breadcrumb').textContent=name;
 $('#cue-count').textContent=String(state.project.cues.length).padStart(2,'0');$('#rundown-count').textContent=state.project.cues.length;
 $('#preview-name').textContent=c?.label||'Aucun graphique';$('#preview-type').textContent=c?TYPES[c.type][0]:'Prévisualisation';$('#ready-label').textContent=c?.label||'Ajoutez un graphique';$('#go-button').disabled=!c||!connected;$('#out-button').disabled=!c||!onAir(c.id);$('#next-button').disabled=!c;
 const live=state.live.filter(x=>!x.exitingAt);$('#live-dot').className='dot'+(live.length?' live':'');$('#program-status').textContent=live.length?`${live.length} GRAPHIQUE${live.length>1?'S':''} EN DIRECT`:'HORS ANTENNE';$('#empty-program').hidden=state.live.length>0;$('#layer-status').textContent=live.length?`Couches ${live.map(x=>x.cue.layer).sort((a,b)=>a-b).join(' · ')} actives`:'Aucune couche active';$('#program-format').textContent='1080p'+state.project.settings.fps;
 const native=state.status.mode==='native';$('#engine-dot').className='dot'+(connected?' mint':'');$('#engine-label').innerHTML=(native?'Engine connecté':'Aperçu web')+`<small>1080p${state.project.settings.fps} · ${state.status.output.running?'SDI ACTIF':native?'SDI ARRÊTÉ':'SANS SORTIE SDI'}</small>`;
 $('#save-status').innerHTML='<i></i>'+escape(state.status.saveError?'Sauvegarde impossible':state.status.savedAt?'Enregistré sur ce Mac':'Sauvegarde locale prête');
 updateTransport();renderList();inspector();if(outputDialog)updateOutputStatus();
}
const events=new EventSource('/api/events');events.onmessage=e=>{connected=true;update(JSON.parse(e.data));};events.onerror=()=>{connected=false;$('#engine-dot').className='dot';$('#engine-label').innerHTML='Moteur déconnecté<small>RECONNEXION EN COURS</small>';$('#go-button').disabled=true;};
let lastFrame=0;function animate(time){if(state&&time-lastFrame>=1000/60){lastFrame=time;const c=selected();render($('#preview'),c?[previewItem(c)]:[],Date.now()+offset,{preview:true});render($('#program'),state.live,Date.now()+offset,{key:viewMode==='key',fill:viewMode==='fill'});updateClock();$('#clock').textContent=new Date().toLocaleTimeString('fr-CH',{hour12:false});}requestAnimationFrame(animate);}requestAnimationFrame(animate);
function modal(title,description,content){outputDialog=false;$('#modal-content').innerHTML=`<div class="modal-header"><h2>${title}</h2><button class="icon-btn" id="modal-close" aria-label="Fermer">×</button></div>${description?`<p class="modal-description">${description}</p>`:''}${content}`;$('#modal-close').onclick=closeModal;if(!$('#modal').open)$('#modal').showModal();}
function closeModal(){outputDialog=false;$('#modal').close();}$('#modal').addEventListener('close',()=>outputDialog=false);$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
function addModal(){modal('Une idée à l’antenne.','Choisissez un modèle. Le style et les contenus restent entièrement personnalisables.',`<div class="modal-grid">${Object.entries(TYPES).map(([key,t])=>`<button class="template-card" data-add="${key}"><span class="symbol">${t[1]}</span><span><strong>${t[0]}</strong><small>${t[2]}</small></span></button>`).join('')}</div>`);document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{closeModal();if(b.dataset.add==='image')importPicker();else fire({type:'add',kind:b.dataset.add});});}
function importPicker(){replaceMediaId=null;$('#png-input').click();}
async function importImages(files,replaceId=null){
 const list=[...files].filter(f=>['image/png','image/jpeg','image/webp'].includes(f.type));if(!list.length){toast('Choisis un PNG, JPEG ou WebP.',true);return;}
 try{for(const [i,file]of list.entries()){if(file.size>25*1024*1024)throw new Error('Image limitée à 25 Mo.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Lecture impossible.'));r.readAsDataURL(file);});const decoded=new Image();decoded.src=data;await decoded.decode().catch(()=>{throw new Error('Image invalide ou illisible : '+file.name);});if(decoded.naturalWidth>8192||decoded.naturalHeight>8192||decoded.naturalWidth*decoded.naturalHeight>33554432)throw new Error('Image limitée à 8192 pixels par côté et 32 mégapixels.');const upload=await api('/api/media',{data});let id=replaceId&&i===0?replaceId:null;if(!id){const result=await command({type:'add',kind:'image'});id=result.selectedId;}await command({type:'edit',id,patch:{media:upload.name,...(!replaceId?{label:file.name.replace(/\.[^.]+$/,''),title:file.name}: {})}});}toast(list.length===1?'Habillage importé. Transparence conservée.':`${list.length} habillages importés.`);inspector(true);}catch(e){toast(e.message,true);}
}
$('#png-input').onchange=async()=>{await importImages($('#png-input').files,replaceMediaId);$('#png-input').value='';replaceMediaId=null;};
function confirmRemove(c){modal('Retirer du conducteur ?',`« ${escape(c.label)} » sera retiré du projet.${onAir(c.id)?' Sa copie à l’antenne continuera jusqu’au retrait global.':''}`,`<div class="modal-actions"><button class="button" id="cancel-remove">Annuler</button><button class="button delete" id="confirm-remove">Retirer</button></div>`);$('#cancel-remove').onclick=closeModal;$('#confirm-remove').onclick=()=>{fire({type:'remove',id:c.id});closeModal();};}
function projectModal(){modal('Votre production.','Le projet est enregistré automatiquement sur ce Mac. L’export emporte les images avec le conducteur.',`<label class="modal-field"><span>Nom du projet</span><input id="project-name-input" value="${escape(state.project.name)}" maxlength="120"></label><div class="modal-actions"><button class="button" id="load-project">Ouvrir un projet</button><a class="button" href="/api/export" download="graphX-project.graphx">Exporter .graphx ↗</a><button class="button update" id="save-name">Enregistrer</button></div><p class="footnote">Un projet s’ouvre uniquement hors antenne et sortie SDI arrêtée. Les habillages PNG sont inclus dans le fichier exporté.</p>`);$('#save-name').onclick=()=>{fire({type:'rename',name:$('#project-name-input').value});closeModal();};$('#load-project').onclick=()=>$('#project-input').click();}
$('#project-input').onchange=async()=>{try{const file=$('#project-input').files[0];if(!file)return;const data=JSON.parse(await file.text());await api('/api/import',data);closeModal();toast('Projet chargé. Prêt à jouer.');}catch(e){toast(e.message,true);}$('#project-input').value='';};
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
 $('#go-button').disabled=!connected||transportBusy||!(p.enabled?next:c);
 $('#out-button').disabled=!connected||!onAir(p.enabled?p.lastId:c?.id);
 $('#arm-button').hidden=!p.enabled;$('#arm-button').disabled=!connected||!c;
 $('#next-button').hidden=p.enabled;
 $('#last-played').textContent=p.enabled?`Dernier envoyé : ${last?.label||'—'}`:'Espace · jouer / Maj + Espace · jouer et avancer';
 $('#clock-toggle').textContent=p.clockStartedAt===null?'▶ Démarrer':'Ⅱ Pause';
}
function updateClock(){
 const p=state.playback,ms=elapsedClock(p,Date.now()+offset),fps=state.project.settings.fps;
 $('#show-timecode').textContent=formatTimecode(ms,fps);
 const next=state.project.cues.find(c=>c.id===(p.enabled?p.nextId:state.selectedId));
 const delta=next?.timecodeMs==null?null:next.timecodeMs-ms;
 $('#cue-countdown').textContent=delta===null?'Aucun repère sur le prochain élément':`${delta>=0?'Repère dans':'Repère dépassé de'} ${formatTimecode(Math.abs(delta),fps)}`;
 $('#cue-countdown').classList.toggle('late',delta!==null&&delta<0);
}
async function take(advance=false){
 if(transportBusy||!connected)return;
 const intent={follow:state.playback.enabled,nextId:state.playback.nextId,selectedId:state.selectedId};
 transportBusy=true;updateTransport();
 try{await flushDrafts();if(intent.follow)await command({type:'advance',expectedId:intent.nextId});else{await command({type:'go',id:intent.selectedId});if(advance)await command({type:'next',id:intent.selectedId});}}
 catch{}finally{transportBusy=false;updateTransport();}
}
function outCurrent(){const id=state.playback.enabled?state.playback.lastId:state.selectedId;if(id)fire({type:'out',id});}
$('#go-button').onclick=()=>take();$('#out-button').onclick=outCurrent;$('#next-button').onclick=()=>fire({type:'next'});
$('#follow-mode').onchange=e=>{fire({type:'followMode',enabled:e.target.checked});e.target.blur();};
$('#arm-button').onclick=()=>fire({type:'arm'});
$('#clock-toggle').onclick=()=>fire({type:'clockToggle'});$('#clock-reset').onclick=()=>fire({type:'clockReset'});
$('#clear-button').onclick=()=>{fire({type:'clear'});toast('Toutes les couches ont été retirées.');};
$('#add-button').onclick=addModal;$('#import-png').onclick=importPicker;$('#nav-import').onclick=importPicker;$('#project-menu').onclick=projectModal;$('#nav-project').onclick=projectModal;$('#nav-output').onclick=outputModal;$('#nav-obs').onclick=obsModal;$('#nav-rundown').onclick=()=>$('.rundown').scrollIntoView({behavior:'smooth'});$('#shortcuts').onclick=helpModal;$('#help-button').onclick=helpModal;
$('#safe-toggle').onclick=()=>{$('.safe-area').hidden=!$('.safe-area').hidden;};$('#view-mode').querySelectorAll('button').forEach(b=>b.onclick=()=>{viewMode=b.dataset.mode;$('#view-mode').querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));});
document.addEventListener('keydown',e=>{
 if($('#modal').open||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable||e.metaKey||e.ctrlKey||e.altKey||!connected)return;
 // Prevent native Space/Enter activation on a focused button from sending a second command.
 if(e.code==='Space'){e.preventDefault();if(!e.repeat)take(e.shiftKey);return;}
 if(e.repeat){if(['o','t','g'].includes(e.key.toLowerCase()))e.preventDefault();return;}
 if(e.key.toLowerCase()==='o'){e.preventDefault();outCurrent();}
 else if(e.key==='Escape'){e.preventDefault();fire({type:'clear'});toast('Toutes les couches retirées.');}
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
document.addEventListener('drop',e=>{if(!e.dataTransfer?.types.includes('Files'))return;e.preventDefault();dragDepth=0;$('#drop-overlay').hidden=true;importImages(e.dataTransfer.files);});
window.addEventListener('beforeunload',()=>{for(const [id,patch]of drafts)fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'edit',id,patch}),keepalive:true});});
