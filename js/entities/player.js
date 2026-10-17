// player.js — Rostam: movement, 3-hit mace combo, bow, Rakhsh mount, health
import { clamp, rectsOverlap } from '../core/utils.js';
import { Rig, Animator } from '../gfx/rig.js';
import { ROSTAM_RIG, ROSTAM_CLIPS, ROSTAM_HIP_H } from '../content/rigs.js';
import { paintRostam } from '../gfx/paint.js';

const MOVE = 330, JUMP_V = -830, GRAV = 2500;
const ATTACK_RANGE = 78, ATTACK_BOX = { w: 84, h: 60 };

export class Player {
  constructor(game) {
    this.game = game;
    this.w = 34; this.h = 62;          // collision box (feet origin at y+h)
    this.reset(100, 500);
    this.rig = new Animator(ROSTAM_CLIPS);
    this.maxHp = 5; this.hp = 5;
    this.maxArrows = 12; this.arrows = 8;
    this.rakhshCd = 0; this.rakhshCdMax = 14;
    this.comboStats = { hits: 0 };
  }

  reset(x, y) {
    this.x = x; this.y = y;            // y = feet position
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.state = 'idle';               // idle|run|jump|fall|attack|bow|hurt|dead|mount
    this.attackPhase = null;           // {name, hitDone}
    this.bowCharge = 0;
    this.invuln = 0;
    this.mounted = false; this.mountTimer = 0;
    this.comboWindow = 0; this.comboNext = 0;
  }

  hurtbox() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

  hurt(dmg, fromDir, game) {
    if (this.invuln > 0 || this.state === 'dead') return;
    this.hp -= dmg;
    this.invuln = 1.1;
    this.vx = -fromDir * 260;
    this.vy = -260;
    this.state = 'hurt';
    this.attackPhase = null;
    this.rig.play('hurt', { restart: true });
    game.audio.play('hurt');
    game.camera.shake(7, 0.3);
    game.particles.burst(this.x, this.y - 36, 10, { speed: 130, life: 0.45, size: 3.2, color: ['#b03030', '#7a1f1f'], grav: 500 });
    game.hud.sync(this);
    if (this.hp <= 0) {
      this.state = 'dead';
      game.onPlayerDead();
    }
  }

  heal(n, game) {
    this.hp = clamp(this.hp + n, 0, this.maxHp);
    game.hud.sync(this);
  }

  // ---------- attack helpers ----------
  startAttack(name) {
    this.state = 'attack';
    this.attackPhase = { name, hitDone: false };
    this.rig.play(name, { restart: true, onFinish: () => {
      if (this.state === 'attack' && this.attackPhase && this.attackPhase.name === name) {
        this.state = 'idle';
        this.attackPhase = null;
      }
    }});
    this.game.audio.play('swing');
  }

  attackHitFrame() {
    if (!this.attackPhase || this.attackPhase.hitDone) return false;
    const a = this.rig;
    const fireAt = { attack1: 0.45, attack2: 0.5, attack3: 0.55 };
    const at = fireAt[this.attackPhase.name] || 0.5;
    if (a.current && a.name === this.attackPhase.name && a.progress >= at) {
      this.attackPhase.hitDone = true;
      return true;
    }
    return false;
  }

  doMeleeHit(enemies) {
    const box = {
      x: this.facing === 1 ? this.x + 8 : this.x - 8 - ATTACK_BOX.w,
      y: this.y - 52, w: ATTACK_BOX.w, h: ATTACK_BOX.h,
    };
    let hitAny = false;
    for (const e of enemies) {
      if (e.dead) continue;
      if (rectsOverlap(box, e.hurtbox())) {
        const dmg = this.attackPhase.name === 'attack3' ? 4 : 2;
        e.hurt(dmg, this.facing, this.game);
        hitAny = true;
      }
    }
    if (hitAny) {
      this.comboStats.hits++;
      this.game.audio.play('hit');
      this.game.camera.shake(4, 0.14);
      this.game.hitstop = 0.055;   // juicy freeze frame
    }
  }

  // ---------- per-frame ----------
  update(dt, world, input) {
    if (this.invuln > 0) this.invuln -= dt;
    if (this.rakhshCd > 0) this.rakhshCd = Math.max(0, this.rakhshCd - dt);
    if (this.comboWindow > 0) this.comboWindow -= dt;

    const g = this.game;
    const dead = this.state === 'dead';

    // gravity + horizontal control
    if (!dead) {
      if (this.state === 'hurt') {
        // no control during hurt
      } else if (this.state === 'attack') {
        this.vx *= 0.82;   // slide while swinging
        // chain combo
        if (this.attackPhase && this.rig.progress > 0.62 && input.justPressed('attack') && this.attackPhase.name !== 'attack3') {
          const next = { attack1: 'attack2', attack2: 'attack3' }[this.attackPhase.name];
          if (next) this.startAttack(next);
        }
      } else if (this.mounted) {
        this.mountTimer -= dt;
        const boost = 1.85;
        this.vx = 0;
        if (input.down('left')) { this.vx = -MOVE * boost; this.facing = -1; }
        if (input.down('right')) { this.vx = MOVE * boost; this.facing = 1; }
        if (input.justPressed('jump') && this.onGround) {
          this.vy = JUMP_V * 0.95; this.onGround = false; g.audio.play('jump');
        }
        if (this.mountTimer <= 0) this.dismount();
      } else {
        this.vx = 0;
        if (input.down('left')) { this.vx = -MOVE; this.facing = -1; }
        if (input.down('right')) { this.vx = MOVE; this.facing = 1; }
        if (input.justPressed('jump') && this.onGround) {
          this.vy = JUMP_V; this.onGround = false; g.audio.play('jump');
        }
        // actions
        if (this.state !== 'bow') {
          if (input.justPressed('attack')) {
            this.startAttack('attack1');
          } else if (input.down('bow') && this.arrows > 0) {
            this.state = 'bow';
            this.bowCharge = 0;
            this.rig.play('bowDraw', { restart: true });
          }
        } else {
          this.bowCharge += dt;
          this.vx *= 0.8;
          if (this.rig.name === 'bowDraw' && this.rig.finished) this.rig.play('bowHold');
          const charged = this.bowCharge > 0.25;
          const released = !input.down('bow');
          if ((charged && released) || this.bowCharge > 1.4) {
            if (this.arrows > 0) {
              this.arrows--;
              const dir = this.facing;
              g.arrows.shoot(this.x + dir * 30, this.y - 44, dir, 780, g);
            }
            this.bowCharge = 0;
            this.rig.play('bowShot', { restart: true, onFinish: () => { if (this.state === 'bow') { this.state = 'idle'; } } });
            g.hud.sync(this);
          }
        }
        // Rakhsh mount
        if (input.justPressed('mount') && this.rakhshCd <= 0 && !this.mounted && this.onGround) {
          g.callRakhsh();
        }
      }
    }

    // physics
    this.vy += GRAV * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, world.camMinX() + 20, world.camMaxX() - 20);
    world.collide(this);

    // attack hit detection at fire frame
    if (this.state === 'attack' && this.attackHitFrame()) this.doMeleeHit(g.enemies);

    // animation state selection
    if (!dead && this.state !== 'attack' && this.state !== 'bow' && this.state !== 'hurt') {
      if (!this.onGround) {
        if (this.rig.name !== 'jump' && this.rig.name !== 'fall') this.rig.play(this.vy < 0 ? 'jump' : 'fall');
        else if (this.vy > 60 && this.rig.name === 'jump' && this.rig.finished) this.rig.play('fall');
      } else if (Math.abs(this.vx) > 20) {
        if (this.rig.name !== 'run' || (this.mounted && this.rig.name !== 'run')) this.rig.play('run', { speed: this.mounted ? 1.5 : 1.35 });
      } else {
        this.rig.play('idle');
      }
    }
    if (dead) this.rig.play('hurt');
    this.rig.update(dt);
  }

  mount() {
    this.mounted = true;
    this.mountTimer = 6;
    this.state = 'idle';
    this.rig.play('mount', { restart: true });
  }
  dismount() {
    this.mounted = false;
    this.rakhshCd = this.rakhshCdMax;
    this.game.hud.sync(this);
  }

  draw(ctx, cam) {
    const hipX = this.x;
    const hipY = this.y - ROSTAM_HIP_H + (this.mounted ? -26 : 0);
    const pose = this.rig.pose();
    const joints = ROSTAM_RIG.compute(pose, { x: hipX, y: hipY, flip: this.facing, scale: 1 });
    // invulnerability blink
    const alpha = this.invuln > 0 ? (Math.floor(this.invuln * 14) % 2 === 0 ? 0.35 : 1) : 1;
    paintRostam(ctx, joints, alpha);
  }
}
