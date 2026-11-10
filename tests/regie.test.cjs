'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { createServer } = require('../app/server.cjs');
const { NativeOutput } = require('../app/native.cjs');

async function withServer(options, run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'graphx-regie-'));
  const server = createServer({ dataDir: dir, ...options });
  try {
    const url = await server.listen();
    const post = (route, body, type = 'application/json') => fetch(url + route, {
      method: 'POST', headers: { 'Content-Type': type },
      body: type === 'application/json' ? JSON.stringify(body) : body
    });
    const action = body => post('/api/action', body);
    await run({ server, post, action, url });
  } finally {
    await server.close();
    await fs.rm(dir, { recursive: true, force: true });
  }
}

test('emergency clear interrupts preparation and invalidates earlier takes without waiting for the renderer', async () => {
  let blockedId, release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const starting = new Promise(resolve => { entered = resolve; });
  await withServer({ mode: 'native', async onPrepare(cues, signal) {
    if (signal && cues.some(c => c.id === blockedId)) { entered(); await gate; }
    return cues.map(c => ({ id: c.id, state: 'ready' }));
  } }, async ({ server, action }) => {
    try {
      const [first, second, third] = server.state.project.cues;
      blockedId = second.id;
      assert.equal((await action({ type: 'go', id: first.id })).status, 200);
      const oldToken = server.snapshot().transportToken;
      const slow = action({ type: 'go', id: second.id, transportToken: oldToken });
      await starting;
      const clear = await action({ type: 'clear', requestId: 'panic', transportToken: oldToken });
      assert.equal(clear.status, 200);
      const cleared = await clear.json();
      assert.equal(server.state.live.length, 0);
      assert.notEqual(cleared.transportToken, oldToken);
      assert.equal((await slow).status, 400);
      assert.equal((await action({ type: 'go', id: second.id, transportToken: oldToken })).status, 400);
      const retry = await action({ type: 'clear', requestId: 'panic', transportToken: oldToken });
      assert.deepEqual(await retry.json(), cleared);
      assert.equal((await action({ type: 'go', id: third.id, transportToken: cleared.transportToken })).status, 200);
      release();
      assert.deepEqual(server.state.live.map(x => x.cue.id), [third.id]);
    } finally { release(); }
  });
});

test('live import is atomic, preserves the armed cue and reserves stable media slots', async () => {
  await withServer({}, async ({ server, post, action }) => {
    const bytes = await fs.readFile(path.join(__dirname, '../examples/Mire-alpha-1080.png'));
    const uploaded = await post('/api/media', bytes, 'image/png');
    assert.equal(uploaded.status, 200);
    const { name } = await uploaded.json();
    const { state } = server;
    await action({ type: 'followMode', enabled: true });
    await action({ type: 'advance', expectedId: state.playback.nextId });
    const live = structuredClone(state.live), next = state.playback.nextId, selected = state.selectedId;
    const image = { type: 'image', media: name, label: 'Sponsor' };
    const originalCount = state.project.cues.length;
    const rejected = await action({ type: 'importAssets', cues: [image, { ...image, media: 'a'.repeat(64) + '.png' }] });
    assert.equal(rejected.status, 400);
    assert.equal(state.project.cues.length, originalCount);
    assert.equal((await action({ type: 'importAssets', cues: [image, { ...image, label: 'Pause' }] })).status, 200);
    const [sponsor, pause] = state.project.cues.slice(-2);
    assert.deepEqual(state.live, live);
    assert.equal(state.playback.nextId, next);
    assert.equal(state.selectedId, selected);
    assert.ok(sponsor.skip && pause.skip);
    assert.deepEqual(state.project.assetSlots.slice(0, 2), [sponsor.id, pause.id]);
    assert.equal(state.project.lastAssetId, pause.id);
    await action({ type: 'reorder', id: pause.id, beforeId: sponsor.id });
    assert.equal(state.project.assetSlots[1], pause.id);
    await action({ type: 'assetSlot', slot: 1, id: null });
    assert.deepEqual(state.project.assetSlots.slice(0, 2), [null, pause.id]);
    await action({ type: 'remove', id: pause.id });
    assert.equal(state.project.lastAssetId, null);
    assert.equal(state.project.assetSlots[1], null);
  });
});

test('SDI health distinguishes missing stats from a stalled completion counter', () => {
  const statuses = [];
  const output = new NativeOutput('test', status => statuses.push(status));
  output.running = true;
  output.lastStatsAt = output.lastProgressAt = 1000;
  output.checkHealth(4499);
  assert.equal(statuses.length, 0);
  output.checkHealth(4501);
  assert.match(statuses.at(-1).message, /ne transmet plus/);
  output.lastStatsAt = 4600;
  output.checkHealth(4600);
  assert.match(statuses.at(-1).message, /ne progresse plus/);
  output.lastProgressAt = 4700;
  output.checkHealth(4700);
  assert.equal(statuses.at(-1).error, false);
});
