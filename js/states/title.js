// title.js — title state: ambient desert scene behind the DOM overlay
import { TAU } from '../core/utils.js';
import { ROSTAM_RIG, ROSTAM_CLIPS, ROSTAM_HIP_H } from '../content/rigs.js';
import { RAKHSH_RIG, RAKHSH_CLIPS } from '../content/rigs.js';
import { paintRostam, paintRakhsh } from '../gfx/paint.js';

export class TitleState {
  constructor(game) { this.game = game; this.t = 0; }

  enter() {
    this.t = 0;
    this.game.menus.show('title');
    this.game.hud.hide();
    if (!this.env) {
      this.env = this.game.makeAmbientScene();
    }
  }

  update(dt) {
    this.t += dt;
    const g = this.game;
    if (g.input.justPressed('confirm') || g.input.justPressed('advance')) {
      g.audio.init();
      g.audio.play('ui');
      g.setState('play', { levelId: 'trial1' });
    }
    if (g.input.justPressed('mute')) g.toggleMute();
  }

  draw(ctx) {
    const g = this.game;
    this.env.setView(g.viewW, g.viewH);
    this.env.drawSky(ctx, { x: 0, y: 0 }, this.t);
    this.env.drawMid(ctx, { x: 0, y: 0 }, this.t);
    this.env.drawGround(ctx, { x: 0, y: 0 });
    // Rostam & Rakhsh standing together, breathing
    const idle = ROSTAM_CLIPS.idle.sample((this.t % 2.4) / 2.4);
    const horseIdle = RAKHSH_CLIPS.idle.sample((this.t % 3) / 3);
    const hx = 560, hy = 585;
    const rj = RAKHSH_RIG.compute(horseIdle, { x: hx - 110, y: hy - 6, flip: 1, scale: 1 });
    paintRakhsh(ctx, rj);
    const j = ROSTAM_RIG.compute(idle, { x: hx, y: hy - ROSTAM_HIP_H, flip: 1, scale: 1 });
    paintRostam(ctx, j);
  }
}
