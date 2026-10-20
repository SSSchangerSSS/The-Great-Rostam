// models3d.js — procedural low-poly TOON characters for the 2.5D layer (Three.js)
//
// Characters are real 3D bodies (volumes, cel-shaded, lit) built from primitives.
// They are DRIVEN by the existing 2D rig system: Rig.compute() resolves joint
// positions/angles from the same Flash-school keyframe clips, and the adapter
// in gl3d.js maps each joint to a FLAT bone group:
//
//    boneGroup.position = (j.x, -j.y, zOff)      (canvas y-down → 3D y-up)
//    boneGroup.rotation.z = P2 - j.angle         (limb meshes point along -Y)
//
// Authoring conventions inside a bone group:
//  - LIMBS (arms/legs/tails): rotationally symmetric, built along local -Y —
//    they align with the bone at ANY rest angle automatically.
//  - FEATURES (torso, heads, gear): positioned via place() which takes WORLD
//    offsets (+X forward, +Y up, relative to the joint at rest) and converts
//    them into the bone's local frame, so what you write is what you see.
//
// The environment stays 2D (canvas) — this file builds the heroes & beasts only.

import { ROSTAM_RIG, ROSTAM_CLIPS } from '../content/rigs.js';

const THREE = window.THREE;
const P2 = Math.PI / 2;

// ---------- cel-shading gradient (4 hard steps — the toon look) --------------
let _grad = null;
function gradientMap() {
  if (_grad) return _grad;
  const d = new Uint8Array([95, 95, 95, 150, 150, 150, 210, 210, 210, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 4, 1, THREE.RGBFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  _grad = t;
  return t;
}

export function toonMat(color, opts = {}) {
  return new THREE.MeshToonMaterial(Object.assign({ color, gradientMap: gradientMap() }, opts));
}

// leopard pelt canvas texture (Rostam's babr-e bayan)
let _peltTex = null;
function peltTexture() {
  if (_peltTex) return _peltTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#c97a22'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#241407';
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 26; i++) {
    const px = rnd() * 64, py = rnd() * 64, r = 2 + rnd() * 3.4;
    x.beginPath(); x.ellipse(px, py, r * 1.5, r, rnd() * 3, 0, Math.PI * 2); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  _peltTex = t;
  return t;
}

// soft radial shadow sprite (vertical plane at the feet — side-scroller style)
let _shadowTex = null;
export function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 32, 4, 64, 32, 60);
  g.addColorStop(0, 'rgba(8,4,0,0.55)');
  g.addColorStop(0.55, 'rgba(8,4,0,0.3)');
  g.addColorStop(1, 'rgba(8,4,0,0)');
  x.translate(64, 32); x.scale(1, 0.5);
  x.fillStyle = g;
  x.beginPath(); x.arc(0, 0, 62, 0, Math.PI * 2); x.fill();
  _shadowTex = new THREE.CanvasTexture(c);
  return _shadowTex;
}

// ---------- tiny build helpers ----------
function cyl(rTop, rBottom, h, mat, x = 0, y = 0, z = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat);
  m.position.set(x, y, z);
  return m;
}
function sph(r, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, seg = 10) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), mat);
  m.position.set(x, y, z);
  m.scale.set(sx, sy, sz);
  return m;
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  return m;
}
function cone(r, h, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), mat);
  m.position.set(x, y, z);
  return m;
}
function boneGroup() { return new THREE.Group(); }

// place(mesh, restAngle, wx, wy, wrot):
//   position mesh at WORLD offset (wx,+up / wy,+fwd→+X) from the joint AS AT REST,
//   with world rotation wrot (0 = axis-aligned with world). Converts to bone-local.
function place(mesh, rest, wx, wy, wrot = 0) {
  const R = P2 - rest;
  const c = Math.cos(-R), s = Math.sin(-R);
  mesh.position.set(wx * c - wy * s, wx * s + wy * c, mesh.position.z);
  mesh.rotation.z = -R + wrot;
  return mesh;
}

// ============================================================
// ROSTAM — the hero (rig root = hip, 52px above feet)
// ============================================================
export function buildRostam() {
  const SKIN = toonMat('#c99263'), HAIR = toonMat('#241a12'), BEARD = toonMat('#1d130c');
  const LEATHER = toonMat('#5c4328'), LEATHER_D = toonMat('#47331e');
  const ARMOR = toonMat('#7d6a4a'), BRONZE = toonMat('#9a7b3f'), GOLD = toonMat('#e8b64c');
  const BOOT = toonMat('#3c2c1a'), IRON = toonMat('#8f8f96'), IRON_D = toonMat('#5c5c64');
  const PELT = toonMat('#ffffff', { map: peltTexture() });
  const HORN = toonMat('#d9cbb0'), TASSEL = toonMat('#b03030'), BOWM = toonMat('#7a5a30');
  const EYE_W = new THREE.MeshBasicMaterial({ color: '#f4efe2' });
  const EYE_B = new THREE.MeshBasicMaterial({ color: '#1a1208' });
  const mats = [SKIN, HAIR, BEARD, LEATHER, LEATHER_D, ARMOR, BRONZE, GOLD, BOOT, IRON, IRON_D, PELT, HORN, TASSEL, BOWM];

  const R_SPINE = -P2 + 0.06, R_NECK = -P2 + 0.10, R_HEAD = -P2;
  const R_AF1 = P2 - 0.75, R_AF2 = 0.35, R_LF2 = 0.14;

  const root = new THREE.Group();          // world position (set by adapter)
  const flip = new THREE.Group();          // rotation.y = PI when facing left
  const tumble = new THREE.Group();        // roll spin / death topple
  const squash = new THREE.Group();        // squash & stretch
  root.add(flip); flip.add(tumble); tumble.add(squash);

  const bones = {};
  const zOff = { armF1: 8, armF2: 8, armB1: -8, armB2: -8, legF1: 4.5, legF2: 4.5, legB1: -4.5, legB2: -4.5 };

  // ---- spine: torso stack + pelt + belt + bow (world coords from hip) ----
  const spine = boneGroup();
  spine.add(place(cyl(10, 12, 13, LEATHER, 0, 0, 0), R_SPINE, 0, 8));       // waist
  spine.add(place(cyl(12.5, 10.5, 17, PELT, 0, 0, 0), R_SPINE, 0, 21));     // chest — leopard pelt
  const belt = new THREE.Mesh(new THREE.TorusGeometry(9.8, 2.1, 8, 14), GOLD);
  belt.rotation.x = P2; spine.add(place(belt, R_SPINE, 0, 13.5));
  const peltDrape = box(15, 25, 1.4, PELT, 0, 0, -7.5);
  peltDrape.geometry.translate(0, -12.5, 0);                                // pivot = top edge
  spine.add(place(peltDrape, R_SPINE, -8.5, 25));
  const bowArc = new THREE.Mesh(new THREE.TorusGeometry(16, 1.7, 6, 16, Math.PI * 1.1), BOWM);
  bowArc.position.set(0, 0, -10.5);
  spine.add(place(bowArc, R_SPINE, -9, 17, 0.2));
  squash.add(spine); bones.spine = spine;

  // ---- neck ----
  const neck = boneGroup();
  neck.add(place(cyl(5.2, 6.4, 9, SKIN, 0, 0, 0), R_NECK, 0, 4.5));
  squash.add(neck); bones.neck = neck;

  // ---- head: skull + helmet + beard + eyes ----
  const head = boneGroup();
  head.add(place(box(18, 16.5, 17, SKIN, 0, 0, 0), R_HEAD, 1, 6.5));
  head.add(place(box(9.5, 13, 12, BEARD, 0, 0, 0), R_HEAD, 2.5, -1.5));     // beard mass
  head.add(place(box(7, 4, 12.6, HAIR, 0, 0, 0), R_HEAD, -3.5, 10.5));      // hair
  head.add(place(sph(10.4, BRONZE, 0, 0, 0, 1, 0.72, 1), R_HEAD, 0.5, 13.5)); // helmet dome
  head.add(place(box(7, 6, 1.4, GOLD, 0, 0, 0), R_HEAD, -2, 20.5));         // crest fin
  head.add(place(box(1.6, 5.5, 3, BRONZE, 0, 0, 0), R_HEAD, 10.5, 10));     // nose guard
  for (const s of [1, -1]) {
    const e = new THREE.Mesh(new THREE.CircleGeometry(1.9, 10), EYE_W);
    e.position.set(0, 0, s * 8.8); if (s < 0) e.rotation.y = Math.PI;
    head.add(place(e, R_HEAD, 6.8, 6.4));
    const p = new THREE.Mesh(new THREE.CircleGeometry(0.95, 8), EYE_B);
    p.position.set(0, 0, s * 9.05); if (s < 0) p.rotation.y = Math.PI;
    head.add(place(p, R_HEAD, 7.8, 6.4));
    head.add(place(box(4, 1.1, 0.9, HAIR, 0, 0, s * 8.9), R_HEAD, 6.5, 9.3, s > 0 ? -0.12 : 0.12));
  }
  squash.add(head); bones.head = head;

  // ---- arms (flat bones; limbs built along local -Y) ----
  function arm(prefix) {
    const a1 = boneGroup();
    a1.add(sph(5.6, ARMOR, 0, 0.5, 0));                                     // pauldron
    a1.add(cyl(4.4, 3.9, 19, SKIN, 0, -9.5, 0));
    const a2 = boneGroup();                                                 // FLAT — positioned by rig
    a2.add(cyl(3.7, 3.1, 17, SKIN, 0, -8.5, 0));
    a2.add(sph(3.9, SKIN, 0, -17, 0));                                      // hand
    squash.add(a1); squash.add(a2);
    bones[prefix + '1'] = a1; bones[prefix + '2'] = a2;
    return a2;
  }
  const armF2 = arm('armF');
  arm('armB');

  // ox-head gurz (mace) — prop child of front forearm, extends past the hand
  const mace = new THREE.Group();
  mace.position.set(0, -17, 0);
  mace.add(cyl(2.1, 2.4, 26, IRON_D, 0, -13, 0));
  const band = new THREE.Mesh(new THREE.TorusGeometry(2.9, 0.9, 6, 10), GOLD);
  band.rotation.x = P2; band.position.set(0, -22, 0); mace.add(band);
  mace.add(sph(8, IRON, 0, -33, 0, 1.05, 0.95, 0.9));                       // ox-head
  const hornL = cone(2.3, 8, HORN, 0, -28, 6.5); hornL.rotation.x = -0.9; mace.add(hornL);
  const hornR = cone(2.3, 8, HORN, 0, -28, -6.5); hornR.rotation.x = 0.9; mace.add(hornR);
  mace.add(box(4.5, 3, 4.5, TASSEL, 0, -40.5, 0));                          // crimson tassel
  armF2.add(mace);

  // ---- legs ----
  function leg(prefix) {
    const l1 = boneGroup();
    l1.add(cyl(5.6, 4.6, 26, LEATHER_D, 0, -13, 0));                        // thigh
    l1.add(sph(4.6, LEATHER_D, 0, -26, 0));                                 // knee
    const l2 = boneGroup();                                                 // FLAT
    l2.add(cyl(4, 3.1, 26, BOOT, 0, -13, 0));                               // shin
    l2.add(place(box(11, 4.6, 6.6, BOOT, 0, 0, 0), R_LF2, 2.6, -24.6));     // world-flat foot
    squash.add(l1); squash.add(l2);
    bones[prefix + '1'] = l1; bones[prefix + '2'] = l2;
  }
  leg('legF'); leg('legB');

  return {
    type: 'rostam', root, flip, tumble, squash, bones, zOff, mats,
    rig: ROSTAM_RIG, clips: ROSTAM_CLIPS,
    frame: { w: 190, h: 165 }, lift: 52, height: 118,
    extras: { mace, peltDrape },
  };
}

// ============================================================
// RAKHSH — the black stallion (rig root = body center, 34 above feet)
// ============================================================
export function buildRakhsh() {
  const COAT = toonMat('#17141a'), COAT_L = toonMat('#262230'), MANE = toonMat('#0c0a0f');
  const HOOF = toonMat('#2e2a33'), GOLD = toonMat('#e8b64c'), SADDLE = toonMat('#8a2430');
  const STAR = new THREE.MeshBasicMaterial({ color: '#f2ede2' });
  const EYE = new THREE.MeshBasicMaterial({ color: '#c9a13b' });
  const mats = [COAT, COAT_L, MANE, HOOF, GOLD, SADDLE];

  const R_NECK = -2.45, R_HEAD = 0.55;

  const root = new THREE.Group();
  const flip = new THREE.Group(); root.add(flip);
  const tumble = new THREE.Group(); flip.add(tumble);
  const squash = new THREE.Group(); tumble.add(squash);
  const bones = {};
  const zOff = { legFL: 5.5, legFR: -5.5, legBL: 5.5, legBR: -5.5 };

  const body = new THREE.Group();
  const bc = cyl(11.5, 11.5, 40, COAT, 0, -14, 0); bc.rotation.z = P2; body.add(bc);
  body.add(sph(12, COAT, 16, -14, 0)); body.add(sph(11.5, COAT, -17, -13, 0));
  body.add(sph(12.5, COAT_L, 14, -9, 0, 1, 0.7, 0.9));                      // lit shoulder
  body.add(box(15, 3.6, 19, SADDLE, 2, 0.4, 0));                            // saddle
  body.add(box(15.8, 1.3, 19.8, GOLD, 2, -0.8, 0));                         // gold trim
  body.add(box(2.4, 10, 21, SADDLE, -5, -6, 0));                            // skirt
  squash.add(body);

  const neck = boneGroup();                                                 // arched, rises back
  neck.add(cyl(5.4, 7.6, 24, COAT, 0, -12, 0));
  for (const [ly, lz] of [[-7, 4.2], [-13, 4.4], [-19, 3.6], [-10, -4.2], [-16, -4.4]]) {
    neck.add(box(3.4, 7, 2.6, MANE, -2.6, ly, lz));                         // mane on top edge
  }
  squash.add(neck); bones.neck = neck;

  const head = boneGroup();
  head.add(box(15, 9.5, 9, COAT, 0.5, -7, 0));                              // skull along bone
  head.add(box(7.5, 5.5, 6, COAT_L, 1.5, -16.5, 0));                        // muzzle
  head.add(sph(1.3, MANE, 4, -19, 0));                                       // nose
  head.add(cone(1.8, 4.6, COAT, 2.8, -4.5, 3.4));                            // ears (up-back)
  head.add(cone(1.8, 4.6, COAT, 2.8, -4.5, -3.4));
  for (const s of [1, -1]) {
    head.add(sph(1.25, EYE, 3.2, -8, s * 4.7));
    head.add(sph(1.7, STAR, 4.5, -10.2, s * 4.55, 1, 1.25, 0.5));            // the white star
  }
  squash.add(head); bones.head = head;

  const tail = boneGroup();
  tail.add(cyl(2.2, 1.3, 26, MANE, 0, -13, 0));
  tail.add(sph(3.9, MANE, 0, -26.5, 0));
  squash.add(tail); bones.tail = tail;

  function leg(name) {
    const g = boneGroup();
    g.add(cyl(3.1, 2.3, 22, COAT, 0, -11, 0));
    g.add(sph(2.6, COAT, 0, -21.5, 0));
    g.add(cyl(2.7, 2.9, 3.4, HOOF, 0, -21.5, 0));
    squash.add(g); bones[name] = g;
  }
  leg('legFL'); leg('legBL'); leg('legFR'); leg('legBR');

  return {
    type: 'rakhsh', root, flip, tumble, squash, bones, zOff, mats,
    rig: null, clips: null,                                                  // driven by PlayState rakhshAnim
    frame: { w: 240, h: 150 }, lift: 34, height: 76,
    extras: {},
  };
}

// ============================================================
// LION — Trial I boss (rig root = body center, 34 above feet)
// ============================================================
export function buildLion() {
  const COAT = toonMat('#c08b3e'), COAT_L = toonMat('#d4a459'), COAT_D = toonMat('#8f6528');
  const MANE = toonMat('#5e3a14'), MANE_D = toonMat('#462a0c');
  const EYE = new THREE.MeshBasicMaterial({ color: '#2a1508' });
  const TEETH = new THREE.MeshBasicMaterial({ color: '#f2ede2' });
  const mats = [COAT, COAT_L, COAT_D, MANE, MANE_D];
  const baseCols = mats.map(m => m.color.getHex());

  const R_HEAD = 0.45;

  const root = new THREE.Group();
  const flip = new THREE.Group(); root.add(flip);
  const tumble = new THREE.Group(); flip.add(tumble);
  const squash = new THREE.Group(); tumble.add(squash);
  const bones = {};
  const zOff = { legFL: 7, legFR: -7, legBL: 7, legBR: -7, jaw: 0, tail2: 0 };

  const body = new THREE.Group();
  const bc = cyl(13, 13.5, 46, COAT, 0, -16, 0); bc.rotation.z = P2; body.add(bc);
  body.add(sph(14, COAT, 17, -15, 0)); body.add(sph(13, COAT, -19, -15, 0));
  body.add(sph(13, COAT_L, 15, -9, 0, 1, 0.65, 0.9));
  const mane = sph(13.5, MANE, 27, -4, 0, 1.1, 1.28, 1);                     // crown at the neck base
  body.add(mane);
  squash.add(body);

  const neck = boneGroup();                                                  // raised, slight back-lean
  neck.add(cyl(7, 9.5, 18, COAT, 0, -9, 0));
  squash.add(neck); bones.neck = neck;

  const head = boneGroup();                                                  // hangs forward-down
  head.add(box(19, 14.5, 15, COAT, 2.5, -10, 0));                            // skull along bone
  head.add(box(8.5, 6.5, 8.5, COAT_L, 11, -18.5, 0));                        // snout
  head.add(sph(1.5, MANE_D, 16, -20, 0));                                    // nose
  head.add(box(2.2, 0.9, 10, TEETH, 13, -16.8, 0));                          // upper teeth
  head.add(sph(2.9, MANE, 1.5, -6, 5.6, 1, 0.8, 0.8));                       // ears
  head.add(sph(2.9, MANE, 1.5, -6, -5.6, 1, 0.8, 0.8));
  for (const s of [1, -1]) head.add(sph(1.5, EYE, 7, -8.5, s * 7.7));
  squash.add(head); bones.head = head;

  const jaw = boneGroup();                                                    // own flat bone
  jaw.add(box(11.5, 4.6, 9.5, COAT_L, 4.5, -2.6, 0));
  jaw.add(box(2, 0.8, 7, TEETH, 8.5, -0.9, 0));
  squash.add(jaw); bones.jaw = jaw;

  const t1 = boneGroup();
  t1.add(cyl(1.8, 1.6, 20, COAT, 0, -10, 0));
  squash.add(t1); bones.tail1 = t1;
  const t2 = boneGroup();                                                     // FLAT
  t2.add(cyl(1.6, 1.2, 16, COAT, 0, -8, 0));
  t2.add(sph(3.6, MANE, 0, -16.5, 0));
  squash.add(t2); bones.tail2 = t2;

  function leg(name, mat) {
    const g = boneGroup();
    g.add(cyl(4.2, 3, 20, mat, 0, -10, 0));
    g.add(sph(3.3, mat, 0, -19, 0));
    squash.add(g); bones[name] = g;
  }
  leg('legFL', COAT); leg('legFR', COAT_D); leg('legBL', COAT); leg('legBR', COAT_D);

  return {
    type: 'lion', root, flip, tumble, squash, bones, zOff, mats, baseCols,
    rig: null, clips: null,
    frame: { w: 250, h: 175 }, lift: 34, height: 92,
    extras: { mane },
  };
}

// ============================================================
// JACKAL — trash mob & White-Jackal alpha variant (rig root 22 above feet)
// ============================================================
export function buildJackal(alpha = false) {
  const COAT = toonMat(alpha ? '#d9d2c4' : '#8a6d4a');
  const COAT_L = toonMat(alpha ? '#efe9dc' : '#a3835c');
  const DARK = toonMat(alpha ? '#a89f8d' : '#5e4a30');
  const EYE = new THREE.MeshBasicMaterial({ color: alpha ? '#e04430' : '#d8b23a' });
  const mats = [COAT, COAT_L, DARK];
  const baseCols = mats.map(m => m.color.getHex());

  const root = new THREE.Group();
  const flip = new THREE.Group(); root.add(flip);
  const tumble = new THREE.Group(); flip.add(tumble);
  const squash = new THREE.Group(); tumble.add(squash);
  const bones = {};
  const zOff = { legF: 4, legB: -4 };

  const body = new THREE.Group();
  const bc = cyl(6.8, 7.2, 24, COAT, 0, -8, 0, 9); bc.rotation.z = P2; body.add(bc);
  body.add(sph(7.4, COAT, 10, -8, 0)); body.add(sph(7, COAT, -11, -7.5, 0));
  body.add(sph(6.8, COAT_L, 8, -4.5, 0, 1, 0.6, 0.9));
  if (alpha) {
    body.add(box(0.8, 7, 0.7, DARK, 2, -9, 7.2));              // battle scar
    body.add(box(0.8, 7, 0.7, DARK, 2, -9, -7.2));
    body.add(box(12, 2.2, 8, DARK, 0, 0.5, 0));                // alpha crest
  }
  squash.add(body);

  const neck = boneGroup();
  neck.add(cyl(3.4, 4.6, 10, COAT, 0, -5, 0));
  neck.add(box(3, 5, 3, COAT_L, -2, -4, 0));                    // scruff
  squash.add(neck); bones.neck = neck;

  const head = boneGroup();
  head.add(box(11, 7.5, 8.5, COAT, 0.5, -5, 0));                // skull
  head.add(box(5.8, 4, 4.6, DARK, 4.5, -11, 0));                // snout
  head.add(sph(1, DARK, 7.6, -11.8, 0));
  head.add(cone(1.7, 5.2, COAT, 2.2, -2.5, 3));                 // ears
  head.add(cone(1.7, 5.2, COAT, 2.2, -2.5, -3));
  for (const s of [1, -1]) head.add(sph(1.2, EYE, 2.8, -6, s * 4.4));
  squash.add(head); bones.head = head;

  const tail = boneGroup();
  tail.add(cyl(1.8, 1, 14, COAT, 0, -7, 0));
  tail.add(sph(2.3, DARK, 0, -14, 0));
  squash.add(tail); bones.tail = tail;

  function leg(name) {
    const g = boneGroup();
    g.add(cyl(2.3, 1.6, 14, COAT, 0, -7, 0));
    g.add(sph(1.9, DARK, 0, -13.4, 0));
    squash.add(g); bones[name] = g;
  }
  leg('legF'); leg('legB');

  return {
    type: 'jackal', root, flip, tumble, squash, bones, zOff, mats, baseCols,
    rig: null, clips: null,
    frame: { w: 160, h: 105 }, lift: 22, height: 56, alpha,
    extras: {},
  };
}
