// gl3d.js — THE 2.5D LAYER (Three.js)
// Characters are real 3D toon bodies driven by the existing 2D rig clips;
// the environment stays 2D (canvas). This module:
//   • owns the transparent WebGL canvas above the 2D world canvas
//   • mirrors the 2D camera 1:1 (pixel-aligned with the painted environment)
//   • maps Rig.compute() joints onto flat bone groups every frame
//   • BAKES animation frames ("فریم‌ها رو ذخیره کن"): every clip is rendered
//     once to cached textures — used for ghost afterimages, and as a full
//     sprite-mode fallback when a device can't hold 60fps.
import { GROUND_Y } from '../content/levels.js';
import { ROSTAM_RIG, ROSTAM_CLIPS, JACKAL_RIG, JACKAL_CLIPS, LION_RIG, LION_CLIPS, RAKHSH_RIG, RAKHSH_CLIPS } from '../content/rigs.js';
import { buildRostam, buildRakhsh, buildLion, buildJackal, shadowTexture } from './models3d.js';

const THREE = window.THREE;
const P2 = Math.PI / 2;

const BUILDERS = {
  rostam: { build: buildRostam, rig: ROSTAM_RIG, clips: ROSTAM_CLIPS },
  rakhsh: { build: buildRakhsh, rig: RAKHSH_RIG, clips: RAKHSH_CLIPS },
  lion: { build: buildLion, rig: LION_RIG, clips: LION_CLIPS },
  jackal: { build: () => buildJackal(false), rig: JACKAL_RIG, clips: JACKAL_CLIPS },
  jackalA: { build: () => buildJackal(true), rig: JACKAL_RIG, clips: JACKAL_CLIPS },
};
const BAKE_CENTER = { rostam: 5, rakhsh: 4, lion: 12, jackal: 6, jackalA: 6 };
const SHADOW_W = { rostam: 58, rakhsh: 122, lion: 132, jackal: 64, jackalA: 64 };
const Z = { rostam: 6, rakhsh: 3, lion: -2, jackalA: -1, jackal: 0 };

// bake priority: what ghosts & gameplay need first
const BAKE_ORDER = [
  ['rostam', 'idle'], ['rostam', 'run'], ['rostam', 'roll'], ['rostam', 'finishLeap'],
  ['rostam', 'attack1'], ['rostam', 'attack2'], ['rostam', 'attack3'],
  ['jackal', 'run'], ['jackal', 'lunge'], ['jackal', 'flinch'], ['jackal', 'die'],
  ['jackalA', 'run'], ['jackalA', 'lunge'], ['jackalA', 'flinch'], ['jackalA', 'die'],
  ['jackalA', 'howl'], ['jackalA', 'stagger'],
  ['lion', 'prowl'], ['lion', 'crouch'], ['lion', 'pounce'], ['lion', 'swipe'],
  ['lion', 'roar'], ['lion', 'flinch'], ['lion', 'hurt'], ['lion', 'die'], ['lion', 'stagger'],
  ['rakhsh', 'idle'], ['rakhsh', 'gallop'],
  ['rostam', 'jump'], ['rostam', 'fall'], ['rostam', 'land'], ['rostam', 'hurt'],
  ['rostam', 'dead'], ['rostam', 'airAttack'], ['rostam', 'mount'],
  ['rostam', 'bowDraw'], ['rostam', 'bowHold'], ['rostam', 'bowShot'],
  ['rostam', 'finishSlam'],
];
const BAKE_FRAMES = 8;

export class GL3D {
  constructor(game) {
    this.game = game;
    this.ok = false;
    this.fallback = false;              // sprite mode for weak devices
    if (!window.THREE) return;
    const canvas = document.getElementById('gl');
    if (!canvas) return;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) { return; }
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));

    this.scene = new THREE.Scene();
    this.cam = new THREE.OrthographicCamera(-640, 640, 360, -360, 1, 2000);
    this.cam.position.z = 500;

    // lighting — warm dusk key from the 2D sun side + cool rim for depth
    const hemi = new THREE.HemisphereLight(0xffe2b8, 0x5a3242, 0.95);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff2d8, 0.9);
    sun.position.set(260, 340, 300);
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0xff9a60, 0.3);
    rim.position.set(-240, 120, -220);
    this.scene.add(rim);

    // separate mini-scene for offline frame baking
    this.bakeScene = new THREE.Scene();
    this.bakeScene.add(new THREE.HemisphereLight(0xffe2b8, 0x5a3242, 1.1));
    const bd = new THREE.DirectionalLight(0xfff2d8, 0.95);
    bd.position.set(260, 340, 300);
    this.bakeScene.add(bd);
    this.bakeCam = new THREE.OrthographicCamera(-100, 100, 100, -100, 1, 2000);
    this.bakeCam.position.z = 500;

    this.bakeTex = {};                  // type -> clip -> [CanvasTexture]
    this._bakeInst = {};                // type -> pose-able model instance
    this.bakeQueue = BAKE_ORDER.slice();
    this._rt = null;

    this.handles = new Map();           // entity -> handle
    this._ghostMeshes = new Set();
    this._ghostGeo = new THREE.PlaneGeometry(190, 165);
    this._planeOff = {};
    for (const t in BUILDERS) this._planeOff[t] = (BAKE_CENTER[t] || 0) + BUILDERS[t].build().lift;
    this._shadowGeo = {};
    for (const t in SHADOW_W) this._shadowGeo[t] = new THREE.PlaneGeometry(SHADOW_W[t], SHADOW_W[t] * 0.24);
    this._shadowTex = shadowTexture();

    this._camKey = '';
    this._dtSum = 0; this._dtN = 0; this._badStreak = 0;
    this.ok = true;
  }

  resize(w, h, dpr) {
    if (!this.ok) return;
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
  }

  clearEntities() {
    for (const h of this.handles.values()) {
      this.scene.remove(h.model.root);
      this.scene.remove(h.shadow);
      if (h.sprite) this.scene.remove(h.sprite);
    }
    this.handles.clear();
    for (const m of this._ghostMeshes) this.scene.remove(m);
    this._ghostMeshes.clear();
  }

  // ---------------- handle management ----------------
  _typeOf(ent) {
    const n = ent.constructor.name;
    if (n === 'Player') return 'rostam';
    if (n === 'Lion') return 'lion';
    if (n === 'WhiteJackal') return 'jackalA';
    return 'jackal';
  }

  _handleFor(ent) {
    let h = this.handles.get(ent);
    if (h) return h;
    const type = this._typeOf(ent);
    const def = BUILDERS[type];
    const model = def.build();
    model.rig = def.rig;
    model.clips = def.clips;
    const bs = type === 'jackalA' ? 1.5 : 1;
    const shadow = new THREE.Mesh(
      this._shadowGeo[type],
      new THREE.MeshBasicMaterial({ map: this._shadowTex, transparent: true, depthWrite: false, opacity: 0.9 })
    );
    this.scene.add(model.root);
    this.scene.add(shadow);
    h = { type, model, rig: def.rig, clips: def.clips, bs, z: Z[type], shadow, sprite: null, enraged: false, fading: false };
    this.handles.set(ent, h);
    return h;
  }

  // ---------------- rig → 3D ----------------
  applyPose(model, rig, pose) {
    const joints = rig.compute(pose, { x: 0, y: 0, flip: 1, scale: 1 });
    const bones = model.bones, zOff = model.zOff;
    for (const name in bones) {
      const j = joints[name];
      if (!j) continue;
      const g = bones[name];
      g.position.set(j.x, -j.y, zOff[name] || 0);
      g.rotation.z = P2 - j.angle;
    }
  }

  _setFlash(h, f) {
    if (f === h._flash) return;
    h._flash = f;
    for (const m of h.model.mats) {
      if (!m.emissive) continue;
      m.emissive.setRGB(f * 0.95, f * 0.88, f * 0.72);
    }
  }

  _setEnraged(h, on) {
    if (on === h.enraged || !h.model.baseCols) return;
    h.enraged = on;
    const red = new THREE.Color(0xd03018);
    h.model.mats.forEach((m, i) => {
      if (!h.model.baseCols[i] || !m.color) return;
      m.color.setHex(h.model.baseCols[i]);
      if (on) m.color.lerp(red, 0.45);
    });
  }

  _setFade(h, k) {                       // k = 1 visible … 0 gone
    if (k >= 0.999) {
      if (h.fading) { h.model.mats.forEach(m => { m.transparent = false; m.opacity = 1; }); h.fading = false; }
      h.model.root.visible = true;
      return;
    }
    if (!h.fading) { h.model.mats.forEach(m => { m.transparent = true; }); h.fading = true; }
    h.model.mats.forEach(m => { m.opacity = Math.max(0, k); });
    h.model.root.visible = k > 0.02;
  }

  // ---------------- per-frame entity sync ----------------
  _syncEntity(h, ent, play, camC, halfW) {
    const m = h.model;
    const onScreen = Math.abs(ent.x - camC) < halfW + 280;
    if (!onScreen) { m.root.visible = false; h.shadow.visible = false; if (h.sprite) h.sprite.visible = false; return; }

    // ----- pose (with lion recoil overlay) -----
    let pose = ent.rig.pose();
    if (h.type === 'lion' && ent.recoil > 0) {
      pose = Object.assign({}, pose);
      pose.neck = (pose.neck || 0) + ent.recoil * 0.55;
      pose.head = (pose.head || 0) + ent.recoil * 0.3;
      pose.jaw = (pose.jaw || 0) + ent.recoil * 0.25;
    }

    // ----- root placement (canvas y-down → 3D y-up, feet on the 2D ground) -----
    let rootY, feet3;
    if (h.type === 'rostam') {
      feet3 = GROUND_Y - ent.y - (ent.yOff || 0) + (ent.mounted ? 34 : 0);
      rootY = feet3 + 52;
    } else {
      rootY = GROUND_Y - ent.y + m.lift;
      feet3 = GROUND_Y - ent.y;
    }
    m.root.position.set(ent.x, rootY, h.z);
    m.flip.rotation.y = ent.facing < 0 ? Math.PI : 0;

    // tumble / squash / blink / flash
    m.tumble.rotation.z = 0;
    if (h.type === 'rostam') {
      if (ent.state === 'roll') m.tumble.rotation.z = -ent.rollDir * ent.rig.progress * Math.PI * 2;
      else if (ent.state === 'dead') m.tumble.rotation.z = Math.min(1, ent.deadT / 0.5) * ent.deathDir * 1.35;
      const sq = ent.sq || 0;
      m.squash.scale.set((1 - sq * 0.7) * h.bs, (1 + sq) * h.bs, h.bs);
      m.flip.visible = !(ent.invuln > 0 && ent.state !== 'roll' && Math.floor(ent.invuln * 14) % 2 === 0);
      // pelt secondary motion
      const pd = m.extras.peltDrape;
      if (pd) {
        if (h._peltBase === undefined) h._peltBase = pd.rotation.z;
        pd.rotation.z = h._peltBase + Math.max(-0.4, Math.min(0.4, -ent.vx * 0.0011)) * 0.6;
      }
      this._setFlash(h, ent.flashT > 0 ? ent.flashT / 0.13 : 0);
      this._setFade(h, 1);
    } else {
      m.squash.scale.set(h.bs, h.bs, h.bs);
      m.flip.visible = true;
      this._setFlash(h, (ent.hurtFlash > 0 ? ent.hurtFlash / (h.type === 'lion' ? 0.18 : 0.16) : 0)
        || (ent.flashT > 0 ? ent.flashT / 0.12 : 0));
      this._setEnraged(h, !!ent.enraged);
      if (ent.dead) {
        const rate = h.type === 'lion' ? 0.35 : 1;
        this._setFade(h, 1 - Math.min(1, ent.deadT * rate));
      } else this._setFade(h, 1);
    }

    // ----- render: live 3D or baked-sprite fallback -----
    if (this.fallback) {
      m.root.visible = m.root.visible && false;
      this._syncSprite(h, ent, pose, feet3);
    } else {
      if (h.sprite) h.sprite.visible = false;
      this.applyPose(m, h.rig, pose);
      m.root.visible = m.root.visible !== false;
    }

    // ----- shadow -----
    const airH = Math.max(0, GROUND_Y - ent.y) + Math.max(0, -(ent.yOff || 0)) + (h.type === 'rostam' && ent.mounted ? 34 : 0);
    const k = Math.max(0.3, Math.min(1, 1 - airH / 280));
    h.shadow.visible = m.root.visible && !ent.dead;
    h.shadow.position.set(ent.x, 0.9, h.z - 3);
    h.shadow.scale.set(k * h.bs, 1, 1);
    h.shadow.material.opacity = 0.9 * k;
  }

  _syncSprite(h, ent, pose, feet3) {
    if (!h.sprite) {
      const f = h.model.frame;
      h.sprite = new THREE.Mesh(
        new THREE.PlaneGeometry(f.w, f.h),
        new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide })
      );
      this.scene.add(h.sprite);
    }
    const texs = this.bakeTex[h.type] && this.bakeTex[h.type][ent.rig.name];
    if (!texs) { h.sprite.visible = false; return; }
    const idx = Math.min(texs.length - 1, Math.floor(ent.rig.progress * texs.length + 0.0001)) % texs.length;
    h.sprite.material.map = texs[idx];
    h.sprite.visible = true;
    h.sprite.position.set(ent.x, feet3 + this._planeOff[h.type] * h.bs, h.z + 0.5);
    h.sprite.scale.set((ent.facing < 0 ? -1 : 1) * h.bs, h.bs, 1);
    // baked frames don't know flash — tint via color
    const f = h._flash || 0;
    h.sprite.material.color.setRGB(1 + f * 2, 1 + f * 1.8, 1 + f * 1.5);
  }

  // ---------------- ghosts (baked-frame afterimages) ----------------
  _syncGhosts(play) {
    const p = play.player;
    const live = new Set();
    if (p && p.ghosts && this.bakeTex.rostam) {
      for (const gh of p.ghosts) {
        const texs = this.bakeTex.rostam[gh.clip];
        if (!texs) continue;
        live.add(gh);
        if (!gh._mesh) {
          const idx = Math.min(texs.length - 1, Math.round((gh.frame || 0) * texs.length)) % texs.length;
          gh._mesh = new THREE.Mesh(this._ghostGeo,
            new THREE.MeshBasicMaterial({ map: texs[idx], transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: gh.a }));
          gh._mesh._gh = gh;
          this.scene.add(gh._mesh);
          this._ghostMeshes.add(gh._mesh);
        }
        const m = gh._mesh;
        m.position.set(gh.x, GROUND_Y - gh.y - (gh.yOff || 0) + this._planeOff.rostam, 4.5);
        m.rotation.z = -(gh.rot || 0);
        m.scale.set(gh.facing || 1, 1, 1);
        m.material.opacity = Math.max(0, gh.a);
        m.visible = gh.a > 0.02;
      }
    }
    for (const m of this._ghostMeshes) {
      if (!live.has(m._gh)) { this.scene.remove(m); m.material.dispose(); this._ghostMeshes.delete(m); }
    }
  }

  // ---------------- camera mirror of the 2D camera ----------------
  syncCamera(cam) {
    const g = this.game;
    const vw = g.viewW, vh = g.viewH, z = cam.zoom || 1;
    const hw = vw / (2 * z), hh = vh / (2 * z);
    const key = `${hw.toFixed(2)}|${hh.toFixed(2)}`;
    if (key !== this._camKey) {
      this.cam.left = -hw; this.cam.right = hw;
      this.cam.top = hh; this.cam.bottom = -hh;
      this.cam.updateProjectionMatrix();
      this._camKey = key;
    }
    this.cam.position.set(cam.offsetX + vw / 2, GROUND_Y - (cam.offsetY + vh / 2), 500);
  }

  // ---------------- frame baking ----------------
  _ensureBakeInst(type) {
    if (this._bakeInst[type]) return this._bakeInst[type];
    const def = BUILDERS[type];
    const model = def.build();
    model.rig = def.rig;
    model.clips = def.clips;
    this.bakeScene.add(model.root);
    this._bakeInst[type] = model;
    return model;
  }

  bakeClip(type, clipName) {
    const model = this._ensureBakeInst(type);
    const clip = model.clips && model.clips[clipName];
    if (!clip) return;
    // isolate: only the model being baked renders into the frame
    for (const t in this._bakeInst) this._bakeInst[t].root.visible = (t === type);
    model.root.visible = true;
    const { w, h } = model.frame;
    if (!this._rt) this._rt = new THREE.WebGLRenderTarget(w, h);
    if (this._rt.width !== w || this._rt.height !== h) { this._rt.dispose(); this._rt = new THREE.WebGLRenderTarget(w, h); }
    const bc = this.bakeCam;
    bc.left = -w / 2; bc.right = w / 2; bc.top = h / 2; bc.bottom = -h / 2;
    bc.position.set(0, BAKE_CENTER[type] || 0, 500);
    bc.updateProjectionMatrix();
    const px = new Uint8Array(w * h * 4);
    const canvases = [];
    for (let i = 0; i < BAKE_FRAMES; i++) {
      const tn = clip.loop ? i / BAKE_FRAMES : i / (BAKE_FRAMES - 1);
      this.applyPose(model, model.rig, clip.sample(tn));
      this.renderer.setRenderTarget(this._rt);
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.clear();
      this.renderer.render(this.bakeScene, bc);
      this.renderer.readRenderTargetPixels(this._rt, 0, 0, w, h, px);
      this.renderer.setRenderTarget(null);
      canvases.push(this._pxToCanvas(px, w, h));
    }
    (this.bakeTex[type] = this.bakeTex[type] || {})[clipName] =
      canvases.map(c => { const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; return t; });
  }

  _pxToCanvas(px, w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      const src = (h - 1 - y) * w * 4, dst = y * w * 4;
      img.data.set(px.subarray(src, src + w * 4), dst);
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }

  _processBake(budgetMs) {
    if (!this.bakeQueue.length) return;
    const t0 = performance.now();
    while (this.bakeQueue.length && performance.now() - t0 < budgetMs) {
      const [type, clip] = this.bakeQueue.shift();
      try { this.bakeClip(type, clip); } catch (e) { /* skip broken clip */ }
    }
  }

  // ---------------- fps watch → sprite fallback ----------------
  _noteDt(dt) {
    if (this.fallback || !this.ok) return;
    this._dtSum += dt; this._dtN++;
    if (this._dtN >= 75) {
      const avg = this._dtSum / this._dtN;
      this._dtSum = 0; this._dtN = 0;
      if (avg > 1 / 27 && this.bakeQueue.length === 0) {
        if (++this._badStreak >= 2) this.fallback = true;
      } else this._badStreak = 0;
    }
  }

  // ---------------- main entry ----------------
  render(state, cam, rawDt) {
    if (!this.ok) return;
    const g = this.game;
    this._processBake(g.stateName === 'play' ? 5 : 13);
    this._noteDt(rawDt);
    this.syncCamera(cam);

    const play = g.stateName === 'play' ? state : null;
    if (!play || !play.player) {
      for (const h of this.handles.values()) { h.model.root.visible = false; h.shadow.visible = false; if (h.sprite) h.sprite.visible = false; }
      this.renderer.render(this.scene, this.cam);
      return;
    }

    const camC = cam.offsetX + g.viewW / 2;
    const halfW = g.viewW / (2 * (cam.zoom || 1));

    this._syncEntity(this._handleFor(play.player), play.player, play, camC, halfW);

    // Rakhsh under the hero when mounted
    if (play.player.mounted && play.rakhshAnim) {
      if (!this._rakhsh) {
        const def = BUILDERS.rakhsh;
        const model = def.build();
        model.rig = def.rig; model.clips = def.clips;
        const shadow = new THREE.Mesh(this._shadowGeo.rakhsh,
          new THREE.MeshBasicMaterial({ map: this._shadowTex, transparent: true, depthWrite: false, opacity: 0.9 }));
        this.scene.add(model.root); this.scene.add(shadow);
        this._rakhsh = { type: 'rakhsh', model, rig: def.rig, clips: def.clips, bs: 1, z: Z.rakhsh, shadow, sprite: null, enraged: false, fading: false };
      }
      const p = play.player;
      const h = this._rakhsh;
      this.applyPose(h.model, h.rig, play.rakhshAnim.pose());
      h.model.root.position.set(p.x - p.facing * 4, GROUND_Y - p.y + 34, h.z);
      h.model.flip.rotation.y = p.facing < 0 ? Math.PI : 0;
      h.model.flip.visible = true;
      h.model.squash.scale.set(1, 1, 1);
      h.shadow.visible = true;
      h.shadow.position.set(p.x - p.facing * 4, 0.9, h.z - 3);
      h.shadow.scale.set(1, 1, 1);
      h.shadow.material.opacity = 0.9;
    } else if (this._rakhsh) {
      this._rakhsh.model.root.visible = false;
      this._rakhsh.shadow.visible = false;
    }

    for (const e of play.enemies) {
      if ((e === play.boss || e === play.miniBoss) && !e.active && !e.dead) continue;
      this._syncEntity(this._handleFor(e), e, play, camC, halfW);
    }

    this._syncGhosts(play);
    this.renderer.render(this.scene, this.cam);
  }
}
