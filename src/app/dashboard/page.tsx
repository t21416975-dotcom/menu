import type { Metadata } from "next";
import Link from "next/link";
import {
  ExternalLinkIcon,
  PaletteIcon,
  QrCodeIcon,
  UploadIcon,
  UtensilsCrossedIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireRestaurant } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { menuUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "نظرة عامة" };

export default async function DashboardPage() {
  const restaurant = await requireRestaurant();
  const supabase = await createClient();

  const [{ count: categoryCount }, { count: itemCount }, { count: scanCount }, slugRow] =
    await Promise.all([
      supabase
        .from("menu_categories")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("scans")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurant.id),
      supabase
        .from("slugs")
        .select("slug")
        .eq("restaurant_id", restaurant.id)
        .eq("is_current", true)
        .maybeSingle(),
    ]);

  const slug = slugRow.data?.slug ?? "";

  const stats = [
    { label: "الأقسام", value: categoryCount ?? 0, icon: UtensilsCrossedIcon },
    { label: "الأطباق", value: itemCount ?? 0, icon: UtensilsCrossedIcon },
    { label: "مرات المسح", value: scanCount ?? 0, icon: QrCodeIcon },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{restaurant.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {restaurant.is_active ? "المنيو معروض للزوار" : "المنيو موقوف مؤقتاً"}
          </p>
        </div>

        <div className="flex gap-2">
          <Badge variant={restaurant.is_active ? "default" : "secondary"}>
            {restaurant.is_active ? "نشط" : "موقوف"}
          </Badge>
          {slug && (
            <Button variant="outline" size="sm" asChild>
              <Link href={menuUrl(slug)} target="_blank">
                <ExternalLinkIcon className="size-4" />
                معاينة المنيو
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-2">
                <stat.icon className="size-4" />
                {stat.label}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(itemCount ?? 0) === 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle>ابدأ بإنشاء منيوك</CardTitle>
            <CardDescription className="leading-relaxed">
              ارفع صورة قائمتك الحالية وسنستخرج الأصناف والأسعار تلقائياً، أو أضف
              الأطباق يدوياً.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/dashboard/import">
                <UploadIcon className="size-4" />
                رفع صورة المنيو
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/menu">إضافة يدوية</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UploadIcon className="size-4" />
              استيراد من صورة
            </CardTitle>
            <CardDescription>
              حوّل صورة المنيو إلى أصناف قابلة للتعديل.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/import">ابدأ الاستيراد</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PaletteIcon className="size-4" />
              المظهر والألوان
            </CardTitle>
            <CardDescription>
              اختر ثيماً جاهزاً أو اطلب اقتراحات بالذكاء الاصطناعي.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/appearance">تخصيص المظهر</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCodeIcon className="size-4" />
              رمز QR الدائم
            </CardTitle>
            <CardDescription>
              حمّل الرمز واطبعه. لا يتغير مهما عدّلت.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/qr">عرض الرمز</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}