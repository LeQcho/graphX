// Shared scene renderer: identical geometry in preview and the native 1920×1080 output.
export const WIDTH=1920,HEIGHT=1080;
const images=new Map();
export function imageAsset(name){if(!name)return null;if(!images.has(name)){const image=new Image();image.src='/media/'+name;images.set(name,image);}const image=images.get(name);return image.complete&&image.naturalWidth?image:null;}
export function preloadCues(cues){for(const c of cues)if(c.media)imageAsset(c.media);}
function box(c,x,y,w,h,r=0){c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function font(c,size,weight=600){c.font=`${weight} ${size}px -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`;}
function fit(c,text,size,max,weight=600){font(c,size,weight);while(size>16&&c.measureText(text).width>max){size-=2;font(c,size,weight);}return size;}
function label(c,text,x,y,size=24,color='#ffffff',weight=600){font(c,size,weight);c.fillStyle=color;c.fillText(text,x,y);}
function anchor(cue,w,h){let x=112,y=HEIGHT-h-108;const p=cue.position;if(p==='bottom-right')x=WIDTH-w-112;else if(p==='top-left')y=100;else if(p==='top-right'){x=WIDTH-w-112;y=100;}else if(p==='center'){x=(WIDTH-w)/2;y=(HEIGHT-h)/2;}return [x,y];}
const ease=x=>1-Math.pow(1-x,3);
function progress(item,now){const c=item.cue,d=c.animation==='cut'?0:c.transition;const enter=d?Math.min(1,Math.max(0,(now-item.enteredAt)/d)):1;const exit=item.exitingAt?(d?Math.min(1,Math.max(0,(now-item.exitingAt)/d)):1):0;return {alpha:ease(enter)*(1-ease(exit)),move:(1-ease(enter))*50-ease(exit)*35};}
function graphic(ctx,item,now,preview){
 const c=item.cue,accent=c.accent,bg=c.background,white=c.textColor;const p=preview?{alpha:1,move:0}:progress(item,now);if(p.alpha<=0)return;
 ctx.save();ctx.globalAlpha=p.alpha*c.opacity;ctx.translate(c.x||0,c.y||0);if(c.animation==='slide')ctx.translate(p.move,0);
 // Zoom around the frame center for full-frame PNGs, and around each graphic's anchor for template graphics.
 if(c.type==='image'){
  const img=imageAsset(c.media);if(img){const ratio=Math.min(WIDTH/img.naturalWidth,HEIGHT/img.naturalHeight,1)*c.scale;const w=img.naturalWidth*ratio,h=img.naturalHeight*ratio;let [x,y]=anchor(c,w,h);if(c.position==='center'){x=(WIDTH-w)/2;y=(HEIGHT-h)/2;}ctx.drawImage(img,x,y,w,h);}ctx.restore();return;
 }
 function local(w,h){const [x,y]=anchor(c,w*c.scale,h*c.scale);ctx.translate(x,y);ctx.scale(c.scale,c.scale);}
 if(c.type==='lowerthird'){
  font(ctx,64,650);const w=Math.min(1320,Math.max(580,ctx.measureText(c.title).width+100));local(w,170);
  ctx.shadowColor='#00000055';ctx.shadowBlur=30;ctx.shadowOffsetY=12;ctx.fillStyle=bg;box(ctx,0,0,w,170,4);ctx.shadowColor='transparent';ctx.fillStyle=accent;box(ctx,0,0,8,170,0);
  ctx.fillStyle=white;fit(ctx,c.title,64,w-105,650);ctx.fillText(c.title,46,83);label(ctx,c.subtitle,48,132,25,accent,550);
 }else if(c.type==='title'){
  local(1530,330);ctx.fillStyle=accent;box(ctx,0,0,78,5);label(ctx,c.subtitle,0,62,27,accent,650);ctx.fillStyle=white;fit(ctx,c.title,122,1500,700);ctx.fillText(c.title,0,218);
  ctx.globalAlpha*=.65;ctx.fillStyle=white;box(ctx,0,272,1480,1);
 }else if(c.type==='logo'){
  const img=imageAsset(c.media);const w=280,h=120;local(w,h);
  if(img){const ratio=Math.min(w/img.naturalWidth,h/img.naturalHeight);ctx.drawImage(img,(w-img.naturalWidth*ratio)/2,0,img.naturalWidth*ratio,img.naturalHeight*ratio);}else{ctx.textAlign='right';label(ctx,c.title,w,62,65,white,750);label(ctx,c.subtitle,w,100,19,accent,700);ctx.fillStyle=accent;ctx.beginPath();ctx.arc(w-ctx.measureText(c.subtitle).width-17,93,5,0,Math.PI*2);ctx.fill();}
 }else if(c.type==='ticker'){
  const y=c.position.startsWith('top')?0:HEIGHT-92;ctx.translate(0,y);ctx.fillStyle=bg;box(ctx,0,0,WIDTH,92);ctx.fillStyle=accent;box(ctx,0,0,185,92);label(ctx,'LE FIL',38,59,28,bg,750);
  ctx.save();ctx.beginPath();ctx.rect(200,0,1720,92);ctx.clip();font(ctx,35,550);const content=c.title+'     /     ';const textW=ctx.measureText(content).width;const offset=preview?0:((now-item.enteredAt)/1000*105)%(textW||1);ctx.fillStyle=white;for(let x=222-offset;x<2200;x+=textW||2000)ctx.fillText(content,x,59);ctx.restore();
 }else if(c.type==='timer'){
  local(680,280);ctx.fillStyle=bg;box(ctx,0,0,680,280,8);ctx.fillStyle=accent;box(ctx,0,0,680,6);label(ctx,c.title,42,62,28,white,550);
  const remaining=preview?c.timerSeconds:Math.max(0,Math.ceil((item.timerEndAt-(item.timerPausedAt||now))/1000));const h=Math.floor(remaining/3600),m=Math.floor(remaining%3600/60),s=remaining%60;const text=(h?String(h).padStart(2,'0')+':':'')+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  ctx.font=`600 ${h?105:140}px "SFMono-Regular", Menlo, monospace`;ctx.fillStyle=accent;ctx.fillText(text,38,222);
 }else if(c.type==='score'){
  local(850,114);ctx.fillStyle=bg;box(ctx,0,0,850,114,6);ctx.fillStyle=accent;box(ctx,335,0,180,114);ctx.textAlign='center';fit(ctx,c.title,31,290,650);ctx.fillStyle=white;ctx.fillText(c.title,167,70);fit(ctx,c.subtitle,31,290,650);ctx.fillText(c.subtitle,682,70);label(ctx,`${c.scoreHome} : ${c.scoreAway}`,425,75,47,bg,750);
 }else if(c.type==='fullscreen'){
  ctx.fillStyle=bg;ctx.fillRect(0,0,WIDTH,HEIGHT);ctx.save();ctx.globalAlpha*=.12;ctx.strokeStyle=accent;ctx.lineWidth=1;for(let x=-600;x<2300;x+=120){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+550,HEIGHT);ctx.stroke();}ctx.restore();
  ctx.fillStyle=accent;box(ctx,112,110,64,6);label(ctx,'graphX  /  LIVE PRODUCTION',112,164,21,accent,650);ctx.fillStyle=white;fit(ctx,c.title,148,1690,700);ctx.fillText(c.title,108,585);label(ctx,c.subtitle,116,665,36,white,450);label(ctx,'RESTEZ AVEC NOUS',116,975,22,accent,650);
 }
 ctx.restore();
}
export function render(canvas,items,now=Date.now(),options={}){
 const ctx=canvas.getContext('2d',{willReadFrequently:options.key===true});ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(canvas.width/WIDTH,0,0,canvas.height/HEIGHT,0,0);
 const sorted=[...items].sort((a,b)=>a.cue.layer-b.cue.layer||a.enteredAt-b.enteredAt);for(const item of sorted)graphic(ctx,item,now,options.preview);
 ctx.setTransform(1,0,0,1,0,0);
 if(options.key){const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4){pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=pixels.data[i+3];pixels.data[i+3]=255;}ctx.putImageData(pixels,0,0);}
 if(options.fill){ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#000000';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalCompositeOperation='source-over';}
}
export function previewItem(cue){return {key:'preview',cue,enteredAt:0,exitingAt:null,timerEndAt:Date.now()+cue.timerSeconds*1000,timerPausedAt:null};}
