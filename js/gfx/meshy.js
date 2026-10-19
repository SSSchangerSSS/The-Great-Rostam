// meshy.js — MESHY-AI DROP-IN LAYER (مدل‌های آمادهٔ Meshy)
// ------------------------------------------------------------------
// If  assets/meshy/<type>.glb  exists, it replaces the procedural 3D body
// automatically — zero code changes. Generate the GLBs with the prompts in
// docs/MESHY_PROMPTS.md (auto-rig + animation presets, download as GLB),
// then drop them in:
//
//   assets/meshy/rostam.glb    ← the hero
//   assets/meshy/rakhsh.glb    ← the horse
//   assets/meshy/lion.glb      ← Trial I boss
//   assets/meshy/jackal.glb    ← grunt demon-jackal (jackalA.glb optional)
//   assets/meshy/jackalA.glb   ← white pack-alpha (falls back to jackal.glb + pale tint)
//
// The layer normalizes scale (feet at y=0, per-type world height), fixes the
// facing axis, re-tints the alpha variant, clones materials per instance and
// maps Meshy animation presets onto the game's clip names (fuzzy match).

const THREE = window.THREE;

// world-space heights of the procedural bodies (px) — GLBs are scaled to match
const TARGET_H = { rostam: 118, rakhsh: 76, lion: 92, jackal: 56, jackalA: 84 };

// Meshy GLBs usually face +z; the game faces +x at rotation.y = 0.
// If a model runs backwards in-game, add Math.PI to its entry here.
const FACING_FIX = { rostam: Math.PI / 2, rakhsh: Math.PI / 2, lion: Math.PI / 2, jackal: Math.PI / 2, jackalA: Math.PI / 2 };

// clips that should loop in Meshy form (everything else plays once + holds)
const LOOP_CLIPS = new Set(['idle', 'run', 'walk', 'prowl', 'crouch', 'gallop', 'bowHold']);

// game clip → Meshy preset-name keywords (checked in order, case-insensitive)
const CLIP_HINTS = {
  idle:      ['idle', 'breath', 'stand'],
  run:       ['run', 'gallop'],
  walk:      ['walk'],
  gallop:    ['gallop', 'run'],
  prowl:     ['walk', 'run', 'idle'],
  crouch:    ['crouch', 'sneak', 'idle'],
  jump:      ['jump'],
  fall:      ['fall', 'jump'],
  land:      ['land', 'idle'],
  roll:      ['roll', 'dodge', 'spin'],
  attack1:   ['attack', 'punch', 'slash', 'swing'],
  attack2:   ['attack', 'punch', 'slash', 'swing'],
  attack3:   ['attack', 'punch', 'slash', 'swing'],
  airAttack: ['attack', 'slash', 'punch'],
  bowDraw:   ['draw', 'aim', 'shoot', 'attack'],
  bowHold:   ['aim', 'draw', 'idle'],
  bowShot:   ['shoot', 'release', 'attack'],
  hurt:      ['hit', 'flinch', 'damage', 'reaction'],
  flinch:    ['hit', 'flinch', 'damage', 'reaction'],
  stagger:   ['stagger', 'dizzy', 'hit', 'damage'],
  howl:      ['howl', 'roar', 'scream'],
  roar:      ['roar', 'howl', 'scream'],
  pounce:    ['pounce', 'jump', 'attack'],
  swipe:     ['swipe', 'attack', 'slash', 'punch'],
  mount:     ['idle'],
  finishLeap: ['jump', 'attack'],
  finishSlam: ['slam', 'smash', 'attack'],
  dead:      ['death', 'die', 'dying', 'fall'],
  die:       ['death', 'die', 'dying', 'fall'],
};

function findAnim(animations, hints) {
  for (const hint of hints) {
    for (const a of animations) {
      if (a.name && a.name.toLowerCase().includes(hint)) return a;
    }
  }
  return null;
}

export class MeshyModels {
  constructor() {
    this.sources = {};        // type -> normalized source
    this.ready = false;
  }

  load() {
    if (!window.THREE || !THREE.GLTFLoader) return Promise.resolve();
    this.loader = new THREE.GLTFLoader();
    const jobs = Object.keys(TARGET_H).map(t => this._tryLoad(t));
    return Promise.all(jobs).then(() => { this.ready = true; });
  }

  get(type) { return this.sources[type] || null; }

  async _tryLoad(type) {
    try {
      const res = await fetch(`assets/meshy/${type}.glb`);
      if (!res.ok) return;                              // silently stay procedural
      const buf = await res.arrayBuffer();
      if (buf.byteLength < 1200) return;                // not a real GLB
      const gltf = await new Promise((ok, err) => this.loader.parse(buf, '', ok, err));
      this.sources[type] = this._normalize(gltf, type);
      // white pack-alpha: reuse the jackal model, pale-tinted
      if (type === 'jackal' && !this.sources.jackalA) {
        this.sources.jackalA = this._normalize(gltf, 'jackalA', 0xdfe4ea);
      }
    } catch (e) { /* broken/absent file → procedural body stays */ }
  }

  _normalize(gltf, type, tint) {
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const s = TARGET_H[type] / Math.max(0.0001, size.y);
    const offset = new THREE.Vector3(
      -(box.min.x + size.x / 2), -box.min.y, -(box.min.z + size.z / 2)
    );

    if (tint) {
      scene.traverse(o => {
        if ((o.isMesh || o.isSkinnedMesh) && o.material && o.material.color) {
          o.material = o.material.clone();
          o.material.color.lerp(new THREE.Color(tint), 0.72);
        }
      });
    }

    // clip map: our clip names → Meshy AnimationClip objects (pure data, shareable)
    const anims = gltf.animations || [];
    const clipMap = {};
    for (const ours in CLIP_HINTS) {
      const a = findAnim(anims, CLIP_HINTS[ours]);
      if (a) clipMap[ours] = a;
    }
    const fallbackClip = clipMap.idle || anims[0] || null;

    return {
      glscene: scene, clipMap, fallbackClip, tint: tint || null,
      scale: s, rotY: FACING_FIX[type], offset,
      frame: { w: Math.max(120, size.x * s), h: TARGET_H[type] + 44 },
    };
  }

  // per-entity instance: cloned skeleton, cloned materials, own mixer
  instantiate(type) {
    const src = this.sources[type];
    if (!src) return null;
    const clone = THREE.SkeletonUtils
      ? THREE.SkeletonUtils.clone(src.glscene)
      : src.glscene.clone(true);
    clone.position.copy(src.offset);

    const mats = [], baseCols = [];
    clone.traverse(o => {
      if ((o.isMesh || o.isSkinnedMesh) && o.material) {
        o.material = Array.isArray(o.material) ? o.material.map(m => m.clone()) : o.material.clone();
        for (const m of [].concat(o.material)) {
          if (mats.indexOf(m) < 0) { mats.push(m); baseCols.push(m.color ? m.color.getHex() : null); }
        }
      }
    });

    // fit group applies the once-computed normalization (scale + facing)
    const fit = new THREE.Group();
    fit.scale.setScalar(src.scale);
    fit.rotation.y = src.rotY;
    fit.add(clone);

    const flip = new THREE.Group();
    const tumble = new THREE.Group();
    const squash = new THREE.Group();
    squash.add(fit); tumble.add(squash); flip.add(tumble);

    const mixer = new THREE.AnimationMixer(clone);
    const actions = {};
    for (const ours in src.clipMap) {
      const a = mixer.clipAction(src.clipMap[ours]);
      if (!LOOP_CLIPS.has(ours)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      actions[ours] = a;
    }
    const fallbackAction = src.fallbackClip ? mixer.clipAction(src.fallbackClip) : null;

    const model = {
      root: flip, flip, tumble, squash,
      bones: null, zOff: {}, extras: {},
      mats, baseCols,
      lift: 0,
      frame: src.frame,
      mixer, actions, fallbackAction,
      cur: null, curName: null,
      play: (name) => {
        const a = actions[name] || actions.idle || fallbackAction;
        if (!a) return;
        if (model.cur === a) {
          // one-shots must retrigger (attack chains, repeated flinches)
          if (!LOOP_CLIPS.has(name) && actions[name]) a.reset().play();
          return;
        }
        if (model.cur) { a.reset().fadeIn(0.12).play(); model.cur.fadeOut(0.12); }
        else { a.reset().fadeIn(0.05).play(); }
        model.cur = a; model.curName = name;
      },
    };
    return model;
  }
}
