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

  // hard-stop any active offer/QTE (player death, pause, leaving play state)
  abort() {
    if (this.state === 'idle') return null;
    const wasQte = this.state === 'qte';
    this.el.offer.classList.add('hidden');
    this.el.overlay.classList.add('hidden');
    document.body.classList.remove('in-qte');
    this.state = 'idle';
    const b = this.boss;
    this.boss = null;
    const g = this.game;
    g.timescale = 1;
    g.camera.zoomTo(1);
    g.camera.freeY = false;
    if (g.player && g.player.state === 'qte') g.player.state = 'idle';
    if (wasQte && b && b.staggered && b.recoverFromStagger) b.recoverFromStagger();
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
    const rng = g.rng || Math.random;   // seeded gameplay RNG when available
    for (let i = 0; i < n; i++) {
      let act = PROMPT_ACTIONS[(rng() * PROMPT_ACTIONS.length) | 0];
      if (act === last) act = PROMPT_ACTIONS[(PROMPT_ACTIONS.indexOf(act) + 1) % 3];
      last = act;
      // escalating speed: later prompts shrink faster (easy mode stretches all)
      const dur = ((n === 1 ? 1.15 : 1.1 - i * 0.22) * (this.isMini ? 1.15 : 1)) * this._windows().durMul;
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

  // QTE easy mode (settings.qteEasy): wider timing windows, slower rings
  _windows() {
    const e = this.game.settings && this.game.settings.qteEasy;
    return e
      ? { perfectLo: 0.90, perfectHi: 1.14, goodLo: 0.74, goodHi: 1.34, durMul: 1.3 }
      : { perfectLo: 0.92, perfectHi: 1.10, goodLo: 0.80, goodHi: 1.24, durMul: 1.0 };
  }

  attempt(action) {
    if (this.state !== 'qte' || !this.cur || this.waitT > 0) return;
    const ratio = this.curSize / this.targetR;
    const w = this._windows();
    if (action !== this.cur.action) return this._register('wrong');
    if (ratio <= w.goodHi && ratio >= w.goodLo) {
      this._register(ratio <= w.perfectHi && ratio >= w.perfectLo ? 'perfect' : 'good');
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
    this.state = 'idle';
    const boss = this.boss, isMini = this.isMini;
    this.boss = null;
    g.input.clearPresses();   // the QTE’s buttons must not leak into gameplay
    g.director.start(boss, isMini);
  }

  _fail() {
    const g = this.game;
    this.el.overlay.classList.add('hidden');
    document.body.classList.remove('in-qte');
    this.state = 'idle';
    const boss = this.boss;
    this.boss = null;
    g.input.clearPresses();
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
    // never let the QTE outlive the play state (death screen, results…)
    if (g.stateName !== 'play') {
      if (this.state !== 'idle') this.abort();
      return;
    }
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

    // keyboard prompts — consume so a buffered press cannot register twice
    for (const act of PROMPT_ACTIONS) {
      if (g.input.justPressed(act)) {
        g.input.consume(act);
        this.attempt(act);
        break;
      }
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
    this.el.offer.classList.add('hidden');
    this.el.overlay.classList.add('hidden');
    document.body.classList.remove('in-qte');
    this.state = 'idle';
    const boss = this.boss, isMini = this.isMini;
    this.boss = null;
    g.input.clearPresses();
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
// v2: every per-run flag is reset in start() (the missing _done_slamhit reset
// made the SECOND finisher of a session fire no slam), the cinematic aborts
// cleanly on pause / leaving play, and a stopped run can never pollute the next.
// ============================================================
export class Director {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.boss = null;
    this.isMini = false;
    this.t = 0;
    this._slammed = false;
    this._done_slamhit = false;
    this._restored = false;
    this._done = false;
    this._ghostT = 0;
  }
  start(boss, isMini) {
    const g = this.game;
    this.active = true;
    this.boss = boss;
    this.isMini = isMini;
    this.t = 0;
    this._slammed = false;
    this._done_slamhit = false;   // ← THE FIX: reset per run, or finisher #2 has no slam
    this._restored = false;
    this._done = false;
    this._ghostT = 0;
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

  // hard-stop the cinematic (pause, player death, leaving the play state).
  // Restores every global the run touched; a not-yet-slammed boss recovers.
  abort() {
    if (!this.active) return;
    const g = this.game;
    this.active = false;
    const b = this.boss;
    this.boss = null;
    g.timescale = 1;
    g.camera.zoomTo(1);
    g.camera.freeY = false;
    if (g.player) { g.player.state = g.player.state === 'cine' ? 'idle' : g.player.state; g.player.yOff = 0; }
    if (b && !b.dead && b.staggered && b.recoverFromStagger) b.recoverFromStagger();
  }

  update(rawDt) {
    if (!this.active) return;
    const g = this.game;
    // never let a cinematic outlive the play state (results, title…)
    if (g.stateName !== 'play') { this.abort(); return; }
    const p = g.player, b = this.boss;
    this.t += rawDt;
    const t = this.t;

    // leap toward the boss with an arc — trailing afterimages (Flash-style)
    if (t < 0.62 && b) {
      const f = easeOut(Math.min(1, t / 0.55));
      p.x = lerp(this.p0.x, b.x - p.facing * 48, f);
      p.yOff = -Math.sin(Math.min(1, t / 0.62) * Math.PI) * 86;
      this._ghostT = (this._ghostT || 0) - rawDt;
      if (this._ghostT <= 0) { this._ghostT = 0.05; p.pushGhost(0.42); }
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
