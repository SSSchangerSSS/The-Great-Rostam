// game.js — core engine: FIXED-TIMESTEP loop, state machine, adaptive viewport,
// slow-mo, shared systems
//
// v2 simulation contract:
//   • simulation runs at a fixed STEP = 1/60 s with an accumulator + catch-up cap
//     (MAX_STEPS). Rendering is decoupled and interpolates positions with
//     alpha = acc/STEP (entities store px/py). After a hidden-tab return the
//     accumulator is dropped, so time never "teleports" the world.
//   • time domains:
//       sim time      — fixed steps × timescale (gameplay, physics, animation)
//       real time     — rawDt (QTE rings, Director, delayed callbacks)
//       UI time       — DOM/CSS animations (browser-owned)
//   • pause truly freezes sim + cinematics; slow-mo never touches QTE timing
//   • hitstop freezes gameplay INSIDE the play state but presses survive in the
//     input buffer (120 ms), so fast inputs are never swallowed
import { Input } from './input.js';
import { Camera } from './camera.js';
import { AudioSys } from './audio.js';
import { Particles } from '../gfx/particles.js';
import { Hud } from '../ui/hud.js';
import { Menus } from '../ui/menus.js';
import { DialogueBox } from '../ui/dialogue.js';
import { TouchUI } from '../ui/touch.js';
import { FinisherQTE, Director } from '../qte.js';
import { TitleState } from '../states/title.js';
import { PlayState } from '../states/play.js';
import { ResultsState } from '../states/results.js';
import { Environment } from '../gfx/parallax.js';
import { SpriteBank } from '../gfx/sprites.js';
import * as painters from '../gfx/paint.js';
import { makeRng } from './utils.js';

const BASE_H = 720;      // logical viewport height reference
const MIN_VIEW_W = 780;  // smallest logical width (portrait phones) — keeps combat readable
const STEP = 1 / 60;     // fixed simulation step
const MAX_STEPS = 4;     // catch-up cap: drop backlog beyond this (severe-slowdown policy)

const SETTINGS_KEY = 'rostam_settings_v1';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stage = document.getElementById('stage');
    // frame-by-frame sprite bank (pre-drawn sheets — no rigging at runtime);
    // legacy procedural painters remain as automatic fallback
    this.sprites = new SpriteBank();
    this.sprites.load();
    const fxCanvas = document.getElementById('fx');
    this.fxCanvas = fxCanvas;
    this.fxCtx = fxCanvas ? fxCanvas.getContext('2d') : null;

    this.input = new Input();
    this.audio = new AudioSys();
    this.camera = new Camera(1280, BASE_H);
    this.camera.game = this;               // camera reads shake-intensity setting
    this.particles = new Particles(420);
    this.hud = new Hud();
    this.menus = new Menus(this.audio);
    this.dialogue = new DialogueBox(this.input, this.audio);
    this.qte = new FinisherQTE(this);
    this.director = new Director(this);
    this.touch = new TouchUI(this);
    this.hitstop = 0;
    this.timescale = 1;          // slow-mo factor (finisher cinematics)
    this.realDt = 1 / 60;
    this.alpha = 0;              // render interpolation alpha (0 = right on a sim step)

    // ---- user settings (versioned, error-safe) ----
    this.settings = { sound: true, shake: 1, qteEasy: false };
    this.loadSettings();

    // ---- deterministic gameplay RNG (logic only — visual FX keep Math.random) ----
    const seedParam = new URLSearchParams(location.search).get('seed');
    const seed = seedParam ? (parseInt(seedParam, 10) >>> 0) : (Date.now() >>> 0);
    this.rngSeed = seed;
    this.rng = makeRng(seed);

    // ---- checkpoint (versioned, error-safe) ----
    this.checkpoint = null;      // { levelId, x, y } once the mini-boss falls
    this.loadCheckpoint();

    this.isTouch = window.matchMedia('(pointer: coarse)').matches
      || (('ontouchstart' in window) && navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches);
    if (this.isTouch) document.body.classList.add('touch');
    // hybrid devices: activate touch UI on the first real touch
    window.addEventListener('touchstart', () => {
      if (!this.isTouch) {
        this.isTouch = true;
        document.body.classList.add('touch');
      }
    }, { once: true, passive: true });

    // shared assets for states
    this.painters = painters;

    this.states = {
      title: new TitleState(this),
      play: new PlayState(this),
      results: new ResultsState(this),
    };
    this.stateName = 'title';
    this.state = this.states.title;

    this._last = performance.now();
    this._acc = 0;               // fixed-step accumulator
    this._pending = [];          // delayed callbacks (real time)
    this.running = true;

    // frame-time instrumentation (evidence for perf claims — see __rostam.stats)
    this.stats = { fps: 0, frameMs: 0, simMs: 0, drawMs: 0, steps: 0, stepsDropped: 0 };
    this._statAcc = { frames: 0, t: 0, sim: 0, draw: 0 };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      // first real keypress also initializes audio
      this.audio.init();
      this.applySoundSetting();
    });
    window.addEventListener('mousedown', () => this.audio.init());
    window.addEventListener('pointerdown', () => this.audio.init(), { passive: true });
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // pausing mid-play keeps the sim honest; the accumulator is dropped on return
        if (this.stateName === 'play' && !this.states.play.paused
            && !this.states.play.ending) this.pauseToggle();
      } else {
        this._last = performance.now();
        this._acc = 0;
      }
    });
    // a lost focus must never leave a key "held"
    window.addEventListener('blur', () => { this._acc = 0; this._last = performance.now(); });

    this.resize();
    this.state.enter();
    requestAnimationFrame((t) => this._frame(t));
  }

  // ---- settings (versioned localStorage, never fatal) ----
  loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && data.v === 1) {
        if (typeof data.sound === 'boolean') this.settings.sound = data.sound;
        if (typeof data.shake === 'number') this.settings.shake = data.shake;
        if (typeof data.qteEasy === 'boolean') this.settings.qteEasy = data.qteEasy;
      }
    } catch (e) { /* private mode / quota — defaults stay */ }
  }
  saveSettings() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ v: 1, ...this.settings })); }
    catch (e) { /* ignore */ }
  }
  setSetting(key, value) {
    this.settings[key] = value;
    this.saveSettings();
    this.applySoundSetting();
  }
  applySoundSetting() {
    if (this.audio.master) this.audio.master.gain.value = (this.audio.muted || !this.settings.sound) ? 0 : 0.35;
  }

  // ---- checkpoint (versioned localStorage, never fatal) ----
  loadCheckpoint() {
    try {
      const raw = localStorage.getItem('rostam_checkpoint_v1');
      if (!raw) return;
      const cp = JSON.parse(raw);
      if (cp && cp.v === 1 && cp.levelId === 'trial1') this.checkpoint = { levelId: cp.levelId, x: cp.x, y: cp.y };
    } catch (e) { /* ignore */ }
  }
  saveCheckpoint(cp) {
    this.checkpoint = cp;
    try { localStorage.setItem('rostam_checkpoint_v1', JSON.stringify({ v: 1, ...cp })); }
    catch (e) { /* ignore */ }
  }
  clearCheckpoint() {
    this.checkpoint = null;
    try { localStorage.removeItem('rostam_checkpoint_v1'); } catch (e) { /* ignore */ }
  }

  // ---- adaptive viewport: any aspect, mobile-first ----
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.stage.clientWidth || window.innerWidth;
    const h = this.stage.clientHeight || window.innerHeight;
    this.cssW = w; this.cssH = h;
    const sizeCanvas = (c) => {
      if (!c) return;
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
    };
    sizeCanvas(this.canvas);
    sizeCanvas(this.fxCanvas);
    this.dpr = dpr;

    const zoomH = h / BASE_H;
    this.viewW = (w / zoomH >= MIN_VIEW_W) ? w / zoomH : MIN_VIEW_W;
    this.viewH = this.viewW * (h / w);
    // logical → device pixel scale (keeps the whole logical view on the canvas at any DPR)
    this.renderScale = (w * dpr) / this.viewW;
    this.camera.viewW = this.viewW;
    this.camera.viewH = this.viewH;
  }

  setState(name, params) {
    if (this.state && this.state.exit) this.state.exit();
    this.input.clearPresses();      // no press may leak across a state change
    this.stateName = name;
    this.state = this.states[name];
    this.state.enter(params || {});
  }

  // ---- used by play state ----
  makeAmbientScene() {
    return new Environment('dusk', 2400, 580, 11);
  }

  startTrial(levelId, fromCheckpoint = false) {
    const cp = fromCheckpoint && this.checkpoint && this.checkpoint.levelId === levelId
      ? this.checkpoint : null;
    this.setState('play', { levelId, checkpoint: cp });
  }

  callRakhsh() {
    const p = this.player;
    if (!p || p.mounted || p.rakhshCd > 0) return;
    this.audio.play('neigh');
    this.audio.play('mount');
    this.particles.burst(p.x, p.y - 6, 16, { speed: 160, life: 0.6, size: 4, color: ['#c9a877', '#8a6a45'], grav: 300 });
    p.mount();
    this.hud.sync(p);
  }

  activateBoss(kind) {
    const play = this.states.play;
    const b = kind === 'mini' ? play.miniBoss : play.boss;
    if (b && !b.dead) {
      b.active = true;
      this.hud.bossShow(b.displayName);
      if (kind !== 'mini') this.audio.play('roar');
    }
  }

  pauseToggle() {
    const play = this.states.play;
    if (this.stateName !== 'play' || play.ending) return;
    play.paused = !play.paused;
    if (play.paused) {
      this.menus.show('pause');
      // pausing must freeze EVERYTHING: QTE offer/window AND the slam cinematic
      const b = this.qte.abort();
      if (b && b.recoverFromStagger && !b.dead) b.recoverFromStagger();
      this.director.abort();
    } else {
      this.menus.hideAll();
      this._last = performance.now();   // do not fast-forward the accumulator
      this._acc = 0;
    }
  }

  onBossDead() {
    this.camera.shake(10, 0.6);
    const play = this.states.play;
    play.ending = true;
    this.hud.bossHide();
    if (play.world) play.world.unlockArena();
    this._after(1.3, () => {
      this.dialogue.play('lion_defeated', () => {
        this._after(0.4, () => {
          this.setState('results', {
            win: true,
            world: play.world,
            player: play.player,
            elapsed: play.elapsed,
            hits: play.player.comboStats.hits,
          });
        });
      });
    });
  }

  onMiniBossDead(boss) {
    this.camera.shake(10, 0.55);
    const play = this.states.play;
    this.hud.bossHide();
    // drop a healing heart as the alpha's trophy
    if (play.world) play.world.spawnHeart(boss ? boss.x : play.player.x);
    // unlock the checkpoint (immediately + persisted)
    const cpDef = play.world.def.checkpoint;
    if (cpDef) this.saveCheckpoint({ levelId: play.levelId, x: cpDef.x, y: cpDef.y });
    this._after(1.0, () => {
      this.dialogue.play('jackal_defeated', () => {
        if (play.world) play.world.unlockArena();
      });
    });
  }

  onPlayerDead() {
    const play = this.states.play;
    play.ending = true;
    // hard-stop any finisher offer/QTE/cinematic and clean up both directors
    const ob = this.qte.abort();
    if (ob && ob.recoverFromStagger && !ob.dead) ob.recoverFromStagger();
    this.director.abort();
    // dramatic death slow-mo, then the defeat screen
    this.timescale = 0.4;
    this._after(0.9, () => { this.timescale = 1; });
    // force-close any open dialogue so the defeat screen stands alone
    this.dialogue.active = false;
    this.dialogue.done = null;
    document.getElementById('dialogue').classList.add('hidden');
    this._after(1.7, () => {
      this.setState('results', {
        win: false,
        world: play.world,
        player: play.player,
        elapsed: play.elapsed,
        hits: play.player.comboStats.hits,
        levelId: play.levelId,
      });
    });
  }

  // ---- UI helpers ----
  banner(text, rage = false) {
    const el = document.getElementById('big-banner');
    const span = document.getElementById('big-banner-text');
    if (!el || !span) return;
    span.textContent = text;
    el.classList.toggle('rage', rage);
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => el.classList.add('hidden'), 2300);
  }

  flash() {
    const el = document.getElementById('flash');
    el.classList.remove('hidden');
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = '';
    clearTimeout(this._flashT);
    this._flashT = setTimeout(() => el.classList.add('hidden'), 520);
  }

  // red edge-vignette when Rostam takes a hit (Shank-style pain feedback)
  hurtVignette() {
    const el = document.getElementById('hurt-vignette');
    if (!el) return;
    el.classList.remove('hit');
    void el.offsetWidth;
    el.classList.add('hit');
    clearTimeout(this._hvT);
    this._hvT = setTimeout(() => el.classList.remove('hit'), 420);
  }

  toggleMute() {
    const m = this.audio.toggleMute();
    this.applySoundSetting();
    document.getElementById('mute-indicator').textContent = m ? '🔇 M — sound off' : '🔊 M — sound on';
    document.getElementById('mute-indicator').classList.toggle('hidden', false);
    document.getElementById('tb-mute').textContent = m ? '🔇' : '🔊';
    this._after(1.6, () => document.getElementById('mute-indicator').classList.add('hidden'));
  }

  _after(sec, fn) { this._pending.push({ t: sec, fn }); }

  // ---- main loop: fixed timestep sim + interpolated render ----
  _frame(now) {
    if (!this.running) return;
    requestAnimationFrame((t) => this._frame(t));
    const t0 = performance.now();

    let rawDt = (now - this._last) / 1000;
    this._last = now;
    rawDt = Math.min(rawDt, 0.25);           // hard clamp (tab was hidden, debugger…)
    this.realDt = rawDt;

    // delayed callbacks run on REAL time (dialogue hand-offs, results timers)
    for (let i = this._pending.length - 1; i >= 0; i--) {
      this._pending[i].t -= rawDt;
      if (this._pending[i].t <= 0) {
        const { fn } = this._pending.splice(i, 1)[0];
        fn();
      }
    }

    // QTE + Director live on real time — slow-mo must never stretch their windows.
    // Both self-abort if the play state went away (results / title).
    this.qte.update(rawDt);
    this.director.update(rawDt);

    // ---- fixed-step simulation ----
    const t1 = performance.now();
    this._acc = Math.min(this._acc + rawDt, MAX_STEPS * STEP);
    let steps = 0;
    while (this._acc >= STEP && steps < MAX_STEPS) {
      this._acc -= STEP;
      steps++;
      const dt = STEP * this.timescale;
      this.alpha = 0;
      // update() returns false when the step consumed no gameplay input
      // (paused / dialogue / hitstop / QTE-freeze) — the input buffer then
      // keeps fresh presses alive for INPUT_KEEP_MS instead of dropping them
      const processed = this.state.update(dt) !== false;
      this.input.endStep(processed);
    }
    if (this._acc >= STEP) {            // backlog beyond the cap — drop it
      this.stats.stepsDropped++;
      this._acc = 0;
    }
    this.alpha = Math.min(1, this._acc / STEP);   // render interpolation alpha
    const t2 = performance.now();

    // touch UI context
    this.touch.poll();

    // render — painted 2D world → sprite-sheet heroes → combat fx overlay
    const ctx = this.ctx;
    const s = this.renderScale || this.dpr || 1;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    this.state.draw(ctx);

    if (this.fxCtx) {
      this.fxCtx.setTransform(s, 0, 0, s, 0, 0);
      this.fxCtx.clearRect(0, 0, this.viewW, this.viewH);
    }
    const t3 = performance.now();

    // rolling stats (1s window)
    const st = this._statAcc;
    st.frames++; st.t += rawDt; st.sim += (t2 - t1); st.draw += (t3 - t2);
    if (st.t >= 1) {
      this.stats.fps = Math.round(st.frames / st.t);
      this.stats.frameMs = +(st.t / st.frames * 1000).toFixed(2);
      this.stats.simMs = +(st.sim / st.frames).toFixed(3);
      this.stats.drawMs = +(st.draw / st.frames).toFixed(3);
      this.stats.steps = steps;
      st.frames = 0; st.t = 0; st.sim = 0; st.draw = 0;
    }
  }
}
