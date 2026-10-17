// hud.js — DOM-based HUD: hearts, arrows, Rakhsh cooldown, boss bar
export class Hud {
  constructor() {
    this.root = document.getElementById('hud');
    this.heartsEl = document.getElementById('hearts');
    this.arrowsEl = document.getElementById('arrow-count');
    this.rakhshEl = document.getElementById('rakhsh-cd');
    this.rakhshRadial = document.getElementById('rakhsh-radial');
    this.bossBar = document.getElementById('boss-bar');
    this.bossFill = document.getElementById('boss-fill');
    this.trialLabel = document.getElementById('trial-label');
    this._heartEls = [];
    for (let i = 0; i < 5; i++) {
      const h = document.createElement('div');
      h.className = 'heart';
      this.heartsEl.appendChild(h);
      this._heartEls.push(h);
    }
  }
  show() { this.root.classList.remove('hidden'); }
  hide() { this.root.classList.add('hidden'); }

  sync(player) {
    this._heartEls.forEach((el, i) => {
      el.classList.toggle('empty', i >= player.hp);
    });
    this.arrowsEl.textContent = player.arrows;
    const ready = player.rakhshCd <= 0;
    const frac = ready ? 1 : 1 - player.rakhshCd / player.rakhshCdMax;
    this.rakhshEl.style.setProperty('--cd', `${(frac * 100).toFixed(0)}%`);
    this.rakhshEl.style.setProperty('--gray', ready ? '0' : '1');
  }

  bossShow(name) {
    this.bossBar.classList.remove('hidden');
    document.getElementById('boss-name').textContent = name;
    this.bossFill.style.width = '100%';
  }
  bossSync(lion) {
    this.bossFill.style.width = `${Math.max(0, (lion.hp / lion.maxHp) * 100)}%`;
  }
  bossHide() { this.bossBar.classList.add('hidden'); }

  setTrialLabel(txt) { this.trialLabel.textContent = txt; }
}
