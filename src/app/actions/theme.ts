"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { isPaletteAccessible } from "@/lib/theme";
import type { PaletteColors, RestaurantTheme } from "@/lib/types";

export type ThemeActionState = { error?: string; success?: string };

const hexSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "لون غير صالح");

const paletteSchema = z.object({
  primary: hexSchema,
  accent: hexSchema,
  background: hexSchema,
  foreground: hexSchema,
  muted: hexSchema,
  mode: z.enum(["light", "dark"]),
});

export async function applyTheme(
  _prev: ThemeActionState,
  formData: FormData,
): Promise<ThemeActionState> {
  const user = await requireUser();

  const parsed = paletteSchema.safeParse({
    primary: formData.get("primary"),
    accent: formData.get("accent"),
    background: formData.get("background"),
    foreground: formData.get("foreground"),
    muted: formData.get("muted"),
    mode: formData.get("mode") || "light",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "ألوان غير صالحة" };
  }

  const paletteId = String(formData.get("paletteId") ?? "").trim() || null;
  const radiusRaw = Number(formData.get("radius"));
  const radius = Number.isFinite(radiusRaw)
    ? Math.min(28, Math.max(0, Math.round(radiusRaw)))
    : 14;

  const theme: RestaurantTheme = {
    ...parsed.data,
    paletteId,
    radius,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ theme })
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  revalidatePath("/", "layout");
  return { success: "تم تطبيق الثيم" };
}

export async function savePalette(
  name: string,
  colors: PaletteColors,
): Promise<{ error?: string; id?: string }> {
  const user = await requireUser();

  const parsed = paletteSchema.safeParse(colors);
  if (!parsed.success) return { error: "ألوان غير صالحة" };
  if (!isPaletteAccessible(parsed.data)) {
    return { error: "التباين ضعيف، اختر ألواناً أوضح" };
  }

  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!restaurant) return { error: "لا يوجد مطعم" };

  const { data, error } = await supabase
    .from("palettes")
    .insert({
      restaurant_id: restaurant.id,
      name: name.trim() || "ثيمي",
      colors: parsed.data,
      source: "manual",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/appearance");
  return { id: data.id };
}

export async function deletePalette(id: string): Promise<{ error?: string }> {
  await requireUser();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { error: "معرّف غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase.from("palettes").delete().eq("id", parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/appearance");
  return {};
}

/** Persists AI-suggested palettes so they survive a page refresh. */
export async function saveAiPalettes(
  palettes: { name: string; colors: PaletteColors }[],
): Promise<{ error?: string }> {
  const user = await requireUser();

  const valid = palettes.filter((palette) => {
    const parsed = paletteSchema.safeParse(palette.colors);
    return parsed.success && isPaletteAccessible(parsed.data);
  });

  if (valid.length === 0) return { error: "لا توجد ثيمات صالحة" };

  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!restaurant) return { error: "لا يوجد مطعم" };

  const { error } = await supabase.from("palettes").insert(
    valid.map((palette) => ({
      restaurant_id: restaurant.id,
      name: palette.name,
      colors: palette.colors,
      source: "ai" as const,
    })),
  );

  if (error) return { error: error.message };
  revalidatePath("/dashboard/appearance");
  return {};
}