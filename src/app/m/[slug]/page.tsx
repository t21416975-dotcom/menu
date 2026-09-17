import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { PublicMenu } from "@/components/public/public-menu";
import { createClient } from "@/lib/supabase/server";
import type {
  MenuCategory,
  MenuItem,
  PublicRestaurant,
} from "@/lib/types";

const getRestaurantBySlug = cache(
  async (slug: string): Promise<PublicRestaurant | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("public_restaurants")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    return (data as PublicRestaurant | null) ?? null;
  },
);

/**
 * Resolves a *historical* slug to the restaurant's current one. This is what
 * keeps links shared before a rename from breaking.
 */
const resolveSlugRedirect = cache(
  async (slug: string): Promise<string | null> => {
    const supabase = await createClient();
    const { data } = await supabase.rpc("resolve_slug", { p_slug: slug });

    const row = data?.[0];
    if (!row || row.is_current) return null;
    return row.current_slug !== slug ? row.current_slug : null;
  },
);

const getMenu = cache(
  async (
    restaurantId: string,
  ): Promise<{ categories: MenuCategory[]; items: MenuItem[] }> => {
    const supabase = await createClient();
    const [{ data: categories }, { data: items }] = await Promise.all([
      supabase
        .from("menu_categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_visible", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_visible", true)
        .order("sort_order", { ascending: true }),
    ]);

    return {
      categories: (categories ?? []) as MenuCategory[],
      items: (items ?? []) as MenuItem[],
    };
  },
);

export async function generateMetadata({
  params,
}: PageProps<"/m/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) return { title: "المنيو غير موجود" };

  return {
    title: restaurant.name,
    description:
      restaurant.description ??
      `المنيو الإلكتروني لـ ${restaurant.name} بالأسعار المحدّثة.`,
    openGraph: {
      title: restaurant.name,
      description: restaurant.description ?? undefined,
      images: restaurant.cover_url ? [restaurant.cover_url] : undefined,
    },
  };
}

export default async function PublicMenuPage({ params }: PageProps<"/m/[slug]">) {
  const { slug } = await params;
  const restaurant = await getRestaurantBySlug(slug);

  if (!restaurant) {
    // The slug may be an old one the owner has since renamed away from.
    const currentSlug = await resolveSlugRedirect(slug);
    if (currentSlug) redirect(`/m/${currentSlug}`);
    notFound();
  }

  const { categories, items } = await getMenu(restaurant.id);

  void trackScan(restaurant.id);

  return <PublicMenu restaurant={restaurant} categories={categories} items={items} />;
}

/**
 * Fire-and-forget analytics. Awaited so the RLS-protected insert completes
 * before the response is flushed, but failures never break the page.
 */
async function trackScan(restaurantId: string) {
  try {
    const supabase = await createClient();
    await supabase.from("scans").insert({ restaurant_id: restaurantId });
  } catch {
    // Analytics are best-effort only.
  }
}