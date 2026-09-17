"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import type { ExtractedMenu } from "@/lib/types";

export type MenuActionState = { error?: string; success?: string };

/** The select control uses a sentinel because HTML options cannot be empty. */
function normaliseCategoryId(value: FormDataEntryValue | null): string | null {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw === "" || raw === "__none__" ? null : raw;
}

const categorySchema = z.object({
  restaurantId: z.string().uuid(),
  name: z.string().trim().min(1, "اسم القسم مطلوب").max(80),
  description: z.string().trim().max(300).optional(),
});

export async function createCategory(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  await requireUser();
  const parsed = categorySchema.safeParse({
    restaurantId: formData.get("restaurantId"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const supabase = await createClient();

  const { data: last } = await supabase
    .from("menu_categories")
    .select("sort_order")
    .eq("restaurant_id", parsed.data.restaurantId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("menu_categories").insert({
    restaurant_id: parsed.data.restaurantId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/menu");
  return { success: "تم إضافة القسم" };
}

export async function updateCategory(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const name = z.string().trim().min(1).max(80).parse(formData.get("name"));
  const description = String(formData.get("description") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_categories")
    .update({ name, description })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/menu");
  revalidatePath("/", "layout");
  return { success: "تم تحديث القسم" };
}

export async function deleteCategory(id: string): Promise<MenuActionState> {
  await requireUser();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { error: "معرّف غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", parsed.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/menu");
  revalidatePath("/", "layout");
  return { success: "تم حذف القسم" };
}

export async function toggleCategoryVisibility(
  id: string,
  isVisible: boolean,
): Promise<MenuActionState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_categories")
    .update({ is_visible: isVisible })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/menu");
  revalidatePath("/", "layout");
  return { success: "تم التحديث" };
}

const itemSchema = z.object({
  restaurantId: z.string().uuid(),
  categoryId: z.string().uuid().nullable(),
  name: z.string().trim().min(1, "اسم الطبق مطلوب").max(120),
  description: z.string().trim().max(400).optional(),
  price: z.coerce.number().min(0, "السعر غير صحيح").max(1_000_000).nullable(),
  imageUrl: z.string().trim().url("رابط الصورة غير صحيح").or(z.literal("")).nullable().optional(),
});

export async function createItem(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  await requireUser();
  const rawPrice = String(formData.get("price") ?? "").trim();
  const rawImageUrl = String(formData.get("imageUrl") ?? "").trim();

  const parsed = itemSchema.safeParse({
    restaurantId: formData.get("restaurantId"),
    categoryId: normaliseCategoryId(formData.get("categoryId")),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: rawPrice === "" ? null : rawPrice,
    imageUrl: rawImageUrl || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const supabase = await createClient();

  let lastQuery = supabase
    .from("menu_items")
    .select("sort_order")
    .eq("restaurant_id", parsed.data.restaurantId);

  lastQuery = parsed.data.categoryId
    ? lastQuery.eq("category_id", parsed.data.categoryId)
    : lastQuery.is("category_id", null);

  const { data: last } = await lastQuery
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("menu_items").insert({
    restaurant_id: parsed.data.restaurantId,
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    price: parsed.data.price,
    image_url: parsed.data.imageUrl || null,
    sort_order: (last?.sort_order ?? 0) + 1,
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard/menu");
  revalidatePath("/", "layout");
  return { success: "تم إضافة الطبق" };
}

export async function updateItem(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const rawPrice = String(formData.get("price") ?? "").trim();
  const rawImageUrl = String(formData.get("imageUrl") ?? "").trim();

  const parsed = z
    .object({
      name: z.string().trim().min(1, "اسم الطبق مطلوب").max(120),
      description: z.string().trim().max(400).nullable(),
      price: z.coerce.number().min(0).max(1_000_000).nullable(),
      categoryId: z.string().uuid().nullable(),
      image_url: z.string().trim().url("رابط الصورة غير صحيح").or(z.literal("")).nullable().optional(),
    })
    .safeParse({
      name: formData.get("name"),
      description: String(formData.get("description") ?? "").trim() || null,
      price: rawPrice === "" ? null : rawPrice,
      categoryId: normaliseCategoryId(formData.get("categoryId")),
      image_url: rawImageUrl || null,
    });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "بيانات غير صحيحة" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      category_id: parsed.data.categoryId,
      image_url: parsed.data.image_url || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/menu");
  revalidatePath("/", "layout");
  return { success: "تم تحديث الطبق" };
}

export async function deleteItem(id: string): Promise<MenuActionState> {
  await requireUser();
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { error: "معرّف غير صالح" };

  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", parsed.data);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/menu");
  revalidatePath("/", "layout");
  return { success: "تم حذف الطبق" };
}

export async function toggleItemAvailability(
  id: string,
  isAvailable: boolean,
): Promise<MenuActionState> {
  await requireUser();
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/menu");
  revalidatePath("/", "layout");
  return { success: "تم التحديث" };
}

/**
 * Persists a reviewed AI extraction. Everything is written in one pass after
 * the owner has confirmed the data, so a bad OCR run can never corrupt a live
 * menu.
 */
export async function applyExtraction(
  _prev: MenuActionState,
  formData: FormData,
): Promise<MenuActionState> {
  await requireUser();

  const restaurantId = z.string().uuid().parse(formData.get("restaurantId"));
  const jobId = z.string().uuid().parse(formData.get("jobId"));
  const payload = String(formData.get("menu") ?? "");

  let menu: ExtractedMenu;
  try {
    menu = JSON.parse(payload) as ExtractedMenu;
  } catch {
    return { error: "بيانات الاستخراج تالفة" };
  }

  if (!Array.isArray(menu.categories) || menu.categories.length === 0) {
    return { error: "لا توجد أقسام لحفظها" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("menu_categories")
    .select("sort_order")
    .eq("restaurant_id", restaurantId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  let order = (existing?.sort_order ?? 0) + 1;

  for (const category of menu.categories) {
    const name = category.name?.trim();
    if (!name) continue;

    const { data: createdCategory, error: categoryError } = await supabase
      .from("menu_categories")
      .insert({ restaurant_id: restaurantId, name, sort_order: order++ })
      .select("id")
      .single();

    if (categoryError || !createdCategory) {
      return { error: "تعذّر حفظ الأقسام" };
    }

    const items = category.items
      .filter((item) => item.name?.trim())
      .map((item, index) => ({
        restaurant_id: restaurantId,
        category_id: createdCategory.id,
        name: item.name.trim(),
        description: item.description?.trim() || null,
        price:
          typeof item.price === "number" && Number.isFinite(item.price)
            ? item.price
            : null,
        sort_order: index + 1,
      }));

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("menu_items").insert(items);
      if (itemsError) return { error: "تعذّر حفظ الأطباق" };
    }
  }

  await supabase
    .from("extraction_jobs")
    .update({ status: "applied" })
    .eq("id", jobId);

  revalidatePath("/dashboard/menu");
  revalidatePath("/", "layout");
  return { success: "تم حفظ المنيو بنجاح" };
}