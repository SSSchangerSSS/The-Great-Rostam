<img src="https://capsule-render.vercel.app/api?type=rect&height=180&color=0:2b0a00,50:8b5a00,100:ffd700&text=THE%20GREAT%20ROSTAM&fontSize=52&fontAlignY=42&desc=A%202D%20Action%20Game%20Inspired%20by%20Shahnameh&descAlignY=62&descSize=16&animation=twinkling" width="100%" />

<div align="center">

![Love2D](https://img.shields.io/badge/Love2D-11.5-00FF41?style=for-the-badge&logo=lua&logoColor=black)
![Status](https://img.shields.io/badge/Status-In%20Development-orange?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-00FF41?style=for-the-badge)
![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge)

</div>

<div align="center">

> **EN** — An epic 2D action game about **Rostam**, the legendary hero of Ferdowsi's *Shahnameh*.
> Fight through the **Seven Trials (هفت‌خوان)**, ride **Rakhsh**, and face the White Demon.

> **FA** — یک بازی اکشن دوبعدی حماسی درباره‌ی **رستم دستان**، پهلوان شاهنامه‌ی فردوسی.
> از **هفت‌خوان** عبور کن، سوار بر **رخش** بشو و با دیو سپید مبارزه کن.

</div>

---

## 🏔 Story | داستان

The land of Iran is plagued by demons. The aged hero **Rostam**, wearing his tiger-skin armor
(پوست ببر) and wielding the ox-headed mace (گرز گاوسر), sets his famous horse **Rakhsh** toward
Mazandaran to free King Kay Kavus. Seven trials stand between him and the White Demon —
each one a level of the game.

سرزمین ایران آلوده به دیوان است. پهلوان کهنسال **رستم** با جامه‌ی پلنگینه (پوست ببر) و گرز
گاوسر، سوار بر اسب افسانه‌ای‌اش **رخش** راهی مازندران می‌شود تا کیکاوس را برهاند. هفت‌خوان
سخت میان او و دیو سپید فاصله انداخته — هر خوان، یک مرحله از بازی است.

---

## 🎮 Gameplay | گیم‌پلی

| Feature | Description |
|---|---|
| 🏃 **Side-scrolling action** | Fast 2D combat with jump, dash and combo attacks |
| 🐎 **Rakhsh Mount** | Call Rakhsh for a speed & damage boost on demand |
| 🏹 **Two weapon styles** | Ox-headed mace (melee) + heroic bow (ranged) |
| 🗺 **Seven Trials** | Each خوان is a handcrafted level with a unique boss |
| 💀 **Boss fights** | Lion, Dragon, Witch... and finally **دیو سپید** |
| ⭐ **Persian atmosphere** | Pixel art inspired by Persian miniatures & Shahnameh calligraphy |

## 🕹 Controls | کنترل‌ها

| Key | Action |
|---|---|
| `←` `→` | Move / حرکت |
| `Z` / `Space` | Jump / پرش |
| `X` | Mace attack / حمله با گرز |
| `C` | Bow shot / تیراندازی |
| `Shift` | Call Rakhsh / فراخوان رخش |
| `Esc` | Pause / توقف |

---

## 🚀 Getting Started | نحوه اجرا

**EN:** Install [Love2D 11.5](https://love2d.org/), then:

```bash
git clone https://github.com/SSSchangerSSS/The-Great-Rostam.git
cd The-Great-Rostam
love .
```

Or zip the folder, rename it to `Rostam.love`, and open it with Love2D.

**FA:** اول [Love2D 11.5](https://love2d.org/) را نصب کنید، سپس مخزن را کلون کرده و دستور `love .` را اجرا کنید. یا پوشه را zip کرده و پسوندش را به `Rostam.love` تغییر دهید.

---

## 📁 Project Structure | ساختار پروژه

```
The-Great-Rostam/
├── main.lua              # entry point & game states / نقطه ورود و حالت‌های بازی
├── conf.lua              # Love2D window & module config / تنظیمات پنجره
├── src/                  # game code modules (player, enemies, states)
├── assets/               # sprites, audio, fonts / گرافیک، صدا و فونت
├── docs/
│   └── GAME_DESIGN.md    # full game design document / سند کامل طراحی بازی
└── README.md
```

---

## 🗺 Roadmap | نقشه راه

- [x] Project bootstrap — مقدمات پروژه
- [x] Core game loop & menu — حلقه اصلی بازی و منو
- [ ] Player movement, jump & mace combat — حرکت، پرش و مبارزه
- [ ] Rakhsh mount mechanic — سازوکار سوار شدن بر رخش
- [ ] Trial I — The Lion (خوان اول — شیر)
- [ ] Trial II — The Burning Desert (خوان دوم — بیابان سوزان)
- [ ] Trial III — The Dragon (خوان سوم — اژدها)
- [ ] Trial IV — The Witch (خوان چهارم — جادوگر)
- [ ] ??? (mystery trials — خوان‌های اسرارآمیز)
- [ ] Final Boss — Div-e Sepid (غول آخر — دیو سپید)

---

## 🤝 Contributing | مشارکت

Ideas, pixel art, Persian poetry quotes and code are all welcome — open an issue or a PR!

ایده، هنر پیکسلی، ابیات شاهنامه و کد — همه خوش‌آمدید؛ ایشو یا پول‌ریکوئست باز کنید!

## 📜 License | مجوز

[MIT](LICENSE) — *Shahnameh belongs to everyone; this game belongs to its contributors.*

*شاهنامه مال همه است؛ این بازی مال سازندگانش.*
