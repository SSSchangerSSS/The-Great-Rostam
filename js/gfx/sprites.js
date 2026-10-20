// sprites.js v2 — frame-by-frame sprite-SHEET animation layer (NO rigging).
// Every character clip is ONE pre-packed sprite sheet PNG under
// assets/sprites/<char>/<clip>.png — a 6x5 grid of exactly 30 frames
// (see manifest.json v2: {sheet, cols, rows, fw, fh, frames, loop}).
// Frames are sampled by normalized progress, so combat timing (hit frames,
// QTE windows, combo pacing) is untouched — only the pixels change.
//
//   SpriteBank.draw(ctx, char, clip, progress, x, y, opts)
//     x,y = feet anchor (world space, already camera-transformed)
//     opts: { facing, alpha, flash, tint, scale, yOff }
//
// ALIAS sub-ranges are FRACTIONS of the clip (0..1), robust to frame counts.
// If the manifest or a sheet is missing, callers silently fall back to the
// legacy procedural painters — the game can never break because of assets.

const ALIAS = {
  rostam: {
    airAttack: ['attack2'],
    fall: ['jump', 0.35, 0.85],
    finishLeap: ['jump'],
    finishSlam: ['attack3'],
    bowDraw: ['bow', 0.0, 0.45],
    bowHold: ['bow', 0.45, 0.58],
    bowShot: ['bow', 0.58, 1.0],
  },
  lion: { flinch: ['hurt'] },
  jackal: {},
  jackalA: {},
  rakhsh: {},
};

export class SpriteBank {
  constructor() {
    this.ready = false;
    this.data = null;          // manifest chars
    this.imgs = new Map();     // 'char/clip' -> HTMLImageElement (sheet)
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
        if ((json.version || 0) < 2) throw new Error('manifest v1 unsupported');
        const jobs = [];
        const chars = json.chars || {};
        for (const char of Object.keys(chars)) {
          for (const clip of Object.keys(chars[char].clips || {})) {
            const info = chars[char].clips[clip];
            if (!info.sheet) continue;
            jobs.push(new Promise((done) => {
              const im = new Image();
              im.onload = () => { this.imgs.set(`${char}/${clip}`, im); done(); };
              im.onerror = () => done();
              im.src = `assets/sprites/${char}/${info.sheet}`;
            }));
          }
        }
        await Promise.all(jobs);
        this.data = chars;
        this.ready = true;
        console.log(`[sprites] v2 bank ready — ${this.imgs.size} sheets, 30 frames/clip`);
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
      if (!src || !src.sheet) return null;
      const n = src.frames || 0;
      let from = a.length > 1 ? a[1] : 0;           // fractions 0..1
      let to = a.length > 2 ? a[2] : 1;
      from = Math.max(0, Math.min(0.999, from));
      to = Math.max(from, Math.min(1, to));
      const i0 = Math.floor(from * n);
      const i1 = Math.max(i0, Math.ceil(to * n) - 1);
      return { clip: a[0], src, i0, i1, n: i1 - i0 + 1 };
    }
    const src = this.data[char] && this.data[char].clips[clip];
    return (src && src.sheet) ? { clip, src, i0: 0, i1: src.frames - 1, n: src.frames } : null;
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
    const idx = info.i0 + Math.min(info.n - 1, Math.floor(t * info.n));
    const sheet = this.imgs.get(`${char}/${info.clip}`);
    if (!sheet) return false;

    const { cols, rows, fw, fh } = info.src;
    const sx = (idx % cols) * fw, sy = Math.floor(idx / cols) * fh;

    const H = this.height(char) * (opts.scale || 1);
    const W = H * (fw / fh);           // per-CELL aspect, not sheet aspect
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
      if (s.width !== fw || s.height !== fh) {
        s.width = fw; s.height = fh;
      }
      const sc = s.getContext('2d');
      sc.clearRect(0, 0, fw, fh);
      sc.drawImage(sheet, sx, sy, fw, fh, 0, 0, fw, fh);
      sc.globalCompositeOperation = 'source-atop';
      if (flash > 0.02) {
        sc.globalAlpha = flash;
        sc.fillStyle = '#ffffff';
        sc.fillRect(0, 0, fw, fh);
        sc.globalAlpha = 1;
      }
      if (tint) {
        sc.globalAlpha = 0.26;
        sc.fillStyle = tint === 'red' ? '#ff3c1e' : tint;
        sc.fillRect(0, 0, fw, fh);
        sc.globalAlpha = 1;
      }
      sc.globalCompositeOperation = 'source-over';
      ctx.drawImage(s, dx, dy, W, H);
    } else {
      ctx.drawImage(sheet, sx, sy, fw, fh, dx, dy, W, H);
    }
    ctx.restore();
    return true;
  }
}
