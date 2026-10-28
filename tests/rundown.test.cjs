'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createState, validateProject, act } = require('../app/model.cjs');

function ids(state) { return state.project.cues.map(c => c.id); }

test('dragging a live cue preserves its on-air snapshot, selection and armed cue', () => {
  const s = createState();
  const original = ids(s);
  act(s, { type: 'followMode', enabled: true }, 1000);
  act(s, { type: 'advance' }, 1000);
  const live = structuredClone(s.live);
  const selected = s.selectedId;
  const armed = s.playback.nextId;
  assert.equal(act(s, { type: 'reorder', id: original[0], beforeId: null }, 1100), true);
  assert.deepEqual(ids(s), [...original.slice(1), original[0]]);
  assert.deepEqual(s.live, live);
  assert.equal(s.selectedId, selected);
  assert.equal(s.playback.nextId, armed);
});

test('reordering before an earlier or later item is based on stable cue IDs', () => {
  const s = createState();
  const original = ids(s);
  act(s, { type: 'reorder', id: original[4], beforeId: original[1] });
  assert.deepEqual(ids(s), [original[0], original[4], ...original.slice(1, 4), ...original.slice(5)]);
  act(s, { type: 'reorder', id: original[4], beforeId: original[5] });
  assert.deepEqual(ids(s), original);
  act(s, { type: 'reorder', id: original[4], beforeId: original[4] });
  assert.deepEqual(ids(s), original);
});

test('invalid reorder destination leaves the entire state unchanged', () => {
  const s = createState();
  const before = structuredClone(s);
  assert.throws(() => act(s, { type: 'reorder', id: s.selectedId, beforeId: 'missing-cue' }), /Destination/);
  assert.deepEqual(s, before);
});

test('browsing the rundown does not replace the cue armed for sequential playback', () => {
  const s = createState();
  const original = ids(s);
  act(s, { type: 'followMode', enabled: true }, 1000);
  act(s, { type: 'select', id: original[4] }, 1000);
  assert.equal(s.playback.nextId, original[0]);
  assert.equal(act(s, { type: 'advance' }, 2000), false);
  assert.equal(s.live.at(-1).cue.id, original[0]);
  assert.equal(s.playback.lastId, original[0]);
  assert.equal(s.playback.nextId, original[1]);
  assert.equal(s.selectedId, original[4]);
});

test('advance follows the current order after moving the armed cue', () => {
  const s = createState();
  const original = ids(s);
  act(s, { type: 'followMode', enabled: true }, 1000);
  act(s, { type: 'reorder', id: original[0], beforeId: original[4] }, 1000);
  assert.equal(s.playback.nextId, original[0]);
  act(s, { type: 'advance' }, 2000);
  assert.equal(s.live.at(-1).cue.id, original[0]);
  assert.equal(s.playback.nextId, original[4]);
});

test('last cue plays once; advancing at the end cannot silently replay it', () => {
  const s = createState();
  const last = s.project.cues.at(-1).id;
  act(s, { type: 'select', id: last }, 1000);
  act(s, { type: 'followMode', enabled: true }, 1000);
  act(s, { type: 'advance' }, 2000);
  assert.equal(s.playback.nextId, null);
  assert.equal(s.playback.lastId, last);
  const finished = structuredClone(s);
  assert.throws(() => act(s, { type: 'advance' }, 2100), /Fin du conducteur/);
  assert.deepEqual(s, finished);
  act(s, { type: 'arm', id: last }, 2200);
  act(s, { type: 'advance' }, 2300);
  assert.equal(s.live.at(-1).cue.id, last);
  assert.equal(s.live.at(-1).enteredAt, 2300);
});

test('sequential playback is rejected while follow mode is disabled', () => {
  const s = createState();
  const before = structuredClone(s);
  assert.throws(() => act(s, { type: 'advance' }), /mode conducteur/);
  assert.deepEqual(s, before);
});

test('removing the armed cue arms its successor; removing the last reaches the end', () => {
  const s = createState();
  const original = ids(s);
  act(s, { type: 'followMode', enabled: true }, 1000);
  act(s, { type: 'remove', id: original[0] }, 1000);
  assert.equal(s.playback.nextId, original[1]);
  act(s, { type: 'arm', id: original.at(-1) }, 1000);
  act(s, { type: 'remove', id: original.at(-1) }, 1000);
  assert.equal(s.playback.nextId, null);
});

test('show clock accumulates running intervals only and resets without changing program', () => {
  const s = createState();
  act(s, { type: 'go' }, 1000);
  const live = structuredClone(s.live);
  assert.equal(act(s, { type: 'clockToggle' }, 2000), false);
  assert.equal(s.playback.clockStartedAt, 2000);
  act(s, { type: 'clockToggle' }, 3250);
  assert.equal(s.playback.clockMs, 1250);
  assert.equal(s.playback.clockStartedAt, null);
  act(s, { type: 'clockToggle' }, 10000);
  act(s, { type: 'clockToggle' }, 10500);
  assert.equal(s.playback.clockMs, 1750);
  act(s, { type: 'clockToggle' }, 20000);
  act(s, { type: 'clockReset' }, 20500);
  assert.equal(s.playback.clockMs, 0);
  assert.equal(s.playback.clockStartedAt, null);
  assert.deepEqual(s.live, live);
});

test('older projects load with optional timecode markers and restart with clock paused', () => {
  const s = createState();
  for (const c of s.project.cues) delete c.timecodeMs;
  const old = validateProject(s.project);
  assert.ok(old.cues.every(c => c.timecodeMs === null));
  const resumed = createState(old);
  assert.equal(resumed.playback.enabled, false);
  assert.equal(resumed.playback.nextId, old.cues[0].id);
  assert.equal(resumed.playback.clockStartedAt, null);
  assert.equal(resumed.playback.clockMs, 0);
  act(resumed, { type: 'edit', patch: { timecodeMs: 61240 } });
  const saved = validateProject(resumed.project);
  assert.equal(saved.cues[0].timecodeMs, 61240);
  act(resumed, { type: 'edit', patch: { timecodeMs: null } });
  assert.equal(resumed.project.cues[0].timecodeMs, null);
});


test('stale advance expectation is rejected before program or playhead changes', () => {
  const s = createState();
  const first = s.project.cues[0].id;
  act(s, { type: 'followMode', enabled: true }, 1000);
  act(s, { type: 'advance', expectedId: first }, 2000);
  const before = structuredClone(s);
  assert.throws(() => act(s, { type: 'advance', expectedId: first }, 2100), /prochain élément a changé/);
  assert.deepEqual(s, before);
  const next = s.playback.nextId;
  const revision = s.revision;
  act(s, { type: 'advance', expectedId: next }, 2200);
  assert.equal(s.live.at(-1).cue.id, next);
  assert.equal(s.revision, revision + 1);
});

test('selection follows the playhead only when it was on the armed cue', () => {
  const s = createState();
  const original = ids(s);
  act(s, { type: 'followMode', enabled: true }, 1000);
  act(s, { type: 'advance' }, 2000);
  assert.equal(s.selectedId, original[1]);
  act(s, { type: 'select', id: original[5] }, 2100);
  act(s, { type: 'advance' }, 2200);
  assert.equal(s.selectedId, original[5]);
  assert.equal(s.playback.nextId, original[2]);
});

test('invalid imported cue IDs are regenerated before initial selection and arming', () => {
  const project = createState().project;
  project.cues[0].id = '../../bad identifier';
  const s = createState(project);
  assert.notEqual(s.project.cues[0].id, project.cues[0].id);
  assert.equal(s.selectedId, s.project.cues[0].id);
  assert.equal(s.playback.nextId, s.project.cues[0].id);
  act(s, { type: 'followMode', enabled: true }, 1000);
  act(s, { type: 'advance' }, 2000);
  assert.equal(s.live.at(-1).cue.id, s.project.cues[0].id);
});

test('timecode roundtrips frame, second, minute and hour boundaries at every supported rate', async () => {
  const { parseTimecode, formatTimecode } = await import('../web/timecode.mjs');
  for (const fps of [25, 30, 50, 59.94, 60]) {
    const rate = Math.round(fps);
    const lastFrame = String(rate - 1).padStart(2, '0');
    for (const tc of ['00:00:00:00', '00:00:00:01', `00:00:00:${lastFrame}`, '00:00:01:00',
      `00:00:59:${lastFrame}`, '00:01:00:00', `00:59:59:${lastFrame}`, '01:00:00:00',
      '12:34:56:12', `99:59:59:${lastFrame}`]) {
      assert.equal(formatTimecode(parseTimecode(tc, fps), fps), tc, `${fps} fps: ${tc}`);
    }
    const lastMinuteFrame = parseTimecode(`00:00:59:${lastFrame}`, fps);
    assert.equal(formatTimecode(lastMinuteFrame + 1000 / fps, fps), '00:01:00:00');
    const lastHourFrame = parseTimecode(`00:59:59:${lastFrame}`, fps);
    assert.equal(formatTimecode(lastHourFrame + 1000 / fps, fps), '01:00:00:00');
  }
});

test('timecode rejects malformed and out-of-range markers while allowing an empty marker', async () => {
  const { parseTimecode } = await import('../web/timecode.mjs');
  assert.equal(parseTimecode(''), null);
  assert.equal(parseTimecode('  '), null);
  for (const tc of ['1:00:00:00', '-1:00:00:00', '00:60:00:00', '00:00:60:00', 'aa:00:00:00', '00:00:00', '100:00:00:00']) {
    assert.throws(() => parseTimecode(tc, 50), undefined, tc);
  }
  for (const fps of [25, 30, 50, 59.94, 60]) {
    assert.throws(() => parseTimecode(`00:00:00:${Math.round(fps)}`, fps));
  }
});

test('elapsed clock interpolates running time and holds when paused', async () => {
  const { elapsedClock } = await import('../web/timecode.mjs');
  assert.equal(elapsedClock({ clockMs: 5000, clockStartedAt: 1000 }, 2250), 6250);
  assert.equal(elapsedClock({ clockMs: 5000, clockStartedAt: null }, 2250), 5000);
  assert.equal(elapsedClock({ clockMs: 5000, clockStartedAt: 3000 }, 2250), 5000);
});

test('manual GO updates the last sent cue without moving the sequential playhead',()=>{
 const s=createState();act(s,{type:'followMode',enabled:true});act(s,{type:'advance'});
 const next=s.playback.nextId,manual=s.project.cues[4].id;act(s,{type:'go',id:manual});
 assert.equal(s.playback.lastId,manual);assert.equal(s.playback.nextId,next);
 act(s,{type:'out',id:s.playback.lastId});assert.ok(s.live.find(item=>item.cue.id===manual).exitingAt);
});

test('Companion score changes are atomic, bounded, and update the matching on-air score',()=>{
 const s=createState(),c=s.project.cues.find(c=>c.type==='score');act(s,{type:'go',id:c.id});
 act(s,{type:'scoreAdjust',id:c.id,side:'home',amount:1});act(s,{type:'scoreAdjust',id:c.id,side:'home',amount:1});
 assert.equal(c.scoreHome,4);assert.equal(s.live.find(x=>x.cue.id===c.id).cue.scoreHome,4);
 act(s,{type:'scoreAdjust',id:c.id,side:'away',amount:-99});assert.equal(c.scoreAway,0);
 assert.throws(()=>act(s,{type:'scoreAdjust',id:c.id,side:'home',amount:NaN}));
});
test('Companion timer adjustment preserves pause and never goes below zero',()=>{
 const s=createState(),c=s.project.cues.find(c=>c.type==='timer');
 act(s,{type:'timerAdjust',id:c.id,seconds:30});assert.equal(c.timerSeconds,330);
 act(s,{type:'go',id:c.id},1000);act(s,{type:'timerToggle',id:c.id},2000);const item=s.live[0],end=item.timerEndAt;
 act(s,{type:'timerAdjust',id:c.id,seconds:30},9000);assert.equal(item.timerEndAt,end+30000);assert.equal(item.timerPausedAt,2000);
 act(s,{type:'timerAdjust',id:c.id,seconds:-86400},10000);assert.equal(item.timerEndAt,2000);
});
