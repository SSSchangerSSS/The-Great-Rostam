// world.js — level container: platforms, props, triggers, AABB physics
import { rectsOverlap } from '../core/utils.js';
import { Environment } from '../gfx/parallax.js';
import { paintColumn, paintBrazier, paintShrub, paintRock } from '../gfx/paint.js';
import { LEVELS, GROUND_Y } from '../content/levels.js';

export class World {
  constructor(levelId, game) {
    const L = LEVELS[levelId];
    this.levelId = levelId;
    this.def = L;
    this.game = game;
    this.width = L.width;
    this.groundY = GROUND_Y;
    this.platforms = L.platforms.map(p => ({ ...p }));
    this.props = L.props;
    this.braziers = L.braziers;
    this.pickups = (L.pickupArrows || []).map(p => ({ ...p, taken: false }));
    this.triggers = L.triggers.map(t => ({ ...t, fired: false }));
    this.arena = null;                    // {x1,x2} when boss locked
    this.env = new Environment(L.palette, L.width, GROUND_Y, 7);
    this.time = 0;
  }

  camMinX() { return this.arena ? this.arena.x1 : 0; }
  camMaxX() { return this.arena ? this.arena.x2 : this.width; }

  lockArena(x1, x2) {
    this.arena = { x1, x2 };
  }
  unlockArena() { this.arena = null; }

  // AABB collision: resolve horizontal then vertical against platforms
  collide(ent) {
    const box = ent.hurtbox ? ent.hurtbox() : { x: ent.x - ent.w / 2, y: ent.y - ent.h, w: ent.w, h: ent.h };
    // NOTE: entity origin = feet (x center, y = feet). Convert to box, resolve, write back.
    let b = { x: ent.x - ent.w / 2, y: ent.y - ent.h, w: ent.w, h: ent.h };
    ent.onGround_ = false;

    // vertical resolution first (feet-based)
    for (const p of this.platforms) {
      if (b.x + b.w <= p.x || b.x >= p.x + p.w) continue;
      // falling onto top surface
      const prevFeet = ent.y - ent.vy * (1 / 120);   // approx previous position
      if (ent.vy >= 0 && prevFeet <= p.y + 8 && ent.y >= p.y && ent.y <= p.y + p.h + 30) {
        ent.y = p.y;
        ent.vy = 0;
        ent.onGround = true;
        ent.onGround_ = true;
        b.y = p.y - b.h;
      }
      // bonk head
      if (ent.vy < 0 && b.y <= p.y + p.h && b.y > p.y && ent.y - b.h >= p.y) {
        // only for solids tall enough to matter
        if (p.h > 40 && ent.y - ent.vy * (1 / 120) - ent.h >= p.y + p.h - 6) {
          ent.y = p.y + p.h + ent.h;
          ent.vy = 0;
          b.y = p.y + p.h;
        }
      }
    }
    if (ent.y >= this.groundY) {
      ent.y = this.groundY;
      if (ent.vy > 0) ent.vy = 0;
      ent.onGround = true;
      ent.onGround_ = true;
    }
    ent.onGround = ent.onGround_ || ent.y >= this.groundY - 0.5;
  }

  updateTriggers(player, game) {
    for (const t of this.triggers) {
      if (t.fired || player.x < t.x) continue;
      t.fired = true;
      if (t.lockArena && this.def.boss) {
        this.lockArena(this.def.boss.arena.x1, this.def.boss.arena.x2);
        game.activateBoss();
      }
      if (t.dialogue) game.dialogue.play(t.dialogue);
    }
  }

  update(dt, player) {
    this.time += dt;
    // arrow pickups
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      if (Math.abs(player.x - pk.x) < 30 && Math.abs(player.y - pk.y) < 50) {
        pk.taken = true;
        player.arrows = Math.min(player.maxArrows, player.arrows + 4);
        this.game.audio.play('ui');
        this.game.particles.burst(pk.x, pk.y, 8, { speed: 70, life: 0.4, size: 2.6, color: '#e8dcc8', glow: true });
        this.game.hud.sync(player);
      }
    }
  }

  drawProps(ctx, cam) {
    const gy = this.groundY;
    // ruins columns (parallax 1 — world space) with slight depth offset
    for (const pr of this.props) {
      const x = pr.x - cam.offsetX;
      if (x < -120 || x > (this.game.viewW || 1280) + 120) continue;
      if (pr.type === 'column') paintColumn(ctx, pr.x, gy, pr.broken ? 90 : 150 + pr.seed * 8, pr.seed);
      else if (pr.type === 'shrub') paintShrub(ctx, pr.x, gy, pr.seed);
      else if (pr.type === 'rock') paintRock(ctx, pr.x, gy, pr.scale || 1);
    }
    for (const bx of this.braziers) {
      const x = bx - cam.offsetX;
      if (x < -80 || x > (this.game.viewW || 1280) + 80) continue;
      paintBrazier(ctx, bx, gy, this.time);
    }
    // arrow pickups (floating, gently bobbing)
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      const x = pk.x - cam.offsetX;
      if (x < -40 || x > (this.game.viewW || 1280) + 40) continue;
      const bob = Math.sin(this.time * 3 + pk.x) * 5;
      const y = pk.y + bob - cam.offsetY;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.5);
      ctx.strokeStyle = '#e8dcc8';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(6, -3.5); ctx.lineTo(6, 3.5); ctx.closePath(); ctx.fill();
      ctx.restore();
      // glow
      ctx.fillStyle = 'rgba(255,215,0,0.08)';
      ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    }
  }
}
