// menus.js — title / pause / victory / defeat overlays (DOM)
// v2: pause screen carries the settings row (sound / shake / easy-QTE),
//     persisted through game.settings (versioned localStorage)
export class Menus {
  constructor(audio) {
    this.audio = audio;
    this.title = document.getElementById('title-screen');
    this.pause = document.getElementById('pause-screen');
    this.victory = document.getElementById('victory-screen');
    this.defeat = document.getElementById('defeat-screen');
    this._wireSettings();
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
  setDefeatHint(hasCheckpoint) {
    const el = document.getElementById('defeat-hint');
    if (el) {
      el.textContent = hasCheckpoint
        ? 'ENTER / tap — تلاش مجدد از ایست بازرسی'
        : 'ENTER / tap — تلاش مجدد';
    }
  }

  // ---- settings row (pause screen) ----
  _wireSettings() {
    const bind = (id, key, flip) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const g = window.__rostam;
        if (!g) return;
        const cur = g.settings[key];
        g.setSetting(key, flip ? !cur : (cur ? 0 : 1));
        this._refreshSettings(g);
        g.audio.play('ui');
      });
    };
    bind('set-sound', 'sound', true);
    bind('set-shake', 'shake', false);
    bind('set-qte', 'qteEasy', true);
  }
  _refreshSettings(g) {
    const s = g.settings;
    const map = {
      'set-sound': s.sound ? '🔊 صدا: روشن' : '🔇 صدا: خاموش',
      'set-shake': s.shake === 1 ? '📳 لرزش: کامل' : s.shake === 0.5 ? '〽 لرزش: نیم' : '🚫 لرزش: صفر',
      'set-qte': s.qteEasy ? '🎯 QTE: آسان' : '🎯 QTE: معمولی',
    };
    for (const [id, label] of Object.entries(map)) {
      const el = document.getElementById(id);
      if (el) el.textContent = label;
    }
  }
  refreshSettings(g) { this._refreshSettings(g); }
}
