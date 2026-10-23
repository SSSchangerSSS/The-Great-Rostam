// dialogue.js — typewriter dialogue system (bilingual FA/EN, DOM-based)
import { SPEAKERS, DIALOGUES } from '../content/dialogues.js';

export class DialogueBox {
  constructor(input, audio) {
    this.input = input;
    this.audio = audio;
    this.root = document.getElementById('dialogue');
    this.portrait = document.getElementById('dialogue-portrait');
    this.speakerEl = document.getElementById('dialogue-speaker');
    this.faEl = document.getElementById('dialogue-fa');
    this.enEl = document.getElementById('dialogue-en');
    this.active = false;
    this.script = null;
    this.lineIdx = 0;
    this.charIdx = 0;
    this.typeTimer = 0;
    this.done = null;          // callback on script end
    this._typing = false;
    this._fullShown = false;
  }

  play(scriptId, onDone) {
    const script = DIALOGUES[scriptId];
    if (!script) { if (onDone) onDone(); return; }
    this.script = script;
    this.lineIdx = 0;
    this.active = true;
    this.done = onDone || null;
    this.root.classList.remove('hidden');
    this._startLine();
  }

  _startLine() {
    const line = this.script[this.lineIdx];
    const sp = SPEAKERS[line.speaker] || SPEAKERS.narrator;
    this.speakerEl.textContent = `${sp.fa} — ${sp.en}`;
    this.speakerEl.style.color = sp.color;
    this.faEl.textContent = '';
    this.enEl.textContent = '';
    this.charIdx = 0;
    this._typing = true;
    this._fullShown = false;
    this._drawPortrait(sp);
  }

  _drawPortrait(sp) {
    // procedural pixel-style portrait on a small canvas
    this.portrait.innerHTML = '';
    const cv = document.createElement('canvas');
    cv.width = 24; cv.height = 24;
    cv.style.width = '78px'; cv.style.height = '78px';
    const c = cv.getContext('2d');
    const em = sp.emblem;
    if (em === 'r') {           // Rostam: helmeted gold face
      c.fillStyle = '#e8b64c'; c.fillRect(6, 4, 12, 6);
      c.fillStyle = '#c99263'; c.fillRect(6, 10, 12, 7);
      c.fillStyle = '#1d130c'; c.fillRect(6, 16, 12, 4);
      c.fillStyle = '#0d0a08'; c.fillRect(8, 11, 2, 2); c.fillRect(14, 11, 2, 2);
    } else if (em === 'h') {    // Rakhsh: black horse head
      c.fillStyle = '#17141a'; c.fillRect(5, 8, 13, 9);
      c.fillRect(16, 10, 5, 5);
      c.fillStyle = '#f2ede2'; c.fillRect(17, 10, 2, 2);
      c.fillStyle = '#0c0a0f'; c.fillRect(4, 4, 3, 7);
    } else if (em === 'l') {    // Lion
      c.fillStyle = '#5e3a14'; c.fillRect(3, 3, 18, 18);
      c.fillStyle = '#d4a459'; c.fillRect(7, 7, 10, 10);
      c.fillStyle = '#2a1508'; c.fillRect(9, 10, 2, 2); c.fillRect(14, 10, 2, 2);
    } else {                    // narrator: scroll
      c.fillStyle = '#b5a888'; c.fillRect(4, 6, 16, 12);
      c.fillStyle = '#6b5a3a';
      for (let i = 0; i < 4; i++) c.fillRect(6, 8 + i * 3, 12 - (i % 2) * 4, 1);
    }
    this.portrait.appendChild(cv);
  }

  update(dt) {
    if (!this.active) return;
    const line = this.script[this.lineIdx];

    // typewriter for the FA line, then reveal EN
    if (this._typing) {
      this.typeTimer -= dt;
      if (this.typeTimer <= 0 && this.charIdx < line.fa.length) {
        this.charIdx++;
        this.faEl.textContent = line.fa.slice(0, this.charIdx);
        this.typeTimer = 0.028;
        if (this.charIdx % 3 === 0) this.audio.play('type');
      }
      if (this.charIdx >= line.fa.length) {
        this.enEl.textContent = line.en;
        this._typing = false;
        this._fullShown = true;
      }
    }

    // advance input — consume() so one press never advances twice
    if (this.input.justPressed('advance')) {
      this.input.consume('advance');
      if (this._typing) {
        // complete the line instantly
        this.charIdx = line.fa.length;
        this.faEl.textContent = line.fa;
        this.enEl.textContent = line.en;
        this._typing = false;
        this._fullShown = true;
      } else if (this._fullShown) {
        this.audio.play('ui');
        this.lineIdx++;
        if (this.lineIdx >= this.script.length) this._finish();
        else this._startLine();
      }
    }
  }

  _finish() {
    this.active = false;
    this.root.classList.add('hidden');
    const cb = this.done;
    this.done = null;
    if (cb) cb();
  }

  // hard-close (finisher stagger takes priority over flavor dialogue)
  forceClose() {
    if (!this.active) return;
    this.active = false;
    this.done = null;
    this.root.classList.add('hidden');
  }
}
