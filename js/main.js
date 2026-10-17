// main.js — entry point
import { Game } from './core/game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  // expose for debugging in devtools
  window.__rostam = game;

  // ---- headless test hooks (harmless in normal play) ----
  window.__rd = {
    toMini() {
      const p = game.states.play;
      if (game.stateName !== 'play' || !p.miniBoss) return;
      p.player.x = p.world.def.miniBoss.arena.x1 + 80;
    },
    toBoss() {
      const p = game.states.play;
      if (game.stateName !== 'play') return;
      p.player.x = p.world.def.boss.arena.x1 + 80;
    },
    stagger() {
      if (game.stateName !== 'play') return;
      const p = game.states.play;
      const b = (p.miniBoss && p.miniBoss.active && !p.miniBoss.dead) ? p.miniBoss
        : (p.boss.active && !p.boss.dead ? p.boss : null);
      if (!b) return;
      b.hp = b.finisherThreshold + 1;
      b.hurt(1, 1, game);
    },
    qteWin() { game.qte.debugWin(); },
    qteLose() { game.qte.debugLose(); },
  };
});
