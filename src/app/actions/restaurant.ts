"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { SYSTEM_PALETTES } from "@/lib/theme";
import { isSlugAllowed, slugify } from "@/lib/utils";

export type ActionState = {
  error?: string;
  success?: string;
};

const createRestaurantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "اسم المطعم قصير جداً")
    .max(120, "اسم المطعم طويل جداً"),
  slug: z.string().trim().min(1, "الرابط مطلوب"),
  currency: z.string().trim().min(1).max(8).default("SAR"),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
});

export async function createRestaurant(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = createRestaurantSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    currency: formData.get("currency") || "SAR",
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    address: formData.get("address") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const slug = slugify(parsed.data.slug);
  if (!isSlugAllowed(slug)) {
    return { error: "الرابط غير صالح أو محجوز، جرّب رابطاً آخر" };
  }

  const supabase = await createClient();

  const { data: available } = await supabase.rpc("slug_available", {
    candidate: slug,
  });
  if (!available) {
    return { error: "هذا الرابط مستخدم بالفعل" };
  }

  const { data: restaurant, error } = await supabase
    .from("restaurants")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      currency: parsed.data.currency,
      phone: parsed.data.phone ?? null,
      whatsapp: parsed.data.whatsapp ?? null,
      address: parsed.data.address ?? null,
      theme: SYSTEM_PALETTES[0].colors,
    })
    .select("id")
    .single();

  if (error || !restaurant) {
    return { error: error?.message ?? "تعذّر إنشاء المطعم" };
  }

  const { error: slugError } = await supabase.from("slugs").insert({
    slug,
    restaurant_id: restaurant.id,
    is_current: true,
  });

  if (slugError) {
    // Roll back so the owner is never left with a restaurant that has no link.
    await supabase.from("restaurants").delete().eq("id", restaurant.id);
    return { error: "تعذّر حجز الرابط، جرّب رابطاً آخر" };
  }

  await supabase.from("subscriptions").insert({
    restaurant_id: restaurant.id,
    plan: "free",
    status: "active",
  });

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

const updateRestaurantSchema = z.object({
  name: z.string().trim().min(2, "اسم المطعم قصير جداً").max(120),
  currency: z.string().trim().min(1).max(8),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  address: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
});

export async function updateRestaurantSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = updateRestaurantSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency") || "SAR",
    phone: formData.get("phone") || undefined,
    whatsapp: formData.get("whatsapp") || undefined,
    address: formData.get("address") || undefined,
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({
      name: parsed.data.name,
      currency: parsed.data.currency,
      phone: parsed.data.phone ?? null,
      whatsapp: parsed.data.whatsapp ?? null,
      address: parsed.data.address ?? null,
      description: parsed.data.description ?? null,
    })
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { success: "تم حفظ البيانات" };
}

const slugSchema = z
  .string()
  .trim()
  .min(3, "الرابط قصير جداً")
  .max(50, "الرابط طويل جداً");

export async function updateSlug(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUser();

  const slug = slugify(slugSchema.parse(formData.get("slug")));
  const restaurantId = String(formData.get("restaurantId") ?? "");

  if (!restaurantId) return { error: "معرّف المطعم مفقود" };
  if (!isSlugAllowed(slug)) {
    return { error: "الرابط غير صالح أو محجوز" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_restaurant_slug", {
    p_restaurant_id: restaurantId,
    p_new_slug: slug,
  });

  if (error) {
    if (error.message.includes("SLUG_TAKEN")) {
      return { error: "هذا الرابط مستخدم بالفعل" };
    }
    if (error.message.includes("INVALID_SLUG")) {
      return { error: "صيغة الرابط غير صحيحة" };
    }
    return { error: "تعذّر تحديث الرابط" };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/", "layout");
  return { success: `تم تحديث الرابط إلى /m/${slug}` };
}

export async function toggleRestaurantActive(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const isActive = formData.get("isActive") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ is_active: isActive })
    .eq("owner_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return {
    success: isActive ? "تم تفعيل المنيو" : "تم إيقاف عرض المنيو مؤقتاً",
  };
}