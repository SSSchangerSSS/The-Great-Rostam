// sprites.js — frame-by-frame sprite-sheet animation layer (NO rigging).
// Every character clip is a folder of pre-drawn frames under assets/sprites/
// (see manifest.json). Playback is LOCKED to the rig Animator's normalized
// progress, so combat timing (hit frames, QTE windows, combos) is untouched —
// only the pixels being drawn change.
//
//   SpriteBank.draw(ctx, char, clip, progress, x, y, opts)
//     x,y = feet anchor (world space, already camera-transformed)
//     opts: { facing, alpha, flash, tint, scale, yOff }
//
// If the manifest or a clip is missing, callers silently fall back to the
// legacy procedural painters — the game can never break because of assets.

const ALIAS = {
  rostam: {
    airAttack: ['attack2'],
    fall: ['jump', 2, 3],
    finishLeap: ['jump'],
    finishSlam: ['attack3'],
    bowDraw: ['bow', 0, 2],
    bowHold: ['bow', 2, 2],
    bowShot: ['bow', 3, 5],
  },
  lion: { flinch: ['hurt', 0, 1] },
  jackal: {},
  jackalA: {},
  rakhsh: {},
};

export class SpriteBank {
  constructor() {
    this.ready = false;
    this.data = null;          // manifest chars
    this.imgs = new Map();     // 'char/clip/f0' -> HTMLImageElement
    this.promise = null;
    this._scratch = null;      // offscreen canvas for flash/tint passes
  }

  load() {
    if (this.promise) return this.promise;
    this.promise = (async () => {
      try {
        const res = await fetch('assets/sprites/manifest.json');
        if (!res.ok) throw new Error('manifest ' + res.status);
        const json = await res.json();
        const jobs = [];
        const chars = json.chars || {};
        for (const char of Object.keys(chars)) {
          for (const clip of Object.keys(chars[char].clips || {})) {
            const n = chars[char].clips[clip].frames || 0;
            for (let i = 0; i < n; i++) {
              jobs.push(new Promise((done) => {
                const im = new Image();
                im.onload = () => { this.imgs.set(`${char}/${clip}/f${i}`, im); done(); };
                im.onerror = () => done();
                im.src = `assets/sprites/${char}/${clip}/f${i}.png`;
              }));
            }
          }
        }
        await Promise.all(jobs);
        this.data = chars;
        this.ready = true;
      } catch (e) {
        console.warn('[sprites] asset bank unavailable — legacy painters stay active:', e.message);
        this.ready = false;
      }
    })();
    return this.promise;
  }

  has(char) {
    return !!(this.ready && this.data && this.data[char]);
  }

  height(char) {
    return (this.data && this.data[char] && this.data[char].h) || 100;
  }

  // resolve an alias chain (max depth 4 — aliases never point at aliases here)
  _resolve(char, clip) {
    let c = clip;
    for (let d = 0; d < 4; d++) {
      const table = ALIAS[char];
      const a = table && table[c];
      if (!a) break;
      c = a[0];
    }
    return c;
  }

  _clipInfo(char, clip) {
    const table = ALIAS[char];
    const a = table && table[clip];
    if (a) {
      const src = this.data[char] && this.data[char].clips[a[0]];
      if (!src) return null;
      const n = src.frames;
      let from = a.length > 1 ? a[1] : 0;
      let to = a.length > 2 ? a[2] : n - 1;
      from = Math.max(0, Math.min(n - 1, from));
      to = Math.max(from, Math.min(n - 1, to));
      return { clip: a[0], from, to, n: to - from + 1 };
    }
    const src = this.data[char] && this.data[char].clips[clip];
    return src ? { clip, from: 0, to: src.frames - 1, n: src.frames } : null;
  }

  /**
   * Draw one frame of one clip, feet-anchored at (x, y).
   * progress: normalized 0..1 through the clip (from the rig Animator).
   */
  draw(ctx, char, clip, progress, x, y, opts = {}) {
    if (!this.has(char)) return false;
    const info = this._clipInfo(char, clip);
    if (!info || info.n <= 0) return false;

    const p = Number.isFinite(progress) ? Math.max(0, progress) : 0;
    const t = p >= 0.999 ? 0.999 : (p % 1);
    const idx = info.from + Math.min(info.n - 1, Math.floor(t * info.n));
    const img = this.imgs.get(`${char}/${info.clip}/f${idx}`);
    if (!img) return false;

    const H = this.height(char) * (opts.scale || 1);
    const W = H * (img.width / img.height);
    const yOff = opts.yOff || 0;
    const alpha = opts.alpha == null ? 1 : Math.max(0, Math.min(1, opts.alpha));
    if (alpha <= 0 || W < 1 || H < 1) return true;

    const flash = Math.max(0, Math.min(1, opts.flash || 0));
    const tint = opts.tint || null;

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y + yOff);
    if ((opts.facing || 1) < 0) ctx.scale(-1, 1);
    const dx = -W / 2, dy = -H;

    if (flash > 0.02 || tint) {
      // flash / tint via offscreen pass (no ctx.filter — iOS safe)
      if (!this._scratch) this._scratch = document.createElement('canvas');
      const s = this._scratch;
      if (s.width !== img.width || s.height !== img.height) {
        s.width = img.width; s.height = img.height;
      }
      const sc = s.getContext('2d');
      sc.clearRect(0, 0, s.width, s.height);
      sc.drawImage(img, 0, 0);
      sc.globalCompositeOperation = 'source-atop';
      if (flash > 0.02) {
        sc.globalAlpha = flash;
        sc.fillStyle = '#ffffff';
        sc.fillRect(0, 0, s.width, s.height);
        sc.globalAlpha = 1;
      }
      if (tint) {
        sc.globalAlpha = 0.26;
        sc.fillStyle = tint === 'red' ? '#ff3c1e' : tint;
        sc.fillRect(0, 0, s.width, s.height);
        sc.globalAlpha = 1;
      }
      sc.globalCompositeOperation = 'source-over';
      ctx.drawImage(s, dx, dy, W, H);
    } else {
      ctx.drawImage(img, dx, dy, W, H);
    }
    ctx.restore();
    return true;
  }
}
