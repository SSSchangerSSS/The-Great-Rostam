// main.js — entry point
import { Game } from './core/game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  // expose for debugging in devtools
  window.__rostam = game;
});
