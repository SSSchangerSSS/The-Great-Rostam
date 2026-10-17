// game.js — core engine: loop, state machine, shared systems
import { Input } from './input.js';
import { Camera } from './camera.js';
import { AudioSys } from './audio.js';
import { Particles } from '../gfx/particles.js';
import { Hud } from '../ui/hud.js';
import { Menus } from '../ui/menus.js';
import { DialogueBox } from '../ui/dialogue.js';
import { TitleState } from '../states/title.js';
import { PlayState } from '../states/play.js';
import { ResultsState } from '../states/results.js';
import { Environment } from '../gfx/parallax.js';
import * as painters from '../gfx/paint.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.viewW = canvas.width;
    this.viewH = canvas.height;

    this.input = new Input();
    this.audio = new AudioSys();
    this.camera = new Camera(this.viewW, this.viewH);
    this.particles = new Particles(420);
    this.hud = new Hud();
    this.menus = new Menus(this.audio);
    this.dialogue = new DialogueBox(this.input, this.audio);
    this.hitstop = 0;

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

    this.state.enter();
    requestAnimationFrame((t) => this._frame(t));
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

  activateBoss() {
    const play = this.states.play;
    if (play.boss && !play.boss.dead) {
      play.boss.active = true;
      this.hud.bossShow('شیرِ خوانِ اوّل — The Lion of Trial I');
    }
  }

  onBossDead() {
    this.camera.shake(10, 0.6);
    const play = this.states.play;
    play.ending = true;
    this.hud.bossHide();
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

  onPlayerDead() {
    const play = this.states.play;
    play.ending = true;
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

  toggleMute() {
    const m = this.audio.toggleMute();
    document.getElementById('mute-indicator').textContent = m ? '🔇 M — sound off' : '🔊 M — sound on';
    document.getElementById('mute-indicator').classList.toggle('hidden', false);
    this._after(1.6, () => document.getElementById('mute-indicator').classList.add('hidden'));
  }

  _after(sec, fn) { this._pending.push({ t: sec, fn }); }

  // ---- main loop ----
  _frame(now) {
    if (!this.running) return;
    let dt = (now - this._last) / 1000;
    this._last = now;
    dt = Math.min(dt, 1 / 20);   // clamp big frame gaps (tab switch)

    // delayed callbacks
    for (let i = this._pending.length - 1; i >= 0; i--) {
      this._pending[i].t -= dt;
      if (this._pending[i].t <= 0) {
        const { fn } = this._pending.splice(i, 1)[0];
        fn();
      }
    }

    this.state.update(dt);

    // render
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    this.state.draw(ctx);

    this.input.endFrame();
    requestAnimationFrame((t) => this._frame(t));
  }
}
