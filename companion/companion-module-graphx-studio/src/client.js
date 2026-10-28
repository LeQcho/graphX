'use strict';
const http=require('node:http');const {EventEmitter}=require('node:events');
class GraphXClient extends EventEmitter{
 constructor({port=4318,host='127.0.0.1'}={}){super();if(!['127.0.0.1','localhost'].includes(host))throw Error('Companion et graphX doivent tourner sur le même Mac.');if(!Number.isInteger(Number(port))||port<1||port>65535)throw Error('Port invalide.');this.url=`http://${host}:${port}`;this.generation=0;this.online=false;this.state=null;this.stopped=true;this.busy=false;}
 start(){this.stop();this.stopped=false;this.connect(this.generation);}
 stop(){this.stopped=true;this.generation++;clearTimeout(this.retry);clearInterval(this.watchdog);this.req?.destroy();this.req=null;this.online=false;this.state=null;}
 accept(s){if(!s?.project?.cues||!s.playback||!Array.isArray(s.live))throw Error('graphX 0.2 ou plus récent requis.');this.state=s;this.offset=s.serverTime-Date.now();if(!this.online){this.online=true;this.emit('status',true);}this.emit('state',s);}
 connect(g){
  if(this.stopped||g!==this.generation)return;let buffer='',failed=false,lastSeen=Date.now();
  const fail=error=>{if(failed||g!==this.generation||this.stopped)return;failed=true;clearInterval(this.watchdog);this.req?.destroy();this.online=false;this.emit('status',false,error?.message||'Moteur déconnecté');this.retry=setTimeout(()=>this.connect(g),1500);};
  this.req=http.get(this.url+'/api/events',res=>{
   if(res.statusCode!==200){res.resume();fail(Error(`Connexion HTTP ${res.statusCode}`));return;}res.setEncoding('utf8');
   res.on('data',chunk=>{if(g!==this.generation||failed)return;lastSeen=Date.now();buffer+=chunk;if(buffer.length>2*1024*1024)return fail(Error('Réponse trop volumineuse.'));
    let end;while((end=buffer.indexOf('\n\n'))!==-1){const block=buffer.slice(0,end);buffer=buffer.slice(end+2);const data=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');if(data){try{this.accept(JSON.parse(data));}catch(e){fail(e);return;}}}
   });res.on('end',()=>fail());res.on('error',fail);
  });this.req.on('error',fail);this.watchdog=setInterval(()=>{if(Date.now()-lastSeen>30000)fail(Error('Moteur sans réponse.'));},1000);
 }
 async request(path,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),3500);try{const r=await fetch(this.url+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:controller.signal});const data=await r.json();if(!r.ok)throw Error(data.error||`HTTP ${r.status}`);return data;}finally{clearTimeout(timer);}}
 async execute(fn){if(!this.online)throw Error('graphX déconnecté : commande non envoyée.');if(this.busy)throw Error('Une commande est déjà en cours.');this.busy=true;const g=this.generation;
  try{const s=await this.request('/api/state');if(g!==this.generation||this.stopped)throw Error('Connexion modifiée.');this.accept(s);
   const send=async action=>{if(g!==this.generation||this.stopped)throw Error('Connexion modifiée.');return this.request('/api/action',action);};
   await fn(s,send);if(g===this.generation&&!this.stopped)this.accept(await this.request('/api/state'));
  }catch(e){if(e.name==='AbortError')throw Error('Délai dépassé. Vérifie l’antenne : la commande n’est jamais renvoyée automatiquement.');throw e;}finally{this.busy=false;}
 }
}
module.exports={GraphXClient};
