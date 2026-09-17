# دليل التشغيل والإعداد — منيو (MenuQR)

هذا الملف يشرح **ما عليك فعله** لتحويل المشروع من كوده الحالي إلى منصة تعمل فعلياً،
ثم **كيف تستخدمها** يوماً بيوم.

> المشروع مكتمل برمجياً (بناء + فحص أنواع + lint كلها نظيفة).
> الناقص فقط: مفاتيح الخدمات الخارجية (Supabase وGoogle وGemini).

---

## 0) المتطلبات

| الأداة | ملاحظة |
|---|---|
| Node.js 20+ | موجود لديك (v22) |
| npm | موجود (10.9) |
| حساب [Supabase](https://supabase.com) | مجاني |
| حساب [Google Cloud](https://console.cloud.google.com) | لزر الدخول بجوجل |
| مفتاح [Google AI Studio](https://aistudio.google.com/apikey) | لتحليل صور المنيو |

---

## 1) إعداد Supabase (الأهم)

### 1.1 إنشاء المشروع
1. اذهب إلى [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. اختر اسماً قوياً وكلمة مرور لقاعدة البيانات واحفظ منطقه (Region) قريباً منك.

### 1.2 تنفيذ المخطط (Schema)
1. من المشروع → **SQL Editor** → **New query**.
2. افتح ملف `supabase/migrations/0001_init.sql` كاملاً، انسخ محتواه والصقه.
3. اضغط **Run**. يجب أن ينتهي بلا أخطاء.

هذا الملف ينشئ:
- الجداول: `profiles, restaurants, slugs, menu_categories, menu_items, extraction_jobs, palettes, scans, subscriptions`.
- سياسات **RLS** على كل جدول.
- الدوال: `is_super_admin, slug_available, is_restaurant_public, resolve_slug, current_slug, set_restaurant_slug`.
- العرض `public_restaurants` (لمنيو الزوار دون كشف `owner_id`).
- مخزني التخزين: `restaurant-assets` (عام) و `menu-uploads` (خاص).

### 1.3 جلب المفاتيح
من **Project Settings → API** انسخ:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **سرّي، لا يصل للمتصفح أبداً**

---

## 2) تفعيل الدخول بجوجل (Google OAuth)

### 2.1 في Google Cloud Console
1. أنشئ مشروعاً جديداً (أو اختر موجوداً).
2. **APIs & Services → OAuth consent screen**: اختر External، املأ اسم التطبيق وبريد الدعم، وأضف نفسك كـ Test user.
3. **Credentials → Create Credentials → OAuth client ID** → نوع **Web application**.
4. في **Authorized redirect URIs** أضف بالضبط:
   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```
   حيث `<project-ref>` هو معرّف مشروع Supabase (الجزء قبل `.supabase.co` في الـ Project URL).
5. انسخ **Client ID** و **Client Secret**.

### 2.2 في Supabase
**Authentication → Providers → Google** → فعّله، والصق Client ID و Secret، ثم **Save**.

---

## 3) مفتاح Gemini (تحليل صور المنيو)

1. اذهب إلى [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. **Create API key** وانسخه → `GEMINI_API_KEY`.
3. الموديل الافتراضي `gemini-2.5-flash` (يمكن تغييره عبر `GEMINI_MODEL`).

> بدون هذا المفتاح يبقى الموقع يعمل، لكن زر «استيراد من صورة» يُظهر تنبيهاً بأن الميزة غير مفعّلة، واقتراح الثيمات بالذكاء الاصطناعي يتوقف.

---

## 4) متغيرات البيئة

```bash
cp .env.example .env.local
```

ثم عبّئ `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci....
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci....

GEMINI_API_KEY=AIzaSy....
GEMINI_MODEL=gemini-2.5-flash

NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- في الإنتاج غيّر `NEXT_PUBLIC_SITE_URL` إلى نطاقك الحقيقي (يُستخدم في روابط QR وإعادة توجيه OAuth).
- ملف `.env.local` مستثنى من Git تلقائياً (`.gitignore`).

---

## 5) التشغيل المحلي

```bash
npm install
npm run dev
```

افتح <http://localhost:3000>.

### التحقق دفعة واحدة
```bash
npx tsc --noEmit   # الأنواع
npm run lint       # ESLint
npm run build      # بناء إنتاجي
```

---

## 6) أول تشغيل: كيف تستخدم المنصة

1. **أنشئ الحساب**: من `/login` اضغط «الدخول بجوجل».
   - **أول مستخدم** في القاعدة يصبح `super_admin` تلقائياً، والبقية `owner`.
2. **أنشئ مطعماً** (`/onboarding`): الاسم + الرابط النظيف (slug) + العملة.
   - الرابط يُفحص فورياً عبر `slug_available`، وهو **قابل للتغيير لاحقاً دون كسر رمز QR**.
3. **أضف المنيو** بإحدى طريقتين:
   - **يدوياً** (`/dashboard/menu`): أقسام وأطباق مع الأسعار.
   - **من صورة** (`/dashboard/import`): ارفع صورة المنيو → يستخرج Gemini الأقسام والأطباق → راجع وعدّل → احفظ.
     > لا يُكتب أي شيء في القاعدة قبل ضغطك «حفظ».
4. **اختر المظهر** (`/dashboard/appearance`):
   - ثيمات جاهزة، أو اقتراحات بالذكاء الاصطناعي، أو تعديل يدوي.
   - كل ثيم يُفحص تلقائياً لتباين WCAG AA (لا نص غير مقروء).
5. **رمز QR** (`/dashboard/qr`): نزّل PNG أو SVG أو لوحة طاولة.
   - الرمز يشفّر `/q/<uuid>` **إلى الأبد**؛ حتى لو غيّرت الرابط النظيف يبقى الرمز المطبوع صالحاً.
6. **شارك المنيو**: الرابط العام `/m/<slug>` يظهر من `/dashboard/qr` و`/dashboard/settings`.
7. **لوحة السوبر أدمن** (`/admin`): تفعيل/إيقاف المطاعم.

### مسار الزائر
```
يمسح QR → /q/<uuid> → يقرأ الـ slug الحالي → redirect → /m/<slug>
رابط قديم → /m/<slug-قديم> → redirect تلقائي → /m/<slug-الحالي>
```

---

## 7) النشر على Vercel

1. ارفع المشروع إلى Git ثم **Import Project** في [vercel.com](https://vercel.com).
2. أضف **كل** متغيرات البيئة في **Settings → Environment Variables** (مع وضع Production).
3. انشر. بعد النشر:
   - حدّث `NEXT_PUBLIC_SITE_URL` إلى نطاق Vercel ثم أعد النشر.
   - أضف نطاق الإنتاج إلى **Authorized redirect URIs** في Google؟ لا — يبقى redirect URI في Google هو رابط Supabase نفسه. لكن تأكد أن `NEXT_PUBLIC_SITE_URL` صحيح لأنه يُستخدم كـ `redirectTo` في OAuth.
4. اختياري: نطاق مخصص من **Settings → Domains**.

---

## 8) استكشاف الأخطاء

| المشكلة | السبب المحتمل | الحل |
|---|---|---|
| الدخول بجوجل يفشل | Redirect URI غير مطابق | تأكد أنه `https://<ref>.supabase.co/auth/v1/callback` بالضبط |
| `/m/*` بطيء جداً | مفاتيح Supabase وهمية → مهلة اتصال | عبّئ `.env.local` بمفاتيح حقيقية |
| «الميزة غير مفعّلة» عند رفع صورة | لا يوجد `GEMINI_API_KEY` | أضف المفتاح وأعد تشغيل الخادم |
| زوار لا يرون المنيو | المطعم موقوف | فعّله من `/dashboard` أو `/admin` |
| الخط العربي لا يظهر | حزمة الخط | تأكد أن `html className` يحمل `plexArabic.variable` وأن `--font-sans` يشير إلى `var(--font-plex-arabic)` |

> بعد تغيير أي متغير بيئة، **أعد تشغيل** `npm run dev`.

---

## 9) الأوامر المختصرة

```bash
npm run dev      # تطوير (localhost:3000)
npm run build    # بناء إنتاجي
npm run start    # تشغيل نسخة البناء
npm run lint     # ESLint
npx tsc --noEmit # فحص الأنواع
```

---

## 10) البنية السريعة

```
supabase/migrations/0001_init.sql   # كل قاعدة البيانات + RLS
src/proxy.ts                        # بديل middleware في Next 16 (حماية المسارات)
src/lib/gemini.ts                   # استخراج المنيو + اقتراح الألوان
src/lib/theme.ts                    # الثيمات + فحص التباين
src/lib/qr.ts                       # توليد QR (PNG/SVG/لوحة)
src/lib/dal.ts                      # طبقة الوصول الآمنة
src/app/m/[slug]/                   # المنيو العام
src/app/q/[id]/                     # نقطة QR الدائمة
src/app/dashboard/                  # لوحة صاحب المطعم
src/app/admin/                      # لوحة السوبر أدمن
```