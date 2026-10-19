// audio.js — fully procedural WebAudio SFX (no asset files)
export class AudioSys {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }
  // must be called from a user gesture (browser autoplay policy)
  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    } catch (e) { /* audio unavailable — game still runs */ }
  }
  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.35;
    return this.muted;
  }
  _now() { return this.ctx ? this.ctx.currentTime : 0; }
  _out() { return this.master; }

  tone({ freq = 440, freqEnd = null, type = 'square', dur = 0.12, vol = 0.5, attack = 0.005 }) {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this._out());
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise({ dur = 0.15, vol = 0.4, filterFreq = 1200, filterEnd = 200, type = 'lowpass' }) {
    if (!this.ctx || this.muted) return;
    const t = this._now();
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFreq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(1, filterEnd), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this._out());
    src.start(t);
  }

  // ---- named effects ----
  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'swing':   this.noise({ dur: 0.12, vol: 0.30, filterFreq: 2400, filterEnd: 300 }); break;
      case 'hit':     this.noise({ dur: 0.10, vol: 0.5, filterFreq: 700, filterEnd: 90 });
                      this.tone({ freq: 130, freqEnd: 55, type: 'triangle', dur: 0.12, vol: 0.5 }); break;
      case 'jump':    this.tone({ freq: 260, freqEnd: 520, type: 'square', dur: 0.14, vol: 0.22 }); break;
      case 'land':    this.noise({ dur: 0.07, vol: 0.2, filterFreq: 400, filterEnd: 100 }); break;
      case 'hurt':    this.tone({ freq: 200, freqEnd: 70, type: 'sawtooth', dur: 0.22, vol: 0.4 }); break;
      case 'roar':    this.tone({ freq: 90, freqEnd: 45, type: 'sawtooth', dur: 0.7, vol: 0.6 });
                      this.noise({ dur: 0.6, vol: 0.35, filterFreq: 500, filterEnd: 80 }); break;
      case 'bow':     this.noise({ dur: 0.09, vol: 0.25, filterFreq: 3000, filterEnd: 900 });
                      this.tone({ freq: 700, freqEnd: 1300, type: 'sine', dur: 0.08, vol: 0.15 }); break;
      case 'pounce':  this.tone({ freq: 320, freqEnd: 90, type: 'sawtooth', dur: 0.25, vol: 0.3 }); break;
      case 'mount':   this.tone({ freq: 330, freqEnd: 660, type: 'triangle', dur: 0.3, vol: 0.3 }); break;
      case 'neigh':   this.tone({ freq: 900, freqEnd: 500, type: 'sawtooth', dur: 0.28, vol: 0.2 }); break;
      case 'ui':      this.tone({ freq: 660, type: 'square', dur: 0.06, vol: 0.18 }); break;
      case 'type':    this.tone({ freq: 880, type: 'square', dur: 0.025, vol: 0.06 }); break;
      case 'victory': [523, 659, 784, 1047].forEach((f, i) =>
                        setTimeout(() => this.tone({ freq: f, type: 'triangle', dur: 0.35, vol: 0.3 }), i * 140)); break;
      case 'defeat':  [392, 330, 262, 196].forEach((f, i) =>
                        setTimeout(() => this.tone({ freq: f, type: 'sawtooth', dur: 0.4, vol: 0.25 }), i * 180)); break;
      // ---- finisher QTE ----
      case 'qteReady':   this.tone({ freq: 520, freqEnd: 780, type: 'triangle', dur: 0.18, vol: 0.3 });
                         this.tone({ freq: 780, freqEnd: 1040, type: 'triangle', dur: 0.22, vol: 0.2 }); break;
      case 'qteGood':    this.tone({ freq: 880, freqEnd: 1180, type: 'sine', dur: 0.16, vol: 0.34 }); break;
      case 'qtePerfect': this.tone({ freq: 880, type: 'sine', dur: 0.3, vol: 0.3 });
                         this.tone({ freq: 1320, type: 'sine', dur: 0.34, vol: 0.24 });
                         this.tone({ freq: 1760, type: 'sine', dur: 0.36, vol: 0.14 }); break;
      case 'qteMiss':    this.tone({ freq: 160, freqEnd: 80, type: 'sawtooth', dur: 0.24, vol: 0.4 }); break;
      case 'slam':       this.tone({ freq: 70, freqEnd: 28, type: 'sine', dur: 0.8, vol: 0.85 });
                         this.noise({ dur: 0.5, vol: 0.6, filterFreq: 900, filterEnd: 60 });
                         this.tone({ freq: 210, freqEnd: 40, type: 'triangle', dur: 0.4, vol: 0.4 }); break;
      case 'enrage':     this.tone({ freq: 130, freqEnd: 420, type: 'sawtooth', dur: 0.55, vol: 0.4 });
                         this.noise({ dur: 0.5, vol: 0.3, filterFreq: 300, filterEnd: 1400, type: 'bandpass' }); break;
      case 'howl':       this.tone({ freq: 480, freqEnd: 620, type: 'sawtooth', dur: 0.5, vol: 0.22 });
                         this.tone({ freq: 484, freqEnd: 300, type: 'triangle', dur: 0.6, vol: 0.16 }); break;
      case 'heal':       this.tone({ freq: 660, freqEnd: 990, type: 'sine', dur: 0.2, vol: 0.28 }); break;
    }
  }
}
