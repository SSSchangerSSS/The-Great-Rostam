// enemies.js — Lion (Trial I boss) & Jackal (ambient mob)
import { clamp, rectsOverlap } from '../core/utils.js';
import { Animator } from '../gfx/rig.js';
import { LION_RIG, LION_CLIPS, JACKAL_RIG, JACKAL_CLIPS } from '../content/rigs.js';
import { paintLion, paintJackal } from '../gfx/paint.js';

const GRAV = 2500;

// ============================================================
// JACKAL — chases and lunges
// ============================================================
export class Jackal {
  constructor(game, x, y) {
    this.game = game;
    this.x = x; this.y = y;             // y = feet
    this.w = 40; this.h = 30;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 2; this.maxHp = 2;
    this.dead = false; this.deadT = 0;
    this.speed = 150;
    this.lungeCd = 0;
    this.state = 'run';
    this.rig = new Animator(JACKAL_CLIPS);
  }
  hurtbox() { return { x: this.x - this.w / 2, y: this.y - this.h - 6, w: this.w, h: this.h + 6 }; }

  hurt(dmg, dir, game) {
    if (this.dead) return;
    this.hp -= dmg;
    this.vx = dir * 320;
    game.particles.burst(this.x, this.y - 16, 8, { speed: 110, life: 0.4, size: 3, color: ['#8a6d4a', '#5e4a30'], grav: 500 });
    if (this.hp <= 0) {
      this.dead = true;
      this.state = 'die';
      this.rig.play('die', { restart: true });
      game.audio.play('hit');
    }
  }

  update(dt, world, player) {
    if (this.dead) {
      this.deadT += dt;
      this.rig.update(dt);
      return;
    }
    this.lungeCd -= dt;
    const dir = Math.sign(player.x - this.x) || -1;
    const dist = Math.abs(player.x - this.x);

    if (this.state === 'lunge') {
      if (this.rig.finished) { this.state = 'run'; }
      // contact damage
      if (rectsOverlap(this.hurtbox(), player.hurtbox())) {
        player.hurt(1, Math.sign(this.x - player.x) || 1, this.game);
      }
    } else {
      this.facing = dir;
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
      if (rectsOverlap(this.hurtbox(), player.hurtbox())) {
        player.hurt(1, Math.sign(this.x - player.x) || 1, this.game);
      }
    }

    this.vy += GRAV * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    world.collide(this);
    this.rig.update(dt);
  }

  draw(ctx, cam) {
    const pose = this.rig.pose();
    const joints = JACKAL_RIG.compute(pose, { x: this.x, y: this.y - 16, flip: this.facing, scale: 1 });
    paintJackal(ctx, joints, this.dead ? Math.max(0, 1 - this.deadT) : 1);
  }
}

// ============================================================
// LION — boss with phases: prowl → crouch → pounce → swipe, roar at 50%
// ============================================================
export class Lion {
  constructor(game, x, y, arena) {
    this.game = game;
    this.arena = arena;
    this.x = x; this.y = y;             // y = feet
    this.w = 92; this.h = 64;
    this.vx = 0; this.vy = 0;
    this.facing = -1;
    this.hp = 30; this.maxHp = 30;
    this.dead = false; this.deadT = 0;
    this.state = 'prowl';               // prowl|crouch|pounce|swipe|roar|hurt|die
    this.stateT = 0;
    this.hurtFlash = 0;
    this.rig = new Animator(LION_CLIPS);
    this.active = false;                // activated by arena trigger
    this.hurt = this.hurt.bind(this);
  }

  hurtbox() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

  hurt(dmg, dir, game) {
    if (this.dead || !this.active) return;
    if (this.state === 'pounce') return; // airborne — armored
    this.hp -= dmg;
    this.hurtFlash = 0.18;
    game.particles.burst(this.x + dir * -20, this.y - 40, 12, { speed: 150, life: 0.5, size: 3.4, color: ['#b03030', '#d8734a', '#5e3a14'], grav: 500 });
    if (this.hp <= this.maxHp / 2 && !this.roaredOnce) {
      this.roaredOnce = true;
      this.enterState('roar');
      game.dialogue.play('lion_half');
    } else if (this.hp > 0) {
      // brief stagger on heavy hits
      if (dmg >= 3 && this.state !== 'roar') { this.enterState('prowl'); this.stateT = -0.25; }
    }
    game.audio.play('hit');
    game.hud.bossSync(this);
    if (this.hp <= 0) {
      this.dead = true;
      this.enterState('die');
      game.onBossDead();
    }
  }

  enterState(s) {
    this.state = s;
    this.stateT = 0;
    const speeds = { prowl: 1, crouch: 1, pounce: 1, swipe: 1, roar: 1, die: 1 };
    this.rig.play(s === 'hurt' ? 'hurt' : s, { restart: true, speed: speeds[s] || 1 });
    if (s === 'roar') this.game.audio.play('roar');
    if (s === 'pounce') this.game.audio.play('pounce');
  }

  update(dt, world, player) {
    if (!this.active) return;
    this.stateT += dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    if (this.dead) {
      this.rig.update(dt);
      this.deadT += dt;
      return;
    }

    const dir = Math.sign(player.x - this.x) || -1;
    const dist = Math.abs(player.x - this.x);
    this.facing = dir;

    switch (this.state) {
      case 'prowl': {
        // circle the player at mid distance
        const want = 170;
        this.vx = dist > want + 30 ? dir * 130 : dist < want - 40 ? -dir * 110 : 0;
        this.rig.play('prowl');
        if (dist < 92 && this.stateT > 0.5) this.enterState('swipe');
        else if (this.stateT > 1.6 + Math.random() * 0.7 && this.onGround_) this.enterState('crouch');
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
          this.vx = dir * 560;
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
        const fireAt = 0.45;
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

    // physics
    this.vy += GRAV * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // stay in arena
    this.x = clamp(this.x, this.arena.x1 + 60, this.arena.x2 - 60);
    world.collide(this);
    // contact damage while walking
    if (this.state !== 'pounce' && rectsOverlap(this.hurtbox(), player.hurtbox())) {
      player.hurt(1, Math.sign(this.x - player.x) || 1, this.game);
    }
    this.rig.update(dt);
  }

  draw(ctx, cam) {
    const pose = this.rig.pose();
    const joints = LION_RIG.compute(pose, { x: this.x, y: this.y - 34, flip: this.facing, scale: 1 });
    paintLion(ctx, joints, this.dead ? Math.max(0, 1 - this.deadT * 0.35) : 1, this.hurtFlash > 0 ? 1 : 0);
  }
}
