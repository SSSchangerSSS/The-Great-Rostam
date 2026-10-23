// play.js — the main gameplay state (mini-boss + finisher QTE + 2D rendering)
//
// v2 (fixed-timestep):
//   • update() runs once per fixed 1/60 step and RETURNS whether it consumed
//     gameplay input — the core loop uses that to keep buffered presses alive
//     across hitstop / pause / dialogue / QTE-freeze instead of dropping them
//   • draw() interpolates entity positions with the accumulator alpha
//   • camera look-ahead is smoothed (no lateral jerk when Rostam turns)
//   • live enemies get a cheap separation pass so the pack never stacks
import { clamp } from '../core/utils.js';
import { World } from '../world/world.js';
import { Player } from '../entities/player.js';
import { Lion, Jackal, WhiteJackal, drawStars } from '../entities/enemies.js';
import { Arrows } from '../entities/projectiles.js';
import { Animator } from '../gfx/rig.js';
import { RAKHSH_RIG, RAKHSH_CLIPS } from '../content/rigs.js';
import { paintRakhsh } from '../gfx/paint.js';

const LOOK_DIST = 64;          // camera look-ahead (world px)

export class PlayState {
  constructor(game) { this.game = game; this.lookX = 0; }

  enter({ levelId, checkpoint }) {
    const g = this.game;
    g.menus.hideAll();
    g.hud.show();
    g.timescale = 1;
    g.hitstop = 0;
    this.levelId = levelId;
    this.fromCheckpoint = !!checkpoint;
    this.world = new World(levelId, g);
    this.player = new Player(g);
    if (checkpoint) {
      // respawn after defeat — the road already conquered stays conquered
      this.player.reset(checkpoint.x, checkpoint.y);
    } else {
      this.player.reset(this.world.def.playerStart.x, this.world.def.playerStart.y);
    }
    g.player = this.player;

    this.enemies = [];
    for (const e of this.world.def.enemies) {
      if (e.type === 'jackal') this.enemies.push(new Jackal(g, e.x, e.y));
    }
    // MINI-BOSS (White Jackal) + BOSS (Lion) — both offer finisher QTEs.
    // After a checkpoint respawn the defeated mini-boss stays defeated.
    const MB = this.world.def.miniBoss;
    this.miniBoss = (MB && !this.fromCheckpoint)
      ? new WhiteJackal(g, MB.x, MB.y, MB.arena, `${MB.name.fa} — ${MB.name.en}`)
      : null;
    if (this.miniBoss) this.enemies.push(this.miniBoss);
    const B = this.world.def.boss;
    this.boss = new Lion(g, B.x, B.y, B.arena);
    this.enemies.push(this.boss);

    this.arrows = new Arrows();
    g.arrows = this.arrows;
    g.enemies = this.enemies;

    this.rakhshAnim = new Animator(RAKHSH_CLIPS);
    this.rakhshAnim.play('idle');

    this.elapsed = 0;
    this.paused = false;
    this.ending = false;
    this.lookX = 0;

    g.camera.setBounds(0, this.world.width);
    g.camera.follow(this.player.x, this.player.y - 60, 0, true);
    g.camera.zoomTo(1);
    g.camera.freeY = false;

    g.hud.setTrialLabel(`${this.world.def.name.fa} | ${this.world.def.name.en}`);
    g.hud.sync(this.player);
    g.hud.bossHide();

    // intro dialogue (skip the welcome-back line on a checkpoint respawn)
    if (this.fromCheckpoint) {
      g.dialogue.play('checkpoint_resume');
    } else {
      g.dialogue.play('trial1_intro');
    }
  }

  exit() {
    const g = this.game;
    g.hud.hide();
    // leaving play must clean every running overlay/cinematic + pending timers
    g.qte.abort();
    g.director.abort();
  }

  update(dt) {
    const g = this.game;
    const input = g.input;
    const p = this.player;

    if (input.justPressed('mute')) { input.consume('mute'); g.toggleMute(); }

    // pause toggle (tap / click / Esc all resume) — consume so the buffered
    // press cannot re-toggle on the next step
    if (input.justPressed('pause')) { input.consume('pause'); g.pauseToggle(); }
    if (this.paused) {
      if (input.justPressed('advance') || input.justPressed('confirm')) {
        input.consume('advance'); input.consume('confirm');
        g.pauseToggle();
      }
      return false;            // step skipped — presses stay buffered (120ms)
    }

    // dialogue freezes the world (typewriter runs on REAL time)
    if (g.dialogue.active) {
      g.dialogue.update(g.realDt);
      this.world.time += dt;
      g.particles.update(dt);
      g.camera.update(dt);
      return false;
    }

    // ---- finisher QTE / cinematic: frozen world, rigs breathe in close to real time ----
    if (g.qte.state === 'qte' || g.director.active) {
      const boss = g.qte.state === 'qte' ? g.qte.boss : g.director.boss;
      this.world.time += dt * 3;
      if (this.player.rig) this.player.rig.update(dt * 4);
      if (boss && boss.rig) boss.rig.update(dt * 4);
      g.particles.update(dt);
      if (boss) {
        g.camera.follow((this.player.x + boss.x) / 2, Math.min(this.player.y, boss.y) - 60, g.realDt);
      }
      g.camera.update(dt);
      return false;
    }

    if (!this.ending) this.elapsed += dt;

    // hitstop freeze — the step still runs (timers decay) but consumes no input;
    // buffered presses survive and fire the moment the freeze lifts
    if (g.hitstop > 0) {
      g.hitstop -= dt;
      g.particles.update(dt);
      g.camera.update(dt);
      return false;
    }

    this.world.update(dt, p);
    this.world.updateTriggers(p, g);
    const processed = p.update(dt, this.world, input);

    for (const e of this.enemies) e.update(dt, this.world, p);
    this.separateEnemies();
    this.arrows.update(dt, this.world, this.enemies, g);
    g.particles.update(dt);
    g.camera.setBounds(this.world.camMinX(), this.world.camMaxX());
    // Shank-style camera: lead the view into the direction the hero faces —
    // the lead distance is smoothed so turning never jerks the camera
    this.lookX += (p.facing * LOOK_DIST - this.lookX) * (1 - Math.pow(0.002, dt));
    g.camera.follow(p.x + this.lookX, p.y - 60, dt);
    g.camera.update(dt);
    g.hud.sync(p);

    // rakhsh ambient animation
    if (p.mounted) this.rakhshAnim.play('gallop'); else this.rakhshAnim.play('idle');
    this.rakhshAnim.update(dt);

    return processed !== false;
  }

  // keep the fight readable: overlapping live mobs gently push apart
  separateEnemies() {
    const list = this.enemies.filter(e => !e.dead && e !== this.boss && e !== this.miniBoss);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const dx = b.x - a.x, dy = (b.y - a.y);
        const minD = (a.w + b.w) * 0.45;
        if (Math.abs(dx) < minD && Math.abs(dy) < 30) {
          const push = (minD - Math.abs(dx)) * 0.5 * (dx >= 0 ? 1 : -1);
          a.x -= push; b.x += push;
        }
      }
    }
  }

  draw(ctx) {
    const g = this.game;
    const cam = g.camera;
    const a = g.alpha || 0;
    this.world.env.setView(g.viewW, g.viewH, cam.zoom);
    this.world.env.drawSky(ctx, cam, this.world.time);
    this.world.env.drawMid(ctx, cam, this.world.time);

    ctx.save();
    cam.apply(ctx, a);                        // ← single camera transform for the world
    this.world.env.drawGround(ctx, cam);
    this.world.drawProps(ctx, cam);

    if (this.player.mounted) {
      const spr = g.sprites;
      if (spr && spr.ready && spr.has('rakhsh')) {
        spr.draw(ctx, 'rakhsh', this.rakhshAnim.name, this.rakhshAnim.progress,
          this.player.ix(a) - this.player.facing * 4, this.player.iy(a) - 6, { facing: this.player.facing });
      } else {
        const rj = RAKHSH_RIG.compute(this.rakhshAnim.pose(), {
          x: this.player.ix(a) - this.player.facing * 4, y: this.player.iy(a) - 6, flip: this.player.facing, scale: 1,
        });
        paintRakhsh(ctx, rj);
      }
    }
    for (const e of this.enemies) {
      if ((e === this.boss || e === this.miniBoss) && !e.active && !e.dead) continue;
      e.draw(ctx, cam, a);
      if (e.staggered && !e.dead && e.active) drawStars(ctx, e.ix(a), e.iy(a) - e.h - 18, this.world.time);
    }
    this.arrows.draw(ctx, cam, a);
    this.player.drawTrail(ctx, cam);
    this.player.draw(ctx, cam, a);
    g.particles.draw(ctx, cam);
    ctx.restore();

    // ambient foreground dust drifting toward camera (screen space)
    ctx.fillStyle = 'rgba(220,180,130,0.05)';
    for (let i = 0; i < 14; i++) {
      const x = (i * 173 + this.world.time * (12 + i * 2)) % (g.viewW + 60) - 30;
      const y = 200 + ((i * 97) % 400) + Math.sin(this.world.time * 0.7 + i) * 24;
      ctx.fillRect(x, y, 3, 3);
    }
  }
}
