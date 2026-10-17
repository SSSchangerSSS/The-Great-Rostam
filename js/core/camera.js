// camera.js — smooth follow + shake
import { clamp, lerp } from './utils.js';

export class Camera {
  constructor(viewW, viewH) {
    this.viewW = viewW; this.viewH = viewH;
    this.x = 0; this.y = 0;
    this.bounds = { x1: 0, x2: 1e9, y1: -1e9, y2: 1e9 };
    this.shakeMag = 0; this.shakeTime = 0;
    this._shakeX = 0; this._shakeY = 0;
  }
  setBounds(x1, x2) {
    this.bounds.x1 = x1;
    this.bounds.x2 = x2;
  }
  follow(targetX, targetY, dt, snap = false) {
    const desired = targetX - this.viewW / 2;
    this.x = snap ? desired : lerp(this.x, desired, 1 - Math.pow(0.001, dt));
    this.y = lerp(this.y, targetY - this.viewH * 0.62, 1 - Math.pow(0.01, dt));
    const maxX = this.bounds.x2 - this.viewW;
    this.x = clamp(this.x, this.bounds.x1, Math.max(this.bounds.x1, maxX));
    this.y = clamp(this.y, -200, 120);
  }
  shake(mag, dur) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, dur);
  }
  update(dt) {
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const m = this.shakeMag * Math.max(0, this.shakeTime * 6);
      this._shakeX = (Math.random() * 2 - 1) * m;
      this._shakeY = (Math.random() * 2 - 1) * m;
      if (this.shakeTime <= 0) { this.shakeMag = 0; this._shakeX = this._shakeY = 0; }
    }
  }
  apply(ctx) {
    ctx.translate(Math.round(-this.x + this._shakeX), Math.round(-this.y + this._shakeY));
  }
  get offsetX() { return this.x + this._shakeX; }
  get offsetY() { return this.y + this._shakeY; }
}
