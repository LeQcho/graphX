const test=require('node:test'),assert=require('node:assert/strict');const {ArmedPreviewClient}=require('../src/armed-preview');
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
const response=key=>new Response(png,{headers:{'Content-Type':'image/png','X-GraphX-Preview-Key':key}});
const client=key=>({online:true,url:'http://127.0.0.1:4318',state:{armedPreview:{key,label:key}}});
test('late thumbnail cannot overwrite a newly armed cue and disconnect clears the image',async()=>{
 let resolveA;const preview=new ArmedPreviewClient(()=>{},async url=>url.endsWith('A')?new Promise(resolve=>resolveA=resolve):response('B'));
 preview.update(client('A'));const first=preview.pending;
 preview.update(client('B'));await preview.pending;assert.equal(preview.png,png.toString('base64'));
 resolveA(response('A'));await first;assert.equal(preview.key,'B');assert.equal(preview.png,png.toString('base64'));
 preview.update({online:false});assert.equal(preview.png,null);assert.equal(preview.key,null);preview.stop();
});
test('mismatched response key or non-PNG body is never displayed',async()=>{
 const preview=new ArmedPreviewClient(()=>{},async()=>response('other'));
 preview.update(client('A'));await preview.pending;assert.equal(preview.png,null);assert.match(preview.error,/périmé/);preview.stop();
});
