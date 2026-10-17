// game.js — core engine: loop, state machine, adaptive viewport, slow-mo, shared systems
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
import * as painters from '../gfx/paint.js';

const BASE_H = 720;      // logical viewport height reference
const MIN_VIEW_W = 780;  // smallest logical width (portrait phones) — keeps combat readable

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stage = document.getElementById('stage');

    this.input = new Input();
    this.audio = new AudioSys();
    this.camera = new Camera(1280, BASE_H);
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
    this._pending = [];          // delayed callbacks
    this.running = true;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Enter' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      // first real keypress also initializes audio
      this.audio.init();
    });
    window.addEventListener('mousedown', () => this.audio.init());
    window.addEventListener('pointerdown', () => this.audio.init(), { passive: true });
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.stateName === 'play' && !this.states.play.paused
          && !this.states.play.ending) this.pauseToggle();
    });

    this.resize();
    this.state.enter();
    requestAnimationFrame((t) => this._frame(t));
  }

  // ---- adaptive viewport: any aspect, mobile-first ----
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.stage.clientWidth || window.innerWidth;
    const h = this.stage.clientHeight || window.innerHeight;
    this.cssW = w; this.cssH = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
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
    this.stateName = name;
    this.state = this.states[name];
    this.state.enter(params || {});
  }

  // ---- used by play state ----
  makeAmbientScene() {
    return new Environment('dusk', 2400, 580, 11);
  }

  startTrial(levelId) {
    this.setState('play', { levelId });
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
      // a staggered boss gets back up while the game is paused
      const b = this.qte.cancelOffer();
      if (b && b.recoverFromStagger) b.recoverFromStagger();
    } else {
      this.menus.hideAll();
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
    this._after(1.0, () => {
      this.dialogue.play('jackal_defeated', () => {
        if (play.world) play.world.unlockArena();
      });
    });
  }

  onPlayerDead() {
    const play = this.states.play;
    play.ending = true;
    this.qte.cancelOffer();
    // force-close any open dialogue so the defeat screen stands alone
    this.dialogue.active = false;
    this.dialogue.done = null;
    document.getElementById('dialogue').classList.add('hidden');
    this._after(1.5, () => {
      this.setState('results', {
        win: false,
        world: play.world,
        player: play.player,
        elapsed: play.elapsed,
        hits: play.player.comboStats.hits,
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

  toggleMute() {
    const m = this.audio.toggleMute();
    document.getElementById('mute-indicator').textContent = m ? '🔇 M — sound off' : '🔊 M — sound on';
    document.getElementById('mute-indicator').classList.toggle('hidden', false);
    document.getElementById('tb-mute').textContent = m ? '🔇' : '🔊';
    this._after(1.6, () => document.getElementById('mute-indicator').classList.add('hidden'));
  }

  _after(sec, fn) { this._pending.push({ t: sec, fn }); }

  // ---- main loop ----
  _frame(now) {
    if (!this.running) return;
    let rawDt = (now - this._last) / 1000;
    this._last = now;
    rawDt = Math.min(rawDt, 1 / 20);   // clamp big frame gaps (tab switch)
    this.realDt = rawDt;

    // delayed callbacks run on real time
    for (let i = this._pending.length - 1; i >= 0; i--) {
      this._pending[i].t -= rawDt;
      if (this._pending[i].t <= 0) {
        const { fn } = this._pending.splice(i, 1)[0];
        fn();
      }
    }

    // QTE timing must never slow down — it drives the slow-mo itself
    this.qte.update(rawDt);
    this.director.update(rawDt);

    const dt = rawDt * this.timescale;
    this.state.update(dt);

    // touch UI context
    this.touch.poll();

    // render
    const ctx = this.ctx;
    const s = this.renderScale || this.dpr || 1;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    this.state.draw(ctx);

    this.input.endFrame();
    requestAnimationFrame((t) => this._frame(t));
  }
}
