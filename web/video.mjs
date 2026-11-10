const warm = new Map();
const players = new Map();

function loadClip(src) {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const clip = { video, decoded: false, pendingPlay: false, lastSeek: -Infinity };
  let finish;
  clip.ready = new Promise((resolve, reject) => {
    finish = error => {
      clearTimeout(timeout);
      video.onloadeddata = video.onerror = null;
      if (error) reject(error);
      else resolve(Math.round(video.duration * 1000));
    };
    const timeout = setTimeout(() => finish(Error('Délai de chargement vidéo dépassé.')), 6500);
    video.onerror = () => finish(Error('Vidéo WebM illisible ou codec incompatible.'));
    video.onloadeddata = () => {
      const duration = Math.round(video.duration * 1000);
      if (!video.videoWidth || video.videoWidth > 1920 || video.videoHeight > 1080 ||
          !Number.isFinite(duration) || duration < 1 || duration > 30 * 60 * 1000) {
        finish(Error('Utilise un WebM de 1920 × 1080 maximum, jusqu’à 30 minutes.'));
      } else finish();
    };
  });
  clip.ready.then(() => { clip.decoded = true; }, () => {});
  clip.dispose = () => {
    finish(Error('Vidéo libérée.'));
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
  video.src = src;
  return clip;
}

function warmClip(media) {
  let clip = warm.get(media);
  if (clip) warm.delete(media);
  else clip = loadClip('/media/' + media);
  warm.set(media, clip);
  if (warm.size > 16) {
    const [key, oldest] = warm.entries().next().value;
    warm.delete(key);
    oldest.dispose();
  }
  return clip;
}

export async function inspectVideo(file) {
  const url = URL.createObjectURL(file);
  const clip = loadClip(url);
  try { return await clip.ready; }
  finally { clip.dispose(); URL.revokeObjectURL(url); }
}

export async function prepareVideo(cue) {
  if (!cue.media) throw Error('Aucune vidéo associée.');
  const duration = await warmClip(cue.media).ready;
  if (Math.abs(duration - cue.videoDurationMs) > 50) throw Error('Durée incorrecte. Réimporte la vidéo.');
  return duration;
}

export function videoPosition(item, now) {
  const duration = item.cue.videoDurationMs;
  const elapsed = Math.max(0, (item.videoPausedAt ?? now) - item.videoStartedAt);
  return item.cue.videoLoop ? elapsed % duration : Math.min(duration, elapsed);
}

export function releaseVideoPlayers(items) {
  const active = new Set(items.filter(item => item.cue.type === 'video').map(item => item.key));
  for (const [key, clip] of players) {
    if (active.has(key)) continue;
    clip.dispose();
    players.delete(key);
  }
}

export function videoFrame(item, now, preview) {
  if (!item.cue.media || !item.cue.videoDurationMs) return null;
  if (preview) {
    const clip = warmClip(item.cue.media);
    return clip.decoded ? clip.video : null;
  }
  let clip = players.get(item.key);
  if (!clip) {
    clip = warm.get(item.cue.media) || loadClip('/media/' + item.cue.media);
    warm.delete(item.cue.media);
    players.set(item.key, clip);
  }
  if (!clip.decoded || clip.video.error) return null;
  const { video } = clip;
  const position = videoPosition(item, now) / 1000;
  const target = Math.min(position, video.duration);
  const paused = item.videoPausedAt !== null || (!item.cue.videoLoop && position * 1000 >= item.cue.videoDurationMs);
  const changed = clip.startedAt !== item.videoStartedAt || clip.pausedAt !== item.videoPausedAt;
  clip.startedAt = item.videoStartedAt;
  clip.pausedAt = item.videoPausedAt;
  video.loop = item.cue.videoLoop;
  if (!video.seeking && Math.abs(video.currentTime - target) > (changed ? 0.02 : paused ? 0.05 : 0.25) &&
      (changed || now - clip.lastSeek > 750)) {
    clip.lastSeek = now;
    video.currentTime = target;
  }
  if (paused) video.pause();
  else if (video.paused && !clip.pendingPlay) {
    clip.pendingPlay = true;
    video.play().catch(() => {}).finally(() => { clip.pendingPlay = false; });
  }
  return video.readyState >= 2 && !video.seeking ? video : null;
}
