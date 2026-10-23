// world.js — level container: platforms, props, triggers, AABB physics
//
// v2 collision contract (fixed-timestep sim):
//   • entity origin = feet center (x, y) in WORLD space
//   • entities store px/py = real position from the END of the previous step,
//     saved BEFORE integration — never reconstructed from an assumed dt
//   • collision body (ent.w/ent.h), hurtbox() and hitboxes are three separate
//     concepts; the body never resizes with animation frames
//   • platforms come in two kinds:
//       oneWay:true  → only landing from above (thin ledges); pass from the
//                      side/below, no head bonk, no side walls
//       oneWay:false → solid: landing, head bonk, and horizontal push-out
import { rectsOverlap } from '../core/utils.js';
import { Environment } from '../gfx/parallax.js';
import { paintColumn, paintBrazier, paintShrub, paintRock } from '../gfx/paint.js';
import { LEVELS, GROUND_Y } from '../content/levels.js';

const LAND_EPS = 6;      // feet may cross the top surface by up to this (px) per step

export class World {
  constructor(levelId, game) {
    const L = LEVELS[levelId];
    this.levelId = levelId;
    this.def = L;
    this.game = game;
    this.width = L.width;
    this.groundY = GROUND_Y;
    this.platforms = L.platforms.map(p => ({ oneWay: false, ...p }));
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

  /**
   * Resolve one entity (feet origin, body = w×h) against platforms + ground.
   * Requires ent.px/ent.py (previous position) and ent.vx/ent.vy.
   * Sets ent.onGround / ent.onGround_ after resolution.
   */
  collide(ent) {
    const w = ent.w, h = ent.h;
    ent.onGround_ = false;

    for (const p of this.platforms) {
      const overlapX = (ent.x + w / 2 > p.x) && (ent.x - w / 2 < p.x + p.w);
      if (!overlapX) continue;

      if (p.oneWay) {
        // one-way: landing only — feet crossed the top surface this step
        if (ent.vy >= 0 && ent.py <= p.y + LAND_EPS && ent.y >= p.y) {
          ent.y = p.y;
          ent.vy = 0;
          ent.onGround = true;
          ent.onGround_ = true;
        }
        continue;
      }

      // solid platform
      if (ent.vy >= 0 && ent.py <= p.y + LAND_EPS && ent.y >= p.y) {
        // came from above → land on top
        ent.y = p.y;
        ent.vy = 0;
        ent.onGround = true;
        ent.onGround_ = true;
      } else if (ent.vy < 0 && ent.py - h >= p.y + p.h - 2 && ent.y - h < p.y + p.h) {
        // came from below → head bonk
        ent.y = p.y + p.h + h;
        ent.vy = 0;
      } else {
        // side overlap (body intersects the slab, was not above/below) → push out
        const bodyTop = ent.y - h;
        const bodyBottom = ent.y;
        const vertOverlap = bodyTop < p.y + p.h && bodyBottom > p.y + 2; // +2: standing on top is not "inside"
        const wasAbove = ent.py <= p.y + LAND_EPS;
        if (vertOverlap && !wasAbove && !(ent.onGround_ && ent.y === p.y)) {
          const penLeft = (ent.x + w / 2) - p.x;              // push left amount
          const penRight = (p.x + p.w) - (ent.x - w / 2);     // push right amount
          if (penLeft < penRight) ent.x = p.x - w / 2 - 0.01;
          else ent.x = p.x + p.w + w / 2 + 0.01;
        }
      }
    }

    // main ground line
    if (ent.y >= this.groundY) {
      ent.y = this.groundY;
      if (ent.vy > 0) ent.vy = 0;
      ent.onGround = true;
      ent.onGround_ = true;
    }
  }

  updateTriggers(player, game) {
    const play = game.states.play;
    for (const t of this.triggers) {
      if (t.fired || player.x < t.x) continue;
      t.fired = true;
      if (t.lockArena) {
        // FIX (checkpoint respawn): never re-lock an arena whose boss is gone —
        // after a checkpoint respawn the defeated mini-boss no longer exists,
        // and locking its arena would soft-lock the run behind x2-20.
        const miniAlive = !!(play && play.miniBoss && !play.miniBoss.dead);
        const bossAlive = !!(play && play.boss && !play.boss.dead);
        if (t.lockArena === 'mini') {
          if (miniAlive && this.def.miniBoss) {
            const mb = this.def.miniBoss;
            this.lockArena(mb.arena.x1, mb.arena.x2);
            game.activateBoss('mini');
          }
        } else if (bossAlive && this.def.boss) {
          this.lockArena(this.def.boss.arena.x1, this.def.boss.arena.x2);
          game.activateBoss('boss');
        }
      }
      if (t.dialogue) game.dialogue.play(t.dialogue);
    }
  }

  update(dt, player) {
    this.time += dt;
    // pickups: arrows & healing hearts (mini-boss trophy)
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      if (Math.abs(player.x - pk.x) < 30 && Math.abs(player.y - pk.y) < 50) {
        pk.taken = true;
        if (pk.heart) {
          player.hp = Math.min(player.maxHp, player.hp + 2);
          this.game.audio.play('heal');
          this.game.particles.burst(pk.x, pk.y, 12, { speed: 80, life: 0.5, size: 3, color: '#e05545', glow: true });
        } else {
          player.arrows = Math.min(player.maxArrows, player.arrows + 4);
          this.game.audio.play('ui');
          this.game.particles.burst(pk.x, pk.y, 8, { speed: 70, life: 0.4, size: 2.6, color: '#e8dcc8', glow: true });
        }
        this.game.hud.sync(player);
      }
    }
  }

  spawnHeart(x) {
    this.pickups.push({ x, y: this.groundY - 60, heart: true, taken: false });
  }

  drawProps(ctx, cam) {
    const gy = this.groundY;
    const cullW = (this.game.viewW || 1280) / (cam.zoom || 1);
    // ruins columns (parallax 1 — world space) with slight depth offset
    for (const pr of this.props) {
      const sx = pr.x - cam.offsetX;
      if (sx < -cullW * 0.2 || sx > cullW + cullW * 0.2) continue;
      if (pr.type === 'column') paintColumn(ctx, pr.x, gy, pr.broken ? 90 : 150 + pr.seed * 8, pr.seed);
      else if (pr.type === 'shrub') paintShrub(ctx, pr.x, gy, pr.seed);
      else if (pr.type === 'rock') paintRock(ctx, pr.x, gy, pr.scale || 1);
    }
    for (const bx of this.braziers) {
      const sx = bx - cam.offsetX;
      if (sx < -80 || sx > cullW + 80) continue;
      paintBrazier(ctx, bx, gy, this.time);
    }
    // arrow pickups (floating, gently bobbing)
    for (const pk of this.pickups) {
      if (pk.taken) continue;
      const sx = pk.x - cam.offsetX;
      if (sx < -40 || sx > cullW + 40) continue;
      const bob = Math.sin(this.time * 3 + pk.x) * 5;
      const y = pk.y + bob - cam.offsetY;
      if (pk.heart) {
        // healing heart — the fallen alpha's trophy
        ctx.save();
        ctx.translate(sx, y);
        const s = 1 + Math.sin(this.time * 5 + pk.x) * 0.08;
        ctx.scale(s, s);
        ctx.fillStyle = 'rgba(224,85,69,0.12)';
        ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#d8503f';
        ctx.beginPath();
        ctx.moveTo(0, 9);
        ctx.bezierCurveTo(-11, 1, -9, -8, -4, -8);
        ctx.bezierCurveTo(-1.5, -8, 0, -5.5, 0, -4);
        ctx.bezierCurveTo(0, -5.5, 1.5, -8, 4, -8);
        ctx.bezierCurveTo(9, -8, 11, 1, 0, 9);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath(); ctx.ellipse(-3.4, -3.6, 2.1, 1.4, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        continue;
      }
      ctx.save();
      ctx.translate(sx, y);
      ctx.rotate(-0.5);
      ctx.strokeStyle = '#e8dcc8';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.stroke();
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(6, -3.5); ctx.lineTo(6, 3.5); ctx.closePath(); ctx.fill();
      ctx.restore();
      // glow
      ctx.fillStyle = 'rgba(255,215,0,0.08)';
      ctx.beginPath(); ctx.arc(sx, y, 16, 0, Math.PI * 2); ctx.fill();
    }
  }
}
