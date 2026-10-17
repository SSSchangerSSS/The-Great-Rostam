// qte.js — God of War style finisher system:
// stagger offer → ring-timed button prompts (slow-mo) → cinematic slam, or boss enrage on fail.
// All timing uses REAL dt (unscaled) so slow-mo never stretches the UI.
import { clamp, lerp, easeOut } from './core/utils.js';

const PROMPT_ACTIONS = ['attack', 'bow', 'jump'];
const KEY_LABEL = { attack: 'X', bow: 'C', jump: 'Z' };
const ICON = { attack: '⚔', bow: '🏹', jump: '⤒' };
const FB = {
  perfect: { fa: 'عالی! PERFECT', color: '#ffd700' },
  good:    { fa: 'خوب GOOD', color: '#7bc47f' },
  early:   { fa: 'زود! TOO EARLY', color: '#e05545' },
  late:    { fa: 'دیر! TOO LATE', color: '#e05545' },
  wrong:   { fa: 'اشتباه! WRONG', color: '#e05545' },
};

export function vibr(ms) {
  if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
}

export class FinisherQTE {
  constructor(game) {
    this.game = game;
    this.state = 'idle';          // idle | offer | qte
    this.boss = null;
    this.el = {
      offer: document.getElementById('finish-offer'),
      banner: document.getElementById('finish-banner'),
      finishBtn: document.getElementById('finish-btn'),
      overlay: document.getElementById('qte-overlay'),
      ring: document.getElementById('qte-ring'),
      target: document.getElementById('qte-target'),
      icon: document.getElementById('qte-icon'),
      feedback: document.getElementById('qte-feedback'),
      dots: document.getElementById('qte-dots'),
      btns: document.getElementById('qte-btns'),
    };
    this._finishDown = false;
    this.el.finishBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault(); this._finishDown = true;
    });
    for (const b of this.el.btns.querySelectorAll('button')) {
      const act = b.dataset.act;
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); this.attempt(act); });
    }
    this._reset();
  }

  _reset() {
    this.seq = []; this.idx = 0; this.pt = 0; this.cur = null;
    this.missCount = 0; this.waitT = 0; this._pendingFail = false;
    this.offerT = 0; this.isMini = false;
  }

  // ---------- phase 1: the staggered-boss offer ----------
  offer(boss) {
    if (this.state !== 'idle') return;
    this.state = 'offer';
    this.boss = boss;
    this.isMini = boss.isMini || false;
    this.offerT = 4.5;
    this._finishDown = false;
    this.el.offer.classList.remove('hidden');
    const sub = this.el.banner.querySelector('.fb-sub');
    sub.dir = 'rtl';
    if (sub) sub.textContent = this.game.isTouch
      ? 'FINISHER — نزدیک شو و دکمه را بزن!'
      : 'FINISHER — نزدیک شو و کلید F را بزن!';
    this.game.audio.play('qteReady');
  }

  cancelOffer() {
    if (this.state !== 'offer') return null;
    this.el.offer.classList.add('hidden');
    this.state = 'idle';
    const b = this.boss;
    this.boss = null;
    return b;
  }

  tryStart() {
    if (this.state !== 'offer') return;
    const p = this.game.player, b = this.boss;
    const close = p && b && Math.abs(p.x - b.x) < 190 && Math.abs(p.y - b.y) < 130;
    if (!close) {
      const sub = this.el.banner.querySelector('.fb-sub');
      if (sub) {
        sub.textContent = 'نزدیکش شو! — get closer!';
        clearTimeout(this._subT);
        this._subT = setTimeout(() => {
          if (this.state === 'offer' && sub) {
            sub.textContent = this.game.isTouch
              ? 'FINISHER — نزدیک شو و دکمه را بزن!'
              : 'FINISHER — نزدیک شو و کلید F را بزن!';
          }
        }, 1200);
      }
      return;
    }
    this._start();
  }

  // ---------- phase 2: the QTE prompts (slow-mo) ----------
  _start() {
    const g = this.game;
    this.el.offer.classList.add('hidden');
    this.state = 'qte';
    const n = this.boss.finisherPrompts || 2;
    this.seq = [];
    let last = '';
    for (let i = 0; i < n; i++) {
      let act = PROMPT_ACTIONS[(Math.random() * PROMPT_ACTIONS.length) | 0];
      if (act === last) act = PROMPT_ACTIONS[(PROMPT_ACTIONS.indexOf(act) + 1) % 3];
      last = act;
      // escalating speed: later prompts shrink faster
      const dur = (n === 1 ? 1.15 : 1.1 - i * 0.22) * (this.isMini ? 1.15 : 1);
      this.seq.push({ action: act, dur });
    }
    this.idx = -1;
    this.missCount = 0;
    this._pendingFail = false;
    this._buildDots();

    // sizes (CSS px, from the real stage size)
    const minDim = Math.min(g.cssW || 800, g.cssH || 600);
    this.r0 = clamp(minDim * 0.36, 150, 260);
    this.targetR = clamp(minDim * 0.155, 64, 116);
    this.el.target.style.width = this.el.target.style.height = `${this.targetR}px`;
    this.el.icon.style.fontSize = `${Math.round(this.targetR * 0.5)}px`;

    // slow-mo + camera punch-in
    g.timescale = 0.2;
    g.camera.zoomTo(this.isMini ? 1.26 : 1.34);
    g.camera.freeY = true;
    if (g.player) { g.player.state = 'qte'; }
    document.body.classList.add('in-qte');
    this.el.overlay.classList.remove('hidden');
    this.el.ring.style.width = this.el.ring.style.height = `${this.r0}px`;
    this._nextPrompt();
    vibr(30);
  }

  _buildDots() {
    this.el.dots.innerHTML = '';
    for (let i = 0; i < this.seq.length; i++) {
      const d = document.createElement('i');
      this.el.dots.appendChild(d);
    }
  }
  _dot(i, cls) { const d = this.el.dots.children[i]; if (d) d.className = cls; }

  _nextPrompt() {
    this.idx++;
    if (this.idx >= this.seq.length) { this._succeed(); return; }
    this.cur = this.seq[this.idx];
    this.pt = 0;
    this.curSize = this.r0;
    this.el.icon.textContent = ICON[this.cur.action];
    for (const b of this.el.btns.querySelectorAll('button')) {
      b.classList.toggle('match', b.dataset.act === this.cur.action);
    }
    this.el.ring.style.width = this.el.ring.style.height = `${this.r0}px`;
  }

  _feedback(kind) {
    const f = FB[kind];
    const fb = this.el.feedback;
    fb.textContent = f.fa;
    fb.style.color = f.color;
    fb.classList.remove('pop');
    void fb.offsetWidth;              // restart the pop animation
    fb.classList.add('pop');
  }

  _clearMatch() {
    for (const b of this.el.btns.querySelectorAll('button')) b.classList.remove('match');
  }

  attempt(action) {
    if (this.state !== 'qte' || !this.cur || this.waitT > 0) return;
    const ratio = this.curSize / this.targetR;
    if (action !== this.cur.action) return this._register('wrong');
    if (ratio <= 1.24 && ratio >= 0.8) {
      this._register(ratio <= 1.1 && ratio >= 0.92 ? 'perfect' : 'good');
    } else {
      this._register('early');
    }
  }

  _register(kind) {
    const g = this.game;
    const hit = kind === 'perfect' || kind === 'good';
    this._feedback(kind);
    this._clearMatch();
    if (hit) {
      this._dot(this.idx, 'done');
      const perfect = kind === 'perfect';
      this.boss.takeFinisherHit(g, perfect);
      // quick strike pose on Rostam
      if (g.player) {
        const clip = perfect ? 'attack3' : (Math.random() < 0.5 ? 'attack1' : 'attack2');
        g.player.rig.play(clip, { restart: true });
      }
      g.audio.play(perfect ? 'qtePerfect' : 'qteGood');
      vibr(perfect ? [20, 30, 20] : 20);
      this.cur = null;
      this.waitT = 0.55;
    } else {
      this._dot(this.idx, 'fail');
      this.missCount++;
      g.audio.play('qteMiss');
      vibr(70);
      this.cur = null;
      this.waitT = 0.6;
      if (this.missCount >= 2) this._pendingFail = true;
    }
  }

  // ---------- phase 3: outcomes ----------
  _succeed() {
    const g = this.game;
    this.el.overlay.classList.add('hidden');
    document.body.classList.remove('in-qte');
    const boss = this.boss, isMini = this.isMini;
    this.state = 'idle';
    this.boss = null;
    g.director.start(boss, isMini);
  }

  _fail() {
    const g = this.game;
    this.el.overlay.classList.add('hidden');
    document.body.classList.remove('in-qte');
    this.state = 'idle';
    const boss = this.boss;
    this.boss = null;
    g.timescale = 1;
    g.camera.zoomTo(1);
    g.camera.freeY = false;
    if (g.player) { g.player.state = 'idle'; g.player.invuln = 1.2; }   // brief grace after the fail
    if (boss) boss.enrage();
    g.banner('خشمگین شد! ENRAGED', true);
    g.audio.play('enrage');
  }

  update(rawDt) {
    const g = this.game;
    if (this.state === 'offer') {
      this.offerT -= rawDt;
      if (this._finishDown || g.input.justPressed('finisher')) {
        this._finishDown = false;
        this.tryStart();
        return;
      }
      this._finishDown = false;
      if (this.offerT <= 0) {
        const b = this.boss;
        this.cancelOffer();
        if (b && b.recoverFromStagger) b.recoverFromStagger();
      }
      return;
    }
    if (this.state !== 'qte') return;

    // keyboard prompts
    for (const act of PROMPT_ACTIONS) {
      if (g.input.justPressed(act)) { this.attempt(act); break; }
    }

    if (this.waitT > 0) {
      this.waitT -= rawDt;
      if (this.waitT <= 0) {
        if (this._pendingFail) { this._pendingFail = false; this._fail(); }
        else this._nextPrompt();
      }
      return;
    }
    if (!this.cur) return;

    this.pt += rawDt;
    const f = clamp(this.pt / this.cur.dur, 0, 1.12);
    const size = lerp(this.r0, this.targetR, Math.min(1, f));
    this.curSize = size;
    this.el.ring.style.width = this.el.ring.style.height = `${size}px`;
    const late = size < this.targetR * 0.78;
    if (this.pt >= this.cur.dur || late) {
      this.curSize = size;
      this._register('late');
    }
  }

  // debug/test helper: instantly resolve the whole sequence as a win
  debugWin() {
    if (this.state !== 'qte') return;
    const g = this.game;
    this.el.overlay.classList.add('hidden');
    document.body.classList.remove('in-qte');
    const boss = this.boss, isMini = this.isMini;
    this.state = 'idle';
    this.boss = null;
    g.timescale = 1;
    g.camera.zoomTo(1);
    g.camera.freeY = false;
    if (g.player) g.player.state = 'idle';
    g.director.start(boss, isMini);
  }

  // debug/test helper: instantly fail (double strike)
  debugLose() {
    if (this.state !== 'qte') return;
    this.missCount = 2;
    this._pendingFail = true;
    this.cur = null;
    this.waitT = 0.01;
  }
}

// ============================================================
// Director — the finisher slam cinematic (real-time phases)
// ============================================================
export class Director {
  constructor(game) {
    this.game = game;
    this.active = false;
  }
  start(boss, isMini) {
    const g = this.game;
    this.active = true;
    this.boss = boss;
    this.isMini = isMini;
    this.t = 0;
    this._slammed = false;
    this._restored = false;
    this._done = false;
    this.p0 = { x: g.player.x, y: g.player.y };
    g.timescale = 0.32;
    g.camera.zoomTo(isMini ? 1.42 : 1.55);
    g.camera.freeY = true;
    g.player.state = 'cine';
    g.player.yOff = 0;
    g.player.rig.play('finishLeap', { restart: true, speed: 1.15 });
    g.audio.play('mount');
    g.banner('ضربهٔ نهایی! FINISHER');
    vibr(40);
  }

  update(rawDt) {
    if (!this.active) return;
    const g = this.game;
    const p = g.player, b = this.boss;
    this.t += rawDt;
    const t = this.t;

    // leap toward the boss with an arc
    if (t < 0.62 && b) {
      const f = easeOut(Math.min(1, t / 0.55));
      p.x = lerp(this.p0.x, b.x - p.facing * 48, f);
      p.yOff = -Math.sin(Math.min(1, t / 0.62) * Math.PI) * 86;
    }

    if (t >= 0.62 && !this._slammed) {
      this._slammed = true;
      p.yOff = 0;
      p.rig.play('finishSlam', { restart: true, speed: 1.5 });
    }
    if (t >= 0.78 && !this._done_slamhit) {
      this._done_slamhit = true;
      // THE SLAM
      g.flash();
      g.camera.shake(16, 0.6);
      g.audio.play('slam');
      vibr([40, 40, 120]);
      if (b) {
        b.enterState('die');
        b.dead = true;
        b.deadT = 0;
        g.particles.burst(b.x, b.y - 40, 34, { speed: 260, life: 0.7, size: 4.5, color: ['#ffd700', '#e8542a', '#b03030', '#d8c9a0'], grav: 700 });
        g.particles.burst(b.x, b.y - 10, 20, { speed: 90, life: 0.9, size: 5, color: ['#8a6a45', '#6b4a2f'], grav: 300 });
      }
      g.hitstop = 0.12;
    }
    if (t >= 1.6 && !this._restored) {
      this._restored = true;
      g.timescale = 1;
      g.camera.zoomTo(1);
      g.camera.freeY = false;
      if (p) { p.state = 'idle'; p.yOff = 0; p.rig.play('idle'); }
    }
    if (t >= 1.85 && !this._done) {
      this._done = true;
      this.active = false;
      if (this.isMini) g.onMiniBossDead(this.boss);
      else g.onBossDead();
    }
  }
}
