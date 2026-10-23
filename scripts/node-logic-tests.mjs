// node-logic-tests.mjs — engine logic tests WITHOUT a browser.
// Run from repo root:  node scripts/node-logic-tests.mjs
// These complement the browser scenario tests (see docs/AUDIT.md).
import { Player } from '../js/entities/player.js';
import { World } from '../js/world/world.js';
import { Jackal, WhiteJackal } from '../js/entities/enemies.js';
import { Arrows } from '../js/entities/projectiles.js';
import { Director } from '../js/qte.js';
import { Input, INPUT_KEEP_MS } from '../js/core/input.js';
import { GROUND_Y } from '../js/content/levels.js';

const STEP = 1 / 60;
let passed = 0, failed = 0;
function assert(cond, name, extra = '') {
  if (cond) { passed++; console.log(`  OK  ${name}`); }
  else { failed++; console.log(`  FAIL  ${name} ${extra}`); }
}

// ---- shared mock game ----
function makeGame() {
  const noop = () => {};
  const held = new Set();          // "keys held down" for down()
  const input = {
    buf: new Set(),
    press(c) { this.buf.add(c); held.add(c); },
    release(c) { this.buf.delete(c); held.delete(c); },
    releaseAll() { this.buf.clear(); held.clear(); },
    down(action) {
      const map = { jump: ['KeyZ'], attack: ['KeyX'], roll: ['KeyV'], bow: ['KeyC'], mount: ['KeyE'], left: ['ArrowLeft'], right: ['ArrowRight'] };
      return (map[action] || []).some(c => held.has(c));
    },
    justPressed(a) {
      const map = { jump: ['KeyZ'], attack: ['KeyX'], roll: ['KeyV'], bow: ['KeyC'], mount: ['KeyE'] };
      return (map[a] || []).some(c => this.buf.has(c));
    },
    endStep(consumed) { if (consumed) this.buf.clear(); },
    clearPresses() { this.buf.clear(); },
  };
  let seed = 12345;
  const rng = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  return {
    settings: { shake: 1, qteEasy: false, sound: true },
    rng,
    audio: { play: noop },
    particles: { burst: noop, dust: noop, spawn: noop, sparkBurst: noop, update: noop },
    camera: { shake: noop, zoomTo: noop, follow: noop, update: noop, freeY: false },
    hud: { sync: noop, bossSync: noop, combo: noop, bossShow: noop, bossHide: noop, setTrialLabel: noop },
    hurtVignette: noop,
    flash: noop,
    banner: noop,
    input,
    enemies: [],
    arrows: new Arrows(),
    player: null,
    hitstop: 0,
    timescale: 1,
    dialogue: { active: false, play: noop, forceClose: noop },
    onMiniBossDead: noop,
    onBossDead: noop,
    onPlayerDead: noop,
    isTouch: false,
    viewW: 1280, viewH: 720,
  };
}

console.log('1) determinism: identical input -> identical state (different chunking)');
{
  const mk = () => {
    const g = makeGame();
    const w = new World('trial1', g);
    const p = new Player(g);
    p.reset(140, GROUND_Y - 60);
    g.player = p;
    g.enemies = [];
    return { g, w, p };
  };
  const A = mk(), B = mk();
  const script = (s, step) => {
    if (step === 90) s.g.input.press('KeyZ'); else if (step === 96) s.g.input.releaseAll();
    if (step === 180 || step === 200) s.g.input.press('KeyX'); else if (step === 186 || step === 206) s.g.input.releaseAll();
    if (step === 300) s.g.input.press('KeyV'); else if (step === 306) s.g.input.releaseAll();
    if (step > 120 && step % 2 === 0) s.g.input.buf.add('ArrowRight');
    if (step > 120 && step % 2 === 1) s.g.input.buf.delete('ArrowRight');
  };
  for (let i = 0; i < 420; i++) { script(A, i); A.p.update(STEP, A.w, A.g.input); A.g.input.endStep(true); }
  for (let i = 0; i < 420; i += 2) {
    script(B, i); B.p.update(STEP, B.w, B.g.input); B.g.input.endStep(true);
    script(B, i + 1); B.p.update(STEP, B.w, B.g.input); B.g.input.endStep(true);
  }
  assert(Math.abs(A.p.x - B.p.x) < 1e-9 && Math.abs(A.p.y - B.p.y) < 1e-9,
    'final state identical across step chunking', `A.x=${A.p.x.toFixed(4)} B.x=${B.p.x.toFixed(4)}`);
  assert(Math.abs(A.p.y - GROUND_Y) < 0.01, 'rests on ground after 7s', `y=${A.p.y.toFixed(2)}`);
}

console.log('2) jump apex matches closed-form expectation (held jump)');
{
  const g = makeGame();
  const w = new World('trial1', g);
  const p = new Player(g);
  p.reset(140, GROUND_Y);
  g.player = p; g.enemies = [];
  let minY = GROUND_Y;
  g.input.press('KeyZ');
  for (let i = 0; i < 120; i++) { p.update(STEP, w, g.input); minY = Math.min(minY, p.y); g.input.endStep(true); }
  const jumpH = GROUND_Y - minY;
  assert(jumpH > 120 && jumpH < 150, `jump height in expected band (${jumpH.toFixed(1)}px ~ v^2/2g = 138)`);
}

console.log('3) collision: one-way landing, pass-through from below, solid landing');
{
  const g = makeGame();
  const w = new World('trial1', g);
  const p = new Player(g);
  g.player = p; g.enemies = [];
  p.reset(830, GROUND_Y - 200); p.vy = 0;
  for (let i = 0; i < 90; i++) { p.update(STEP, w, g.input); g.input.endStep(true); }
  assert(Math.abs(p.y - (GROUND_Y - 70)) < 0.01, `lands on one-way ledge (y=${p.y.toFixed(2)} ~ ${GROUND_Y - 70})`);
  p.reset(830, GROUND_Y - 20); p.vy = 0; g.input.releaseAll();
  for (let i = 0; i < 15; i++) { p.update(STEP, w, g.input); g.input.endStep(true); }  // land first
  assert(p.onGround, 'player grounded before the pass-through jump');
  g.input.press('KeyZ');
  let crossed = false;
  for (let i = 0; i < 60; i++) { p.update(STEP, w, g.input); if (p.y < GROUND_Y - 70 - 5) crossed = true; g.input.endStep(true); }
  assert(crossed, 'passes through one-way ledge from below');
  p.reset(4000, GROUND_Y - 400); p.vy = 0; g.input.releaseAll();
  for (let i = 0; i < 120; i++) { p.update(STEP, w, g.input); g.input.endStep(true); }
  assert(Math.abs(p.y - GROUND_Y) < 0.01, `lands on solid ground without penetration (y=${p.y.toFixed(3)})`);
}

console.log('4) fast arrow: swept collision, no tunneling');
{
  const g = makeGame();
  const w = new World('trial1', g);
  const jackal = new Jackal(g, 1200, GROUND_Y);
  g.enemies = [jackal];
  const arrows = new Arrows();
  arrows.shoot(1000, GROUND_Y - 18, 1, 980, g, 5);
  for (let i = 0; i < 30 && jackal.hp >= 2; i++) arrows.update(STEP, w, g.enemies, g);
  assert(jackal.hp < 2, '980px/s arrow hits the jackal', `hp=${jackal.hp}`);
}

console.log('5) WhiteJackal: triple chain executes real lunges and returns to prowl');
{
  const g = makeGame();
  const w = new World('trial1', g);
  const p = new Player(g); p.reset(2450 - 90, GROUND_Y);
  g.player = p;
  const arena = { x1: 2150, x2: 2950 };
  const bj = new WhiteJackal(g, 2450, GROUND_Y, arena, 'test');
  bj.active = true;
  g.enemies = [bj];
  let lunges = 0, enteredTriple = false, backToProwl = false;
  const realPlay = g.audio.play.bind(g.audio);
  g.audio.play = (name) => { if (name === 'pounce') lunges++; realPlay(name); };
  for (let i = 0; i < 60 * 14; i++) {
    // the player CHASES (330px/s) — the alpha retreats to keep ~140px
    if (!enteredTriple) {
      const d = bj.x - p.x;
      p.x += Math.sign(d) * 330 * STEP;
    }
    bj.update(STEP, w, p);
    if (bj.state === 'triple' && bj.rig.name === 'lunge') enteredTriple = true;
    if (bj.state === 'prowl' && enteredTriple) { backToProwl = true; break; }
  }
  assert(enteredTriple, 'enters triple state');
  assert(lunges >= 3, `at least 3 real lunges (${lunges})`);
  assert(backToProwl, 'returns to prowl after the chain');
}

console.log('6) Director: _done_slamhit resets per start (second finisher still slams)');
{
  const g = makeGame();
  g.stateName = 'play';
  const p = new Player(g); p.reset(100, GROUND_Y);
  g.player = p;
  const d = new Director(g);
  const states = [];
  for (let run = 1; run <= 2; run++) {
    const boss = {
      isMini: true, x: p.x + 40, y: GROUND_Y, w: 56, h: 44, dead: false, staggered: true,
      recoverFromStagger() {}, enterState() {}, hurtbox() { return { x: boss.x - 28, y: GROUND_Y - 44, w: 56, h: 44 }; },
    };
    d.start(boss, true);
    for (let i = 0; i < 140; i++) d.update(STEP); // 2.33s > 1.85s cinematic
    states.push(d._done_slamhit);
  }
  assert(states[0] === true, 'finisher #1: slam fired');
  assert(states[1] === true, 'finisher #2 (same session): slam fired again', `runs=${states}`);
  assert(d.active === false, 'Director deactivated after the run');
}

console.log('7) jackal knockback friction: no ice-skating');
{
  const g = makeGame();
  const w = new World('trial1', g);
  const p = new Player(g); p.reset(500, GROUND_Y);
  g.player = p; g.enemies = [];
  const j = new Jackal(g, 560, GROUND_Y);
  j.hurt(1, 1, g);            // non-lethal: 2hp mob takes 1 → stun, not death
  assert(j.state === 'stun', 'jackal enters stun (not dead)');
  let maxX = j.x, vxAtStun = 0;
  for (let i = 0; i < 120; i++) {
    j.update(STEP, w, p);
    if (i === 15) vxAtStun = j.vx;      // still inside the 0.28s stun window
    maxX = Math.max(maxX, j.x);
  }
  const drift = maxX - 560;
  assert(drift < 120, `total post-hit drift bounded (${drift.toFixed(1)}px)`);
  assert(Math.abs(vxAtStun) < 40, `velocity bleeding off inside stun (${vxAtStun.toFixed(1)}px/s)`);
}

console.log('8) input buffer: pause never double-fires; presses survive hitstop');
{
  // Node has no DOM — stub the global window Input binds to
  globalThis.window = { addEventListener() {} };
  // Simulate the real sequence that used to double-toggle pause:
  // step N consumes Escape via consume() and returns false (paused),
  // step N+1 must NOT see the same press again.
  const inp = new Input();
  windowShim(inp);
  inp.press('Escape');
  let toggles = 0;
  let paused = false;
  for (let i = 0; i < 10; i++) {
    if (inp.justPressed('pause')) { inp.consume('pause'); toggles++; paused = !paused; }
    inp.endStep(paused);   // paused steps return false (keep fresh presses)
  }
  assert(toggles === 1 && paused === true, 'single Escape → single toggle', `toggles=${toggles}`);

  // hitstop survival: press during skipped steps stays alive < INPUT_KEEP_MS
  const inp2 = new Input();
  windowShim(inp2);
  inp2.press('KeyX');
  let sawAttack = false;
  for (let i = 0; i < 5; i++) {           // 5 skipped steps (~83ms) — hitstop window
    if (inp2.justPressed('attack')) sawAttack = true;   // would fire after freeze
    inp2.endStep(false);
  }
  assert(sawAttack, 'press survives hitstop-length skip window');
  // after 150ms of skipped steps the stale press expires (no leak across pause)
  const stale = new Input(); windowShim(stale);
  stale.press('KeyX');
  await new Promise(r => setTimeout(r, INPUT_KEEP_MS + 60));
  stale.endStep(false);
  assert(!stale.justPressed('attack'), 'stale press expires after the keep window');
}

// Input binds window listeners at construction — stub window in Node
function windowShim(inp) {
  // Input's constructor already ran; no listeners are needed for the tests —
  // press()/release() drive it directly.
}

console.log(`\nRESULT: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
