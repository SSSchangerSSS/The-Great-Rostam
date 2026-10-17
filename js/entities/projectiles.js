// projectiles.js — hero's bow arrows
import { rectsOverlap } from '../core/utils.js';

export class Arrows {
  constructor() { this.list = []; }
  shoot(x, y, dir, speed = 780, game) {
    this.list.push({ x, y, vx: dir * speed, vy: -30, dead: false });
    if (game) game.audio.play('bow');
  }
  update(dt, world, enemies, game) {
    for (const a of this.list) {
      a.vy += 300 * dt;                    // slight drop
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      // world collision
      for (const p of world.platforms) {
        if (a.x > p.x && a.x < p.x + p.w && a.y > p.y && a.y < p.y + p.h) { a.dead = true; break; }
      }
      // enemy collision
      if (!a.dead) {
        for (const e of enemies) {
          if (e.dead) continue;
          const box = e.hurtbox();
          if (rectsOverlap({ x: a.x - 8, y: a.y - 3, w: 16, h: 6 }, box)) {
            e.hurt(3, a.vx > 0 ? 1 : -1, game);
            a.dead = true;
            break;
          }
        }
      }
      if (a.x < -50 || a.x > world.width + 50 || a.y > world.groundY + 60) a.dead = true;
    }
    this.list = this.list.filter(a => !a.dead);
  }
  draw(ctx, cam) {
    ctx.strokeStyle = '#d8c9a0';
    ctx.lineWidth = 2.2;
    for (const a of this.list) {
      const ang = Math.atan2(a.vy, a.vx);
      ctx.save();
      ctx.translate(a.x - cam.offsetX, a.y - cam.offsetY);
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
