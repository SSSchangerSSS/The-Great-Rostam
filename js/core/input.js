// input.js — unified keyboard + touch input with action mapping
//
// v2 (fixed-timestep aware):
//   • every press lands in a BUFFER stamped with performance.now()
//   • the simulation consumes presses once per fixed step via endStep(consumed):
//       consumed=true  → buffer cleared (press belongs to that sim step only —
//                        a press is never consumed by two substeps)
//       consumed=false → press survives while it is younger than KEEP_MS
//                        (hitstop / pause / dialogue skips), then expires.
//                        This is exactly the 120ms action-buffer window.
//   • rendering never consumes presses; a press arriving on a rAF frame that
//     runs zero sim steps is picked up by the next step (nothing is lost)
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

export const INPUT_KEEP_MS = 120;   // action-buffer window for skipped steps

export class Input {
  constructor() {
    this.down_ = new Set();      // currently held codes
    this.buf_ = new Map();       // code -> press timestamp (ms), until consumed
    this._now = () => performance.now();
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down_.add(e.code);
      this.press(e.code);
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.down_.delete(e.code));
    window.addEventListener('blur', () => this.releaseAll());
    // click acts as "advance/confirm" (dialogue + menus)
    window.addEventListener('mousedown', () => {
      this.down_.add('MouseAdv');
      this.press('MouseAdv');
    });
    window.addEventListener('mouseup', () => this.down_.delete('MouseAdv'));
    // losing the pointer mid-press must not leave a stuck virtual key
    window.addEventListener('pointercancel', () => this.releaseAll());
  }

  // ---- virtual button injection (touch UI / overlays) ----
  press(code) {
    if (!this.buf_.has(code)) this.buf_.set(code, this._now());
  }
  release(code) { this.down_.delete(code); }
  releaseAll() {
    this.down_.clear();
    this.buf_.clear();
  }

  _codes(action) { return BINDS[action] || []; }
  down(action) { return this._codes(action).some(c => this.down_.has(c)); }
  justPressed(action) { return this._codes(action).some(c => this.buf_.has(c)); }
  anyJustPressed(codes) { return codes.some(c => this.buf_.has(c)); }
  // raw-code probe (codes outside BINDS, e.g. title-screen continue on KeyC)
  codeJustPressed(code) { return this.buf_.has(code); }

  /**
   * Explicitly consume one action's presses NOW. UI handlers (pause, mute,
   * dialogue advance, menu confirm, QTE prompts) must call this — otherwise a
   * press buffered on a step that returns false (paused / dialogue / hitstop)
   * would re-fire on the NEXT step and toggle twice.
   */
  consume(action) { for (const c of this._codes(action)) this.buf_.delete(c); }

  /**
   * End of one simulation step.
   * consumed=true  → the step processed gameplay input: clear everything.
   * consumed=false → the step was skipped (hitstop / pause / dialogue / QTE-cine):
   *                  keep fresh presses up to INPUT_KEEP_MS, drop stale ones so
   *                  nothing leaks across a long pause.
   */
  endStep(consumed) {
    if (consumed) { this.buf_.clear(); return; }
    const now = this._now();
    for (const [code, t] of this.buf_) {
      if (now - t > INPUT_KEEP_MS) this.buf_.delete(code);
    }
  }

  // hard-clear (QTE transitions, state exits) — prevents stale presses
  // from firing a gameplay action right after an overlay closes
  clearPresses() { this.buf_.clear(); }
}
