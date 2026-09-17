import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">٤٠٤</p>
      <h1 className="mt-3 text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        قد يكون الرابط قديماً أو تم حذف المنيو. تأكد من الرمز أو اطلب رابطاً
        جديداً من المطعم.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/">العودة للرئيسية</Link>
      </Button>
    </main>
  );
}