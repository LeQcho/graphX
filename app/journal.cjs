'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
class Journal{
 constructor(dir){this.file=path.join(dir,'events.jsonl');this.events=[];this.chain=Promise.resolve();this.error=null;}
 add(event){const entry={date:new Date().toISOString(),...event};this.events.push(entry);if(this.events.length>250)this.events.shift();this.chain=this.chain.then(async()=>{const stat=await fs.stat(this.file).catch(()=>null);if(stat?.size>2*1024*1024)await fs.rename(this.file,this.file+'.previous');await fs.appendFile(this.file,JSON.stringify(entry)+'\n',{mode:0o600});}).catch(e=>{this.error=e.message;});return entry;}
 async close(){await this.chain;}
}
module.exports={Journal};
