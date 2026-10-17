// parallax.js — procedural multi-layer environment rendering (Trial I: dusk desert)
// Everything is drawn from seeded noise — zero image assets.

import { makeRng, TAU } from '../core/utils.js';
import { paintColumn, paintBrazier, paintShrub, paintRock } from './paint.js';

// ---------- palettes per environment mood ----------
export const PALETTES = {
  dusk: {
    skyTop: '#2b1a3d', skyMid: '#6e3a4e', skyLow: '#c96b3f',
    sun: '#ffd27a', sunGlow: 'rgba(255,180,90,0.35)',
    mountainFar: '#4a3350', mountainNear: '#382a42',
    dune: '#5c4033', duneLit: '#75543c',
    ground: '#6b4a2f', groundDark: '#543823', groundSpeck: '#7d5a38',
    haze: 'rgba(201,107,63,0.12)',
    cloud: 'rgba(255,190,130,0.13)',
    vulture: '#1d1520',
  },
  night: { // reserved for later trials
    skyTop: '#0a0a1c', skyMid: '#141433', skyLow: '#26264d',
    sun: '#dfe8ff', sunGlow: 'rgba(190,205,255,0.2)',
    mountainFar: '#191938', mountainNear: '#12122a',
    dune: '#1c1c30', duneLit: '#26263c',
    ground: '#20202f', groundDark: '#171722', groundSpeck: '#2c2c40',
    haze: 'rgba(60,60,120,0.12)',
    cloud: 'rgba(180,190,255,0.08)',
    vulture: '#0c0c14',
  },
};

// ---------- mountain ridge polyline (procedural, cached per level) ----------
function buildRidge(seed, baseY, amp, step) {
  const rng = makeRng(seed);
  const pts = [];
  let x = -200;
  while (x < 4200) {
    pts.push([x, baseY - rng() * amp]);
    x += step * (0.7 + rng() * 0.6);
  }
  return pts;
}

export class Environment {
  constructor(paletteName, worldWidth, groundY, seed = 7) {
    this.pal = PALETTES[paletteName];
    this.worldW = worldWidth;
    this.groundY = groundY;
    this.seed = seed;
    this.far = buildRidge(seed, groundY - 150, 120, 260);
    this.near = buildRidge(seed + 13, groundY - 60, 80, 200);
    this.dunes = buildRidge(seed + 29, groundY - 12, 34, 150);
    this.vultures = [];
    const rng = makeRng(seed + 101);
    for (let i = 0; i < 3; i++) {
      this.vultures.push({ x: 300 + rng() * (worldWidth - 600), y: 80 + rng() * 60, r: 26 + rng() * 18, sp: 0.25 + rng() * 0.2, ph: rng() * TAU });
    }
    this.stars = [];
    if (paletteName === 'night') {
      const r2 = makeRng(seed + 7);
      for (let i = 0; i < 60; i++) this.stars.push([r2() * worldWidth, r2() * 260, r2()]);
    }
  }

  drawSky(ctx, cam, t) {
    const p = this.pal;
    const g = ctx.createLinearGradient(0, 0, 0, this.groundY + 60);
    g.addColorStop(0, p.skyTop);
    g.addColorStop(0.55, p.skyMid);
    g.addColorStop(1, p.skyLow);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.viewW || 1280, this.viewH || 720);

    // stars (night only)
    if (this.stars.length) {
      ctx.fillStyle = '#fff';
      for (const [sx, sy, tw] of this.stars) {
        const x = sx - cam.x * 0.05;
        if (x < -10 || x > (this.viewW || 1280) + 10) continue;
        ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(t * 1.5 + tw * 10));
        ctx.fillRect(x, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    // sun with glow (drawn against parallax 0.08)
    const sunX = 980 - cam.x * 0.08;
    const sunY = 190;
    ctx.fillStyle = p.sunGlow;
    ctx.beginPath(); ctx.arc(sunX, sunY, 95, 0, TAU); ctx.fill();
    ctx.fillStyle = p.sun;
    ctx.beginPath(); ctx.arc(sunX, sunY, 46, 0, TAU); ctx.fill();

    // drifting clouds
    ctx.fillStyle = p.cloud;
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 430 + t * (8 + i * 3)) % (this.worldW * 0.4)) - cam.x * 0.12;
      const cy = 70 + i * 38;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 90 + i * 14, 13, 0, 0, TAU);
      ctx.ellipse(cx + 60, cy + 6, 60, 10, 0, 0, TAU);
      ctx.fill();
    }

    // circling vultures (silhouettes with flapping)
    ctx.strokeStyle = p.vulture;
    ctx.lineWidth = 2.4;
    for (const v of this.vultures) {
      const vx = v.x - cam.x * 0.25 + Math.sin(t * 0.3 + v.ph) * 30;
      if (vx < -40 || vx > (this.viewW || 1280) + 40) continue;
      const vy = v.y + Math.sin(t * 0.5 + v.ph) * 8;
      const flap = Math.sin(t * 5 + v.ph) * 0.5;
      ctx.beginPath();
      ctx.moveTo(vx - v.r, vy - flap * 6);
      ctx.quadraticCurveTo(vx, vy + 4 + flap * 3, vx + v.r, vy - flap * 6);
      ctx.stroke();
    }

    // mountain ridges (two parallax depths)
    this._ridge(ctx, this.far, p.mountainFar, cam.x * 0.18, 0);
    this._ridge(ctx, this.near, p.mountainNear, cam.x * 0.34, 0);
    // haze band between ridges and dunes
    ctx.fillStyle = p.haze;
    ctx.fillRect(0, this.groundY - 130, this.viewW || 1280, 130);
  }

  _ridge(ctx, pts, color, shiftX, shiftY) {
    const W = this.viewW || 1280;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-60, this.groundY + 80);
    for (const [px, py] of pts) {
      const x = px - shiftX;
      if (x < -120 || x > W + 120) continue;
      ctx.lineTo(x, py + shiftY);
    }
    ctx.lineTo(W + 60, this.groundY + 80);
    ctx.closePath();
    ctx.fill();
  }

  drawMid(ctx, cam, t) {
    const p = this.pal;
    // rolling dunes (parallax 0.55)
    const W = this.viewW || 1280;
    ctx.fillStyle = p.dune;
    ctx.beginPath();
    ctx.moveTo(-60, this.groundY + 60);
    for (const [px, py] of this.dunes) {
      const x = px - cam.x * 0.55;
      if (x < -120 || x > W + 120) continue;
      ctx.lineTo(x, py);
    }
    ctx.lineTo(W + 60, this.groundY + 60);
    ctx.closePath();
    ctx.fill();
    // lit dune crests
    ctx.strokeStyle = p.duneLit;
    ctx.lineWidth = 2;
    for (let i = 0; i < this.dunes.length - 1; i++) {
      const [ax, ay] = this.dunes[i];
      const [bx2, by2] = this.dunes[i + 1];
      const x1 = ax - cam.x * 0.55, x2 = bx2 - cam.x * 0.55;
      if (x2 < -60 || x1 > W + 60) continue;
      if (by2 < ay) {
        ctx.beginPath(); ctx.moveTo(x1, ay); ctx.lineTo(x2, by2); ctx.stroke();
      }
    }
  }

  drawGround(ctx, cam) {
    const p = this.pal;
    const W = this.viewW || 1280;
    const x0 = cam.x, x1 = cam.x + W;
    // base slab (full parallax — part of the world)
    ctx.fillStyle = p.ground;
    ctx.fillRect(x0 - 20, this.groundY, (x1 - x0) + 40, this.viewH || 720);
    ctx.fillStyle = p.groundDark;
    ctx.fillRect(x0 - 20, this.groundY, (x1 - x0) + 40, 5);
    // sand speckles (seeded by world x, drawn only in view)
    const rng = makeRng((Math.floor(x0 / 40)) * 977 + this.seed);
    ctx.fillStyle = p.groundSpeck;
    for (let i = 0; i < 90; i++) {
      const sx = x0 + rng() * (W + 40) - 20;
      const sy = this.groundY + 6 + rng() * 100;
      ctx.fillRect(sx, sy, 2 + rng() * 3, 1.6);
    }
  }

  // view size cache (set by renderer each frame)
  setView(w, h) { this.viewW = w; this.viewH = h; }
}
