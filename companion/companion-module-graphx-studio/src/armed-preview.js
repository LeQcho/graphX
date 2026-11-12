'use strict';
const PNG=Buffer.from([137,80,78,71,13,10,26,10]);
class ArmedPreviewClient{
 constructor(onChange,request=fetch){this.onChange=onChange;this.request=request;this.key=null;this.png=null;this.error='';this.lastAttempt=0;this.generation=0;}
 stop(){this.generation++;this.controller?.abort();this.controller=null;this.key=null;this.png=null;this.error='';}
 update(client){
  const preview=client?.online?client.state?.armedPreview:null,key=preview?.key||null;
  if(key!==this.key){this.stop();this.key=key;this.lastAttempt=0;this.onChange();}
  if(!key||this.png||this.controller||Date.now()-this.lastAttempt<1500)return;
  this.lastAttempt=Date.now();const generation=this.generation,controller=new AbortController();this.controller=controller;
  const timer=setTimeout(()=>controller.abort(),9000);
  this.pending=(async()=>{
   try{
    const response=await this.request(client.url+'/api/armed-preview.png?key='+encodeURIComponent(key),{signal:controller.signal});
    if(!response.ok||response.status===204)throw Error('Aperçu indisponible');
    if(response.headers.get('X-GraphX-Preview-Key')!==key||!response.headers.get('Content-Type')?.startsWith('image/png'))throw Error('Aperçu périmé');
    const reader=response.body.getReader();let size=0;const chunks=[];
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>256*1024)throw Error('Aperçu trop volumineux');chunks.push(Buffer.from(value));}}
    finally{await reader.cancel().catch(()=>{});}
    const png=Buffer.concat(chunks);if(!png.subarray(0,8).equals(PNG))throw Error('Aperçu invalide');
    if(generation===this.generation&&key===this.key){this.png=png.toString('base64');this.error='';this.onChange();}
   }catch(error){if(generation===this.generation){this.png=null;this.error=error.message;this.onChange();}}
   finally{clearTimeout(timer);if(generation===this.generation)this.controller=null;}
  })();
 }
}
module.exports={ArmedPreviewClient};
