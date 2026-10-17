// paint.js — procedural character & prop painters (pure canvas, zero assets)
// Painters receive resolved joint transforms from Rig.compute().

import { TAU } from '../core/utils.js';

const P92 = Math.PI / 2;

// ---------- shared helpers ----------
function limb(ctx, j, w, color, cap = 'round') {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = cap;
  ctx.beginPath();
  ctx.moveTo(j.x, j.y);
  ctx.lineTo(j.tipX, j.tipY);
  ctx.stroke();
}

function blob(ctx, x, y, rx, ry, color, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ============================================================
// ROSTAM
// ============================================================
export const ROSTAM_PAL = {
  skin: '#c99263', hair: '#241a12', beard: '#1d130c',
  leather: '#5c4328', leatherDark: '#47331e',
  armor: '#7d6a4a', bronze: '#9a7b3f',
  pelt: '#c97a22', peltStripe: '#241407',
  gold: '#e8b64c', mace: '#8f8f96', maceDark: '#5c5c64',
  boot: '#3c2c1a', bow: '#7a5a30',
};

export function paintRostam(ctx, joints, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;

  // ---- back arm (behind torso) ----
  limb(ctx, joints.armB1, 8, ROSTAM_PAL.leatherDark);
  limb(ctx, joints.armB2, 7, ROSTAM_PAL.leatherDark);
  blob(ctx, joints.armB2.tipX, joints.armB2.tipY, 4.5, 4.5, ROSTAM_PAL.skin);

  // ---- back leg ----
  limb(ctx, joints.legB1, 10, ROSTAM_PAL.leatherDark);
  limb(ctx, joints.legB2, 9, ROSTAM_PAL.boot);
  // boot
  ctx.save();
  ctx.translate(joints.legB2.tipX, joints.legB2.tipY);
  ctx.rotate(joints.legB2.angle);
  ctx.fillStyle = ROSTAM_PAL.boot;
  ctx.fillRect(-3, -4, 12, 7);
  ctx.restore();

  // ---- torso (spine) with tiger-skin pelt ----
  limb(ctx, joints.spine, 17, ROSTAM_PAL.leather);
  limb(ctx, joints.neck, 8, ROSTAM_PAL.skin);
  // tiger pelt draped over torso: stripes across the spine line
  ctx.save();
  ctx.lineCap = 'butt';
  for (let i = 0; i < 4; i++) {
    const t0 = 0.15 + i * 0.22;
    const x0 = joints.spine.x + (joints.spine.tipX - joints.spine.x) * t0;
    const y0 = joints.spine.y + (joints.spine.tipY - joints.spine.y) * t0;
    const dx = (joints.spine.tipX - joints.spine.x) * 0.09;
    const dy = (joints.spine.tipY - joints.spine.y) * 0.09;
    ctx.strokeStyle = ROSTAM_PAL.peltStripe;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x0 - dy * 2.1, y0 + dx * 2.1);
    ctx.lineTo(x0 + dy * 2.1, y0 - dx * 2.1);
    ctx.stroke();
  }
  ctx.restore();

  // ---- front leg ----
  limb(ctx, joints.legF1, 10, ROSTAM_PAL.leather);
  limb(ctx, joints.legF2, 9, ROSTAM_PAL.boot);
  ctx.save();
  ctx.translate(joints.legF2.tipX, joints.legF2.tipY);
  ctx.rotate(joints.legF2.angle);
  ctx.fillStyle = ROSTAM_PAL.boot;
  ctx.fillRect(-3, -4, 13, 7);
  ctx.restore();

  // ---- belt & skirt (پوست ببر) ----
  const hipX = joints.spine.x, hipY = joints.spine.y;
  blob(ctx, hipX, hipY + 4, 11, 6, ROSTAM_PAL.pelt);
  blob(ctx, hipX, hipY + 4, 11, 6, 'rgba(0,0,0,0)');
  ctx.strokeStyle = ROSTAM_PAL.gold;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(hipX - 10, hipY + 2);
  ctx.lineTo(hipX + 10, hipY + 2);
  ctx.stroke();
  // pelt skirt flaps
  ctx.fillStyle = ROSTAM_PAL.pelt;
  ctx.beginPath();
  ctx.moveTo(hipX - 9, hipY + 4);
  ctx.lineTo(hipX - 4, hipY + 4);
  ctx.lineTo(hipX - 6, hipY + 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = ROSTAM_PAL.peltStripe;
  ctx.fillRect(hipX - 8, hipY + 8, 3, 2);

  // ---- front arm + GRZ-E GAVSAR (ox-headed mace) ----
  limb(ctx, joints.armF1, 9, ROSTAM_PAL.leather);
  limb(ctx, joints.armF2, 8, ROSTAM_PAL.skin);
  const handX = joints.armF2.tipX, handY = joints.armF2.tipY;
  const gripA = joints.armF2.angle;
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(gripA);
  // handle
  ctx.strokeStyle = ROSTAM_PAL.leatherDark;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(16, 0); ctx.stroke();
  // head of the mace
  ctx.fillStyle = ROSTAM_PAL.mace;
  ctx.beginPath();
  ctx.ellipse(22, 0, 9, 6.5, 0, 0, TAU);
  ctx.fill();
  // ox horns
  ctx.strokeStyle = ROSTAM_PAL.maceDark;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(18, -5); ctx.quadraticCurveTo(22, -14, 28, -12); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(18, 5); ctx.quadraticCurveTo(22, 14, 28, 12); ctx.stroke();
  // gold bands
  ctx.fillStyle = ROSTAM_PAL.gold;
  ctx.fillRect(12, -3, 3, 6);
  ctx.restore();

  // ---- head (helmet + hair + beard) ----
  const hx = joints.head.tipX, hy = joints.head.tipY;
  blob(ctx, hx, hy, 8.5, 9.5, ROSTAM_PAL.skin);
  // beard
  ctx.fillStyle = ROSTAM_PAL.beard;
  ctx.beginPath();
  ctx.ellipse(hx - 2, hy + 7, 6.5, 7.5, 0.2, 0, TAU);
  ctx.fill();
  // hair mass
  blob(ctx, hx - 4, hy - 3, 7.5, 8, ROSTAM_PAL.hair);
  // simple bronze helm band
  ctx.strokeStyle = ROSTAM_PAL.bronze;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hx, hy - 1, 8.5, -2.4, -0.6);
  ctx.stroke();
  // eye
  ctx.fillStyle = '#0d0a08';
  ctx.fillRect(hx + 2, hy - 2, 2.4, 2.4);

  ctx.restore();
}

// ============================================================
// RAKHSH — black stallion with white star on forehead
// ============================================================
export const RAKHSH_PAL = {
  coat: '#17141a', coatLight: '#262230', mane: '#0c0a0f',
  hoof: '#2e2a33', star: '#f2ede2', eye: '#c9a13b',
};

export function paintRakhsh(ctx, joints, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const bx = (joints.legFL.x + joints.legBL.x) / 2;
  const by = (joints.legFL.y + joints.legBL.y) / 2 - 12;

  // far-side legs first (slightly darker)
  limb(ctx, joints.legBR, 8, '#100e14');
  limb(ctx, joints.legFR, 8, '#100e14');

  // tail
  ctx.strokeStyle = RAKHSH_PAL.mane;
  ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(joints.tail.x, joints.tail.y);
  ctx.quadraticCurveTo(
    (joints.tail.x + joints.tail.tipX) / 2 - 6, (joints.tail.y + joints.tail.tipY) / 2 + 4,
    joints.tail.tipX, joints.tail.tipY
  );
  ctx.stroke();

  // body
  blob(ctx, bx, by, 34, 15, RAKHSH_PAL.coat, 0.03);
  // chest & haunch shading
  blob(ctx, bx + 22, by + 2, 13, 12, RAKHSH_PAL.coat);
  blob(ctx, bx - 24, by + 1, 15, 13, RAKHSH_PAL.coat);

  // neck
  limb(ctx, joints.neck, 13, RAKHSH_PAL.coat);
  // mane along neck
  ctx.strokeStyle = RAKHSH_PAL.mane;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(joints.neck.x - 2, joints.neck.y - 4);
  ctx.quadraticCurveTo(
    (joints.neck.x + joints.neck.tipX) / 2 - 6, (joints.neck.y + joints.neck.tipY) / 2 - 6,
    joints.neck.tipX - 2, joints.neck.tipY - 4
  );
  ctx.stroke();

  // head
  limb(ctx, joints.head, 10, RAKHSH_PAL.coat);
  blob(ctx, joints.head.tipX, joints.head.tipY, 8, 6, RAKHSH_PAL.coat, joints.head.angle);
  // ears
  ctx.fillStyle = RAKHSH_PAL.coat;
  ctx.beginPath();
  ctx.moveTo(joints.head.tipX - 4, joints.head.tipY - 3);
  ctx.lineTo(joints.head.tipX - 7, joints.head.tipY - 11);
  ctx.lineTo(joints.head.tipX - 1, joints.head.tipY - 5);
  ctx.closePath(); ctx.fill();
  // white star on forehead — Rakhsh's mark from the Shahnameh
  ctx.fillStyle = RAKHSH_PAL.star;
  ctx.beginPath();
  const sx = joints.head.tipX + 2, sy = joints.head.tipY - 3;
  for (let i = 0; i < 5; i++) {
    const a = -P92 + i * (TAU / 5);
    const a2 = a + TAU / 10;
    ctx.lineTo(sx + Math.cos(a) * 3.2, sy + Math.sin(a) * 3.2);
    ctx.lineTo(sx + Math.cos(a2) * 1.4, sy + Math.sin(a2) * 1.4);
  }
  ctx.closePath(); ctx.fill();
  // eye
  ctx.fillStyle = RAKHSH_PAL.eye;
  ctx.fillRect(joints.head.tipX + 4, joints.head.tipY - 1, 2, 2);

  // near-side legs
  limb(ctx, joints.legFL, 9, RAKHSH_PAL.coat);
  limb(ctx, joints.legBL, 9, RAKHSH_PAL.coat);
  ctx.fillStyle = RAKHSH_PAL.hoof;
  [[joints.legFL], [joints.legBL], [joints.legFR], [joints.legBR]].forEach(([j]) => {
    ctx.fillRect(j.tipX - 3, j.tipY - 2, 7, 5);
  });

  ctx.restore();
}

// ============================================================
// LION
// ============================================================
export const LION_PAL = {
  coat: '#c08b3e', coatLight: '#d4a459', coatDark: '#8f6528',
  mane: '#5e3a14', maneDark: '#462a0c',
  eye: '#2a1508', teeth: '#f2ede2', claw: '#e8dcc8',
};

export function paintLion(ctx, joints, alpha = 1, hurtFlash = 0) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const bx = (joints.legFL.x + joints.legBL.x) / 2;
  const by = (joints.legFL.y + joints.legBL.y) / 2 - 10;

  // far legs
  limb(ctx, joints.legBR, 9, LION_PAL.coatDark);
  limb(ctx, joints.legFR, 9, LION_PAL.coatDark);

  // tail with tuft
  limb(ctx, joints.tail1, 4.5, LION_PAL.coat);
  limb(ctx, joints.tail2, 4, LION_PAL.coat);
  blob(ctx, joints.tail2.tipX, joints.tail2.tipY, 5, 5, LION_PAL.mane);

  // body
  blob(ctx, bx, by, 36, 16, hurtFlash > 0 ? '#e88' : LION_PAL.coat, 0.04);
  blob(ctx, bx - 25, by + 2, 14, 13, hurtFlash > 0 ? '#e88' : LION_PAL.coat);
  // belly light
  blob(ctx, bx + 2, by + 8, 26, 7, LION_PAL.coatLight);

  // neck + mane behind head
  limb(ctx, joints.neck, 15, LION_PAL.coat);
  const hx = joints.head.tipX, hy = joints.head.tipY;
  const nx = joints.neck.tipX, ny = joints.neck.tipY;
  blob(ctx, (nx + hx) / 2 - 3, (ny + hy) / 2, 19, 19, LION_PAL.mane);
  blob(ctx, hx - 4, hy - 2, 15, 15, LION_PAL.mane);

  // head
  blob(ctx, hx, hy, 11.5, 10, hurtFlash > 0 ? '#e88' : LION_PAL.coatLight, joints.head.angle);
  // muzzle
  blob(ctx, hx + 9, hy + 3, 7, 5.5, LION_PAL.coatLight, joints.head.angle);
  ctx.fillStyle = LION_PAL.eye;
  ctx.fillRect(hx + 2, hy - 4, 2.6, 2.6);
  // jaw with teeth
  limb(ctx, joints.jaw, 5, LION_PAL.coatLight);
  const jx = joints.jaw.tipX, jy = joints.jaw.tipY;
  ctx.fillStyle = LION_PAL.teeth;
  ctx.fillRect(hx + 12, hy + 5, 2.4, 3);
  ctx.fillRect(jx + 1, jy - 1, 2.4, 3);

  // near legs
  limb(ctx, joints.legFL, 10, LION_PAL.coat);
  limb(ctx, joints.legBL, 10, LION_PAL.coat);

  ctx.restore();
}

// ============================================================
// JACKAL
// ============================================================
export const JACKAL_PAL = {
  coat: '#8a6d4a', coatLight: '#a3835c', dark: '#5e4a30',
  eye: '#d8b23a',
};

export function paintJackal(ctx, joints, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const bx = (joints.legF.x + joints.legB.x) / 2;
  const by = (joints.legF.y + joints.legB.y) / 2 - 7;

  limb(ctx, joints.legB, 5, JACKAL_PAL.dark);
  limb(ctx, joints.tail, 4, JACKAL_PAL.dark);
  blob(ctx, bx, by, 19, 9, JACKAL_PAL.coat, 0.03);
  limb(ctx, joints.neck, 8, JACKAL_PAL.coat);
  const hx = joints.head.tipX, hy = joints.head.tipY;
  blob(ctx, joints.head.tipX * 0.5 + joints.neck.tipX * 0.5, joints.head.tipY * 0.5 + joints.neck.tipY * 0.5, 7.5, 7, JACKAL_PAL.coat);
  // pointed snout
  blob(ctx, hx + 6, hy + 2, 7, 3.5, JACKAL_PAL.coatLight, joints.head.angle);
  // ears
  ctx.fillStyle = JACKAL_PAL.dark;
  ctx.beginPath();
  ctx.moveTo(hx - 5, hy - 4); ctx.lineTo(hx - 2, hy - 13); ctx.lineTo(hx + 2, hy - 4);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = JACKAL_PAL.eye;
  ctx.fillRect(hx + 1, hy - 2, 2, 2);
  limb(ctx, joints.legF, 5.5, JACKAL_PAL.coat);
  ctx.restore();
}

// ============================================================
// PROPS — ruins, braziers (procedural Persian architecture)
// ============================================================
export function paintColumn(ctx, x, groundY, h = 150, seedShift = 0) {
  // Achaemenid-style column
  const w = 26;
  ctx.fillStyle = '#4d4141';
  ctx.fillRect(x - w / 2, groundY - h, w, h);
  // fluting
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + i * (w / 4), groundY - h + 8);
    ctx.lineTo(x - w / 2 + i * (w / 4), groundY - 4);
    ctx.stroke();
  }
  // capital (double bull protome hint — abstracted)
  ctx.fillStyle = '#5d4f4f';
  ctx.fillRect(x - w / 2 - 6, groundY - h - 12, w + 12, 12);
  ctx.fillStyle = '#6d5c5c';
  ctx.beginPath();
  ctx.ellipse(x - 14, groundY - h - 18, 9, 8, 0, Math.PI, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 14, groundY - h - 18, 9, 8, 0, Math.PI, 0);
  ctx.fill();
  // base
  ctx.fillStyle = '#5d4f4f';
  ctx.fillRect(x - w / 2 - 5, groundY - 10, w + 10, 10);
}

export function paintBrazier(ctx, x, groundY, t) {
  // standing fire bowl with animated flames
  const y = groundY - 34;
  ctx.strokeStyle = '#3c3232';
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x, y); ctx.stroke();
  ctx.fillStyle = '#4c3d3d';
  ctx.beginPath();
  ctx.ellipse(x, y, 16, 7, 0, 0, TAU);
  ctx.fill();
  // flames (3 layered flickers)
  for (let i = 0; i < 3; i++) {
    const fh = 18 + 9 * Math.sin(t * 9 + i * 2.1 + x) + i * 4;
    const fw = 10 - i * 2.5;
    const fx = x + Math.sin(t * 13 + i * 1.7) * 2;
    const grad = ctx.createLinearGradient(fx, y - fh, fx, y);
    grad.addColorStop(0, i === 0 ? '#ffd700' : i === 1 ? '#ff9d2e' : '#e8542a');
    grad.addColorStop(1, 'rgba(232,84,42,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(fx - fw, y - 2);
    ctx.quadraticCurveTo(fx - fw * 0.4, y - fh * 0.55, fx, y - fh);
    ctx.quadraticCurveTo(fx + fw * 0.4, y - fh * 0.55, fx + fw, y - 2);
    ctx.closePath();
    ctx.fill();
  }
}

export function paintShrub(ctx, x, groundY, seed = 1) {
  ctx.strokeStyle = '#6d5a35';
  ctx.lineWidth = 2;
  const s = 10 + seed * 4;
  for (let i = 0; i < 5; i++) {
    const a = -P92 + (i - 2) * 0.42;
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.quadraticCurveTo(x + Math.cos(a) * s * 0.5, groundY - s * 0.7, x + Math.cos(a) * s, groundY - s);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a713f';
  for (let i = 0; i < 4; i++) {
    const a = -P92 + (i - 1.5) * 0.5;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * s * 0.9, groundY - s * 0.95, 3, 2, a, 0, TAU);
    ctx.fill();
  }
}

export function paintRock(ctx, x, groundY, s = 1) {
  ctx.fillStyle = '#584a44';
  ctx.beginPath();
  ctx.moveTo(x - 16 * s, groundY);
  ctx.quadraticCurveTo(x - 14 * s, groundY - 14 * s, x - 3 * s, groundY - 16 * s);
  ctx.quadraticCurveTo(x + 12 * s, groundY - 15 * s, x + 15 * s, groundY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(x - 8 * s, groundY - 10 * s);
  ctx.quadraticCurveTo(x - 3 * s, groundY - 15 * s, x + 4 * s, groundY - 13 * s);
  ctx.quadraticCurveTo(x, groundY - 9 * s, x - 8 * s, groundY - 10 * s);
  ctx.fill();
}
