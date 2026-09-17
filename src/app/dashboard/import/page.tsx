import type { Metadata } from "next";

import { MenuImport } from "@/components/dashboard/menu-import";
import { requireRestaurant } from "@/lib/dal";

export const metadata: Metadata = { title: "استيراد المنيو من صورة" };

export default async function ImportPage() {
  const restaurant = await requireRestaurant();

  const geminiConfigured =
    Boolean(process.env.GEMINI_API_KEY) &&
    process.env.GEMINI_API_KEY !== "placeholder-gemini-key";

  return (
    <MenuImport restaurant={restaurant} geminiConfigured={geminiConfigured} />
  );
}