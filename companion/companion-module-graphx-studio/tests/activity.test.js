const test=require('node:test'),assert=require('node:assert/strict');
const {createState,act}=require('../../../app/model.cjs');
const {definitions}=require('../src/definitions');const {dispatch}=require('../src/control');
function fixture(){const state=createState();state.status={mode:'web',output:{}};let time=1000;const client={state,online:true,now:()=>time};const instance={label:'graphx',client,setActionDefinitions(){},setFeedbackDefinitions(){},setPresetDefinitions(){},setVariableDefinitions(){}};return {state,client,defs:definitions(instance),tick:t=>time=t};}
test('media toggle alternates show and hide; activity pulses only while its media is on air',async()=>{
 const {state,defs,tick,client}=fixture(),id=state.project.cues[0].id;state.project.lastAssetId=id;
 const preset=defs.presets.asset_last_toggle,action=preset.steps[0].down[0];assert.deepEqual(action.options,{slot:'last',operation:'toggle'});
 const feedback=()=>defs.feedbacks.assetActivity.callback({options:{slot:'last'}});
 assert.deepEqual(feedback(),{});
 const send=async a=>act(state,a,1000);await dispatch(state,send,'asset',action.options,{assetId:id});
 const light=feedback();tick(1500);const dark=feedback();assert.notEqual(light.bgcolor,dark.bgcolor);assert.equal(light.color,0xffffff);
 client.online=false;assert.deepEqual(feedback(),{});client.online=true;
 await dispatch(state,send,'asset',action.options,{assetId:id});assert.deepEqual(feedback(),{});
});
test('OUT last pulses for its actual on-air target, not an unrelated live cue',()=>{
 const {state,defs,tick}=fixture(),first=state.project.cues[0].id,other=state.project.cues[1].id;
 const preset=defs.presets.outLast_blink;assert.equal(preset.steps[0].down[0].actionId,'outLast');
 const feedback=()=>defs.feedbacks.cueActivity.callback({options:{target:'@last'}});
 act(state,{type:'go',id:first},1000);state.playback.lastId=other;assert.deepEqual(feedback(),{});
 state.playback.lastId=first;const a=feedback();tick(1500);assert.notEqual(a.bgcolor,feedback().bgcolor);
 act(state,{type:'out',id:first},1600);assert.deepEqual(feedback(),{});
});
