// particles.js — pooled particle system (dust, sparks, embers, sand)
import { TAU } from '../core/utils.js';

export class Particles {
  constructor(max = 400) {
    this.pool = [];
    this.active = [];
    for (let i = 0; i < max; i++) this.pool.push({});
  }
  spawn({ x, y, vx, vy, life, size, color, grav = 0, fade = true, shrink = false, glow = false }) {
    const p = this.pool.pop();
    if (!p) return;
    Object.assign(p, { x, y, vx, vy, life, maxLife: life, size, color, grav, fade, shrink, glow });
    this.active.push(p);
  }
  burst(x, y, n, opts) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = (opts.speed || 60) * (0.4 + Math.random() * 0.8);
      this.spawn({
        x, y,
        vx: Math.cos(a) * sp + (opts.vx || 0),
        vy: Math.sin(a) * sp + (opts.vy || 0),
        life: (opts.life || 0.5) * (0.6 + Math.random() * 0.7),
        size: (opts.size || 3) * (0.5 + Math.random()),
        color: Array.isArray(opts.color) ? opts.color[(Math.random() * opts.color.length) | 0] : opts.color,
        grav: opts.grav || 0,
        glow: opts.glow || false,
      });
    }
  }
  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      if (p.life <= 0) { this.active.splice(i, 1); this.pool.push(p); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  draw(ctx, cam) {
    for (const p of this.active) {
      const a = p.fade ? Math.max(0, p.life / p.maxLife) : 1;
      ctx.globalAlpha = a;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
      }
      ctx.fillStyle = p.color;
      const s = p.shrink ? p.size * a : p.size;
      ctx.fillRect(p.x - s / 2 - cam.offsetX, p.y - s / 2 - cam.offsetY, s, s);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }
}
