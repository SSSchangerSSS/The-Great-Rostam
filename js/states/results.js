// results.js — victory / defeat state (world frozen behind the overlay)
import { fmtTime } from '../core/utils.js';

export class ResultsState {
  constructor(game) { this.game = game; this.t = 0; }

  enter({ win, world, player, elapsed, hits }) {
    this.t = 0;
    this.win = win;
    this.world = world;
    this.player = player;
    this.game.hud.hide();
    if (win) {
      this.game.menus.show('victory');
      this.game.menus.setVictoryStats({ time: fmtTime(elapsed), hits, hp: player.hp, maxHp: player.maxHp });
      this.game.audio.play('victory');
      try { localStorage.setItem('rostam_trial1_complete', '1'); } catch (e) {}
    } else {
      this.game.menus.show('defeat');
      this.game.audio.play('defeat');
    }
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    if (this.t > 0.8 && (g.input.justPressed('confirm') || g.input.justPressed('advance'))) {
      g.audio.play('ui');
      g.setState('title');
    }
  }

  draw(ctx) {
    // frozen world behind the menu overlay
    if (this.world) {
      const cam = this.game.camera;
      this.world.env.setView(this.game.viewW, this.game.viewH);
      this.world.env.drawSky(ctx, cam, this.world.time);
      this.world.env.drawMid(ctx, cam, this.world.time);
      ctx.save();
      cam.apply(ctx);
      this.world.env.drawGround(ctx, cam);
      this.world.drawProps(ctx, cam);
      ctx.restore();
    }
  }
}
