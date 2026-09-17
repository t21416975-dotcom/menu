import type { Metadata } from "next";
import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCurrentUser } from "@/lib/dal";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const user = await getCurrentUser();
  const { next, error } = await searchParams;

  if (user) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">أنت مسجل الدخول بالفعل</h1>
          <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            الذهاب إلى لوحة التحكم
          </Link>
        </div>
      </main>
    );
  }

  const nextPath =
    typeof next === "string" && next.startsWith("/") && !next.startsWith("//")
      ? next
      : "/dashboard";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold">مرحباً بك</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            سجّل الدخول بحساب جوجل لإنشاء منيو مطعمك والحصول على رمز QR الدائم.
          </p>

          {typeof error === "string" && error.length > 0 && (
            <Alert variant="destructive" className="mt-6 text-start">
              <AlertDescription>
                تعذّر إكمال تسجيل الدخول. حاول مرة أخرى.
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-8">
            <GoogleSignInButton next={nextPath} />
          </div>

          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            بالمتابعة أنت توافق على شروط الاستخدام وسياسة الخصوصية.
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="underline-offset-4 hover:underline">
            العودة إلى الصفحة الرئيسية
          </Link>
        </p>
      </div>
    </main>
  );
}