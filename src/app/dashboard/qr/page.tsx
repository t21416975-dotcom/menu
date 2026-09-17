import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { QrPanel } from "@/components/dashboard/qr-panel";
import { requireRestaurant } from "@/lib/dal";
import { renderQrDataUrl } from "@/lib/qr";
import { createClient } from "@/lib/supabase/server";
import { menuUrl, scanUrl } from "@/lib/urls";

export const metadata: Metadata = { title: "رمز QR" };

export default async function QrPage() {
  const restaurant = await requireRestaurant();
  const supabase = await createClient();

  const { data: slugRow } = await supabase
    .from("slugs")
    .select("slug")
    .eq("restaurant_id", restaurant.id)
    .eq("is_current", true)
    .maybeSingle();

  const slug = slugRow?.slug ?? "";
  const dataUrl = await renderQrDataUrl(restaurant.id, {
    theme: restaurant.theme,
    size: 512,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">رمز QR الدائم</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            اطبع هذا الرمز وضعه على الطاولات. لن يتغير أبداً مهما عدّلت المنيو أو
            الرابط.
          </p>
        </div>
        {slug && (
          <Link
            href={menuUrl(slug)}
            target="_blank"
            className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
          >
            <ExternalLinkIcon className="size-4" />
            معاينة المنيو
          </Link>
        )}
      </div>

      <QrPanel
        restaurantName={restaurant.name}
        scanUrl={scanUrl(restaurant.id)}
        menuPath={slug ? `/m/${slug}` : ""}
        initialDataUrl={dataUrl}
      />
    </div>
  );
}