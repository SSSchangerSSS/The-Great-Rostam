// input.js — keyboard abstraction with action mapping + frame-edge presses
const BINDS = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['KeyZ', 'Space'],
  attack: ['KeyX'],
  bow: ['KeyC'],
  mount: ['ShiftLeft', 'ShiftRight'],
  advance: ['KeyZ', 'Space', 'Enter'],
  confirm: ['Enter'],
  pause: ['Escape'],
  mute: ['KeyM'],
};

export class Input {
  constructor() {
    this.down_ = new Set();
    this.just_ = new Set();
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down_.add(e.code);
      this.just_.add(e.code);
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.down_.delete(e.code));
    window.addEventListener('blur', () => this.down_.clear());
    // click acts as "advance/confirm" (dialogue + menus)
    window.addEventListener('mousedown', () => {
      this.down_.add('MouseAdv');
      this.just_.add('MouseAdv');
    });
    window.addEventListener('mouseup', () => this.down_.delete('MouseAdv'));
  }
  _codes(action) { return BINDS[action] || []; }
  down(action) { return this._codes(action).some(c => this.down_.has(c)); }
  justPressed(action) { return this._codes(action).some(c => this.just_.has(c)); }
  anyJustPressed(codes) { return codes.some(c => this.just_.has(c)); }
  endFrame() { this.just_.clear(); }
}
