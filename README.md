# منيو | MenuQR

منصة متعددة المطاعم لتحويل صورة المنيو إلى **منيو إلكتروني** أنيق، مع:
- استخراج الأصناف والأسعار من الصورة بالذكاء الاصطناعي (Google Gemini).
- اقتراح ثيمات ألوان تلقائية + تخصيص يدوي مع ضمان التباين (WCAG AA).
- **رمز QR دائم** ورابط عام قابل للتعديل دون كسر الرمز المطبوع.

## التقنيات

| الطبقة | الاختيار |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui (RTL) + خط IBM Plex Sans Arabic |
| Backend | Supabase (Postgres + RLS + Auth + Storage) |
| AI | Google Gemini (`@google/genai`) — server-only |
| QR | `qrcode` (SVG + PNG + لوحة طاولة) |
| Deploy | Vercel + Supabase Cloud |

## كيف يعمل ثبات رمز QR

```
QR يشفّر دائماً:   https://<site>/q/<restaurant-uuid>   ← لا يتغير أبداً
                              │
                              ▼
GET /q/[id]  →  يقرأ الـ slug الحالي  →  redirect  →  /m/<slug>
```

- الـ `slug` للعرض والـ SEO فقط؛ تغييره لا يمسّ الرمز.
- جدول `slugs` يسجّل كل الروابط السابقة، و`/m/<old-slug>` يُحوَّل (301 فعلياً) إلى الرابط الحالي.
- `slug_available` و`set_restaurant_slug` دالتان في Postgres تضمنان التفرد والذرّية.

## الإعداد

### 1. متغيرات البيئة

انسخ `.env.example` إلى `.env.local` واملأ:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # للسوبر أدمن فقط، لا يُرسل للمتصفح
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. قاعدة البيانات

نفّذ `supabase/migrations/0001_init.sql` في Supabase SQL Editor (أو `supabase db push`).
ينشئ الجداول، سياسات RLS، الدوال، وbuckets التخزين.

### 3. تسجيل الدخول بجوجل

1. أنشئ OAuth Client في Google Cloud Console.
2. Redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase Dashboard → Authentication → Providers → Google: الصق Client ID/Secret.

### 4. التشغيل

```bash
npm install
npm run dev      # http://localhost:3000
```

> أول مستخدم يسجّل دخوله يصبح `super_admin` تلقائياً (عبر trigger `handle_new_user`)، والبقية `owner`.

## الأوامر

```bash
npm run dev        # تطوير
npm run build      # بناء إنتاجي
npm run lint       # ESLint
npx tsc --noEmit   # فحص الأنواع
```

## البنية

```
src/
├── app/
│   ├── page.tsx                 # الهبوط
│   ├── login/                   # دخول جوجل
│   ├── auth/callback/           # مبادلة الكود بجلسة
│   ├── onboarding/              # إنشاء المطعم
│   ├── dashboard/               # (menu | import | appearance | qr | settings)
│   ├── admin/                   # لوحة السوبر أدمن
│   ├── m/[slug]/                # المنيو العام (يشمل redirect للروابط القديمة)
│   ├── q/[id]/                  # نقطة QR الدائمة
│   ├── api/extract/             # صورة مدخلات ← JSON (Gemini)
│   ├── api/suggest-palettes/    # اقتراح ثيمات بالـ AI
│   └── api/qr/[format]/         # تنزيل png | svg | badge
├── components/                  # dashboard | public | admin | ui
├── lib/
│   ├── gemini.ts                # استخراج المنيو + اقتراح الألوان
│   ├── theme.ts                 # حل الثيم + التحقق من التباين
│   ├── qr.ts                    # توليد الرموز ولوحة الطاولة
│   ├── dal.ts                   # طبقة الوصول الآمنة (getUser)
│   ── supabase/                # client | server | admin
└── proxy.ts                     # Next.js 16 Proxy (بديل middleware)
```

## ملاحظات أمنية

- مفتاح Gemini على السيرفر فقط؛ لا يصل للعميل.
- كل مدخل يُتحقق منه بـ zod، ومخرجات النموذج تُنقّى قبل الحفظ.
- لا تُكتب نتائج الاستخراج في القاعدة إلا بعد مراجعة المستخدم.
- RLS مفعّل على كل الجداول، والتحقق من الصلاحيات قريب من البيانات (`dal.ts`).
- `role` غير قابل للكتابة من العميل (`revoke update (role)`).