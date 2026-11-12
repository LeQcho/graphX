import {render,prepareCues,previewItem,protectCues} from './render.js';
const output=document.querySelector('canvas'),stage=document.createElement('canvas');stage.width=320;stage.height=180;
window.graphXNative.onPreview(async preview=>{
 protectCues(preview.cues);
 const results=await prepareCues(preview.cues);
 const error=results.find(r=>r.state==='error');if(error)throw Error(error.message);
 render(stage,preview.cues.map(previewItem),0,{preview:true});
 const ctx=output.getContext('2d');ctx.clearRect(0,0,144,144);ctx.fillStyle='#182021';ctx.fillRect(0,0,144,144);
 ctx.fillStyle='#b5f4d6';ctx.fillRect(0,0,144,3);ctx.font='600 12px -apple-system, sans-serif';ctx.textAlign='center';ctx.fillText('ARMÉ',72,20);
 // Preserve the complete 16:9 composition; the checkerboard reveals alpha.
 for(let y=28;y<109;y+=9)for(let x=0;x<144;x+=9){ctx.fillStyle=((x/9+(y-28)/9)%2)?'#354044':'#273236';ctx.fillRect(x,y,9,9);}
 ctx.drawImage(stage,0,28,144,81);
 let size=12;do{ctx.font=`600 ${size}px -apple-system, sans-serif`;}while(ctx.measureText(preview.label).width>134&&--size>7);
 ctx.fillStyle='#ffffff';ctx.fillText(preview.label,72,128,134);
 return output.toDataURL('image/png').split(',')[1];
});
