'use strict';
const {createHash}=require('node:crypto');
const {expandCue,nextPlayable}=require('./model.cjs');
// Match the target of the next conductor GO, including its first activation.
function armedPreview(state){
 const {project,playback,selectedId}=state;
 const id=playback.enabled?playback.nextId:nextPlayable(project,Math.max(0,project.cues.findIndex(c=>c.id===selectedId)));
 const cue=project.cues.find(c=>c.id===id);
 if(!cue||cue.type==='note')return null;
 const cues=expandCue(project,cue);
 const key=createHash('sha256').update(JSON.stringify([project.id,cue,cues])).digest('hex');
 return {id:cue.id,label:cue.label,key,cues};
}
module.exports={armedPreview};
