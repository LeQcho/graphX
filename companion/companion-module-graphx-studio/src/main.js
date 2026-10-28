'use strict';
const {InstanceBase,InstanceStatus}=require('@companion-module/base');
const {GraphXClient}=require('./client');const {variables}=require('./control');const {definitions}=require('./definitions');
class GraphXInstance extends InstanceBase{
 async init(config){await this.configUpdated(config);}
 getConfigFields(){return [{type:'static-text',id:'info',label:'graphX Studio',value:'Companion et graphX sur le même Mac. graphX 0.2+ pour la conduite ; 0.3+ pour les scores et ajustements de temps. Aucun pilote Stream Deck supplémentaire requis par ce module.',width:12},{type:'number',id:'port',label:'Port du moteur graphX',default:4318,min:1,max:65535,width:6}];}
 async configUpdated(config){await this.destroy();this.config=config;this.signature='';this.oldVars=new Set();this.lastValues={};this.client=new GraphXClient({port:Number(config.port)||4318});definitions(this);
  this.client.on('status',(online,error)=>{this.updateStatus(online?InstanceStatus.Ok:InstanceStatus.ConnectionFailure,error);this.setVariableValues({connected:online?1:0,...(!online?{last_error:error||'Moteur déconnecté'}:{last_error:''})});this.checkAllFeedbacks();});
  this.client.on('state',s=>{const signature=JSON.stringify([s.project.id,s.project.cues.map(c=>[c.id,c.label,c.type])]);if(signature!==this.signature){this.signature=signature;definitions(this);}this.refresh();});
  this.updateStatus(InstanceStatus.Connecting);this.client.start();this.interval=setInterval(()=>this.refresh(),250);
 }
 refresh(){if(!this.client?.online||!this.client.state)return;const values=variables(this.client.state,Date.now()+this.client.offset);const currentKeys=new Set(Object.keys(values));for(const key of this.oldVars)if(!(key in values))values[key]='';this.oldVars=currentKeys;const changed=Object.fromEntries(Object.entries(values).filter(([k,v])=>this.lastValues[k]!==v));this.lastValues=values;if(Object.keys(changed).length)this.setVariableValues(changed);this.checkAllFeedbacks();}
 async destroy(){clearInterval(this.interval);if(this.client){this.client.removeAllListeners();this.client.stop();this.client=null;}}
}
module.exports=GraphXInstance;
module.exports.UpgradeScripts=[];
