<img src="https://capsule-render.vercel.app/api?type=rect&height=180&color=0:2b0a00,50:8b5a00,100:ffd700&text=THE%20GREAT%20ROSTAM&fontSize=52&fontAlignY=42&desc=A%202.5D%20Action%20Game%20Inspired%20by%20Shahnameh&descAlignY=62&descSize=16&animation=twinkling" width="100%" />

<div align="center">

▶️ **[PLAY NOW — بازی آنلاین](https://ssschangersss.github.io/The-Great-Rostam/)** ◀️

![Three.js](https://img.shields.io/badge/Three.js-2.5D_Toon_Heroes-000000?style=for-the-badge&logo=threedotjs&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![CSS3](https://img.shields.io/badge/CSS3-UI%20Layer-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Mobile](https://img.shields.io/badge/Mobile--First-Touch_Ready-9cf?style=for-the-badge&logo=android&logoColor=black)
![Status](https://img.shields.io/badge/Status-Playable-green?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-00FF41?style=for-the-badge)

</div>

<div align="center">

> **EN** — An epic **2.5D** action game about **Rostam**, the legendary hero of Ferdowsi's *Shahnameh*.
> **Real 3D toon-shaded heroes** (Three.js) fight inside a **hand-painted 2D world** — Trial I (**The Lion**) is fully playable in your browser, on **desktop or phone**, with **100% procedural graphics, zero image assets**.

> **FA** — یک بازی اکشن **دو‌ونیم‌بعدی** حماسی درباره‌ی **رستم**، پهلوان شاهنامه‌ی فردوسی.
> قهرمان‌ها **سه‌بعدیِ واقعی** با سایه‌زنی کارتونی (Three.js) در دنیای دوبعدیِ نقاشی‌شده می‌جنگند — خوانِ اوّل (**شیر**) به‌طور کامل در مرورگر قابل بازی است — روی **دسکتاپ و موبایل** — با **تمام گرافیک پروسیجرال، بدون هیچ فایل تصویری**.

</div>

---

## 🎬 Screenshots | تصاویر بازی

| Title | The Lion awaits |
|---|---|
| ![Title](docs/screenshots/title.png) | ![Boss](docs/screenshots/boss-fight.png) |
| **⚔️ Finisher offer — the foe is on its knees** | **🎯 God-of-War-style QTE — press in time!** |
| ![Finisher offer](docs/screenshots/finisher-offer.png) | ![QTE](docs/screenshots/finisher-qte.png) |
| **💥 The slam** | **📱 Mobile-first — touch controls** |
| ![Slam](docs/screenshots/finisher-slam.png) | ![Mobile](docs/screenshots/mobile.png) |

---

## ⚔️ What's inside | چه چیزی ساخته شده

- 🧊 **2.5D renderer (Three.js)** — Rostam, Rakhsh, the Lion and every jackal are **real 3D low-poly bodies** (cel-shaded toon materials, warm dusk lighting + rim light) rendered on a transparent WebGL layer **pixel-aligned above the hand-painted 2D parallax world** — 3D heroes, 2D environment, 60fps on mobile (~80 draw calls)
- 🦴 **Flash-school skeletal animation, now in 3D** — the same hand-authored keyframe clips (anticipation → whip strike → impact hold → follow-through, per-key easing, root-motion weight) drive the 3D bone rigs 1:1, plus squash & stretch, death topple, roll tumble, white hit-flash, and velocity-driven pelt sway
- 📸 **Baked animation frames (فریم‌های ذخیره‌شده)** — at boot every clip of every character is rendered once into a cached frame atlas: it powers the **ghost afterimages** (roll / finisher leap) and unlocks a **baked-sprite fallback mode** that auto-engages on weak devices so the game stays smooth everywhere
- ⚔️ **Shank-inspired combat** — lunging 3-hit mace combo, dodge **roll with i-frames**, air attack with hit-bounce, enemy hitstun & knockback friction (no ice-skating!), impact sparks, mace smear trails, hitstop, screen shake and a chain hit-counter
- 🎯 **Finisher QTE system (God of War style)** — bring a mini-boss or boss below its HP threshold and it **staggers**: approach and hit **F** (or the FINISH button) to enter a slow-motion ring-timed button sequence. Succeed → a cinematic leap-and-slam kill with afterimages. Miss twice → the beast **ENRAGES** (heals, red aura, faster & meaner)
- 🐺 **Mini-boss + Boss** — the **White Jackal, Pack Alpha** (summons its pack, triple-lunge chains) and the **Lion of Trial I** (pounce, claw combos, half-health roar shockwave) — each with its own finisher length & arena
- 📱 **Mobile-first design** — full-viewport adaptive canvas (any aspect ratio, DPR-aware), on-screen thumb controls (move / jump / mace / bow / roll / Rakhsh), coyote-time + jump buffering for forgiving touch play, tap-to-advance dialogue, fullscreen button, haptic feedback, one-time rotate hint
- 🏜 **Multi-layer parallax desert** — procedural mountains, dunes, drifting clouds, circling vultures, Achaemenid columns, animated braziers — all drawn in code
- 💬 **Bilingual dialogue system (FA/EN)** — typewriter effect, procedural pixel portraits, epic script in the spirit of the Shahnameh
- 🐎 **Rakhsh mount mechanic** — call the black stallion for a speed & trample boost
- 🏹 **Two weapon styles** — 3-hit mace combo with hitstop & screen shake, chargeable heroic bow
- 🔊 **Procedural WebAudio SFX** — every sound synthesized in code, no audio files
- 📊 **HTML/CSS UI layer** — hearts, arrow counter, Rakhsh cooldown radial, boss bar, chain counter, hurt vignette, QTE rings & feedback, title/pause/victory/defeat screens

## 🎯 The Finisher — ضربهٔ نهایی

When a **mini-boss or boss** is worn down to its threshold, it drops to its knees — dizzy, invulnerable, and offered to you:

1. **Approach** and press `F` / tap the golden **FINISH** button (you have ~4.5s)
2. The world slips into **slow motion** — a ring shrinks onto a target button (`⚔ X`, `🏹 C`, `⤒ Z`)
3. **Press the right button when the ring locks** — `PERFECT` timing hits harder
4. Chain every prompt (mini-boss: **2**, boss: **3**) → Rostam leaps and **ends it, Shahnameh-style**
5. Miss two prompts → the foe rises **ENRAGED**: partial heal, burning aura, faster attacks. Good luck.

> روی موبایل همان دکمه‌های روی صفحه را لمس کنید — حلقه که روی هدف نشست، دکمهٔ درست را بزن!

## 🕹 Controls | کنترل‌ها

**Desktop / دسکتاپ**

| Key | Action |
|---|---|
| `←` `→` / `A` `D` | Move / حرکت |
| `Z` / `Space` | Jump · advance dialogue / پرش · رد کردن دیالوگ |
| `X` | Mace combo (chain 3 hits) / ضربه‌ی سه‌تایی گرز |
| `C` (hold) | Charge & release arrow / نشانه‌گیری و شلیک تیر |
| `V` | **Dodge roll** (i-frames) / **غلتک** (مصونیت لحظه‌ای) |
| `Shift` / `E` | Call Rakhsh / فراخوان رخش |
| `F` | **Finisher** (on a staggered boss) / **ضربهٔ نهایی** |
| `Esc` | Pause / توقف |
| `M` | Mute / بی‌صدا |

**Mobile / موبایل** — on-screen buttons: `◀ ▶` move · `⤒` jump · `⚔` mace · `🏹` bow · `🌀` roll · `🐎` Rakhsh · `⏸ 🔊 ⛶` system — plus the golden **FINISH** button and QTE pads when a boss kneels.

## 🚀 Run it | اجرا

**Option 1 — play online (easiest):** [ssschangersss.github.io/The-Great-Rostam](https://ssschangersss.github.io/The-Great-Rostam/)

**Option 2 — locally** (ES modules need a tiny server):

```bash
git clone https://github.com/SSSchangerSSS/The-Great-Rostam.git
cd The-Great-Rostam
python -m http.server 8000
# open http://localhost:8000
```

**On your phone:** open the same URL (or the GitHub Pages link) in any mobile browser — the touch UI appears automatically.

## 📁 Architecture | معماری ماژولار

```
The-Great-Rostam/
├── index.html                  # 3-layer stage: 2D world canvas → WebGL heroes → fx canvas + DOM UI
├── css/style.css               # mobile-first responsive UI (safe-area, adaptive HUD)
├── js/
│   ├── lib/
│   │   ├── three.min.js        # Three.js r128 (vendored, offline-friendly)
│   │   ├── GLTFLoader.js       # GLB loading for Meshy drop-in models
│   │   └── SkeletonUtils.js    # skinned-mesh cloning (one mixer per entity)
│   ├── main.js                 # entry point + test hooks
│   ├── qte.js                  # ⚔ finisher system: offer → ring QTE → cinematic slam / enrage
│   ├── core/
│   │   ├── game.js             # loop, state machine, adaptive viewport, layer orchestration
│   │   ├── input.js            # action-mapped keyboard + virtual touch buttons
│   │   ├── camera.js           # smooth follow, shake, cinematic zoom (mirrored into WebGL)
│   │   ├── audio.js            # procedural WebAudio SFX (incl. QTE + slam)
│   │   └── utils.js            # math, easing, seeded RNG
│   ├── gfx/
│   │   ├── gl3d.js             # 🧊 the 2.5D layer: scene, camera mirror, bone adapter,
│   │   │                       #    frame baker (clip → cached textures), ghosts, sprite fallback
│   │   ├── meshy.js            # 🎨 Meshy-AI drop-in layer: assets/meshy/<type>.glb replaces
│   │   │                       #    the procedural body automatically (scale/face/clip mapping)
│   │   ├── models3d.js         # procedural low-poly toon builders (Rostam/Rakhsh/Lion/Jackal)
│   │   ├── rig.js              # skeletal animation engine (bones/clips/animator/easing)
│   │   ├── paint.js            # 2D prop painters + legacy no-WebGL fallback painters
│   │   ├── particles.js        # pooled particle system (fx canvas)
│   │   └── parallax.js         # world-anchored 2D parallax environments, any aspect
│   ├── content/
│   │   ├── rigs.js             # animation clip definitions (drive both 2D & 3D rigs)
│   │   ├── dialogues.js        # bilingual scripts (mini-boss + boss)
│   │   └── levels.js           # data-driven levels: waves, arenas, mini-boss, boss
│   ├── entities/
│   │   ├── player.js           # Rostam: combat, bow, mount, cinematic states
│   │   ├── enemies.js          # Jackal · WhiteJackal (mini-boss) · Lion (boss) — stagger/enrage
│   │   └── projectiles.js      # arrows
│   ├── world/
│   │   └── world.js            # physics, props, triggers, pickups (arrows + hearts)
│   ├── ui/
│   │   ├── hud.js              # hearts/arrows/cooldown/boss bar
│   │   ├── touch.js            # virtual controls, context switching, fullscreen, rotate hint
│   │   ├── dialogue.js         # typewriter dialogue system
│   │   └── menus.js            # title/pause/victory/defeat
│   └── states/
│       ├── title.js  ├── play.js  └── results.js
└── docs/
    ├── GAME_DESIGN.md          # full design document (finisher, mobile & 2.5D renderer design)
    ├── MESHY_PROMPTS.md        # 🎨 ready-to-paste Meshy prompts for every character
    └── screenshots/            # gameplay captures
```

**Add a new trial in 3 steps:** a new entry in `levels.js` → a new palette in `parallax.js` → new dialogue in `dialogues.js`. Bosses declare their finisher in the level data (`finisherPrompts`, threshold) — the QTE engine handles the rest.

## 🎨 Meshy AI Models — مدل‌های سه‌بعدی هوش مصنوعی

Want AI-generated 3D characters instead of (or alongside) the procedural toon bodies? The game **auto-discovers** GLB files dropped into `assets/meshy/` — no code changes:

```
assets/meshy/rostam.glb · rakhsh.glb · lion.glb · jackal.glb · jackalA.glb
```

Ready-to-paste prompts, recommended settings, free-plan credit budget and troubleshooting live in **[docs/MESHY_PROMPTS.md](docs/MESHY_PROMPTS.md)**. The engine normalizes scale & facing, maps Meshy animation presets onto game clips (fuzzy match), and silently falls back to the procedural bodies when a file is missing or broken.

*3D models generated with [Meshy AI](https://www.meshy.ai) — licensed CC BY 4.0.*

## 🗺 Roadmap | نقشه راه

- [x] Web engine: rig animation, parallax, physics, dialogue, audio — **موتور وب کامل**
- [x] Trial I — The Lion (playable!) — **خوان اوّل: شیر**
- [x] **2.5D upgrade: Three.js toon heroes + baked frame cache** — **قهرمان‌های سه‌بعدی + ذخیرهٔ فریم‌ها**
- [x] **Meshy-AI drop-in pipeline** (assets/meshy/*.glb → auto-swap) — **پایپ‌لاین مدل‌های هوش مصنوعی**
- [x] Mini-boss (White Jackal) + **God-of-War-style finisher QTEs** — **ضربه‌های نهایی**
- [x] **Mobile-first** touch controls + responsive canvas — **کنترل لمسی موبایل**
- [ ] Trial II — The Burning Desert (night palette ready) — بیابان سوزان
- [ ] Trial III — The Dragon — اژدها
- [ ] Trials IV–VII — جادوگر تا دیو سپید
- [ ] Gamepad support — پشتیبانی دسته

---

## 📜 License | مجوز

[MIT](LICENSE) — *Shahnameh belongs to everyone; this game belongs to its contributors.*

*شاهنامه مال همه است؛ این بازی مال سازندگانش.*
