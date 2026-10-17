// touch.js — mobile-first touch controls: virtual buttons, sys buttons, context visibility
// Contexts: menu | play | dialogue | offer | qte  (drives body classes + overlay visibility)
import { vibr } from '../qte.js';

const VMAP = {
  'tb-left': 'TouchLeft',
  'tb-right': 'TouchRight',
  'tb-jump': 'TouchJump',
  'tb-attack': 'TouchAttack',
  'tb-bow': 'TouchBow',
  'tb-roll': 'TouchRoll',
  'tb-mount': 'TouchMount',
};

export class TouchUI {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('touch-ui');
    this.context = 'menu';

    // virtual action buttons — press & release via pointer events (multi-touch safe)
    for (const [id, code] of Object.entries(VMAP)) {
      const el = document.getElementById(id);
      if (!el) continue;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        el.setPointerCapture(e.pointerId);
        el.classList.add('pressed');
        game.input.press(code);
      });
      const up = (e) => {
        e.preventDefault();
        el.classList.remove('pressed');
        game.input.release(code);
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', () => {
        el.classList.remove('pressed');
        game.input.release(code);
      });
    }

    // system buttons
    document.getElementById('tb-pause').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (game.stateName === 'play') game.pauseToggle();
    });
    document.getElementById('tb-mute').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      game.toggleMute();
    });
    const fsBtn = document.getElementById('tb-fs');
    const stage = document.getElementById('stage');
    if (!stage.requestFullscreen && !document.documentElement.requestFullscreen) {
      fsBtn.style.display = 'none';
    } else {
      fsBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try {
          if (document.fullscreenElement) document.exitFullscreen();
          else (stage.requestFullscreen || document.documentElement.requestFullscreen).call(stage).catch(() => {});
        } catch (err) {}
      });
    }

    // tap-to-advance surfaces: dialogue + menus
    const tapAdvance = (el) => {
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        game.input.press('TouchAdv');
        setTimeout(() => game.input.release('TouchAdv'), 30);
      });
    };
    tapAdvance(document.getElementById('dialogue'));
    for (const id of ['title-screen', 'pause-screen', 'victory-screen', 'defeat-screen']) {
      tapAdvance(document.getElementById(id));
    }
  }

  setContext(c) {
    if (this.context === c) return;
    this.context = c;
    const b = document.body;
    const on = c === 'play' || c === 'offer';
    b.classList.toggle('on-play', on);
    this.root.classList.toggle('on', on);
    this.root.classList.toggle('hidden', !on);
  }

  // called every frame — resolves which context the UI should be in
  poll() {
    const g = this.game;
    if (g.stateName !== 'play') { this.setContext('menu'); return; }
    const play = g.states.play;
    if (g.qte.state === 'qte') this.setContext('qte');
    else if (g.qte.state === 'offer') this.setContext('offer');
    else if (g.dialogue.active) this.setContext('dialogue');
    else if (play && play.paused) this.setContext('menu');
    else this.setContext('play');

    // one-time rotate hint while playing in portrait
    if (!this._rotateShown && g.isTouch && g.stateName === 'play'
        && window.innerHeight > window.innerWidth * 1.15) {
      this._rotateShown = true;
      const t = document.getElementById('rotate-toast');
      t.classList.remove('hidden');
      setTimeout(() => t.classList.add('hidden'), 3800);
    }
  }
}
