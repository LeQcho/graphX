// Non-drop frame counting; at 59.94, frame labels use nominal 60.
export function formatTimecode(ms,fps=50){
 const rate=Math.round(fps),frames=Math.max(0,Math.floor(ms*fps/1000+1e-6));
 const f=frames%rate,total=Math.floor(frames/rate),s=total%60,m=Math.floor(total/60)%60,h=Math.floor(total/3600);
 return [h,m,s,f].map(v=>String(v).padStart(2,'0')).join(':');
}
export function parseTimecode(value,fps=50){
 if(!value.trim())return null;
 const match=/^(\d{2}):(\d{2}):(\d{2}):(\d{2})$/.exec(value.trim());
 if(!match)throw new Error('Timecode attendu : HH:MM:SS:FF.');
 const [h,m,s,f]=match.slice(1).map(Number),rate=Math.round(fps);
 if(m>59||s>59||f>=rate)throw new Error(`Repère invalide : FF doit être compris entre 00 et ${rate-1}.`);
 return (((h*60+m)*60+s)*rate+f)*1000/fps;
}
export function elapsedClock(playback,now){return playback.clockMs+(playback.clockStartedAt===null?0:Math.max(0,now-playback.clockStartedAt));}
