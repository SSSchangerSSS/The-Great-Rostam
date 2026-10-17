# 🎮 The Great Rostam — Game Design Document
# 🎮 رستم بزرگ — سند طراحی بازی

> **Version:** 0.1 (living document — this file evolves with the game)
> **نسخه:** ۰.۱ (سند زنده — همراه با بازی به‌روز می‌شود)

---

## 1. Vision | چشم‌انداز

**EN:** A fast, atmospheric 2D action-platformer that makes the greatest hero of the
*Shahnameh* playable. Every level is one of Rostam's Seven Trials (هفت‌خوان), hand-crafted
with pixel art inspired by Persian miniature painting, and driven by heavy, *weighty* combat
— Rostam is not a ninja; every mace swing should feel like it can shatter stone.

**FA:** یک اکشن-پلتفرم دوبعدی سریع و پرحس که بزرگ‌ترین پهلوان شاهنامه را قابل بازی می‌کند.
هر مرحله یکی از هفت‌خوان رستم است، با هنر پیکسلی الهام‌گرفته از نقاشی مینیاتور ایرانی،
و مبارزه‌ای سنگین و وزین — رستم نینجا نیست؛ هر ضربه‌ی گرز باید حس سنگ‌شکنی بدهد.

**Pillars | اصول طراحی:**
1. **Weighty combat** — slow, powerful swings, not spam | مبارزه‌ی وزین — ضربه‌های کُند اما نیرومند
2. **Persian identity** — poetry, miniatures, calligraphy in art & UI | هویت ایرانی — شعر، مینیاتور و خوشنویسی در گرافیک
3. **One-screen boss drama** — every trial ends in a memorable duel | درام باوس تک‌صحنه — هر خوان به یک دوئل به‌یادماندنی ختم می‌شود

---

## 2. Story | داستان

King **Kay Kavus** has been deceived by demons and captured in Mazandaran. The aged hero
**Rostam** refuses armor and rides **Rakhsh** alone toward the demon land. Between him and
the king stand **seven trials** — lion, desert, dragon, witch, ogres, sorcery and finally the
**White Demon (دیو سپید)**. The game follows the *Haft Khan-e Rostam* episode from Ferdowsi's
epic, condensed into seven handcrafted levels.

شاه **کیکاوس** فریب دیوان را خورده و در مازندران اسیر است. پهلوان کهنسال **رستم** زره
نمی‌پوشد و تنها با **رخش** راهی سرزمین دیوان می‌شود. میان او و شاه، **هفت خوان** است — شیر،
بیابان، اژدها، جادوگر، دیوان، افسون و سرانجام **دیو سپید**. بازی از داستان هفت‌خوان رستم در
شاهنامه‌ی فردوسی گرفته شده و در هفت مرحله‌ی دست‌ساز روایت می‌شود.

---

## 3. Core Gameplay | گیم‌پلی اصلی

### 3.1 Player Kit | تجهیزات بازیکن

| Ability | Key | Design intent |
|---|---|---|
| Mace combo (گرز گاوسر) | `X` `X` `X` | 3-hit chain — every swing **lunges forward** (Shank-style step-in), heavy finisher launches enemies | زنجیره‌ی ۳ ضربه با یورش به جلو و پرتاب دشمن در ضربه‌ی پایانی |
| Dodge roll (غلتک پهلوانی) | `V` | Invulnerable tumble with afterimage trail; cancels attack & bow recovery; also jumps out of it | غلتک مصون با ردپای شبح‌وار؛ ضربه و کمان را کنسل می‌کند |
| Air attack (ضربه‌ی هوایی) | `X` in air | Fast downward arc; striking an enemy bounces Rostam up for juggles | کمان سریع در هوا؛ برخورد، رستم را برای توالی هوایی بالا می‌پراند |
| Heroic bow (کمان رستم) | `C` (hold to charge) | Charged ranged shot, limited arrows per trial | تیر شارژی از راه دور، تیر محدود در هر خوان |
| Jump & wall-slide | `Z` | Classic platforming + coyote-time & jump-buffering for forgiving touch play | پرش با coyote-time و بافر برای لمسِ بخشنده |
| Rakhsh mount (رخش) | `Shift` / `E` | 6s speed/damage boost, long cooldown; Rakhsh tramples small demons | تقویت ۶ ثانیه‌ای سرعت/آسیب؛ رخش دیوهای کوچک را له می‌کند |
| Tiger-skin guard (پوست ببر) | hold `↓` | Damage-reducing block, cannot move | دفاع کاهنده‌ی آسیب، بدون حرکت |

### 3.2 Health & Difficulty | سلامتی و سختی

- Rostam has **5 hearts** per trial; healing fountains (آب زندگانی) appear between sections.
  / رستم در هر خوان **۵ قلب** دارد؛ چشمه‌های آب زندگانی میان بخش‌ها ظاهر می‌شوند.
- Death restarts the current **خوان**, not the whole game — trials are self-contained.
  / مرگ فقط همان **خوان** را از اول شروع می‌کند، نه کل بازی.
- Difficulty curve: Trial I–III teach combat, IV–V punish greed, VI–VII are boss gauntlets.
  / منحنی سختی: خوان‌های ۱–۳ آموزش مبارزه، ۴–۵ تنبیه حریص‌بازی، ۶–۷ دوئل‌های پایانی.

### 3.3 Finisher QTE — ضربهٔ نهایی (God of War style)

Every **mini-boss and boss** carries a finisher. When its HP crosses the threshold it **staggers** — it drops to its knees, becomes invulnerable, and the FINISHER offer appears. The player has ~4.5 seconds to approach and trigger it.
  / هر **مینی‌باس و باس** فینیشر دارد. وقتی سلامتی‌اش از آستانه عبور کند **به زانو درمی‌آید**، شکست‌ناپذیر می‌شود و پیشنهاد «ضربهٔ نهایی» ظاهر می‌شود. بازیکن ~۴.۵ ثانیه فرصت دارد نزدیک شود و آن را آغاز کند.

| Step | What happens |
|---|---|
| 1. Offer | Pulsing gold banner + FINISH button (`F` on keyboard). Slow world, camera leans in |
| 2. QTE | Time slows to ~0.2×; a ring shrinks onto a target action (`⚔ X` · `🏹 C` · `⤒ Z`) |
| 3. Timing | Press the **matching** button while the ring is locked on the target — `PERFECT` window inside the `GOOD` ring |
| 4. Chain | Mini-boss = **2 prompts**, boss = **3 prompts** (escalating speed) — each success lands an unanswered strike |
| 5. Kill | All prompts done → cinematic: Rostam **leaps, and slams the ox-headed mace down** — flash, shockwave, kill |
| Fail | Two missed prompts (wrong button / early / late) → the boss **ENRAGES**: heals ~27%, burning aura, +40% speed — and the stagger can only re-open after more damage |

Design notes / نکات طراحی:
- QTE timing runs on **real time**, never scaled — slow-mo never stretches the ring.
  / زمان‌بندی QTE با زمان واقعی است؛ اسلوموشن حلقه را کشیده نمی‌کند.
- Trash mobs **flee** when their alpha staggers — the duel stays clean and readable.
  / وقتی رهبر گله به زانو درمی‌آید، بقیه **فرار می‌کنند** — دوئل تمیز می‌ماند.
- Touch: the same four actions are big on-screen pads; the matching pad glows during the QTE.
  / روی موبایل همان چهار دکمه‌ی درشت روی صفحه هستند و دکمه‌ی درست در QTE می‌درخشد.
- Safety valves: player death, pausing, or leaving the play state **aborts** any live offer/QTE and the staggered boss rises cleanly — no zombie kneels, no floating bosses (stagger settles to the ground).
  / شیرهای اطمینان: مرگ، توقف یا خروج از بازی، هر offer/QTE فعال را **abort** می‌کند و باوس سالم بلند می‌شود.
- Future bosses only need data: `finisherPrompts` count + HP threshold in `levels.js`.
  / باس‌های آینده فقط داده می‌خواهند: تعداد پرامپت و آستانه‌ی سلامتی در `levels.js`.

### 3.4 Animation Bible — مکتب فلش (Shank 2 school)

Every clip is authored around **per-key easing** — the pipeline of a readable strike:
  / هر کلیپ با **easing کلیدبه‌کلید** ساخته می‌شود — دستور پخت ضربه‌ی خوانا:

1. **Anticipation** — coil *back* past rest (`ease: 'back'` overshoot), hips drift `_ox/_oy`
2. **Whip** — 2–3 frame strike into `ease: 'snap'` (quintic blast)
3. **Impact hold** — a short hold key sells the hit (with engine hitstop + sparks)
4. **Follow-through** — settle back with `ease: 'out'` / `'bounce'`

Systemic juice layered on top / آبه‌سازی سیستمی روی آن:
- **Root motion channels** `_ox/_oy` in every pose — dips on landings, drifts on swings / حرکت ریشه در پوزها
- **Squash & stretch** spring on jump/land / فشردگی و کشیدگی فنری
- **Secondary motion** — beard & tiger-pelt lag behind velocity / رش و پوست ببر با تأخیر حرکت می‌کنند
- **Mace smear trail** — additive gold ribbon sampled through the whip window / دنبالهٔ طلایی گرز
- **Afterimages** — during roll & the finisher leap / شبح‌های تصویر در غلتک و پرش فینیشر
- **White hit-flash** (additive re-draw, no canvas filters → identical on all mobile browsers) / فلاش سفید ضربه
- **Enemy reactions** — jackals flinch & skid (friction, no skating), lion head-snaps via a recoil overlay without breaking its armor states / واکنش دشمن‌ها به هر ضربه

---

## 4. The Seven Trials | هفت‌خوان

| # | Trial (خوان) | Mechanic | Boss |
|---|---|---|---|
| I | **The Lion — شیر** | Melee tutorial; jackal packs, **White Jackal mini-boss**, arena duel; **finisher QTEs on both** | Maneater Lion |
| II | **The Burning Desert — بیابان سوزان** | Survival & navigation; find water before health drains | Sandstorm + jackal packs |
| III | **The Dragon — اژدها** | Stealth section: the dragon sleeps; wake it and you fight | Fire-breathing Dragon |
| IV | **The Witch — جادوگر** | Illusion maze; distinguish real paths from fakes | The Hag (پیرزن جادوگر) |
| V | **The Ogre's Cave — غار دیو** | Vertical climbing gauntlet | Div-e Oulad (دیو اولاد) |
| VI | **??? — خوان اسرارآمیز** | ⚠️ *Reserved — planned twist on the mount mechanic* | ??? |
| VII | **Div-e Sepid — دیو سپید** | Final gauntlet; combine all skills | **White Demon** (final boss) |

> Levels V–VII details intentionally open — to be designed with community input.
> جزئیات خوان‌های ۵ تا ۷ عمداً باز گذاشته شده تا با مشارکت جامعه طراحی شود.

---

## 5. Art Direction | هنر

- **Palette:** warm desert golds & deep nights — Persian miniature tones, not generic dark fantasy.
  / پالت: طلایی‌های گرم صحرا و شب‌های عمیق — رنگ‌های مینیاتور ایرانی، نه فانتزی تاریک تکراری.
- **Sprites:** 32×32 character base scale, hand-pixelled.
  / اسپرایت‌ها: پایه‌ی ۳۲×۳۲ برای شخصیت‌ها، پیکسل‌کاری دستی.
- **UI:** Nastaliq-inspired headings (converted to pixel fonts), poetry verses between levels.
  / رابط کاربری: عناوین با حال‌وهوای نستعلیق، ابیات شاهنامه میان مرحله‌ها.
- **Reference:** Persian miniature horse-riding poses for Rostam & Rakhsh animations.
  / مرجع: ژست‌های سوارکاری مینیاتور ایرانی برای انیمیشن رستم و رخش.

## 6. Audio | صدا

- Instrument set: **santur, daf, ney** — recorded or licensed samples.
  / سازها: سنتور، دف، نی — نمونه‌های ضبط‌شده یا دارای لایسنس.
- Boss themes add **tombak** percussion layers as HP drops.
  / تم باوس‌ها با افت سلامتی لایه‌ی تنبک اضافه می‌کنند.

---

## 7. Technical | فنی

| Item | Decision |
|---|---|
| Stack / پشته | **Pure HTML5 + JavaScript (ES modules) + CSS** — zero frameworks, zero build tools |
| Rendering | Canvas 2D with an **adaptive logical viewport** (height-locked ≈720, min width 780, DPR-aware) — any aspect from phone portrait to ultrawide; DOM/CSS layer for HUD, dialogue, QTE and menus |
| Graphics | **100% procedural** — skeletal rig animation (`js/gfx/rig.js`), code-drawn characters/props (`paint.js`), seeded world-anchored parallax; **no image assets** |
| Audio | Procedural WebAudio synthesis (`audio.js`) — no audio files |
| Architecture | Modular ES modules: `core/` (loop, input, camera, audio), `gfx/`, `entities/`, `world/`, `ui/`, `states/`, `content/`, plus `qte.js` (the finisher engine) |
| Physics | Custom feet-based AABB with pass-through platforms (`world.js`) |
| Mobile | **Mobile-first**: coarse-pointer detection, virtual thumb pads (multi-touch pointer events), tap-to-advance, safe-area insets, fullscreen toggle, haptics (`navigator.vibrate`), one-time rotate hint |
| Save | `localStorage` trial-completion flags |
| Distribution | GitHub Pages (live at `/The-Great-Rostam/`), runs in any modern browser |
| Target platforms | Desktop & **mobile browsers (touch-first)**; gamepad planned |

### Milestones | نقاط عطف
1. **M1 — Web engine:** rig animation, parallax, physics, dialogue, procedural audio ✅
2. **M2 — Trial I complete (playable):** The Lion boss, Rakhsh mount, bow, HUD, results flow ✅
3. **M2.5 — Finishers & mobile:** White Jackal mini-boss, **God-of-War-style finisher QTEs**, cinematic slam, enrage, **mobile-first touch controls** ✅
4. **M3 — Trials II–III** (night palette already prepared)
5. **M4 — Trials IV–VII** + final boss: Div-e Sepid
6. **M5 — Polish:** music layers, gamepad
7. **M6 — Release:** itch.io + collected feedback

---

## 8. Open Questions | پرسش‌های باز

- ~~Persian text rendering~~ ✅ solved — all text lives in the DOM/CSS layer where RTL and Vazirmatn render natively; the canvas stays graphics-only.
  / حل شد — متن‌ها در لایه‌ی DOM هستند و RTL و فونت وزیرمتن بومی رندر می‌شوند.
- Localize fully (EN/FA) or Persian-first with EN subtitles?
  / دوزبانه‌ی کامل یا فارسی‌محور با زیرنویس انگلیسی؟
- Digital release: itch.io first?
  / انتشار: اول itch.io؟
- In-canvas Persian (e.g. title calligraphy baked into scenes) — needs a shaping lib like `arabic-persian-reshaper` at build time — worth it?
  / فارسی داخل بوم (مثلاً خوشنویسی عنوان در صحنه‌ها) — نیاز به کتابخانه‌ی شکل‌دهی در زمان بیلد — ارزشش رو داره؟
