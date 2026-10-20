// play.js — the main gameplay state (mini-boss + finisher QTE + 2.5D rendering)
import { clamp } from '../core/utils.js';
import { World } from '../world/world.js';
import { Player } from '../entities/player.js';
import { Lion, Jackal, WhiteJackal, drawStars } from '../entities/enemies.js';
import { Arrows } from '../entities/projectiles.js';
import { Animator } from '../gfx/rig.js';
import { RAKHSH_RIG, RAKHSH_CLIPS } from '../content/rigs.js';
import { paintRakhsh } from '../gfx/paint.js';

export class PlayState {
  constructor(game) { this.game = game; }

  enter({ levelId }) {
    const g = this.game;
    g.menus.hideAll();
    g.hud.show();
    g.timescale = 1;
    this.levelId = levelId;
    this.world = new World(levelId, g);
    this.player = new Player(g);
    this.player.reset(this.world.def.playerStart.x, this.world.def.playerStart.y);
    g.player = this.player;

    this.enemies = [];
    for (const e of this.world.def.enemies) {
      if (e.type === 'jackal') this.enemies.push(new Jackal(g, e.x, e.y));
    }
    // MINI-BOSS (White Jackal) + BOSS (Lion) — both offer finisher QTEs
    const MB = this.world.def.miniBoss;
    this.miniBoss = MB ? new WhiteJackal(g, MB.x, MB.y, MB.arena, `${MB.name.fa} — ${MB.name.en}`) : null;
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

    g.camera.setBounds(0, this.world.width);
    g.camera.follow(this.player.x, this.player.y - 60, 0, true);
    g.camera.zoomTo(1);
    g.camera.freeY = false;

    g.hud.setTrialLabel(`${this.world.def.name.fa} | ${this.world.def.name.en}`);
    g.hud.sync(this.player);
    g.hud.bossHide();
    if (g.gl3d && g.gl3d.ok) g.gl3d.clearEntities();   // fresh 3D cast for this run

    // intro dialogue
    g.dialogue.play('trial1_intro');
  }

  exit() { this.game.hud.hide(); }

  update(dt) {
    const g = this.game;
    const input = g.input;
    const p = this.player;

    if (input.justPressed('mute')) g.toggleMute();

    // pause toggle (tap / click / Esc all resume)
    if (input.justPressed('pause')) g.pauseToggle();
    if (this.paused) {
      if (input.justPressed('advance') || input.justPressed('confirm')) g.pauseToggle();
      return;
    }

    // dialogue freezes the world
    if (g.dialogue.active) {
      g.dialogue.update(g.realDt);
      this.world.time += dt;
      g.particles.update(dt);
      g.camera.update(dt);
      return;
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
      return;
    }

    if (!this.ending) this.elapsed += dt;

    // hitstop freeze
    if (g.hitstop > 0) { g.hitstop -= dt; return; }

    this.world.update(dt, p);
    this.world.updateTriggers(p, g);
    p.update(dt, this.world, input);
    for (const e of this.enemies) e.update(dt, this.world, p);
    this.arrows.update(dt, this.world, this.enemies, g);
    g.particles.update(dt);
    g.camera.setBounds(this.world.camMinX(), this.world.camMaxX());
    // Shank-style camera: lead the view into the direction the hero faces
    g.camera.follow(p.x + p.facing * 64, p.y - 60, dt);
    g.camera.update(dt);
    g.hud.sync(p);

    // rakhsh ambient animation
    if (p.mounted) this.rakhshAnim.play('gallop'); else this.rakhshAnim.play('idle');
    this.rakhshAnim.update(dt);
  }

  draw(ctx) {
    const g = this.game;
    const cam = g.camera;
    const gl = g.gl3d && g.gl3d.ok;
    this.world.env.setView(g.viewW, g.viewH, cam.zoom);
    this.world.env.drawSky(ctx, cam, this.world.time);
    this.world.env.drawMid(ctx, cam, this.world.time);

    ctx.save();
    cam.apply(ctx);
    this.world.env.drawGround(ctx, cam);
    this.world.drawProps(ctx, cam);

    if (gl) {
      // ---- 2.5D path: characters live on the WebGL layer, combat fx on top ----
      ctx.restore();
      const fx = g.fxCtx;
      if (fx) {
        fx.save();
        cam.apply(fx);
        this.arrows.draw(fx, cam);
        this.player.drawTrail(fx, cam);   // mace smear — the Flash whip arc
        for (const e of this.enemies) {
          if (e.staggered && !e.dead && e.active) drawStars(fx, e.x, e.y - e.h - 18, this.world.time);
        }
        g.particles.draw(fx, cam);
        fx.restore();
      }
    } else {
      // ---- legacy pure-2D path (no WebGL): everything on the main canvas ----
      if (this.player.mounted) {
        const spr = g.sprites;
        if (spr && spr.ready && spr.has('rakhsh')) {
          spr.draw(ctx, 'rakhsh', this.rakhshAnim.name, this.rakhshAnim.progress,
            this.player.x - this.player.facing * 4, this.player.y - 6, { facing: this.player.facing });
        } else {
          const rj = RAKHSH_RIG.compute(this.rakhshAnim.pose(), {
            x: this.player.x - this.player.facing * 4, y: this.player.y - 6, flip: this.player.facing, scale: 1,
          });
          paintRakhsh(ctx, rj);
        }
      }
      for (const e of this.enemies) {
        if ((e === this.boss || e === this.miniBoss) && !e.active && !e.dead) continue;
        e.draw(ctx, cam);
        if (e.staggered && !e.dead && e.active) drawStars(ctx, e.x, e.y - e.h - 18, this.world.time);
      }
      this.arrows.draw(ctx, cam);
      this.player.drawTrail(ctx, cam);
      this.player.draw(ctx, cam);
      g.particles.draw(ctx, cam);
      ctx.restore();
    }

    // ambient foreground dust drifting toward camera
    const dustCtx = gl && g.fxCtx ? g.fxCtx : ctx;
    dustCtx.fillStyle = 'rgba(220,180,130,0.05)';
    for (let i = 0; i < 14; i++) {
      const x = (i * 173 + this.world.time * (12 + i * 2)) % (g.viewW + 60) - 30;
      const y = 200 + ((i * 97) % 400) + Math.sin(this.world.time * 0.7 + i) * 24;
      dustCtx.fillRect(x, y, 3, 3);
    }
  }
}
