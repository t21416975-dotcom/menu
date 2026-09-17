import type { Metadata } from "next";

import { MenuManager } from "@/components/dashboard/menu-manager";
import { requireRestaurant } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { CategoryWithItems, MenuCategory, MenuItem } from "@/lib/types";

export const metadata: Metadata = { title: "المنيو" };

export default async function MenuPage() {
  const restaurant = await requireRestaurant();
  const supabase = await createClient();

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase
      .from("menu_categories")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order", { ascending: true }),
  ]);

  const grouped: CategoryWithItems[] = ((categories ?? []) as MenuCategory[]).map(
    (category) => ({
      ...category,
      items: ((items ?? []) as MenuItem[]).filter(
        (item) => item.category_id === category.id,
      ),
    }),
  );

  const uncategorised = ((items ?? []) as MenuItem[]).filter(
    (item) => item.category_id === null,
  );

  return (
    <MenuManager
      restaurant={restaurant}
      categories={grouped}
      uncategorised={uncategorised}
    />
  );
}