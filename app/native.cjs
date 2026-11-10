'use strict';
const {spawn,execFile}=require('node:child_process');
class NativeOutput{
 constructor(binary,onStatus){this.binary=binary;this.onStatus=onStatus;this.child=null;this.pending=false;this.stats={};this.skipped=0;this.running=false;this.lastStatsAt=0;this.lastProgressAt=0;this.healthError='';}
 scan(){return new Promise(resolve=>execFile(this.binary,['--list'],{timeout:10000},(e,out)=>{if(e){resolve({driver:false,devices:[],message:e.message});return;}try{resolve(JSON.parse(out.trim()));}catch{resolve({driver:false,devices:[],message:'Réponse du pilote illisible.'});}}));}
 checkHealth(now=performance.now()){
  if(!this.running)return;
  const error=now-this.lastStatsAt>3500?'Le moteur SDI ne transmet plus de compteurs.':
    now-this.lastProgressAt>3500?'Le compteur d’images SDI ne progresse plus.':'';
  if(error===this.healthError)return;
  this.healthError=error;
  this.publishStats();
 }
 publishStats(){
  this.onStatus({running:this.running,starting:false,message:this.healthError||'Key + Fill actif',error:!!this.healthError,stats:{...this.stats,transferSkipped:this.skipped}});
 }
 start(settings){if(this.child)throw new Error('La sortie est déjà démarrée.');if(!settings.deviceId)throw new Error('Choisis un périphérique Blackmagic.');
  this.stats={};this.skipped=0;this.pending=false;this.healthError='';this.onStatus({running:false,starting:true,message:'Ouverture de l’UltraStudio…',stats:{}});
  const child=spawn(this.binary,['--device',settings.deviceId,'--fps',String(settings.fps),'--alpha',settings.alpha,'--level-a',String(settings.levelA)],{stdio:['pipe','pipe','pipe']});this.child=child;let buffer='',lastError='';const startupTimeout=setTimeout(()=>{lastError='Le pilote n’a pas confirmé le démarrage dans les 12 secondes.';child.kill('SIGTERM');},12000);
  child.stdout.on('data',chunk=>{buffer+=chunk;let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{const event=JSON.parse(line);if(event.event==='started'){
   clearTimeout(startupTimeout);this.running=true;this.lastStatsAt=this.lastProgressAt=performance.now();this.publishStats();
  }else if(event.event==='stats'&&this.running){
   this.lastStatsAt=performance.now();if(event.completed>(this.stats.completed||0))this.lastProgressAt=this.lastStatsAt;
   this.stats=event;
   if(this.healthError)this.checkHealth(this.lastStatsAt);
   else this.publishStats();
  }else if(event.event==='error'){lastError=event.message;this.running=false;this.onStatus({running:false,starting:false,message:lastError,error:true,stats:this.stats});}else if(event.event==='warning'){this.onStatus({running:this.running,starting:!this.running,message:event.message,warning:true,stats:this.stats});}}catch{}}});
  child.stderr.on('data',()=>{});child.stdin.on('error',()=>{this.pending=false;});
  child.on('error',e=>{lastError=e.message;this.onStatus({running:false,starting:false,error:true,message:e.message,stats:this.stats});});
  child.on('close',code=>{clearTimeout(startupTimeout);if(this.child===child){this.child=null;this.running=false;this.pending=false;this.onStatus({running:false,starting:false,error:!!lastError||code!==0,message:lastError||(code?'Le moteur de sortie s’est arrêté.':'Sortie SDI arrêtée'),stats:this.stats});}});
 }
 frame(bytes){if(!this.child||!this.running||this.child.stdin.destroyed)return;if(bytes.length!==1920*1080*4)return;if(this.pending){this.skipped++;return;}this.pending=true;this.child.stdin.write(bytes,()=>{this.pending=false;});}
 async stop(){const child=this.child;if(!child)return;this.running=false;await new Promise(resolve=>{const timeout=setTimeout(()=>{child.kill('SIGTERM');resolve();},3500);child.once('close',()=>{clearTimeout(timeout);resolve();});child.stdin.end();});}
}
module.exports={NativeOutput};
