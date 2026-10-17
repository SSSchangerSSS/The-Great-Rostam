// play.js — the main gameplay state
import { clamp } from '../core/utils.js';
import { World } from '../world/world.js';
import { Player } from '../entities/player.js';
import { Lion, Jackal } from '../entities/enemies.js';
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
    this.levelId = levelId;
    this.world = new World(levelId, g);
    this.player = new Player(g);
    this.player.reset(this.world.def.playerStart.x, this.world.def.playerStart.y);
    g.player = this.player;

    this.enemies = [];
    for (const e of this.world.def.enemies) {
      if (e.type === 'jackal') this.enemies.push(new Jackal(g, e.x, e.y));
    }
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

    g.hud.setTrialLabel(`${this.world.def.name.fa} | ${this.world.def.name.en}`);
    g.hud.sync(this.player);
    g.hud.bossHide();

    // intro dialogue
    g.dialogue.play('trial1_intro');
  }

  exit() { this.game.hud.hide(); }

  update(dt) {
    const g = this.game;
    const input = g.input;
    const p = this.player;

    if (input.justPressed('mute')) g.toggleMute();

    // pause toggle
    if (input.justPressed('pause')) {
      this.paused = !this.paused;
      if (this.paused) g.menus.show('pause'); else g.menus.hideAll();
    }
    if (this.paused) return;

    // dialogue freezes the world
    if (g.dialogue.active) {
      g.dialogue.update(dt);
      this.world.time += dt;
      g.particles.update(dt);
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
    g.camera.follow(p.x, p.y - 60, dt);
    g.camera.update(dt);
    g.hud.sync(p);

    // rakhsh ambient animation
    if (p.mounted) this.rakhshAnim.play('gallop'); else this.rakhshAnim.play('idle');
    this.rakhshAnim.update(dt);
  }

  draw(ctx) {
    const g = this.game;
    const cam = g.camera;
    this.world.env.setView(g.viewW, g.viewH);
    this.world.env.drawSky(ctx, cam, this.world.time);
    this.world.env.drawMid(ctx, cam, this.world.time);

    ctx.save();
    cam.apply(ctx);
    this.world.env.drawGround(ctx, cam);
    this.world.drawProps(ctx, cam);
    // Rakhsh behind player when mounted
    if (this.player.mounted) {
      const rj = RAKHSH_RIG.compute(this.rakhshAnim.pose(), {
        x: this.player.x - this.player.facing * 4, y: this.player.y - 6, flip: this.player.facing, scale: 1,
      });
      paintRakhsh(ctx, rj);
    }
    for (const e of this.enemies) {
      if (e === this.boss && !this.boss.active && !this.boss.dead) continue;
      e.draw(ctx, cam);
    }
    this.arrows.draw(ctx, cam);
    this.player.draw(ctx, cam);
    g.particles.draw(ctx, cam);
    ctx.restore();

    // ambient foreground dust drifting toward camera
    ctx.fillStyle = 'rgba(220,180,130,0.05)';
    for (let i = 0; i < 14; i++) {
      const x = (i * 173 + this.world.time * (12 + i * 2)) % (g.viewW + 60) - 30;
      const y = 200 + ((i * 97) % 400) + Math.sin(this.world.time * 0.7 + i) * 24;
      ctx.fillRect(x, y, 3, 3);
    }
  }
}
