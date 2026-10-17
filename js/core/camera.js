// camera.js — smooth follow + shake + cinematic zoom (finisher QTE)
import { clamp, lerp } from './utils.js';

export class Camera {
  constructor(viewW, viewH) {
    this.viewW = viewW; this.viewH = viewH;
    this.x = 0; this.y = 0;
    this.zoom = 1; this.zoomTarget = 1;
    this.freeY = false;               // set during cinematics to escape the y-clamp
    this.bounds = { x1: 0, x2: 1e9, y1: -1e9, y2: 1e9 };
    this.shakeMag = 0; this.shakeTime = 0;
    this._shakeX = 0; this._shakeY = 0;
  }
  setBounds(x1, x2) {
    this.bounds.x1 = x1;
    this.bounds.x2 = x2;
  }
  zoomTo(z) { this.zoomTarget = z; }
  get visW() { return this.viewW / this.zoom; }
  get visH() { return this.viewH / this.zoom; }

  follow(targetX, targetY, dt, snap = false) {
    const k = snap ? 1 : 1 - Math.pow(0.001, dt);
    const desired = targetX - this.visW / 2;
    this.x = lerp(this.x, desired, k);
    const desiredY = targetY - this.viewH * 0.62;
    this.y = this.freeY
      ? lerp(this.y, targetY - this.visH * 0.5, snap ? 1 : 1 - Math.pow(0.004, dt))
      : lerp(this.y, desiredY, snap ? 1 : 1 - Math.pow(0.01, dt));
    const maxX = this.bounds.x2 - this.visW;
    this.x = clamp(this.x, this.bounds.x1, Math.max(this.bounds.x1, maxX));
    if (!this.freeY) {
      // keep the ground line between 45%..68% of the viewport height (any aspect)
      const lo = 620 - this.visH * 0.68;
      const hi = 620 - this.visH * 0.45;
      this.y = clamp(this.y, Math.min(lo, hi), Math.max(lo, hi));
    } else {
      this.y = clamp(this.y, -600, 400);
    }
  }
  shake(mag, dur) {
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeTime = Math.max(this.shakeTime, dur);
  }
  update(dt) {
    this.zoom = lerp(this.zoom, this.zoomTarget, 1 - Math.pow(0.00005, dt));
    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const m = this.shakeMag * Math.max(0, this.shakeTime * 6);
      this._shakeX = (Math.random() * 2 - 1) * m;
      this._shakeY = (Math.random() * 2 - 1) * m;
      if (this.shakeTime <= 0) { this.shakeMag = 0; this._shakeX = this._shakeY = 0; }
    }
  }
  apply(ctx) {
    if (this.zoom === 1) {
      ctx.translate(Math.round(-this.x + this._shakeX), Math.round(-this.y + this._shakeY));
      return;
    }
    ctx.translate(this.viewW / 2 + this._shakeX, this.viewH / 2 + this._shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-(this.x + this.viewW / 2), -(this.y + this.viewH / 2));
  }
  get offsetX() { return this.x + this._shakeX; }
  get offsetY() { return this.y + this._shakeY; }
}
