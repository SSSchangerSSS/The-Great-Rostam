// enemies.js — Jackal (mob) · WhiteJackal (MINI-BOSS) · Lion (BOSS)
// Both bosses support God-of-War-style finishers: when HP crosses the
// threshold they STAGGER (invulnerable), offering the player a QTE finisher.
// A failed QTE ENRAGES them: partial heal, red aura, faster & meaner.
//
// v2: every hit now READS — jackals flinch and skid (with friction, no skating),
// the lion's head snaps on light hits (recoil overlay, armor preserved),
// and all enemies white-flash on impact like a Shank/Flash hit.
import { clamp, rectsOverlap } from '../core/utils.js';
import { Animator } from '../gfx/rig.js';
import { LION_RIG, LION_CLIPS, JACKAL_RIG, JACKAL_CLIPS } from '../content/rigs.js';
import { paintLion, paintJackal } from '../gfx/paint.js';

const GRAV = 2500;

// draw dizzy stars above a staggered boss (exported — drawn on the fx layer in 2.5D mode)
export function drawStars(ctx, x, y, t) {
  for (let i = 0; i < 3; i++) {
    const a = t * 3.2 + i * 2.09;
    const sx = x + Math.cos(a) * 26;
    const sy = y - 14 + Math.sin(a) * 6;
    ctx.fillStyle = '#ffd700';
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(a);
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const r = k % 2 === 0 ? 4.2 : 1.8;
      const aa = (k / 8) * Math.PI * 2;
      ctx.lineTo(Math.cos(aa) * r, Math.sin(aa) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

// ============================================================
// JACKAL — chases and lunges (trash mob), flinches on every hit
// ============================================================
export class Jackal {
  constructor(game, x, y) {
    this.game = game;
    this.x = x; this.y = y;             // y = feet
    this.px = x; this.py = y;           // previous position (collision + interp)
    this.homeX = x;
    this.w = 40; this.h = 30;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 2; this.maxHp = 2;
    this.dead = false; this.deadT = 0;
    this.speed = 150;
    this.lungeCd = 0;
    this.state = 'run';                 // run|lunge|stun
    this.stunT = 0;
    this.flashT = 0;
    this.aggro = 480;                   // don't chase across the whole map
    this.fleeing = false; this.fleeT = 0;
    this.patrolT = 0; this.patrolDir = 1;
    this.rig = new Animator(JACKAL_CLIPS);
  }
  hurtbox() { return { x: this.x - this.w / 2, y: this.y - this.h - 6, w: this.w, h: this.h + 6 }; }

  // the pack scatters when its alpha falls to its knees
  flee() {
    if (this.dead) return;
    this.fleeing = true;
    this.fleeT = 2.6;
    this.state = 'run';
    this.rig.play('run', { restart: true, speed: 1.6 });
  }

  hurt(dmg, dir, game) {
    if (this.dead) return false;
    this.hp -= dmg;
    this.flashT = 0.12;
    // ★ knockback WITH friction (skid, then stop) — never a constant slide
    this.stunT = dmg >= 4 ? 0.5 : 0.28;
    this.state = 'stun';
    this.vx = dir * (dmg >= 4 ? 420 : 260);
    if (dmg >= 4) this.vy = -240;       // heavy hits launch
    game.particles.burst(this.x, this.y - 16, 7, { speed: 110, life: 0.4, size: 3, color: ['#8a6d4a', '#5e4a30'], grav: 500 });
    if (this.hp <= 0) {
      this.dead = true;
      this.state = 'die';
      this.stunT = 0;
      this.rig.play('die', { restart: true });
      game.audio.play('hit');
      // death poof — the jackal bursts into sand
      game.particles.burst(this.x, this.y - 14, 12, { speed: 130, life: 0.55, size: 3.4, color: ['#8a6d4a', '#c9b890', '#5e4a30'], grav: 260 });
    }
    return true;
  }

  update(dt, world, player) {
    if (this.dead) {
      this.deadT += dt;
      this.rig.update(dt);
      return;
    }
    if (this.flashT > 0) this.flashT -= dt;
    if (this._trampleT > 0) this._trampleT -= dt;
    this.lungeCd -= dt;
    const dir = Math.sign(player.x - this.x) || -1;
    const dist = Math.abs(player.x - this.x);

    // pack scatters away from the finisher
    if (this.fleeing) {
      this.fleeT -= dt;
      this.facing = -dir;
      this.vx = -dir * 280;
      this.rig.play('run', { speed: 1.6 });
      if (this.fleeT <= 0) {
        this.dead = true;
        this.deadT = 0;
        this.rig.play('die', { restart: true });
      }
      this.vy += GRAV * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      world.collide(this);
      this.rig.update(dt);
      return;
    }

    if (this.state === 'stun') {
      // ★ hit-stun: skid to a halt, then back to the hunt
      this.stunT -= dt;
      this.vx *= Math.pow(0.0006, dt);
      this.rig.play('flinch');
      if (this.stunT <= 0) this.state = 'run';
    } else if (this.state === 'lunge') {
      if (this.rig.finished) { this.state = 'run'; }
      // contact damage
      if (rectsOverlap(this.hurtbox(), player.hurtbox())) {
        player.hurt(1, Math.sign(this.x - player.x) || 1, this.game);
      }
    } else {
      this.facing = dir;
      if (dist > this.aggro) {
        // idle patrol near home — no cross-map marches
        this.patrolT -= dt;
        if (this.patrolT <= 0) { this.patrolT = 1.2 + this.game.rng() * 1.4; this.patrolDir = this.game.rng() < 0.5 ? -1 : 1; }
        if (Math.abs(this.x - this.homeX) > 90) this.patrolDir = Math.sign(this.homeX - this.x);
        this.vx = this.patrolDir * 55;
        this.rig.play('run', { speed: 0.7 });
      } else {
        this.vx = dist > 26 ? dir * this.speed : 0;
        if (dist < 150 && this.lungeCd <= 0 && this.onGround_) {
          this.state = 'lunge';
          this.vx = dir * 430;
          this.lungeCd = 2.2;
          this.rig.play('lunge', { restart: true });
          this.game.audio.play('pounce');
        } else {
          this.rig.play('run');
        }
      }
      if (rectsOverlap(this.hurtbox(), player.hurtbox())) {
        player.hurt(1, Math.sign(this.x - player.x) || 1, this.game);
      }
    }

    // ---- physics: save REAL previous position, then integrate ----
    this.px = this.x; this.py = this.y;
    this.vy += GRAV * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    world.collide(this);
    this.rig.update(dt);
  }

  ix(a) { const t = a || 0; return this.px + (this.x - this.px) * t; }
  iy(a) { const t = a || 0; return this.py + (this.y - this.py) * t; }

  draw(ctx, cam, a = 0) {
    const spr = this.game.sprites;
    if (spr && spr.ready && spr.has('jackal')) {
      spr.draw(ctx, 'jackal', this.rig.name, this.rig.progress, this.ix(a), this.iy(a), {
        facing: this.facing,
        alpha: this.dead ? Math.max(0, 1 - this.deadT) : 1,
        flash: Math.max(0, this.flashT || 0) / 0.12,
      });
      return;
    }
    const pose = this.rig.pose();
    const joints = JACKAL_RIG.compute(pose, { x: this.ix(a), y: this.iy(a) - 16, flip: this.facing, scale: 1 });
    paintJackal(ctx, joints, this.dead ? Math.max(0, 1 - this.deadT) : 1, { flash: Math.max(0, this.flashT || 0) / 0.12 });
  }
}

// ============================================================
// WHITEJACKAL — MINI-BOSS «شغالِ سپید» — Pack Alpha
// Patterns: triple-lunge chain, howl-summon, quick bite.
// Finisher: 2-prompt QTE at 25% HP.
// ============================================================
export class WhiteJackal {
  constructor(game, x, y, arena, name) {
    this.game = game;
    this.arena = arena;
    this.isMini = true;
    this.displayName = name || 'شغالِ سپید — The White Jackal';
    this.x = x; this.y = y;
    this.px = x; this.py = y;
    this.w = 56; this.h = 44;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 12; this.maxHp = 12;
    this.dead = false; this.deadT = 0;
    this.state = 'prowl';               // prowl|triple|howl|stagger|die
    this.stateT = 0;
    this.lungeLeft = 0; this.pauseT = 0;
    this.howlCd = 5;
    this.hurtFlash = 0;
    this.enraged = false;
    this.staggered = false;
    this.finisherPrompts = 2;
    this.finisherThreshold = 3;
    this.auraT = 0;
    this.rig = new Animator(JACKAL_CLIPS);
    this.active = false;
    this.hurt = this.hurt.bind(this);
  }
  hurtbox() { return { x: this.x - this.w / 2, y: this.y - this.h - 6, w: this.w, h: this.h + 6 }; }

  hurt(dmg, dir, game) {
    if (this.dead || !this.active) return false;
    if (this.staggered) {               // armored while the finisher window is open
      game.particles.burst(this.x, this.y - 30, 4, { speed: 60, life: 0.3, size: 2.4, color: '#d9d2c4', grav: 200 });
      return false;
    }
    this.hp -= dmg;
    this.hurtFlash = 0.16;
    this.vx += dir * 120;
    game.particles.sparkBurst(this.x - dir * 10, this.y - 28, dir);
    game.particles.burst(this.x, this.y - 24, 9, { speed: 130, life: 0.45, size: 3, color: ['#d9d2c4', '#a03028', '#5e4a30'], grav: 500 });
    game.audio.play('hit');
    game.hud.bossSync(this);
    if (this.hp <= this.finisherThreshold && !this.finisherUsed && !this.enraged) {
      this.enterStagger(game);
    } else if (this.hp <= 0) {
      this.die(game);
    }
    return true;
  }

  enterStagger(game) {
    if (game.qte.state !== 'idle') return;   // finisher busy — fight on, try next hit
    this.staggered = true;
    this.vx = 0;
    this.vy = 0;
    this.state = 'stagger';
    this.rig.play('stagger', { restart: true });
    // the pack abandons its fallen alpha — scatters in terror
    for (const e of game.enemies) {
      if (e !== this && e.flee) e.flee();
    }
    game.dialogue.forceClose();
    game.qte.offer(this);
    game.audio.play('howl');
  }

  recoverFromStagger() {
    if (this.dead) return;
    this.staggered = false;
    this.finisherUsed = true;           // one free pass — next stagger after more damage
    this.finisherThreshold = Math.max(1, this.hp - 4);
    this.state = 'prowl';
    this.stateT = 0;
    this.rig.play('run', { restart: true });
  }

  takeFinisherHit(game, perfect) {
    this.hurtFlash = 0.22;
    game.camera.shake(perfect ? 9 : 6, 0.3);
    game.particles.sparkBurst(this.x, this.y - 30, perfect ? game.player.facing : -game.player.facing);
    game.particles.burst(this.x, this.y - 30, perfect ? 16 : 10, {
      speed: 180, life: 0.5, size: 3.6, color: ['#d9d2c4', '#a03028', '#ffd700'], grav: 550,
    });
    game.audio.play('hit');
  }

  enrage() {
    if (this.dead) return;
    this.staggered = false;
    this.finisherUsed = true;
    this.enraged = true;
    this.hp = Math.min(this.maxHp, this.hp + 4);
    this.state = 'prowl';
    this.stateT = 0;
    this.game.hud.bossSync(this);
  }

  die(game) {
    this.dead = true;
    this.staggered = false;
    this.state = 'die';
    this.rig.play('die', { restart: true });
    game.audio.play('hit');
    game.onMiniBossDead(this);
  }

  enterState(s) {
    this.state = s;
    this.stateT = 0;
    this.rig.play(s === 'prowl' ? 'run' : s, { restart: true, speed: s === 'prowl' ? 1.25 : 1 });
    if (s === 'howl') this.game.audio.play('howl');
  }

  update(dt, world, player) {
    if (!this.active) return;
    this.stateT += dt;
    this.howlCd -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this._trampleT > 0) this._trampleT -= dt;

    if (this.dead) { this.rig.update(dt); this.deadT += dt; return; }

    // enrage aura embers
    if (this.enraged) {
      this.auraT -= dt;
      if (this.auraT <= 0) {
        this.auraT = 0.1;
        this.game.particles.spawn({
          x: this.x + (Math.random() * 2 - 1) * 26, y: this.y - Math.random() * 40,
          vx: (Math.random() * 2 - 1) * 20, vy: -60 - Math.random() * 50,
          life: 0.5, size: 3, color: Math.random() < 0.5 ? '#ff7a30' : '#e04430', glow: true,
        });
      }
    }

    if (this.state === 'stagger') {
      // settle to the ground even if staggered mid-air (no floating bosses)
      this.vy += GRAV * dt;
      this.y += this.vy * dt;
      if (this.y >= world.groundY) { this.y = world.groundY; this.vy = 0; }
      this.rig.update(dt);
      return;
    }

    const dir = Math.sign(player.x - this.x) || -1;
    const dist = Math.abs(player.x - this.x);
    this.facing = dir;
    const spd = this.enraged ? 1.4 : 1;

    switch (this.state) {
      case 'prowl': {
        const want = 180;
        this.vx = dist > want + 30 ? dir * 150 * spd : dist < want - 40 ? -dir * 120 * spd : 0;
        this.rig.play('run', { speed: 1.25 });
        if (dist < 340 && this.howlCd <= 0) this.enterState('howl');
        else if (dist < 110 && this.stateT > 0.4) {
          // → TRIPLE-LUNGE CHAIN. FIX: 'triple' is a STATE, not a clip — the
          // alpha jumps straight into its first real lunge (the 'lunge' clip
          // exists in JACKAL_CLIPS), then re-lunges from each lunge's finish.
          this.state = 'triple';
          this.stateT = 0;
          this.lungeLeft = this.enraged ? 3 : 2;   // lunges remaining AFTER this one
          this.pauseT = 0;
          this.vx = dir * 470 * spd;
          this.rig.play('lunge', { restart: true });
          this.game.audio.play('pounce');
        }
        break;
      }
      case 'triple': {
        // chained lunges with short skid pauses between — driven by the
        // 'lunge' clip finishing (never by a missing 'triple' clip).
        // pauseT is ONLY armed when lunges remain, so pause-end always fires.
        if (this.pauseT > 0) {
          this.pauseT -= dt;
          this.vx *= Math.pow(0.02, dt);           // skid to a stop between lunges
          if (this.pauseT <= 0) {
            this.vx = dir * 470 * spd;
            this.rig.play('lunge', { restart: true });
            this.game.audio.play('pounce');
          }
        } else if (this.rig.name === 'lunge' && this.rig.finished) {
          if (this.lungeLeft > 0) { this.lungeLeft--; this.pauseT = 0.26; }
          else { this.state = 'prowl'; this.stateT = 0; }
        }
        break;
      }
      case 'howl': {
        this.vx = 0;
        if (!this._howled && this.rig.progress > 0.4) {
          this._howled = true;
          // summon a minion from the dunes (cap 2 alive)
          const alive = this.game.enemies.filter(e => !e.dead && e.constructor === Jackal).length;
          if (alive < 2) {
            const sx = clamp(this.x + (player.x > this.x ? -320 : 320), this.arena.x1 + 40, this.arena.x2 - 40);
            const j = new Jackal(this.game, sx, this.y);
            this.game.enemies.push(j);
            this.game.particles.burst(sx, this.y - 20, 12, { speed: 100, life: 0.5, size: 3, color: ['#8a6d4a', '#c9b890'], grav: 400 });
          }
        }
        if (this.rig.finished) { this._howled = false; this.howlCd = this.enraged ? 7 : 10; this.state = 'prowl'; this.stateT = 0; }
        break;
      }
      case 'die': break;
    }

    // contact damage (never while staggered)
    if (this.state !== 'stagger' && rectsOverlap(this.hurtbox(), player.hurtbox())) {
      player.hurt(1, Math.sign(this.x - player.x) || 1, this.game);
    }

    // ---- physics: save REAL previous position, then integrate ----
    this.px = this.x; this.py = this.y;
    this.vy += GRAV * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, this.arena.x1 + 50, this.arena.x2 - 50);
    world.collide(this);
    this.rig.update(dt);
  }

  ix(a) { const t = a || 0; return this.px + (this.x - this.px) * t; }
  iy(a) { const t = a || 0; return this.py + (this.y - this.py) * t; }

  draw(ctx, cam, a = 0) {
    const spr = this.game.sprites;
    if (spr && spr.ready && spr.has('jackalA')) {
      const alpha = this.dead ? Math.max(0, 1 - this.deadT) : 1;
      const x = this.ix(a), y = this.iy(a);
      ctx.save();
      ctx.translate(x, y);          // scale about the feet
      ctx.scale(1.5, 1.5);
      ctx.translate(-x, -y);
      spr.draw(ctx, 'jackalA', this.rig.name, this.rig.progress, x, y, {
        facing: this.facing,
        alpha,
        flash: Math.max(0, this.hurtFlash || 0) / 0.16,
        tint: this.enraged ? 'red' : null,
      });
      ctx.restore();
      if (this.staggered && !this.dead) drawStars(ctx, this.ix(a), this.iy(a) - this.h - 18, this.game.states.play.world.time);
      return;
    }
    const pose = this.rig.pose();
    const joints = JACKAL_RIG.compute(pose, { x: this.ix(a), y: this.iy(a) - 22, flip: this.facing, scale: 1 });
    const alpha = this.dead ? Math.max(0, 1 - this.deadT) : 1;
    ctx.save();
    ctx.translate(this.ix(a), this.iy(a));          // scale about the feet
    ctx.scale(1.5, 1.5);
    ctx.translate(-this.ix(a), -this.iy(a));
    paintJackal(ctx, joints, alpha, { alpha: true, enraged: this.enraged, flash: Math.max(0, this.hurtFlash || 0) / 0.16 });
    ctx.restore();
    if (this.staggered && !this.dead) drawStars(ctx, this.ix(a), this.iy(a) - this.h - 18, this.game.states.play.world.time);
  }
}

// ============================================================
// LION — BOSS «شیرِ مازندران»
// Phases: prowl → crouch → pounce → swipe, roar at 50%.
// Finisher: 3-prompt QTE at ~27% HP. Enrage on failed QTE.
// v2: light hits snap his head (recoil overlay) without breaking armor feel.
// ============================================================
export class Lion {
  constructor(game, x, y, arena) {
    this.game = game;
    this.arena = arena;
    this.isMini = false;
    this.displayName = 'شیرِ خوانِ اوّل — The Lion of Trial I';
    this.x = x; this.y = y;             // y = feet
    this.px = x; this.py = y;
    this.w = 92; this.h = 64;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 30; this.maxHp = 30;
    this.dead = false; this.deadT = 0;
    this.state = 'prowl';
    this.stateT = 0;
    this.hurtFlash = 0;
    this.recoil = 0;                    // additive neck-flinch (overlay, no state break)
    this.enraged = false;
    this.staggered = false;
    this.finisherPrompts = 3;
    this.finisherThreshold = 8;
    this.auraT = 0;
    this.rig = new Animator(LION_CLIPS);
    this.active = false;                // activated by arena trigger
    this.hurt = this.hurt.bind(this);
  }

  hurtbox() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

  hurt(dmg, dir, game) {
    if (this.dead || !this.active) return false;
    if (this.staggered) {
      game.particles.burst(this.x, this.y - 40, 4, { speed: 60, life: 0.3, size: 2.4, color: '#d4a459', grav: 200 });
      return false;
    }
    if (this.state === 'pounce') return false; // airborne — armored
    this.hp -= dmg;
    this.hurtFlash = 0.18;
    this.recoil = Math.min(0.5, this.recoil + 0.16 + dmg * 0.05);
    game.particles.sparkBurst(this.x + dir * -24, this.y - 44, dir);
    game.particles.burst(this.x + dir * -20, this.y - 40, 12, { speed: 150, life: 0.5, size: 3.4, color: ['#b03030', '#d8734a', '#5e3a14'], grav: 500 });
    if (this.hp <= this.maxHp / 2 && !this.roaredOnce) {
      this.roaredOnce = true;
      this.enterState('roar');
      game.dialogue.play('lion_half');
    } else if (this.hp <= this.finisherThreshold && !this.finisherUsed && !this.enraged) {
      this.enterStagger(game);
      game.hud.bossSync(this);
      return true;
    } else if (this.hp > 0) {
      if (dmg >= 3 && this.state !== 'roar') { this.enterState('prowl'); this.stateT = -0.25; }
    }
    game.audio.play('hit');
    game.hud.bossSync(this);
    if (this.hp <= 0) {
      this.dead = true;
      this.enterState('die');
      game.onBossDead();
    }
    return true;
  }

  enterStagger(game) {
    if (game.qte.state !== 'idle') return;   // finisher busy — fight on, try next hit
    this.staggered = true;
    this.vx = 0;
    this.vy = 0;
    this.state = 'stagger';
    this.rig.play('stagger', { restart: true });
    game.dialogue.forceClose();
    game.qte.offer(this);
    game.audio.play('roar');
  }

  recoverFromStagger() {
    if (this.dead) return;
    this.staggered = false;
    this.finisherUsed = true;
    this.finisherThreshold = Math.max(2, this.hp - 8);
    this.state = 'prowl';
    this.stateT = 0;
    this.rig.play('prowl', { restart: true });
  }

  takeFinisherHit(game, perfect) {
    this.hurtFlash = 0.24;
    this.recoil = Math.min(0.6, this.recoil + (perfect ? 0.45 : 0.3));
    game.camera.shake(perfect ? 10 : 7, 0.32);
    game.particles.sparkBurst(this.x, this.y - 44, game.player.facing);
    game.particles.burst(this.x, this.y - 44, perfect ? 18 : 12, {
      speed: 190, life: 0.55, size: 4, color: ['#b03030', '#d8734a', '#ffd700'], grav: 550,
    });
    game.audio.play('hit');
  }

  enrage() {
    if (this.dead) return;
    this.staggered = false;
    this.finisherUsed = true;
    this.enraged = true;
    this.hp = Math.min(this.maxHp, this.hp + 8);
    this.state = 'prowl';
    this.stateT = 0;
    this.game.hud.bossSync(this);
  }

  enterState(s) {
    this.state = s;
    this.stateT = 0;
    const speeds = { prowl: this.enraged ? 1.25 : 1, crouch: 1, pounce: 1, swipe: this.enraged ? 1.2 : 1, roar: 1, die: 1 };
    this.rig.play(s, { restart: true, speed: speeds[s] || 1 });
    if (s === 'roar') this.game.audio.play('roar');
    if (s === 'pounce') this.game.audio.play('pounce');
  }

  update(dt, world, player) {
    if (!this.active) return;
    this.stateT += dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 1.6);
    if (this._trampleT > 0) this._trampleT -= dt;

    if (this.dead) {
      this.rig.update(dt);
      this.deadT += dt;
      return;
    }

    // enrage aura embers
    if (this.enraged) {
      this.auraT -= dt;
      if (this.auraT <= 0) {
        this.auraT = 0.09;
        this.game.particles.spawn({
          x: this.x + (Math.random() * 2 - 1) * 44, y: this.y - Math.random() * 60,
          vx: (Math.random() * 2 - 1) * 24, vy: -70 - Math.random() * 60,
          life: 0.55, size: 3.4, color: Math.random() < 0.5 ? '#ff7a30' : '#e04430', glow: true,
        });
      }
    }

    if (this.state === 'stagger') {
      // settle to the ground even if staggered mid-air (no floating bosses)
      this.vy += GRAV * dt;
      this.y += this.vy * dt;
      if (this.y >= world.groundY) { this.y = world.groundY; this.vy = 0; }
      this.rig.update(dt);
      return;
    }

    const dir = Math.sign(player.x - this.x) || -1;
    const dist = Math.abs(player.x - this.x);
    this.facing = dir;
    const spd = this.enraged ? 1.45 : 1;

    switch (this.state) {
      case 'prowl': {
        // circle the player at mid distance
        const want = 170;
        this.vx = dist > want + 30 ? dir * 130 * spd : dist < want - 40 ? -dir * 110 * spd : 0;
        this.rig.play('prowl');
        if (dist < 92 && this.stateT > (this.enraged ? 0.3 : 0.5)) this.enterState('swipe');
        else if (this.stateT > (this.enraged ? 1.0 : 1.6) + this.game.rng() * 0.7 && this.onGround_) this.enterState('crouch');
        break;
      }
      case 'crouch': {
        this.vx = 0;
        if (this.rig.finished) this.enterState('pounce');
        break;
      }
      case 'pounce': {
        // leap executed at animation start
        if (this.stateT < 0.02) {
          this.vy = -720;
          this.vx = dir * 560 * spd;
        }
        if (this.onGround_ && this.stateT > 0.25) this.enterState('prowl');
        // mid-air contact damage
        if (rectsOverlap(this.hurtbox(), player.hurtbox())) {
          player.hurt(2, Math.sign(this.x - player.x) || 1, this.game);
        }
        break;
      }
      case 'swipe': {
        this.vx = 0;
        const fireAt = 0.58;
        if (!this._swiped && this.rig.progress >= fireAt) {
          this._swiped = true;
          const box = { x: this.x + (this.facing === 1 ? 10 : -95), y: this.y - 70, w: 85, h: 70 };
          if (rectsOverlap(box, player.hurtbox())) player.hurt(2, -this.facing, this.game);
          this.game.audio.play('swing');
        }
        if (this.rig.finished) { this._swiped = false; this.enterState('prowl'); }
        break;
      }
      case 'roar': {
        this.vx = 0;
        // shockwave that pushes the player back once, mid-roar
        if (!this._roared && this.rig.progress > 0.35) {
          this._roared = true;
          this.game.camera.shake(9, 0.5);
          const d2 = Math.abs(player.x - this.x);
          if (d2 < 300 && player.onGround) {
            player.vx = Math.sign(player.x - this.x || 1) * 380;
            player.vy = -300;
            player.hurt(1, Math.sign(this.x - player.x) || 1, this.game);
          }
        }
        if (this.rig.finished) { this._roared = false; this.enterState('prowl'); }
        break;
      }
      case 'die': break;
    }

    // physics: save REAL previous position, then integrate
    this.px = this.x; this.py = this.y;
    this.vy += GRAV * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // stay in arena
    this.x = clamp(this.x, this.arena.x1 + 60, this.arena.x2 - 60);
    world.collide(this);
    // contact damage while walking (never while staggered)
    if (this.state !== 'pounce' && this.state !== 'stagger' && rectsOverlap(this.hurtbox(), player.hurtbox())) {
      player.hurt(1, Math.sign(this.x - player.x) || 1, this.game);
    }
    this.rig.update(dt);
  }

  ix(a) { const t = a || 0; return this.px + (this.x - this.px) * t; }
  iy(a) { const t = a || 0; return this.py + (this.y - this.py) * t; }

  draw(ctx, cam, a = 0) {
    const spr = this.game.sprites;
    if (spr && spr.ready && spr.has('lion')) {
      spr.draw(ctx, 'lion', this.rig.name, this.rig.progress, this.ix(a), this.iy(a), {
        facing: this.facing,
        alpha: this.dead ? Math.max(0, 1 - this.deadT * 0.35) : 1,
        flash: Math.max(0, this.hurtFlash || 0) / 0.18,
        tint: this.enraged ? 'red' : null,
      });
      if (this.staggered && !this.dead) drawStars(ctx, this.ix(a), this.iy(a) - this.h - 10, this.game.states.play.world.time);
      return;
    }
    const pose = this.rig.pose();
    // recoil overlay — head/neck snap toward the incoming blow
    if (this.recoil > 0) {
      pose.neck = (pose.neck || 0) + this.recoil * 0.55;
      pose.head = (pose.head || 0) + this.recoil * 0.3;
      pose.jaw = (pose.jaw || 0) + this.recoil * 0.25;
    }
    const joints = LION_RIG.compute(pose, { x: this.ix(a), y: this.iy(a) - 34, flip: this.facing, scale: 1 });
    paintLion(ctx, joints, this.dead ? Math.max(0, 1 - this.deadT * 0.35) : 1,
      Math.max(0, this.hurtFlash || 0) / 0.18, this.enraged);
    if (this.staggered && !this.dead) drawStars(ctx, this.ix(a), this.iy(a) - this.h - 10, this.game.states.play.world.time);
  }
}
