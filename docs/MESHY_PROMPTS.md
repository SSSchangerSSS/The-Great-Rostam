# 🎨 Meshy AI Prompts — پرامپت‌های آمادهٔ Meshy برای مدل‌های سه‌بعدی بازی

> این سند به شما اجازه می‌دهد با **پلن رایگان Meshy** (۱۰۰ کردیت در ماه) مدل‌های سه‌بعدی کاراکترهای بازی را بسازید.
> با ساخت هر فایل، فقط کافیست GLB را به من بدهید تا در `assets/meshy/` بگذارم — بازی **خودش** مدل را لود می‌کند
> و جای بدن پروسیجرال فعلی می‌نشاند (Drop-in — بدون هیچ تغییر کدی).

---

## ۱. راهنمای گام‌به‌گام | Step-by-Step

1. **ثبت‌نام:** وارد [meshy.ai](https://www.meshy.ai) شوید (Sign up with Google). پلن رایگان = ۱۰۰ کردیت/ماه.
2. **ساخت مدل:** از منو **Text to 3D** را باز کنید، پرامپت انگلیسیِ جدول پایین را Paste کنید.
3. **تنظیمات پیشنهادی هر جنریشن:**
   - Art Style: **Stylized** (اگر گزینه بود: Stylized / Cartoon)
   - Topology: **Quad** · Target Polycount: **متوسط** (حدود 10k–30k — برای موبایل)
   - Symmetry: **روشن**
4. **ریگ و انیمیشن:** روی مدل ساخته‌شده **Rigging → Auto-Rigging** (۵ کردیت) بزنید، بعد از کتابخانهٔ
   انیمیشن‌ها اکشن‌های جدول «انیمیشن‌های لازم» را اضافه کنید (هر اکشن ۳ کردیت).
5. **دانلود:** **Download → GLB**. فایل را دقیقاً با نام جدول rename کنید (مثلاً `rostam.glb`) و به من بدهید.
6. تمام! من فایل را در ریپو می‌گذارم، بازی در بوت خودش کشف و نرمالایز می‌کند (مقیاس، جهت، سایه، فلاش ضربه).

### نکات پلن رایگان
- دانلود رایگان فقط برای مدل‌های **Meshy-6-Lite** است (حدود ۱۰ دانلود در ماه) — در تنظیمات جنریشن مدل `Meshy-6-Lite` را انتخاب کنید.
- لایسنس خروجی **CC BY 4.0** است؛ اعتبار Meshy در README بازی ذکر شده است.
- بودجهٔ پیشنهادی ماه اول: **رستم + شیر** (۲ مدل با ریگ و انیمیشن ≈ ۹۰ کردیت).

---

## ۲. پرامپت پایه (پسوند مشترک همهٔ پرامپت‌ها)

همهٔ پرامپت‌ها با این پسوند تمام می‌شوند تا استایل بازی یکدست بماند:

```
stylized game character, heroic proportions, Persian miniature painting palette
(turquoise, crimson, gold), hand-painted texture look, clean quad topology,
symmetrical pose, full body, centered, single character
```

---

## ۳. جدول فایل‌ها و پرامپت‌ها

| نام فایل GLB | نقش | اولویت |
|---|---|---|
| `rostam.glb` | قهرمان بازی | ⭐ فوری |
| `lion.glb` | باس خوان I | ⭐ فوری |
| `rakhsh.glb` | اسب رستم | دوم |
| `jackal.glb` | دشمن معمولی | سوم |
| `jackalA.glb` | مینی‌باس شغال سپید | اختیاری (بدونش tint سفید خودکار می‌گیرد) |
| `dragon.glb` | باس خوان III (آینده) | بعداً |
| `witch.glb` | باس خوان IV (آینده) | بعداً |
| `whitediv.glb` | باس نهایی خوان VII (آینده) | بعداً |

### ⭐ rostam.glb — رستم
```
Aged Persian hero Rostam from the Shahnameh epic, powerful middle-aged warrior
with thick black beard and braided hair, wearing a leopard-skin pelt over his
chest, crimson warrior trousers and leather boots, bronze archer helmet with a
small golden crest, golden armbands, holding a heavy bronze ox-headed mace in
his right hand, long curved bow slung across his back, stoic heroic expression,
```

**انیمیشن‌های لازم (از کتابخانهٔ Meshy):** Idle · Walk · Run · Jump · یک ضربهٔ حمله (Punch/Attack) · Hit Reaction · Death

### ⭐ lion.glb — شیرِ خوان
```
Fierce mythical lion of the Shahnameh, huge male lion with dark golden mane,
battle-scarred muscular body, open jaw with fangs, intimidating golden eyes,
heavy paws, prowling predator stance,
```

**انیمیشن‌ها:** Idle · Walk · Run · Attack (Pounce/Swipe) · Hit Reaction · Death

### rakhsh.glb — رخش
```
Majestic white war stallion of Persian legend, muscular heroic horse with a
golden saddle and crimson saddle cloth decorated with Persian ornaments, a
white star marking on the forehead, long flowing mane and tail, proud stance,
```

**انیمیشن‌ها:** Idle · Run (Gallop در صورت وجود)

### jackal.glb — شغال دیو
```
Sinister demon jackal creature from Persian mythology, lean canine quadruped
with dark charcoal fur, glowing amber eyes, small curved horns and a spiked
collar, evil grin with fangs, crouched hunting stance,
```

**انیمیشن‌ها:** Idle · Run · Attack (Lunge/Pounce) · Hit Reaction · Death

### jackalA.glb — شغالِ سپید (مینی‌باس)
```
Alpha demon jackal from Persian mythology, larger lean canine quadruped with
snow-white fur and pale battle scars, glowing ice-blue eyes, ornate bone totem
jewelry on its neck, dominant alpha predator stance,
```

**انیمیشن‌ها:** همان jackal + Howl/Roar در صورت وجود

### dragon.glb — اژدها (خوان III — بعداً)
```
Colossal Persian mythical dragon from the Shahnameh, serpentine wingless dragon
of the volcanic wasteland, obsidian scales with ember-orange glow between the
plates, rows of horns along its spine, glowing yellow eyes, coiled crouched pose,
```

### witch.glb — ساحره (خوان IV — بعداً)
```
Wicked desert witch of the Shahnameh, gaunt old woman in tattered dark teal
robes with golden jewelry, holding a gnarled wooden staff, veil over grey hair,
sinister smile, hunched pose,
```

### whitediv.glb — دیو سپید (باس نهایی — بعداً)
```
White Div, the towering demon king of Persian mythology, massive humanoid demon
with chalk-white skin, long white beard and braided hair, fanged snarling mouth,
heavy golden bracelets and black iron armor plates, glowing red eyes, menacing
standing pose,
```

---

## ۴. نگاشت انیمیشن | Animation Mapping

نیازی به تطبیق دقیق اسم اکشن‌ها نیست — بازی با **جستجوی فازی** خودش اکشن درست را پیدا می‌کند:

| کلیپ بازی | کلمات کلیدی جستجو |
|---|---|
| idle / run / walk / gallop | idle, run, gallop, walk |
| attack1-3 / swipe | attack, punch, slash, swing |
| hurt / flinch / stagger | hit, flinch, damage, reaction |
| die / dead | death, die, dying |
| howl / roar | howl, roar, scream |
| jump / fall / pounce | jump, fall, pounce |
| roll | roll, dodge, spin |

اگر اکشنی در GLB نباشد، همان حالت به نزدیک‌ترین اکشن موجود (معمولاً Idle) می‌افتد — بازی هرگز نمی‌شکند.

---

## ۵. عیب‌یابی

| مشکل | راه‌حل |
|---|---|
| مدل رو به عقب راه می‌رود | در `js/gfx/meshy.js` ثابت `FACING_FIX` برای آن کاراکتر `Math.PI` اضافه/کم کنید |
| مدل بزرگ/کوچک است | خودکار با `TARGET_H` نرمالایز می‌شود؛ عدد آن کاراکتر را تغییر دهید |
| مدل لود نمی‌شود | نام فایل باید دقیقاً `assets/meshy/<نام جدول>.glb` باشد |
| رنگ رستم با محیط نمی‌خواند | در پرامپت پالت رنگ (فیروزه‌ای/قرمز/طلایی) را پررنگ‌تر کنید |

> **یادآوری:** مدل‌های پروسیجرال فعلی کاملاً حفظ شده‌اند — اگر فایل GLB نباشد یا خراب باشد، بازی بی‌صدا به همان بدن‌های فعلی برمی‌گردد. هیچ‌چیز نمی‌شکند.
