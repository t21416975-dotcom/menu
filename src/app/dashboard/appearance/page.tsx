import type { Metadata } from "next";

import { AppearanceEditor } from "@/components/dashboard/appearance-editor";
import { requireRestaurant } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PALETTES } from "@/lib/theme";
import type { Palette } from "@/lib/types";

export const metadata: Metadata = { title: "المظهر" };

export default async function AppearancePage() {
  const restaurant = await requireRestaurant();
  const supabase = await createClient();

  const { data: palettes } = await supabase
    .from("palettes")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false });

  const geminiConfigured =
    Boolean(process.env.GEMINI_API_KEY) &&
    process.env.GEMINI_API_KEY !== "placeholder-gemini-key";

  return (
    <AppearanceEditor
      restaurant={restaurant}
      savedPalettes={(palettes ?? []) as Palette[]}
      systemPalettes={SYSTEM_PALETTES}
      geminiConfigured={geminiConfigured}
    />
  );
}