# IMPLEMENTATION_STATUS — وضعیت پیاده‌سازی

تاریخ: ۲۰۲۶-۱۰-۲۳ · نسبت به commit مبنای ممیزی `e21a00e`
همراه با: `docs/AUDIT.md` (ریز ایرادها) و `docs/ASSET_PIPELINE.md` (دارایی‌ها)

## ۱) انجام‌شده در این نوبت (تغییرات واقعی فایل‌ها)

### موتور (P0)
- **حلقهٔ fixed-timestep**: `js/core/game.js` — STEP=1/60 با accumulator، سقف catch-up، alpha interpolation، بازنشانی پس از تب مخفی/blur/pause، آمار زمان‌سنجی `__rostam.stats` (fps/frameMs/simMs/drawMs/steps/stepsDropped).
- **قرارداد ورودی**: `js/core/input.js` — بافر مهر-زمانی، `endStep(consumed)`، `consume(action)`، پنجرهٔ ۱۲۰ms برای گام‌های ردشده؛ حذف گم‌شدن ضربه در hitstop؛ رفع دوباره‌شلیک pause/دیالوگ/منو/QTE.
- **برخورد**: `js/world/world.js` — prev واقعی (px/py)، one-way در برابر solid (فرود/bonk/هل افقی)، `LAND_EPS`؛ `js/content/levels.js` — پرچم oneWay برای لبه‌ها.
- **قرارداد مختصات**: تیر/ذرات/آیتم‌ها در world-space داخل `cam.apply`؛ culling با `cam.rect()`؛ `js/core/camera.js` — interp دوربین + `rect()/visible()` + شدت لرزش از تنظیمات.
- **QTE/Director**: بازنشانی کامل per-run (`_done_slamhit`!)، `Director.abort()`، guard خروج از play، پاک‌سازی در pause/مرگ/exit.
- **SpriteBank صادقانه**: retry، ثبت خطا، `has()` همه‌یانه، fallback کنترل‌شده به painter، `status()`.

### مبارزه و AI (P1)
- بافر کمبو ۱۲۰ms + `hitSet` (هر دشمن یک‌بار در هر ضربه) + roll-cancel پس از فریم فعال.
- کمان دو رده (سریع/شارژشده) با anchor و رفتار تعریف‌شده؛ تیر swept.
- رخش: trample تاکتیکی با per-enemy cooldown؛ حفظ cooldown فراخوان.
- زنجیرهٔ triple باس میانی از پایه اصلاح شد (A1)؛ جداسازی دشمنان؛ look-ahead نرم دوربین.
- تنظیمات: صدا/لرزش/QTE آسان (نسخه‌دار در localStorage) + دکمه‌های pause.

### جریان مرحله
- **checkpoint** پس از باس میانی (حافظه + localStorage نسخه‌دار)؛ retry شکست از checkpoint؛ «ادامه» روی title؛ دیالوگ بازگشت؛ رفع soft-lock قفل arena پس از respawn.
- جریان کامل شروع→آموزش→برخوردها→میان‌باس→checkpoint→باس→شکست/پیروزی→تلاش مجدد یکپارچه شد.

### ابزار و آزمون
- `tools/animation-lab.html` (بازبینی + اعتبارسنجی شیت‌ها).
- `scripts/node-logic-tests.mjs` — **۲۰ آزمون منطق** سبز (تعیین‌پذیری، پرش، برخورد، swept، triple، Director، اصطکاک، بافر ورودی).
- آزمون‌های مرورگر واقعی (headless Chromium): فینیشر دوتایی در یک نشست، checkpoint/retry، pause، restart×۳ بدون تکثیر، خرابی دارایی 404 با fallback، موبایل portrait/landscape، اسکرین‌شات‌ها در `docs/screenshots-test/`.
- قلاب‌های آزمون گسترش‌یافته: `__rd.info()/tap()/hold()/clearMobs()/setupBossFight()`.

### اندازه‌گیری عملکرد (محیط: headless Chromium، localhost، viewport 1280×720)
- FPS: **۵۸–۶۰** پایدار؛ frameMs≈۱۶٫۶؛ **simMs≈۰٫۵۸**؛ drawMs≈۰٫۱۶؛ stepsDropped=0.
- شمارندهٔ FPS به‌تنهایی مدرک نیست — زمان‌سنجی تفکیک‌شده در `__rostam.stats` زنده است.

## ۲) باز (به‌ترتیب اولویت پیشنهادی)

1. **اندازه‌گیری تجربهٔ کامل با گیم‌پلی دستی** روی دستگاه مرجع (زمان مرحله ۵–۱۰ دقیقه هدف) — تخمین فعلی از مشاهدهٔ مسیر آزمون: ~۵–۸ دقیقه.
2. **دستگاه لمسی واقعی**: چندلمسی، safe-area، خروج انگشت از دکمه — headless جایگزین آن نیست.
3. **سیستم event-key انیمیشن**: رویدادهای (ضربه/تیر/صدا) روی timeline دادهٔ کلیپ به‌جای polling progress (فعلاً polling با progress مقفل بر dt ثابت درست کار می‌کند).
4. **تنوع برخورد مرحله**: نقش مهاجم سریع ثانویه (پرنده؟) و تهدید ناحیه‌ای — فعلاً جکال/آلفا/شیر.
5. **تعامل محیطی معنادار جدید** (مثلاً ستون فروریزنده به‌عنوان مسیر/سلاح) — pickupها فعلی حفظ شدند.
6. **شیت‌های اختصاصی** finishLeap/finishSlam/airAttack (فهرست در ASSET_PIPELINE §۶).
7. **HUD پرترهٔ باریک**: چیدمان hearts/boss-bar/sys-btns (خوانا ولی همپوشان).
8. **تصمیم سرنوشت GL3D/Meshy** (`js/gfx/gl3d.js`, `meshy.js`, `models3d.js`, `js/lib/three*` — ~۱MB کد مرده، import ندارند): حذف یا اتصال دوباره؛ تا آن زمان از bundle بارگیری حذف‌شان نکنید چون module graph به‌صورت تنبل لود نمی‌شود.

## ۳) ریسک‌ها

- **Safari/iOS آزمون نشده**: `ctx.filter` استفاده نمی‌شود (عمداً)، ولی font-stack و audio unlock باید روی دستگاه واقعی چک شود.
- **throw در هندلر UI حین تغییر وضعیت**: همهٔ مسیرها با try/catch localStorage محافظت شده‌اند؛ خطای uncaught در اجرای آزمون‌شده دیده نشد، ولی پوشش خودکار خطا (window.onerror → گزارش) هنوز وجود ندارد.
- **RNG قابل seed**: `?seed=` منطق gameplay را deterministic می‌کند؛ افکت‌های بصری عمداً Math.random می‌مانند (طبق الزام، منطق را نمی‌شکنند).
- **فضای ذخیره‌سازی خصوصی**: همهٔ localStorage ها try/catch دارند؛ در حالت private مرورگر فقط persistence از دست می‌رود.

## ۴) قدم بعدی دقیق (دستورالعمل)

1. `git pull` جدیدترین main را بگیرید؛ `python3 -m http.server 8000` و `tools/animation-lab.html` را باز کنید.
2. مرحلهٔ ۲ از §۲ بالا: یک گوشی/تبلت واقعی؛ بازی را باز کنید؛ چندلمسی (حرکت+حملهٔ هم‌زمان) و safe-area را چک کنید؛ نتایج را در AUDIT §F-H ثبت کنید.
3. شیت‌های §۶ ASSET_PIPELINE را با مشخصات §۵ سفارش/ساخت کنید؛ پس از هر بازسازی `ASSET_VER` را bump بزنید و آزمون اعتبارسنجی را سبز کنید.
4. سیستم event-key (بند ۳ باز) را روی `content/rigs.js` بسازید: `events: [{t:0.52, fn:'hit'}]` در Clip + `Animator` با crossing-aware dispatch (loop/interruption هم پوشش داده شود).
