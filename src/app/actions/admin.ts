"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSuperAdmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export async function setRestaurantActive(
  restaurantId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  await requireSuperAdmin();

  const parsed = z.string().uuid().safeParse(restaurantId);
  if (!parsed.success) return { error: "معرّف غير صالح" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("restaurants")
    .update({ is_active: isActive })
    .eq("id", parsed.data);

  if (error) return { error: error.message };

  revalidatePath("/admin");
  revalidatePath("/", "layout");
  return {};
}