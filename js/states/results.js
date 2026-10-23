// results.js — victory / defeat state (world frozen behind the overlay)
// v2: defeat offers a real retry — from the checkpoint once the mini-boss fell
import { fmtTime } from '../core/utils.js';

export class ResultsState {
  constructor(game) { this.game = game; this.t = 0; }

  enter({ win, world, player, elapsed, hits, levelId }) {
    this.t = 0;
    this.win = win;
    this.world = world;
    this.player = player;
    this.levelId = levelId || 'trial1';
    this.game.hud.hide();
    if (win) {
      this.game.menus.show('victory');
      this.game.menus.setVictoryStats({ time: fmtTime(elapsed), hits, hp: player.hp, maxHp: player.maxHp });
      this.game.audio.play('victory');
      try { localStorage.setItem('rostam_trial1_complete', '1'); } catch (e) {}
      this.game.clearCheckpoint();      // trial done — the checkpoint served its purpose
    } else {
      this.game.menus.show('defeat');
      this.game.menus.setDefeatHint(!!this.game.checkpoint);
      this.game.audio.play('defeat');
    }
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    if (this.t > 0.8 && (g.input.justPressed('confirm') || g.input.justPressed('advance'))) {
      g.input.consume('advance'); g.input.consume('confirm');
      g.audio.play('ui');
      if (this.win) {
        g.setState('title');
      } else {
        // try again: from the checkpoint when one exists, else from the start
        g.startTrial(this.levelId, true);
      }
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
      cam.apply(ctx, 0);
      this.world.env.drawGround(ctx, cam);
      this.world.drawProps(ctx, cam);
      ctx.restore();
    }
  }
}
