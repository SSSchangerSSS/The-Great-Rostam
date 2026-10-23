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
      if (b.roaredOnce === false) b.roaredOnce = true;   // skip the 50%-roar branch
      b.hp = b.finisherThreshold + 1;
      b.hurt(1, 1, game);
    },
    qteWin() { game.qte.debugWin(); },
    qteLose() { game.qte.debugLose(); },

    // ---- richer introspection for automated scenario tests ----
    info() {
      const p = game.states.play;
      if (game.stateName !== 'play') return { state: game.stateName };
      return {
        state: game.stateName,
        paused: p.paused,
        ending: p.ending,
        player: { x: +p.player.x.toFixed(1), y: +p.player.y.toFixed(1), hp: p.player.hp, state: p.player.state, arrows: p.player.arrows, mounted: p.player.mounted },
        enemies: p.enemies.map(e => ({ kind: e.constructor.name, state: e.state, hp: e.hp, dead: !!e.dead, active: !!e.active, x: +e.x.toFixed(1) })),
        miniBossActive: !!(p.miniBoss && p.miniBoss.active && !p.miniBoss.dead),
        bossActive: !!(p.boss && p.boss.active && !p.boss.dead),
        qte: game.qte.state,
        director: game.director.active,
        dialogue: game.dialogue.active,
        elapsed: +p.elapsed.toFixed(2),
        stats: { ...game.stats },
        sprites: game.sprites.status ? game.sprites.status() : null,
        checkpoint: game.checkpoint,
      };
    },
    // scripted input helper for determinism tests: press an action for N sim steps
    tap(action, frames = 2) {
      const codes = { attack: 'KeyX', jump: 'KeyZ', bow: 'KeyC', roll: 'KeyV', right: 'ArrowRight', left: 'ArrowLeft', mount: 'KeyE' };
      const code = codes[action];
      if (!code) return;
      game.input.press(code);
      setTimeout(() => game.input.release(code), frames * 16.7);
    },
    hold(action, down) {
      const codes = { attack: 'KeyX', jump: 'KeyZ', bow: 'KeyC', roll: 'KeyV', right: 'ArrowRight', left: 'ArrowLeft', mount: 'KeyE' };
      const code = codes[action];
      if (!code) return;
      if (down) game.input.press(code); else game.input.release(code);
    },
    // kill every live enemy except bosses (speeds up level traversal in tests)
    clearMobs() {
      const p = game.states.play;
      if (game.stateName !== 'play') return;
      for (const e of p.enemies) {
        if (e !== p.boss && e !== p.miniBoss) { e.dead = true; e.deadT = 1; }
      }
    },
    // unlock everything: teleport to the lion with the checkpoint path honored
    setupBossFight() {
      const p = game.states.play;
      if (game.stateName !== 'play') return;
      this.clearMobs();
      p.player.x = p.world.def.boss.arena.x1 + 120;
      p.world.lockArena(p.world.def.boss.arena.x1, p.world.def.boss.arena.x2);
      game.activateBoss('boss');
    },
  };
});
