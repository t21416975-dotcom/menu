import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/dal";

const STEPS = [
  {
    title: "ارفع صورة المنيو",
    body: "صوّر قائمتك الحالية بالجوال، وارفع الصورة كما هي. لا حاجة لإعادة الكتابة.",
  },
  {
    title: "الذكاء الاصطناعي يقرأها",
    body: "نستخرج الأقسام والأطباق والأسعار تلقائياً، ثم تراجعها أنت وتعدّل ما تريد.",
  },
  {
    title: "اختر ألوانك",
    body: "ثيمات مقترحة لمنيو مطعمك، أو اختر ألوانك بنفسك مع ضمان وضوح النص.",
  },
  {
    title: "اطبع رمز QR",
    body: "رمز دائم لا يتغير أبداً، حتى لو غيّرت الرابط أو حدّثت الأسعار.",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center">
        <Badge variant="secondary" className="mb-6">
          منيو إلكتروني بالذكاء الاصطناعي
        </Badge>

        <h1 className="text-4xl font-bold leading-[1.25] tracking-tight sm:text-6xl sm:leading-[1.2]">
          منيو مطعمك الإلكتروني
          <br />
          <span className="text-primary">جاهز في دقيقتين</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          ارفع صورة قائمتك، ودعنا نحولها إلى منيو إلكتروني أنيق برابط خاص
          ورمز QR دائم. عدّل الأسعار والأصناف في أي وقت — والرمز لا يتغير.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {user ? (
            <Button size="lg" asChild>
              <Link href="/dashboard">الذهاب إلى لوحة التحكم</Link>
            </Button>
          ) : (
            <Button size="lg" asChild>
              <Link href="/login">ابدأ مجاناً بحساب جوجل</Link>
            </Button>
          )}
          <Button size="lg" variant="outline" asChild>
            <Link href="#how">كيف يعمل؟</Link>
          </Button>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-5 sm:grid-cols-2">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className="rounded-2xl border border-border bg-card p-6 text-start"
            >
              <div className="mb-4 flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {index + 1}
              </div>
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            الرمز لا يتغير. المحتوى يتغير.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            رمز QR يشير إلى رابط دائم خاص بمطعمك. عدّل الرابط الظاهر، أضف
            أطباقاً، أو ارفع الأسعار — كل الأكواد المطبوعة تبقى تعمل.
          </p>
        </div>
      </section>
    </main>
  );
}