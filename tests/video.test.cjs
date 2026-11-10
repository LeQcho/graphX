'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createHash } = require('node:crypto');
const { act, cleanup, createState, cue } = require('../app/model.cjs');
const { createServer } = require('../app/server.cjs');

test('video playback keeps remaining time through pause and expires without removing other layers', async () => {
  const { videoPosition } = await import('../web/video.mjs');
  const state = createState();
  const video = cue('video', { media: 'a'.repeat(64) + '.webm', videoDurationMs: 2000 });
  state.project.cues.push(video);
  act(state, { type: 'go', id: state.project.cues[0].id }, 1000);
  act(state, { type: 'go', id: video.id }, 1000);
  const live = state.live.find(item => item.cue.id === video.id);
  act(state, { type: 'videoTransport', key: live.key, operation: 'toggle' }, 1750);
  assert.equal(videoPosition(live, 3000), 750);
  assert.equal(cleanup(state, 3000), false);
  act(state, { type: 'videoTransport', key: live.key, operation: 'toggle' }, 3000);
  assert.equal(videoPosition(live, 3250), 1000);
  act(state, { type: 'videoTransport', key: live.key, operation: 'restart' }, 3500);
  assert.equal(videoPosition(live, 4000), 500);
  assert.equal(cleanup(state, 5500), true);
  assert.deepEqual(state.live.map(item => item.cue.id), [state.project.cues[0].id]);
  assert.throws(() => act(state, { type: 'videoTransport', key: live.key, operation: 'toggle' }, 5500), /plus à l’antenne/);
  act(state, { type: 'edit', id: video.id, patch: { videoLoop: true } }, 6000);
  act(state, { type: 'go', id: video.id }, 6000);
  const loop = state.live.find(item => item.cue.id === video.id);
  assert.equal(videoPosition(loop, 8400), 400);
  assert.equal(cleanup(state, 8400), false);
});

test('WebM streaming, byte ranges and portable archives preserve the media and duration', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'graphx-video-test-'));
  const original = createServer({ dataDir: path.join(root, 'original') });
  const restored = createServer({ dataDir: path.join(root, 'restored') });
  try {
    const url = await original.listen(), target = await restored.listen();
    // Container header and synthetic payload for transport. Decoding is exercised in Electron.
    const bytes = Buffer.alloc(160 * 1024, 0x7f);
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]).copy(bytes);
    const post = (url, type, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': type }, body });
    assert.equal((await post(url + '/api/video', 'video/webm', Buffer.from('invalid'))).status, 400);
    const uploaded = await post(url + '/api/video', 'video/webm', bytes);
    assert.equal(uploaded.status, 200);
    const { name } = await uploaded.json();
    assert.equal(name, createHash('sha256').update(bytes).digest('hex') + '.webm');
    const range = await fetch(url + '/media/' + name, { headers: { Range: 'bytes=2-7' } });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('content-range'), 'bytes 2-7/' + bytes.length);
    assert.deepEqual(Buffer.from(await range.arrayBuffer()), bytes.subarray(2, 8));
    const suffix = await fetch(url + '/media/' + name, { headers: { Range: 'bytes=-8' } });
    assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), bytes.subarray(-8));
    assert.equal((await fetch(url + '/media/' + name, { headers: { Range: 'bytes=999999-' } })).status, 416);
    assert.equal((await post(url + '/api/action', 'application/json', JSON.stringify({
      type: 'batchAdd', cues: [{ type: 'video', media: name, videoDurationMs: 2500, videoLoop: true }]
    }))).status, 200);
    const archive = await fetch(url + '/api/archive').then(res => res.arrayBuffer());
    assert.equal((await post(target + '/api/archive', 'application/octet-stream', archive)).status, 200);
    const video = restored.state.project.cues.find(c => c.type === 'video');
    assert.equal(video.videoDurationMs, 2500);
    assert.equal(video.videoLoop, true);
    assert.deepEqual(Buffer.from(await fetch(target + '/media/' + name).then(res => res.arrayBuffer())), bytes);
  } finally {
    await Promise.all([original.close(), restored.close()]);
    await fs.rm(root, { recursive: true, force: true });
  }
});
