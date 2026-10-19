// particles.js — pooled particle system (dust, sparks, embers, sand, hit-flashes)
// v2: shaped particles — 'spark' (velocity streaks), 'flash' (expanding impact
// rings), 'dust' (soft sand puffs) — the Shank/Flash combat punctuation.
import { TAU } from '../core/utils.js';

export class Particles {
  constructor(max = 420) {
    this.pool = [];
    this.active = [];
    for (let i = 0; i < max; i++) this.pool.push({});
  }
  spawn({ x, y, vx, vy, life, size, color, grav = 0, fade = true, shrink = false, glow = false, shape = 'quad' }) {
    const p = this.pool.pop();
    if (!p) return;
    Object.assign(p, { x, y, vx, vy, life, maxLife: life, size, color, grav, fade, shrink, glow, shape });
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
        shape: opts.shape || 'quad',
      });
    }
  }

  // Shank-style impact sparks: bright streaks bursting against the swing
  sparkBurst(x, y, dir = 1) {
    for (let i = 0; i < 7; i++) {
      const a = (Math.random() - 0.5) * 2.4 + (dir > 0 ? 0 : Math.PI);
      const sp = 180 + Math.random() * 260;
      this.spawn({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.16 + Math.random() * 0.14,
        size: 2 + Math.random() * 1.6,
        color: Math.random() < 0.55 ? '#ffd700' : '#fff3c4',
        grav: 420, shape: 'spark', glow: true,
      });
    }
    this.spawn({ x, y, vx: 0, vy: 0, life: 0.14, size: 7, color: '#fff8dc', shape: 'flash', glow: true });
  }

  // soft sand puffs for landings, run kicks and take-offs
  dust(x, y, n = 6, power = 1) {
    for (let i = 0; i < n; i++) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.spawn({
        x: x + dir * (4 + Math.random() * 12), y: y - 2 - Math.random() * 4,
        vx: dir * (30 + Math.random() * 90) * power,
        vy: -(20 + Math.random() * 70) * power,
        life: 0.4 + Math.random() * 0.4,
        size: (3 + Math.random() * 4) * power,
        color: Math.random() < 0.5 ? '#c9b890' : '#a89367',
        grav: -60, shape: 'dust',
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
      if (p.shape === 'spark') { p.vx *= Math.pow(0.02, dt); p.vy *= Math.pow(0.1, dt); }
      if (p.shape === 'dust') { p.vx *= Math.pow(0.15, dt); }
    }
  }
  draw(ctx, cam) {
    for (const p of this.active) {
      const a = p.fade ? Math.max(0, p.life / p.maxLife) : 1;
      const x = p.x - cam.offsetX, y = p.y - cam.offsetY;
      if (p.shape === 'spark') {
        // streak along velocity — the classic Flash hit-spark
        ctx.globalAlpha = a;
        if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 7; }
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size * a + 0.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - p.vx * 0.045, y - p.vy * 0.045);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else if (p.shape === 'flash') {
        // expanding white impact flash
        const r = p.size * (1 + (1 - a) * 3.4);
        ctx.globalAlpha = a * 0.85;
        ctx.fillStyle = p.color;
        if (p.glow) { ctx.shadowColor = p.color; ctx.shadowBlur = 12; }
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.shape === 'dust') {
        // soft sand puff — grows & fades
        const r = p.size * (1 + (1 - a) * 1.6);
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      } else {
        ctx.globalAlpha = a;
        if (p.glow) {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
        }
        ctx.fillStyle = p.color;
        const s = p.shrink ? p.size * a : p.size;
        ctx.fillRect(x - s / 2, y - s / 2, s, s);
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
  }
}
