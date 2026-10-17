// input.js — unified keyboard + touch input with action mapping + frame-edge presses
// Virtual button codes (TouchLeft, TouchJump, ...) are injected by ui/touch.js
const BINDS = {
  left: ['ArrowLeft', 'KeyA', 'TouchLeft'],
  right: ['ArrowRight', 'KeyD', 'TouchRight'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['KeyZ', 'Space', 'TouchJump'],
  attack: ['KeyX', 'TouchAttack'],
  bow: ['KeyC', 'TouchBow'],
  roll: ['KeyV', 'TouchRoll'],
  mount: ['ShiftLeft', 'ShiftRight', 'KeyE', 'TouchMount'],
  finisher: ['KeyF'],
  advance: ['KeyZ', 'Space', 'Enter', 'MouseAdv', 'TouchAdv'],
  confirm: ['Enter', 'TouchAdv'],
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

  // ---- virtual button injection (touch UI / overlays) ----
  press(code) { this.down_.add(code); this.just_.add(code); }
  release(code) { this.down_.delete(code); }

  _codes(action) { return BINDS[action] || []; }
  down(action) { return this._codes(action).some(c => this.down_.has(c)); }
  justPressed(action) { return this._codes(action).some(c => this.just_.has(c)); }
  anyJustPressed(codes) { return codes.some(c => this.just_.has(c)); }
  endFrame() { this.just_.clear(); }
}
