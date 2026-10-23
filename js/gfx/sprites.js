// sprites.js v4 — frame-by-frame sprite-SHEET animation layer (NO rigging).
// Every character clip is ONE pre-packed sprite sheet PNG under
// assets/sprites/<char>/<clip>.png — a 6x5 grid of exactly 30 frames
// (see manifest.json v3: {sheet, cols, rows, fw, fh, frames, loop}).
// Frames are sampled by normalized progress, so combat timing (hit frames,
// QTE windows, combo pacing) is untouched — only the pixels change.
//
//   SpriteBank.draw(ctx, char, clip, progress, x, y, opts)
//     x,y = feet anchor (WORLD space — drawn inside cam.apply)
//     opts: { facing, alpha, flash, tint, scale, yOff }
//
// v2 LOADING CONTRACT (no fake success):
//   • a failed sheet is RECORDED (never silently "done"), retried once, and
//     reported — see status()/console output
//   • has(char) is all-or-nothing per character: EVERY clip of that char must
//     have loaded, otherwise the whole character falls back to the legacy
//     procedural painters. A half-loaded hero can never turn invisible.
//   • draw() still guards every frame and reports one warning per bad clip
const ASSET_VER = 'v3';   // bump on every sheet rebuild — busts stale caches

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
    this.failed = new Set();   // 'char/clip' entries that failed to load
    this.promise = null;
    this.charReady = new Set(); // chars whose sheets are ALL loaded
    this._warned = new Set();   // dedup draw-time warnings
    this._scratch = null;      // offscreen canvas for flash/tint passes
  }

  load() {
    if (this.promise) return this.promise;
    this.promise = (async () => {
      try {
        const res = await fetch(`assets/sprites/manifest.json?v=${ASSET_VER}`);
        if (!res.ok) throw new Error('manifest ' + res.status);
        const json = await res.json();
        if ((json.version || 0) < 3) throw new Error('manifest v2 unsupported');
        const chars = json.chars || {};
        this.data = chars;
        // staged per-character loading — the hero lands first
        const order = ['rostam', 'rakhsh', 'lion', 'jackal', 'jackalA'];
        for (const char of order) {
          const info = chars[char];
          if (!info) continue;
          const clips = Object.keys(info.clips || {});
          await Promise.all(clips.map((clip) => this._loadSheet(char, clip, info.clips[clip])));
          // ALL-or-nothing: a character is usable only if every clip exists
          const bad = clips.filter(c => this.failed.has(`${char}/${c}`));
          if (bad.length === 0) {
            this.charReady.add(char);
          } else {
            console.warn(`[sprites] char "${char}" INCOMPLETE — missing ${bad.join(', ')} — procedural fallback active for it`);
          }
          if (char === 'rostam') {
            this.ready = this.charReady.has('rostam');
            console.log(this.ready
              ? '[sprites] rostam sheets ready (staged)'
              : '[sprites] rostam sheets FAILED — legacy painter stays active');
          }
        }
        this.ready = this.charReady.size > 0;
        const ok = this.imgs.size, bad = this.failed.size;
        console.log(`[sprites] bank ${this.ready ? 'ready' : 'UNAVAILABLE'} — ${ok} sheets ok, ${bad} failed`);
        if (bad > 0) console.warn('[sprites] failed sheets:', [...this.failed].join(', '));
      } catch (e) {
        console.warn('[sprites] asset bank unavailable — legacy painters stay active:', e.message);
        this.ready = false;
      }
    })();
    return this.promise;
  }

  // load one sheet with ONE retry — failures are recorded, never faked
  _loadSheet(char, clip, clipInfo) {
    const src = `assets/sprites/${char}/${clipInfo.sheet}?v=${ASSET_VER}`;
    return new Promise((done) => {
      let attempts = 0;
      const tryLoad = () => {
        attempts++;
        const im = new Image();
        im.onload = () => {
          // a decoded empty/broken image is a failure too
          if (!im.naturalWidth || !im.naturalHeight) {
            this.failed.add(`${char}/${clip}`);
            console.warn(`[sprites] empty image: ${src}`);
          } else {
            this.imgs.set(`${char}/${clip}`, im);
          }
          done();
        };
        im.onerror = () => {
          if (attempts < 2) { setTimeout(tryLoad, 350); return; }   // one retry
          this.failed.add(`${char}/${clip}`);
          console.warn(`[sprites] FAILED to load: ${src}`);
          done();
        };
        im.src = src;
      };
      tryLoad();
    });
  }

  // truthful per-character/per-clip status (tools, tests, docs)
  status() {
    const out = {};
    if (this.data) {
      for (const [char, info] of Object.entries(this.data)) {
        out[char] = {};
        for (const clip of Object.keys(info.clips || {})) {
          out[char][clip] = this.failed.has(`${char}/${clip}`) ? 'failed'
            : this.imgs.has(`${char}/${clip}`) ? 'loaded' : 'pending';
        }
      }
    }
    return out;
  }

  has(char) {
    return !!(this.data && this.data[char] && this.charReady.has(char));
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
    if (!info || info.n <= 0) {
      if (!this._warned.has(`${char}/${clip}`)) {
        this._warned.add(`${char}/${clip}`);
        console.warn(`[sprites] no sheet for clip "${clip}" of "${char}" — frame skipped`);
      }
      return false;
    }

    const p = Number.isFinite(progress) ? Math.max(0, progress) : 0;
    const t = p >= 0.999 ? 0.999 : (p % 1);
    const idx = info.i0 + Math.min(info.n - 1, Math.floor(t * info.n));
    const sheet = this.imgs.get(`${char}/${info.clip}`);
    if (!sheet || !sheet.complete || !sheet.naturalWidth) return false;

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
