// rigs.js — character rig definitions + animation clips (all hand-authored)
// Angles: radians, 0 = right, positive = clockwise (canvas y-down).
// Poses are DELTAS from each bone's rest angle.

import { Rig, Clip } from '../gfx/rig.js';

const P2 = Math.PI / 2;

// ============================================================
// ROSTAM — hip origin (feet ≈ hip + 52px down)
// ============================================================
const rostamDef = {
  bones: [
    { name: 'spine',  parent: null,    ox: 0,  oy: 0,  angle: -P2 + 0.06, len: 30 },
    { name: 'neck',   parent: 'spine', ox: 0,  oy: 0,  angle: -P2 + 0.10, len: 9 },
    { name: 'head',   parent: 'neck',  ox: 0,  oy: 0,  angle: -P2,        len: 12 },

    { name: 'armB1',  parent: 'spine', ox: -2, oy: 2,  angle: P2 + 0.9,   len: 19 },  // back arm
    { name: 'armB2',  parent: 'armB1', ox: 0,  oy: 0,  angle: -0.25,      len: 17 },

    { name: 'armF1',  parent: 'spine', ox: 3,  oy: 3,  angle: P2 - 0.75,  len: 19 },  // front (mace) arm
    { name: 'armF2',  parent: 'armF1', ox: 0,  oy: 0,  angle: 0.35,       len: 17 },

    { name: 'legB1',  parent: null,    ox: -3, oy: 0,  angle: P2 + 0.28,  len: 26 },  // back leg
    { name: 'legB2',  parent: 'legB1', ox: 0,  oy: 0,  angle: -0.12,      len: 26 },

    { name: 'legF1',  parent: null,    ox: 3,  oy: 0,  angle: P2 - 0.22,  len: 26 },  // front leg
    { name: 'legF2',  parent: 'legF1', ox: 0,  oy: 0,  angle: 0.14,       len: 26 },
  ],
};

function K(t, pose) { return { t, pose }; }

const rostamClips = {
  idle: new Clip(2.4, true, [
    K(0,   { spine: 0.05, armF1: 0.06, armF2: 0.10, armB1: -0.06, head: 0.04 }),
    K(0.5, { spine: -0.04, armF1: -0.05, armF2: -0.08, armB1: 0.05, head: -0.03 }),
    K(1,   { spine: 0.05, armF1: 0.06, armF2: 0.10, armB1: -0.06, head: 0.04 }),
  ]),
  run: new Clip(0.55, true, [
    K(0,    { legF1: 0.55, legF2: 0.75, legB1: -0.55, legB2: -0.55, armF1: -0.85, armF2: -0.5, armB1: 0.8, armB2: -0.6, spine: 0.16 }),
    K(0.25, { legF1: 0.05, legF2: 0.05, legB1: -0.05, legB2: 0.45, armF1: -0.25, armF2: -0.2, armB1: 0.25, armB2: -0.3, spine: 0.18 }),
    K(0.5,  { legF1: -0.55, legF2: -0.55, legB1: 0.55, legB2: 0.75, armF1: 0.55, armF2: 0.3, armB1: -0.7, armB2: 0.5, spine: 0.16 }),
    K(0.75, { legF1: -0.05, legF2: 0.35, legB1: 0.05, legB2: 0.05, armF1: 0.15, armF2: 0.1, armB1: -0.2, armB2: 0.2, spine: 0.18 }),
    K(1,    { legF1: 0.55, legF2: 0.75, legB1: -0.55, legB2: -0.55, armF1: -0.85, armF2: -0.5, armB1: 0.8, armB2: -0.6, spine: 0.16 }),
  ]),
  jump: new Clip(0.3, false, [
    K(0,   { legF1: 0.3, legF2: 0.8, legB1: -0.25, legB2: 0.7, armF1: -0.5, armB1: 0.4, spine: 0.05 }),
    K(0.4, { legF1: -0.5, legF2: 1.15, legB1: -0.7, legB2: 1.0, armF1: -1.4, armF2: -0.4, armB1: 1.3, spine: -0.08 }),
    K(1,   { legF1: -0.2, legF2: 0.7, legB1: -0.35, legB2: 0.65, armF1: -1.1, armB1: 1.0, spine: -0.05 }),
  ]),
  fall: new Clip(0.5, true, [
    K(0,   { legF1: -0.15, legF2: 0.5, legB1: -0.3, legB2: 0.45, armF1: -1.3, armF2: 0.3, armB1: 1.35, armB2: -0.3, spine: -0.04 }),
    K(0.5, { legF1: -0.3, legF2: 0.55, legB1: -0.15, legB2: 0.5, armF1: -1.45, armF2: 0.4, armB1: 1.5, armB2: -0.35, spine: -0.02 }),
    K(1,   { legF1: -0.15, legF2: 0.5, legB1: -0.3, legB2: 0.45, armF1: -1.3, armF2: 0.3, armB1: 1.35, armB2: -0.3, spine: -0.04 }),
  ]),
  attack1: new Clip(0.34, false, [   // horizontal forehand swing
    K(0,    { armF1: -1.9, armF2: 1.1, spine: -0.14, legF1: -0.2, legB1: 0.3 }),
    K(0.35, { armF1: -2.5, armF2: 1.5, spine: -0.22, legF1: -0.3, legB1: 0.4 }),
    K(0.62, { armF1: 1.25, armF2: 0.35, spine: 0.22, legF1: 0.35, legB1: -0.25 }),
    K(1,    { armF1: 0.9, armF2: 0.4, spine: 0.1, legF1: 0.1, legB1: -0.05 }),
  ]),
  attack2: new Clip(0.32, false, [   // backhand return
    K(0,    { armF1: 1.15, armF2: 0.5, spine: 0.2 }),
    K(0.3,  { armF1: 1.45, armF2: 0.8, spine: 0.28, legF1: 0.3 }),
    K(0.6,  { armF1: -1.35, armF2: 0.3, spine: -0.24, legF1: -0.3 }),
    K(1,    { armF1: -0.7, armF2: 0.3, spine: -0.1 }),
  ]),
  attack3: new Clip(0.52, false, [   // overhead smash
    K(0,    { armF1: -1.2, armF2: 0.6, armB1: -0.6, spine: -0.18 }),
    K(0.32, { armF1: -2.9, armF2: 0.7, armB1: -2.4, spine: -0.3, legF1: -0.35, legB1: 0.35 }),
    K(0.6,  { armF1: 1.5, armF2: 0.5, armB1: 1.2, spine: 0.34, legF1: 0.4, legB1: -0.3 }),
    K(1,    { armF1: 1.15, armF2: 0.45, armB1: 0.9, spine: 0.18 }),
  ]),
  bowDraw: new Clip(0.22, false, [
    K(0,   { armF1: -P2 + 0.15, armF2: 0.05, armB1: P2 - 0.9, armB2: -1.1, spine: -0.06 }),
    K(1,   { armF1: -P2 + 0.1, armF2: 0.0, armB1: P2 - 0.45, armB2: -1.5, spine: -0.1 }),
  ]),
  bowHold: new Clip(0.5, true, [
    K(0,  { armF1: -P2 + 0.1, armF2: 0.0, armB1: P2 - 0.45, armB2: -1.5, spine: -0.1 }),
    K(1,  { armF1: -P2 + 0.1, armF2: 0.0, armB1: P2 - 0.45, armB2: -1.5, spine: -0.1 }),
  ]),
  bowShot: new Clip(0.18, false, [
    K(0,   { armF1: -P2 + 0.1, armF2: 0.0, armB1: P2 - 0.45, armB2: -1.5, spine: -0.1 }),
    K(0.4, { armF1: -P2 + 0.12, armF2: 0.0, armB1: P2 - 0.95, armB2: -0.2, spine: 0.04 }),
    K(1,   { armF1: -P2 + 0.3, armF2: 0.1, armB1: P2 - 0.7, armB2: -0.3, spine: 0.0 }),
  ]),
  hurt: new Clip(0.32, false, [
    K(0,   { spine: -0.3, head: -0.3, armF1: -0.9, armB1: 1.1, legF1: -0.3 }),
    K(0.4, { spine: -0.45, head: -0.4, armF1: -1.2, armB1: 1.4, legF1: -0.45, legB1: 0.4 }),
    K(1,   { spine: -0.1, head: -0.1, armF1: -0.4, armB1: 0.5 }),
  ]),
  mount: new Clip(0.55, false, [
    K(0,   { legF1: 0.7, legB1: -0.7, armF1: -1.6, armB1: 1.6 }),
    K(0.5, { legF1: 1.0, legB1: -1.0, armF1: -2.1, armB1: 2.1 }),
    K(1,   { legF1: 0.45, legF2: 0.9, legB1: -0.45, legB2: 0.9, armF1: -0.9, armB1: 0.9, spine: 0.1 }),
  ]),
  // ---- finisher cinematic clips (QTE success) ----
  finishLeap: new Clip(0.55, false, [
    K(0,   { armF1: -1.4, armF2: 0.6, armB1: 0.9, legF1: 0.45, legB1: -0.4, spine: -0.12 }),
    K(0.5, { armF1: -2.7, armF2: 0.5, armB1: 2.3, legF1: 0.95, legF2: 1.15, legB1: -0.95, legB2: 0.85, spine: -0.24, head: -0.15 }),
    K(1,   { armF1: -2.8, armF2: 0.5, armB1: 2.35, legF1: 1.0, legF2: 1.15, legB1: -1.0, legB2: 0.9, spine: -0.26, head: -0.18 }),
  ]),
  finishSlam: new Clip(0.42, false, [
    K(0,    { armF1: -2.8, armF2: 0.5, armB1: 2.35, legF1: 1.0, legF2: 1.15, legB1: -1.0, legB2: 0.9, spine: -0.26, head: -0.18 }),
    K(0.5,  { armF1: 1.55, armF2: 0.4, armB1: 1.15, legF1: 0.55, legF2: 0.95, legB1: -0.6, legB2: 0.65, spine: 0.46, head: 0.2 }),
    K(1,    { armF1: 1.3, armF2: 0.4, armB1: 0.9, legF1: 0.5, legF2: 0.8, legB1: -0.5, legB2: 0.55, spine: 0.3, head: 0.1 }),
  ]),
};

export const ROSTAM_RIG = new Rig(rostamDef);
export const ROSTAM_CLIPS = rostamClips;
export const ROSTAM_HIP_H = 52;   // hip height above feet

// ============================================================
// RAKHSH — the black stallion, body-center origin
// ============================================================
const rakhshDef = {
  bones: [
    { name: 'neck',   parent: null,   ox: 26,  oy: -14, angle: -2.45, len: 24 },
    { name: 'head',   parent: 'neck', ox: 0,   oy: 0,   angle: 0.55,  len: 18 },
    { name: 'tail',   parent: null,   ox: -30, oy: -10, angle: 2.35,  len: 26 },

    { name: 'legFL',  parent: null,   ox: 22,  oy: 12,  angle: P2 + 0.1,  len: 22 },
    { name: 'legBL',  parent: null,   ox: -24, oy: 12,  angle: P2 - 0.1,  len: 22 },
    { name: 'legFR',  parent: null,   ox: 26,  oy: 10,  angle: P2 - 0.15, len: 22 },
    { name: 'legBR',  parent: null,   ox: -20, oy: 10,  angle: P2 + 0.15, len: 22 },
  ],
};

const rakhshClips = {
  idle: new Clip(3.0, true, [
    K(0,   { neck: 0.05, head: 0.03, tail: 0.08 }),
    K(0.5, { neck: -0.05, head: -0.04, tail: -0.1 }),
    K(1,   { neck: 0.05, head: 0.03, tail: 0.08 }),
  ]),
  gallop: new Clip(0.46, true, [
    K(0,    { legFL: 0.85, legFR: -0.35, legBL: -0.5, legBR: 0.55, neck: 0.12, tail: -0.25 }),
    K(0.25, { legFL: -0.45, legFR: 0.3, legBL: 0.5, legBR: -0.3, neck: -0.1, tail: 0.1 }),
    K(0.5,  { legFL: 0.2, legFR: -0.6, legBL: 0.75, legBR: -0.55, neck: 0.05, tail: -0.15 }),
    K(0.75, { legFL: -0.55, legFR: 0.45, legBL: 0.1, legBR: 0.2, neck: -0.08, tail: 0.05 }),
    K(1,    { legFL: 0.85, legFR: -0.35, legBL: -0.5, legBR: 0.55, neck: 0.12, tail: -0.25 }),
  ]),
};

export const RAKHSH_RIG = new Rig(rakhshDef);
export const RAKHSH_CLIPS = rakhshClips;

// ============================================================
// LION — Trial I boss, body-center origin
// ============================================================
const lionDef = {
  bones: [
    { name: 'neck',   parent: null,   ox: 34,  oy: -16, angle: -2.75, len: 18 },
    { name: 'head',   parent: 'neck', ox: 0,   oy: 0,   angle: 0.45,  len: 20 },
    { name: 'jaw',    parent: 'head', ox: 0,   oy: 0,   angle: 0.35,  len: 12 },
    { name: 'tail1',  parent: null,   ox: -36, oy: -12, angle: 2.9,   len: 20 },
    { name: 'tail2',  parent: 'tail1', ox: 0,  oy: 0,   angle: -0.4,  len: 16 },

    { name: 'legFL',  parent: null,   ox: 26,  oy: 14,  angle: P2 + 0.15, len: 20 },
    { name: 'legBL',  parent: null,   ox: -28, oy: 12,  angle: P2 - 0.15, len: 20 },
    { name: 'legFR',  parent: null,   ox: 30,  oy: 11,  angle: P2 - 0.2,  len: 20 },
    { name: 'legBR',  parent: null,   ox: -24, oy: 9,   angle: P2 + 0.2,  len: 20 },
  ],
};

const lionClips = {
  prowl: new Clip(1.15, true, [
    K(0,    { legFL: 0.5, legFR: -0.3, legBL: -0.45, legBR: 0.4, neck: 0.06, tail1: 0.15, tail2: -0.3, head: 0.05 }),
    K(0.25, { legFL: 0.0, legFR: 0.05, legBL: 0.0, legBR: 0.0, neck: 0.02, tail1: -0.05, tail2: 0.2 }),
    K(0.5,  { legFL: -0.45, legFR: 0.45, legBL: 0.5, legBR: -0.4, neck: -0.06, tail1: -0.2, tail2: 0.35, head: -0.04 }),
    K(0.75, { legFL: 0.0, legFR: -0.05, legBL: 0.05, legBR: 0.0, neck: 0.02, tail1: 0.1, tail2: -0.15 }),
    K(1,    { legFL: 0.5, legFR: -0.3, legBL: -0.45, legBR: 0.4, neck: 0.06, tail1: 0.15, tail2: -0.3, head: 0.05 }),
  ]),
  crouch: new Clip(0.55, false, [   // telegraph before pounce
    K(0,   { legFL: 0.3, legBL: -0.25, neck: 0.1, head: 0.05 }),
    K(0.7, { legFL: 1.1, legBL: -0.9, neck: 0.35, head: -0.25, tail1: 0.4 }),
    K(1,   { legFL: 1.15, legBL: -0.95, neck: 0.38, head: -0.28, tail1: 0.45, tail2: 0.3 }),
  ]),
  pounce: new Clip(0.55, false, [
    K(0,   { legFL: 1.15, legBL: -0.95, neck: 0.38, head: -0.28 }),
    K(0.3, { legFL: -1.0, legFR: -0.8, legBL: 0.9, legBR: 0.7, neck: -0.5, head: 0.3, tail1: -0.5 }),
    K(0.7, { legFL: -0.7, legFR: -0.5, legBL: 0.55, legBR: 0.45, neck: -0.3, head: 0.2 }),
    K(1,   { legFL: 0.4, legBL: -0.3, neck: 0.15, head: 0.0 }),
  ]),
  swipe: new Clip(0.4, false, [
    K(0,   { legFR: -0.5, neck: -0.15 }),
    K(0.35, { legFR: -2.2, neck: -0.35, head: -0.2 }),
    K(0.65, { legFR: 0.9, neck: 0.2, head: 0.15 }),
    K(1,   { legFR: -0.2, neck: 0.0 }),
  ]),
  roar: new Clip(1.0, false, [
    K(0,    { neck: -0.2, jaw: 0.2, head: -0.1 }),
    K(0.3,  { neck: -0.85, jaw: 1.15, head: -0.35, tail1: -0.45, tail2: 0.5 }),
    K(0.6,  { neck: -0.75, jaw: 1.0, head: -0.3, tail1: -0.3, tail2: 0.35 }),
    K(0.75, { neck: -0.8, jaw: 1.1, head: -0.32 }),
    K(1,    { neck: -0.1, jaw: 0.15, head: -0.05 }),
  ]),
  hurt: new Clip(0.3, false, [
    K(0,   { neck: 0.3, head: 0.25, spineShake: 0 }),
    K(0.5, { neck: 0.1, head: 0.1 }),
    K(1,   { neck: 0.0, head: 0.0 }),
  ]),
  die: new Clip(0.9, false, [
    K(0,   { neck: 0.1, head: 0.05, legFL: 0.3 }),
    K(0.5, { neck: 0.6, head: 0.4, jaw: 0.6, legFL: 1.0, legBL: -0.8, tail1: 0.5 }),
    K(1,   { neck: 0.85, head: 0.5, jaw: 0.8, legFL: 1.3, legBL: -1.1, legFR: 1.1, legBR: -0.9, tail1: 0.7, tail2: 0.6 }),
  ]),
  // kneeling, dizzy — the finisher window
  stagger: new Clip(1.7, true, [
    K(0,   { legFL: 1.15, legBL: -1.1, legFR: 1.0, legBR: -0.95, neck: 0.5, head: 0.32, jaw: 0.15, tail1: 0.4 }),
    K(0.5, { legFL: 1.24, legBL: -1.18, legFR: 1.08, legBR: -1.02, neck: 0.6, head: 0.4, jaw: 0.08, tail1: 0.3, tail2: -0.2 }),
    K(1,   { legFL: 1.15, legBL: -1.1, legFR: 1.0, legBR: -0.95, neck: 0.5, head: 0.32, jaw: 0.15, tail1: 0.4 }),
  ]),
};

export const LION_RIG = new Rig(lionDef);
export const LION_CLIPS = lionClips;
export const LION_BODY_H = 44;  // leg length + body half-height ≈ stand height

// ============================================================
// JACKAL — fast trash mob
// ============================================================
const jackalDef = {
  bones: [
    { name: 'neck',   parent: null,  ox: 18,  oy: -8,  angle: -2.7,  len: 10 },
    { name: 'head',   parent: 'neck', ox: 0,  oy: 0,   angle: 0.35,  len: 12 },
    { name: 'tail',   parent: null,  ox: -20, oy: -6,  angle: 3.4,   len: 16 },
    { name: 'legF',   parent: null,  ox: 14,  oy: 8,   angle: P2 + 0.12, len: 14 },
    { name: 'legB',   parent: null,  ox: -16, oy: 8,   angle: P2 - 0.12, len: 14 },
  ],
};

const jackalClips = {
  run: new Clip(0.32, true, [
    K(0,   { legF: 0.6, legB: -0.5, tail: 0.2, neck: 0.08 }),
    K(0.5, { legF: -0.5, legB: 0.55, tail: -0.25, neck: -0.08 }),
    K(1,   { legF: 0.6, legB: -0.5, tail: 0.2, neck: 0.08 }),
  ]),
  lunge: new Clip(0.35, false, [
    K(0,   { legF: 0.5, legB: -0.4, neck: 0.2 }),
    K(0.35, { legF: -1.1, legB: 0.8, neck: -0.45, head: 0.3, tail: -0.4 }),
    K(1,   { legF: -0.6, legB: 0.5, neck: -0.2 }),
  ]),
  die: new Clip(0.5, false, [
    K(0,  {}),
    K(1,  { legF: 1.2, legB: -1.0, neck: 0.8, head: 0.5, tail: 0.6 }),
  ]),
  // Pack Alpha extras: howl summon + staggered finisher window
  howl: new Clip(1.0, false, [
    K(0,    { neck: 0.1, head: 0.05 }),
    K(0.3,  { neck: -0.75, head: -0.3, tail: -0.35, legF: -0.2 }),
    K(0.75, { neck: -0.68, head: -0.26, tail: -0.28, legF: -0.15 }),
    K(1,    { neck: 0.05, head: 0.0, tail: 0.0 }),
  ]),
  stagger: new Clip(1.7, true, [
    K(0,   { legF: 0.95, legB: -0.9, neck: 0.55, head: 0.35, tail: 0.4 }),
    K(0.5, { legF: 1.05, legB: -1.0, neck: 0.64, head: 0.42, tail: 0.28 }),
    K(1,   { legF: 0.95, legB: -0.9, neck: 0.55, head: 0.35, tail: 0.4 }),
  ]),
};

export const JACKAL_RIG = new Rig(jackalDef);
export const JACKAL_CLIPS = jackalClips;
