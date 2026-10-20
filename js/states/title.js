// title.js — title state: ambient desert scene + sprite-sheet heroes (adaptive layout)
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
    // touch-friendly start prompt
    const start = document.getElementById('title-start');
    if (start) {
      start.textContent = this.game.isTouch
        ? '— TAP TO START / برای شروع لمس کن —'
        : '— PRESS ENTER / اینتر —';
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
    const vw = g.viewW, vh = g.viewH;
    this.env.setView(vw, vh, 1);
    // fake camera: slow pan, ground pinned to ~62% of the viewport height
    const camX = 300 + Math.sin(this.t * 0.05) * 120;
    const camY = this.env.groundY - vh * 0.62;
    this.env.drawSky(ctx, { x: camX, y: camY }, this.t);
    this.env.drawMid(ctx, { x: camX, y: camY }, this.t);

    ctx.save();
    ctx.translate(-camX, -camY);
    this.env.drawGround(ctx, { x: camX, y: camY, zoom: 1 });
    const gy = this.env.groundY;
    const hx = camX + vw * 0.8, hy = gy;
    const spr = g.sprites;
    if (spr && spr.has('rostam') && spr.has('rakhsh')) {
      // ---- frame-by-frame sprite heroes (30-frame sheets, no rigging) ----
      spr.draw(ctx, 'rakhsh', 'idle', (this.t % 3) / 3, hx - 128, hy, { facing: 1 });
      spr.draw(ctx, 'rostam', 'idle', (this.t % 2.4) / 2.4, hx + 18, hy, { facing: 1 });
    } else {
      // legacy procedural fallback while sheets stream in
      const horseIdle = RAKHSH_CLIPS.idle.sample((this.t % 3) / 3);
      const rj = RAKHSH_RIG.compute(horseIdle, { x: hx - 110, y: hy - 6, flip: 1, scale: 1 });
      paintRakhsh(ctx, rj);
      const idle = ROSTAM_CLIPS.idle.sample((this.t % 2.4) / 2.4);
      const j = ROSTAM_RIG.compute(idle, { x: hx, y: hy - ROSTAM_HIP_H, flip: 1, scale: 1 });
      paintRostam(ctx, j);
    }
    ctx.restore();
  }
}
