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
| Mace combo (گرز گاوسر) | `X` `X` `X` | 3-hit chain, heavy finisher with screen shake | زنجیره‌ی ۳ ضربه با ضربه‌ی پایانی و لرزش صفحه |
| Heroic bow (کمان رستم) | `C` (hold to charge) | Charged ranged shot, limited arrows per trial | تیر شارژی از راه دور، تیر محدود در هر خوان |
| Jump & wall-slide | `Z` | Classic platforming traversal | عبور از موانع پلتفرمی |
| Rakhsh mount (رخش) | `Shift` | 6s speed/damage boost, long cooldown; Rakhsh tramples small demons | تقویت ۶ ثانیه‌ای سرعت/آسیب؛ رخش دیوهای کوچک را له می‌کند |
| Tiger-skin guard (پوست ببر) | hold `↓` | Damage-reducing block, cannot move | دفاع کاهنده‌ی آسیب، بدون حرکت |

### 3.2 Health & Difficulty | سلامتی و سختی

- Rostam has **5 hearts** per trial; healing fountains (آب زندگانی) appear between sections.
  / رستم در هر خوان **۵ قلب** دارد؛ چشمه‌های آب زندگانی میان بخش‌ها ظاهر می‌شوند.
- Death restarts the current **خوان**, not the whole game — trials are self-contained.
  / مرگ فقط همان **خوان** را از اول شروع می‌کند، نه کل بازی.
- Difficulty curve: Trial I–III teach combat, IV–V punish greed, VI–VII are boss gauntlets.
  / منحنی سختی: خوان‌های ۱–۳ آموزش مبارزه، ۴–۵ تنبیه حریص‌بازی، ۶–۷ دوئل‌های پایانی.

---

## 4. The Seven Trials | هفت‌خوان

| # | Trial (خوان) | Mechanic | Boss |
|---|---|---|---|
| I | **The Lion — شیر** | Melee tutorial; arena combat | Maneater Lion |
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
| Engine / موتور | Love2D 11.5 (Lua) |
| Resolution | 1280×720 internal, integer pixel scaling |
| Architecture | State machine (`menu` / `playing` / `paused` / `dialogue`) + module-per-entity in `src/` |
| Physics | Custom AABB — no engine physics (keeps combat math explicit) |
| Save | Trial progress in `love.filesystem` JSON |
| Target platforms | Windows, Linux, macOS, Android (love-android) |

### Milestones | نقاط عطف
1. **M1 — Playable core:** movement, mace combat, one demo enemy (current `main.lua` skeleton)
2. **M2 — Trial I complete:** The Lion, art pass, HUD polish
3. **M3 — Rakhsh & bow:** mount mechanic, ranged combat
4. **M4 — Trials II–III**
5. **M5 — Vertical slice:** Trials I–III + menu, music, save
6. **M6 — Full game:** all seven trials + final boss

---

## 8. Open Questions | پرسش‌های باز

- Persian text rendering in Love2D needs an RTL shaping library — candidates?
  / رندر متن فارسی در Love2D به کتابخانه‌ی شکل‌دهی RTL نیاز دارد — گزینه‌ها؟
- Localize fully (EN/FA) or Persian-first with EN subtitles?
  / دوزبانه‌ی کامل یا فارسی‌محور با زیرنویس انگلیسی؟
- Digital release: itch.io first?
  / انتشار: اول itch.io؟
