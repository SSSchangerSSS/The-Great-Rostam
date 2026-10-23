// projectiles.js — hero's bow arrows
// v2:
//   • COORDINATE CONTRACT: everything here lives in WORLD space. Drawing happens
//     inside cam.apply(ctx) — never subtract the camera offset again.
//   • substepped (swept) collision: a fast arrow is sampled along its path so
//     it cannot tunnel through a thin hurtbox between two sim steps
//   • dmg comes from the shooter (quick vs charged bow)
import { rectsOverlap } from '../core/utils.js';

const SUBSTEPS = 3;   // path samples per sim step (arrow ≤ ~16px/step at 980px/s)

export class Arrows {
  constructor() { this.list = []; }
  shoot(x, y, dir, speed = 780, game, dmg = 3) {
    this.list.push({ x, y, px: x, py: y, vx: dir * speed, vy: -30, dead: false, dmg });
    if (game) game.audio.play('bow');
  }
  update(dt, world, enemies, game) {
    for (const a of this.list) {
      a.px = a.x; a.py = a.y;
      for (let s = 0; s < SUBSTEPS && !a.dead; s++) {
        const h = dt / SUBSTEPS;
        a.vy += 300 * h;                   // slight drop
        a.x += a.vx * h;
        a.y += a.vy * h;
        // world collision (solid platforms only — one-way ledges don't stop arrows)
        for (const p of world.platforms) {
          if (p.oneWay) continue;
          if (a.x > p.x && a.x < p.x + p.w && a.y > p.y && a.y < p.y + p.h) { a.dead = true; break; }
        }
        // enemy collision
        if (!a.dead) {
          for (const e of enemies) {
            if (e.dead) continue;
            const box = e.hurtbox();
            if (rectsOverlap({ x: a.x - 8, y: a.y - 3, w: 16, h: 6 }, box)) {
              e.hurt(a.dmg || 3, a.vx > 0 ? 1 : -1, game);
              a.dead = true;
              break;
            }
          }
        }
      }
      if (a.x < -50 || a.x > world.width + 50 || a.y > world.groundY + 60) a.dead = true;
    }
    this.list = this.list.filter(a => !a.dead);
  }
  // drawn in WORLD space inside cam.apply — interpolation keeps fast arrows smooth
  draw(ctx, cam, a = 0) {
    ctx.strokeStyle = '#d8c9a0';
    ctx.lineWidth = 2.2;
    for (const ar of this.list) {
      const t = a || 0;
      const x = ar.px + (ar.x - ar.px) * t;
      const y = ar.py + (ar.y - ar.py) * t;
      const ang = Math.atan2(ar.vy, ar.vx);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(-10, 0); ctx.lineTo(8, 0);
      ctx.stroke();
      ctx.fillStyle = '#e8dcc8';
      ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(5, -3); ctx.lineTo(5, 3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#b03030';
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-10, -2.5); ctx.lineTo(-6, 0); ctx.lineTo(-10, 2.5); ctx.stroke();
      ctx.restore();
    }
  }
  clear() { this.list = []; }
}
