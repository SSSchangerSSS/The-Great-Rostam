// rig.js — procedural skeletal animation system v2 ("Flash-style")
// Bones form a hierarchy; poses are per-bone angle offsets; clips are keyframed poses.
// v2: per-key EASING (snap strikes, back-overshoot windups), root-motion channels
// (_ox/_oy hip drift) so poses can carry weight, and hold keys for impact freezes.
// Everything is drawn by "painters" using the resolved joint transforms.

import { lerp } from '../core/utils.js';

// ---- easing library (the soul of Flash-style animation) ----
export const Ease = {
  smooth: (t) => t * t * (3 - 2 * t),                 // organic default
  linear: (t) => t,
  in:     (t) => t * t * t,                            // slow start → whip arrival
  out:    (t) => 1 - Math.pow(1 - t, 3),               // fast burst → soft settle
  snap:   (t) => 1 - Math.pow(1 - t, 5),               // violent burst (strikes)
  back:   (t) => { const c = 1.9; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; }, // overshoot
  bounce: (t) => { // small settle wobble for heavy landings
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
};

export class Rig {
  /**
   * def = {
   *   bones: [{ name, parent|null, ox, oy, angle(rest, rad), len }],
   * }
   * ox/oy = offset from parent's TIP (end of parent bone). Root uses offset from entity origin.
   * A bone extends from its joint at `angle` for `len` pixels.
   */
  constructor(def) {
    this.def = def;
    this.bones = {};      // name -> bone
    this.order = [];      // top-down order for resolution
    for (const b of def.bones) {
      this.bones[b.name] = { ...b };
      this.order.push(b.name);
    }
  }

  /**
   * pose: { boneName: angleDelta(rad), _ox, _oy (px root drift), ... }
   * root: { x, y, flip(+1/-1), scale }
   * returns { name: { x, y, angle, tipX, tipY, len } } in world space
   */
  compute(pose = {}, root = { x: 0, y: 0, flip: 1, scale: 1 }) {
    const out = {};
    const rOx = (pose._ox || 0) * root.flip;
    const rOy = pose._oy || 0;
    for (const name of this.order) {
      const b = this.bones[name];
      const delta = pose[name] || 0;
      const angle = (b.angle + delta) * root.flip;
      let jx, jy;
      if (b.parent === null) {
        jx = root.x + b.ox * root.flip + rOx;
        jy = root.y + b.oy + rOy;
      } else {
        const p = out[b.parent];
        jx = p.tipX + b.ox * root.flip;
        jy = p.tipY + b.oy;
      }
      const tipX = jx + Math.cos(angle) * b.len * root.scale;
      const tipY = jy + Math.sin(angle) * b.len * root.scale;
      out[name] = { x: jx, y: jy, angle, tipX, tipY, len: b.len * root.scale };
    }
    return out;
  }
}

// ---------- clips ----------
export class Clip {
  /**
   * keys: [{ t: 0..1, pose: {bone: angleDelta, _ox, _oy}, ease: 'mode' }]
   * `ease` on a key describes HOW WE ARRIVE INTO that key.
   * Missing bones in a key inherit from previous key (or 0).
   */
  constructor(duration, loop, keys) {
    this.duration = duration;
    this.loop = loop;
    this.keys = keys;
  }
  sample(tNorm) {
    const keys = this.keys;
    if (keys.length === 0) return {};
    const t = this.loop ? ((tNorm % 1) + 1) % 1 : Math.min(1, Math.max(0, tNorm));
    let a = keys[0], b = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (t >= keys[i].t && t <= keys[i + 1].t) { a = keys[i]; b = keys[i + 1]; break; }
    }
    const span = b.t - a.t;
    const f = span > 0 ? (t - a.t) / span : 1;
    const e = (Ease[b.ease] || Ease.smooth)(f);
    const bones = new Set([...Object.keys(a.pose), ...Object.keys(b.pose)]);
    const out = {};
    for (const k of bones) {
      const va = a.pose[k] ?? 0;
      const vb = b.pose[k] ?? 0;
      out[k] = lerp(va, vb, e);
    }
    return out;
  }
}

export class Animator {
  constructor(clips = {}) {
    this.clips = clips;      // name -> Clip
    this.current = null;
    this.name = '';
    this.time = 0;
    this.speed = 1;
    this.finished = false;
    this.onFinish = null;
  }
  add(name, clip) { this.clips[name] = clip; return this; }
  play(name, { speed = 1, restart = false, onFinish = null } = {}) {
    if (this.name === name && !restart && this.current) { this.speed = speed; return; }
    this.current = this.clips[name] || null;
    this.name = this.current ? name : '';
    this.time = 0;
    this.speed = speed;
    this.finished = false;
    this.onFinish = onFinish;
  }
  update(dt) {
    if (!this.current || this.finished) return;
    this.time += dt * this.speed;
    if (this.time >= this.current.duration) {
      if (this.current.loop) this.time %= this.current.duration;
      else { this.time = this.current.duration; this.finished = true; if (this.onFinish) { const cb = this.onFinish; this.onFinish = null; cb(); } }
    }
  }
  pose() {
    if (!this.current) return {};
    return this.current.sample(this.time / this.current.duration);
  }
  get progress() { return this.current ? this.time / this.current.duration : 0; }
}
