// player.js — Rostam: movement, 3-hit mace combo (Shank-style lunges), bow,
// dodge roll with i-frames, air attack, Rakhsh mount, health.
//
// FIXED: the "ice-skate" bug — hurt/dead states now own a timer AND apply
// friction every frame, so knockback velocity bleeds off instead of sliding
// the hero across the map forever.
import { clamp, rectsOverlap } from '../core/utils.js';
import { Rig, Animator } from '../gfx/rig.js';
import { ROSTAM_RIG, ROSTAM_CLIPS, ROSTAM_HIP_H } from '../content/rigs.js';
import { paintRostam } from '../gfx/paint.js';

const MOVE = 330, JUMP_V = -830, GRAV = 2500;
const ATTACK_BOX = { w: 88, h: 62 };
const FIRE_AT = { attack1: 0.52, attack2: 0.5, attack3: 0.46, airAttack: 0.4 };
const LUNGE = { attack1: 210, attack2: 190, attack3: 260, airAttack: 0 };
const ROLL_V = 470, ROLL_TIME = 0.34, ROLL_CD = 0.5;

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
    this.trail = [];                   // mace swing trail points {x,y,t}
    this.ghosts = [];                  // afterimages {pose,x,y,facing,a,rot}
    this.sq = 0; this.sqV = 0;         // squash & stretch spring
  }

  reset(x, y) {
    this.x = x; this.y = y;            // y = feet position
    this.yOff = 0;                     // cinematic vertical offset (finisher leap)
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.state = 'idle';               // idle|run|jump|fall|land|attack|airAttack|bow|roll|hurt|dead|mount|qte|cine
    this.attackPhase = null;           // {name, hitDone}
    this.bowCharge = 0;
    this.invuln = 0;
    this.flashT = 0;                   // white hit-flash
    this.hurtT = 0;                    // ← the anti-skate timer
    this.rollT = 0; this.rollCd = 0; this.rollDir = 1; this._rollGhostT = 0;
    this.landT = 0;
    this.coyote = 0; this.jumpBuf = 0;
    this.mounted = false; this.mountTimer = 0;
    this.comboWindow = 0; this.comboNext = 0;
    this.deathDir = 1; this.deadT = 0;
  }

  hurtbox() { return { x: this.x - this.w / 2, y: this.y - this.h, w: this.w, h: this.h }; }

  hurt(dmg, fromDir, game) {
    if (this.invuln > 0 || this.state === 'dead' || this.state === 'qte' || this.state === 'cine' || this.state === 'roll') return;
    this.hp -= dmg;
    this.invuln = 1.05;
    this.flashT = 0.13;
    this.chain = 0;                          // pain breaks the chain
    this.hurtT = 0.42;                       // state auto-expires now
    this.vx = -fromDir * 300;
    this.vy = this.onGround ? -150 : -240;
    this.state = 'hurt';
    this.attackPhase = null;
    this.mounted = false;
    this.rig.play('hurt', { restart: true });
    game.audio.play('hurt');
    game.camera.shake(7, 0.3);
    game.hurtVignette();
    game.particles.burst(this.x, this.y - 36, 10, { speed: 130, life: 0.45, size: 3.2, color: ['#b03030', '#7a1f1f'], grav: 500 });
    game.hud.sync(this);
    if (this.hp <= 0) {
      this.state = 'dead';
      this.deadT = 0;
      this.deathDir = Math.sign(this.vx) || -this.facing;
      this.rig.play('dead', { restart: true });
      game.onPlayerDead();
    }
  }

  heal(n, game) {
    this.hp = clamp(this.hp + n, 0, this.maxHp);
    game.hud.sync(this);
  }

  // ---------- actions ----------
  startAttack(name) {
    this.state = name === 'airAttack' ? 'airAttack' : 'attack';
    this.attackPhase = { name, hitDone: false };
    this.rig.play(name, { restart: true, onFinish: () => {
      if (this.attackPhase && this.attackPhase.name === name) {
        this.state = this.onGround ? 'idle' : 'fall';
        this.attackPhase = null;
      }
    }});
    this.game.audio.play('swing');
  }

  startRoll(dir) {
    if (this.rollCd > 0 || this.mounted) return;
    this.state = 'roll';
    this.rollT = 0;
    this.rollDir = dir || this.facing;
    this.facing = this.rollDir;
    this.vx = this.rollDir * ROLL_V;
    this.invuln = Math.max(this.invuln, ROLL_TIME + 0.04);   // i-frames through the tumble
    this.rollCd = ROLL_CD;
    this.attackPhase = null;
    this.rig.play('roll', { restart: true, onFinish: () => { if (this.state === 'roll') this.state = 'idle'; } });
    this.game.audio.play('pounce');
    this.game.particles.burst(this.x, this.y - 4, 6, { speed: 90, life: 0.35, size: 3, color: ['#c9b890', '#8a6d4a'], grav: -60 });
  }

  attackHitFrame() {
    if (!this.attackPhase || this.attackPhase.hitDone) return false;
    const a = this.rig;
    const at = FIRE_AT[this.attackPhase.name] || 0.5;
    if (a.current && a.name === this.attackPhase.name && a.progress >= at) {
      this.attackPhase.hitDone = true;
      return true;
    }
    return false;
  }

  doMeleeHit(enemies) {
    const name = this.attackPhase.name;
    const box = {
      x: this.facing === 1 ? this.x + 8 : this.x - 8 - ATTACK_BOX.w,
      y: this.y - (name === 'airAttack' ? 58 : 52), w: ATTACK_BOX.w, h: ATTACK_BOX.h,
    };
    let hitAny = false;
    for (const e of enemies) {
      if (e.dead) continue;
      if (rectsOverlap(box, e.hurtbox())) {
        const dmg = name === 'attack3' ? 4 : 2;
        if (e.hurt(dmg, this.facing, this.game) !== false) {
          hitAny = true;
          // Shank-style impact sparks at the contact point
          const hb = e.hurtbox();
          this.game.particles.sparkBurst(hb.x + hb.w / 2 - this.facing * 8, hb.y + hb.h * 0.35, this.facing);
        }
      }
    }
    if (hitAny) {
      this.comboStats.hits++;
      this.chain = (this.chain || 0) + 1;
      this.chainT = 1.7;
      this.game.hud.combo(this.chain);
      this.game.audio.play('hit');
      this.game.camera.shake(name === 'attack3' ? 6.5 : 3.8, name === 'attack3' ? 0.22 : 0.13);
      this.game.hitstop = name === 'attack3' ? 0.085 : 0.05;
      if (name === 'attack3' && this.onGround) {
        this.game.particles.dust(this.x + this.facing * 44, this.y, 10, 1.2);  // slam dust
      }
    }
    return hitAny;
  }

  pushGhost(alpha = 0.35) {
    if (this.ghosts.length > 8) this.ghosts.shift();
    this.ghosts.push({
      pose: { ...this.rig.pose() },
      clip: this.rig.name, frame: this.rig.progress,   // for baked-frame ghosts (2.5D)
      x: this.x, y: this.y, yOff: this.yOff || 0,
      facing: this.facing, a: alpha,
      rot: this.state === 'roll' ? this._rollRot() : 0,
    });
  }
  _rollRot() {
    return this.rollDir * (this.rig.name === 'roll' ? this.rig.progress : 0) * Math.PI * 2;
  }

  // ---------- per-frame ----------
  update(dt, world, input) {
    // frozen during finisher QTE & cinematic — rigs are driven by the play state
    if (this.state === 'qte' || this.state === 'cine') return;
    const g = this.game;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (this.rakhshCd > 0) this.rakhshCd = Math.max(0, this.rakhshCd - dt);
    if (this.rollCd > 0) this.rollCd -= dt;
    if (this.jumpBuf > 0) this.jumpBuf -= dt;
    if (this.chainT > 0) { this.chainT -= dt; if (this.chainT <= 0) this.chain = 0; }
    this.coyote = this.onGround ? 0.09 : Math.max(0, this.coyote - dt);

    // squash & stretch spring (Flash bounce)
    this.sqV += (-this.sq * 210 - this.sqV * 13) * dt;
    this.sq += this.sqV * dt;

    // mace trail decay
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].t -= dt * 3.4;
      if (this.trail[i].t <= 0) this.trail.splice(i, 1);
    }
    // ghost decay
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      this.ghosts[i].a -= dt * 2.4;
      if (this.ghosts[i].a <= 0) this.ghosts.splice(i, 1);
    }

    const dead = this.state === 'dead';

    if (!dead) {
      if (this.state === 'hurt') {
        // ★ THE SKATE FIX: friction bleeds knockback; timer ends the state
        this.hurtT -= dt;
        this.vx *= this.onGround ? Math.pow(1e-9, dt) : Math.pow(0.3, dt);
        if (this.hurtT <= 0) { this.state = this.onGround ? 'idle' : 'fall'; }
      } else if (this.state === 'dead') {
        // (handled below)
      } else if (this.state === 'roll') {
        this.rollT += dt;
        this._rollGhostT -= dt;
        if (this._rollGhostT <= 0) { this._rollGhostT = 0.045; this.pushGhost(0.4); }
        const k = 1 - clamp(this.rollT / ROLL_TIME, 0, 1);
        this.vx = this.rollDir * ROLL_V * (0.55 + 0.45 * k);
        if (input.justPressed('jump') && (this.onGround || this.coyote > 0)) {
          this.jumpBuf = 0.12;
        }
        if (this.jumpBuf > 0 && (this.onGround || this.coyote > 0) && this.rig.progress > 0.55) {
          this.jumpBuf = 0; this.doJump();
        }
      } else if (this.state === 'attack' || this.state === 'airAttack') {
        const name = this.attackPhase ? this.attackPhase.name : '';
        const fire = FIRE_AT[name] || 0.5;
        if (this.state === 'attack') {
          this.vx *= Math.pow(0.02, dt);
          // strike lunge: step INTO the swing the Shank way
          if (this.attackPhase && this.attackPhase.hitDone && !this.attackPhase.lunged) {
            this.attackPhase.lunged = true;
            this.vx = this.facing * (LUNGE[name] || 180);
          }
        } else {
          this.vx *= Math.pow(0.5, dt);
        }
        // chain into next combo hit (window opens right after the strike)
        if (this.state === 'attack' && this.attackPhase && input.justPressed('attack')
            && this.rig.progress > fire - 0.04 && name !== 'attack3') {
          const next = { attack1: 'attack2', attack2: 'attack3' }[name];
          if (next) this.startAttack(next);
        }
        // roll-cancel after the strike lands
        if (this.attackPhase && this.attackPhase.hitDone && input.justPressed('roll') && this.onGround) {
          const dir = input.down('left') ? -1 : input.down('right') ? 1 : this.facing;
          this.startRoll(dir);
        } else if (input.justPressed('roll') && this.onGround && this.state !== 'attack') {
          this.startRoll(input.down('left') ? -1 : input.down('right') ? 1 : this.facing);
        }
      } else if (this.state === 'bow') {
        this.bowCharge += dt;
        this.vx *= Math.pow(0.01, dt);
        if (input.justPressed('roll') && this.onGround) {
          this.state = 'idle'; this.bowCharge = 0;
          this.startRoll(input.down('left') ? -1 : input.down('right') ? 1 : this.facing);
        } else if (this.rig.name === 'bowDraw' && this.rig.finished) {
          this.rig.play('bowHold');
        } else if (this.rig.name !== 'bowDraw' && this.rig.name !== 'bowHold' && this.rig.name !== 'bowShot') {
          this.rig.play('bowDraw', { restart: true });
        }
        if (this.rig.name !== 'bowShot') {
          const charged = this.bowCharge > 0.25;
          const released = !input.down('bow');
          if ((charged && released) || this.bowCharge > 1.4) {
            if (this.arrows > 0) {
              this.arrows--;
              g.arrows.shoot(this.x + this.facing * 30, this.y - 44, this.facing, 780, g);
              g.particles.burst(this.x + this.facing * 30, this.y - 44, 4, { speed: 60, life: 0.25, size: 2.2, color: '#e8dcc8', grav: 0 });
            }
            this.bowCharge = 0;
            this.rig.play('bowShot', { restart: true, onFinish: () => { if (this.state === 'bow') { this.state = 'idle'; } } });
            g.hud.sync(this);
          }
        }
      } else if (this.state === 'land') {
        this.landT -= dt;
        this.vx *= Math.pow(0.001, dt);
        if (this.landT <= 0) this.state = 'idle';
        // actionable recovery — any input cancels the land pose
        if (input.justPressed('attack')) this.startAttack('attack1');
        else if (input.justPressed('roll')) this.startRoll(input.down('left') ? -1 : input.down('right') ? 1 : this.facing);
        else if (input.justPressed('jump')) this.doJump();
        else if (input.down('left') || input.down('right')) this.state = 'idle';
      } else if (this.mounted) {
        this.mountTimer -= dt;
        const boost = 1.85;
        this.vx = 0;
        if (input.down('left')) { this.vx = -MOVE * boost; this.facing = -1; }
        if (input.down('right')) { this.vx = MOVE * boost; this.facing = 1; }
        if (input.justPressed('jump') && this.onGround) {
          this.vy = JUMP_V * 0.95; this.onGround = false; this.coyote = 0; g.audio.play('jump');
        }
        if (this.mountTimer <= 0) this.dismount();
      } else { // idle / run / jump / fall — full control
        this.vx = 0;
        if (input.down('left')) { this.vx = -MOVE; this.facing = -1; }
        if (input.down('right')) { this.vx = MOVE; this.facing = 1; }
        if (input.justPressed('jump')) this.jumpBuf = 0.12;
        if (this.jumpBuf > 0 && (this.onGround || this.coyote > 0)) { this.jumpBuf = 0; this.doJump(); }
        // actions
        if (this.state !== 'bow') {
          if (input.justPressed('attack')) {
            this.startAttack(this.onGround ? 'attack1' : 'airAttack');
          } else if (input.down('bow') && this.arrows > 0 && this.onGround) {
            this.state = 'bow';
            this.bowCharge = 0;
            this.rig.play('bowDraw', { restart: true });
          } else if (input.justPressed('roll') && this.onGround) {
            this.startRoll(input.down('left') ? -1 : input.down('right') ? 1 : this.facing);
          }
        }
        // Rakhsh mount
        if (input.justPressed('mount') && this.rakhshCd <= 0 && !this.mounted && this.onGround) {
          g.callRakhsh();
        }
      }
    }

    // variable jump height: release early → softer arc (great for touch taps)
    if (!dead && this.vy < -300 && !input.down('jump')) this.vy += GRAV * 1.7 * dt;

    // physics
    const prevOnGround = this.onGround;
    const impactVy = this.vy;
    this.vy += GRAV * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.x = clamp(this.x, world.camMinX() + 20, world.camMaxX() - 20);
    world.collide(this);

    // dead: bleed velocity too (corpse must NOT skate either)
    if (dead) {
      this.vx *= Math.pow(1e-8, dt);
      this.deadT += dt;
      this.rig.update(dt);
      return;
    }

    // landing event: dust + squash + land pose
    if (!prevOnGround && this.onGround && impactVy > 430 && this.state !== 'roll' && this.state !== 'hurt') {
      const power = clamp((impactVy - 430) / 700, 0.35, 1);
      g.particles.dust(this.x, this.y, Math.round(5 + power * 8), 0.7 + power * 0.7);
      g.audio.play('land');
      this.sq = 0.2 * power; this.sqV = -0.9 * power;      // squash!
      if (this.state === 'idle' || this.state === 'run' || this.state === 'jump' || this.state === 'fall') {
        this.state = 'land';
        this.landT = 0.2;
        this.rig.play('land', { restart: true });
      }
    }

    // attack hit detection at fire frame
    if ((this.state === 'attack' || this.state === 'airAttack') && this.attackHitFrame()) {
      const hitAny = this.doMeleeHit(g.enemies);
      if (this.state === 'airAttack') {
        this.vy = Math.min(this.vy, -60);                  // floaty strike hover
        if (hitAny) this.vy = -330;                        // bounce off the hit (air juggle)
      }
    }

    // mace trail sampling during the whip window
    if ((this.state === 'attack' || this.state === 'airAttack') && this.attackPhase) {
      const fire = FIRE_AT[this.attackPhase.name] || 0.5;
      const pr = this.rig.progress;
      if (pr > fire - 0.18 && pr < fire + 0.16) {
        const pose = this.rig.pose();
        const joints = ROSTAM_RIG.compute(pose, { x: this.x, y: this.y - ROSTAM_HIP_H + (this.mounted ? -26 : 0) + (this.yOff || 0), flip: this.facing, scale: 1 });
        const j = joints.armF2;
        const mx = j.tipX + Math.cos(j.angle) * 26;
        const my = j.tipY + Math.sin(j.angle) * 26;
        this.trail.push({ x: mx, y: my, t: 1 });
        if (this.trail.length > 16) this.trail.shift();
      }
    }

    // run dust kicks
    if (this.onGround && Math.abs(this.vx) > 200 && this.state !== 'roll') {
      this._dustT = (this._dustT || 0) - dt;
      if (this._dustT <= 0) {
        this._dustT = 0.16;
        g.particles.dust(this.x - this.facing * 10, this.y, 2, 0.5);
      }
    }

    // animation state selection (locomotion only — action states own their clips)
    const loco = this.state === 'idle' || this.state === 'run' || this.state === 'jump' || this.state === 'fall';
    if (loco) {
      if (!this.onGround) {
        if (this.rig.name !== 'jump' && this.rig.name !== 'fall') this.rig.play(this.vy < 0 ? 'jump' : 'fall');
        else if (this.vy > 60 && this.rig.name === 'jump' && this.rig.finished) this.rig.play('fall');
        if (this.state !== 'jump' && this.state !== 'fall') this.state = this.vy < 0 ? 'jump' : 'fall';
      } else if (Math.abs(this.vx) > 20) {
        this.state = 'run';
        this.rig.play('run', { speed: this.mounted ? 1.5 : 1.4 });
      } else {
        this.state = 'idle';
        this.rig.play('idle');
      }
    }
    this.rig.update(dt);
  }

  doJump() {
    this.vy = JUMP_V;
    this.onGround = false;
    this.coyote = 0;
    this.sq = -0.15; this.sqV = 0.8;
    if (this.state === 'land') this.state = 'jump';
    this.game.audio.play('jump');
    this.game.particles.dust(this.x, this.y, 4, 0.5);
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
    // afterimage ghosts (roll / finisher leaps) — drawn beneath the hero
    for (const gh of this.ghosts) {
      const joints = ROSTAM_RIG.compute(gh.pose, { x: gh.x, y: gh.y - ROSTAM_HIP_H, flip: gh.facing, scale: 1 });
      if (gh.rot) {
        ctx.save();
        ctx.translate(gh.x, gh.y - 30);
        ctx.rotate(gh.rot);
        ctx.translate(-gh.x, -(gh.y - 30));
        paintRostam(ctx, joints, gh.a);
        ctx.restore();
      } else {
        paintRostam(ctx, joints, gh.a);
      }
    }

    const hipX = this.x;
    const hipY = this.y - ROSTAM_HIP_H + (this.mounted ? -26 : 0) + (this.yOff || 0);
    const pose = this.rig.pose();
    const joints = ROSTAM_RIG.compute(pose, { x: hipX, y: hipY, flip: this.facing, scale: 1 });

    // squash & stretch about the feet + death topple rotation
    ctx.save();
    const sy = 1 + this.sq, sx = 1 - this.sq * 0.7;
    ctx.translate(this.x, this.y);
    ctx.scale(sx, sy);
    ctx.translate(-this.x, -this.y);
    if (this.state === 'dead') {
      const fall = Math.min(1, this.deadT / 0.5);
      ctx.translate(this.x, this.y);
      ctx.rotate(-this.deathDir * 1.35 * fall);
      ctx.translate(-this.x, -this.y);
    }
    if (this.state === 'roll') {
      const rot = this.rollDir * this.rig.progress * Math.PI * 2;
      ctx.translate(this.x, this.y - 30);
      ctx.rotate(rot);
      ctx.translate(-this.x, -(this.y - 30));
    }
    // invulnerability blink
    const alpha = this.invuln > 0 && this.state !== 'roll' ? (Math.floor(this.invuln * 14) % 2 === 0 ? 0.35 : 1) : 1;
    // secondary motion: beard & pelt lag behind velocity
    const sway = clamp(-this.vx * 0.0011, -0.4, 0.4);
    paintRostam(ctx, joints, alpha, this.flashT > 0 ? this.flashT / 0.13 : 0, sway);
    ctx.restore();
  }

  drawTrail(ctx, cam) {
    if (this.trail.length < 2) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1], b = this.trail[i];
      const f = b.t;
      ctx.strokeStyle = `rgba(255,${Math.round(200 + 40 * f)},${Math.round(90 * f + 40)},${0.34 * f})`;
      ctx.lineWidth = 2 + 11 * f;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
