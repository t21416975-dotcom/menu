import type { Metadata } from "next";

import { SettingsForm } from "@/components/dashboard/settings-form";
import { requireRestaurant } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/lib/types";

export const metadata: Metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  const restaurant = await requireRestaurant();
  const supabase = await createClient();

  const [{ data: slugRow }, { data: slugHistory }, { data: subscription }] =
    await Promise.all([
      supabase
        .from("slugs")
        .select("slug")
        .eq("restaurant_id", restaurant.id)
        .eq("is_current", true)
        .maybeSingle(),
      supabase
        .from("slugs")
        .select("slug, created_at")
        .eq("restaurant_id", restaurant.id)
        .eq("is_current", false)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("subscriptions")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle(),
    ]);

  return (
    <SettingsForm
      restaurant={restaurant}
      currentSlug={slugRow?.slug ?? ""}
      slugHistory={slugHistory ?? []}
      subscription={(subscription as Subscription | null) ?? null}
    />
  );
}