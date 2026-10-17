// menus.js — title / pause / victory / defeat overlays (DOM)
export class Menus {
  constructor(audio) {
    this.audio = audio;
    this.title = document.getElementById('title-screen');
    this.pause = document.getElementById('pause-screen');
    this.victory = document.getElementById('victory-screen');
    this.defeat = document.getElementById('defeat-screen');
  }
  show(which) {
    this.hideAll();
    ({ title: this.title, pause: this.pause, victory: this.victory, defeat: this.defeat }[which] || this.title)
      .classList.remove('hidden');
  }
  hideAll() {
    for (const el of [this.title, this.pause, this.victory, this.defeat]) el.classList.add('hidden');
  }
  setVictoryStats({ time, hits, hp, maxHp }) {
    document.getElementById('victory-stats').innerHTML =
      `<span>⏱ <b>${time}</b></span><span>⚔ <b>${hits}</b> hits</span><span>❤ <b>${hp}/${maxHp}</b></span>`;
  }
}
