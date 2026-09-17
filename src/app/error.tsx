"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Error() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-2xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        حاول تحديث الصفحة. إذا استمرت المشكلة، تواصل معنا.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/">العودة للرئيسية</Link>
      </Button>
    </main>
  );
}
