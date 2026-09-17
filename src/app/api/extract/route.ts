import { NextResponse } from "next/server";

import { getOwnRestaurant, getCurrentUser } from "@/lib/dal";
import {
  GeminiNotConfiguredError,
  extractMenuFromImage,
} from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const restaurant = await getOwnRestaurant();
  if (!restaurant) {
    return NextResponse.json({ error: "لا يوجد مطعم" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "طلب غير صالح" }, { status: 400 });
  }

  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "لم يتم إرسال صورة" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "حجم الصورة يتجاوز 8 ميجابايت" },
      { status: 413 },
    );
  }

  const mimeType = file.type || "image/jpeg";
  if (!ALLOWED_TYPES.includes(mimeType)) {
    return NextResponse.json(
      { error: "صيغة الصورة غير مدعومة" },
      { status: 415 },
    );
  }

  const supabase = await createClient();
  const bytes = Buffer.from(await file.arrayBuffer());

  // 1. Persist the original privately so the owner can revisit it later.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "menu.jpg";
  const imagePath = `${user.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from("menu-uploads")
    .upload(imagePath, bytes, { contentType: mimeType, upsert: false });

  if (uploadError) {
    return NextResponse.json(
      { error: "تعذّر رفع الصورة" },
      { status: 500 },
    );
  }

  // 2. Create the job row before calling the model so failures are traceable.
  const { data: job, error: jobError } = await supabase
    .from("extraction_jobs")
    .insert({
      restaurant_id: restaurant.id,
      created_by: user.id,
      image_path: imagePath,
      status: "processing",
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "تعذّر إنشاء المهمة" }, { status: 500 });
  }

  try {
    const menu = await extractMenuFromImage(bytes.toString("base64"), mimeType);

    if (menu.categories.length === 0) {
      await supabase
        .from("extraction_jobs")
        .update({
          status: "failed",
          error: "لم يتم العثور على أصناف في الصورة",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      return NextResponse.json(
        { error: "لم نتمكن من قراءة أي أصناف. جرّب صورة أوضح." },
        { status: 422 },
      );
    }

    await supabase
      .from("extraction_jobs")
      .update({
        status: "completed",
        result: menu,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({ jobId: job.id, menu });
  } catch (error) {
    const message =
      error instanceof GeminiNotConfiguredError
        ? "ميزة القراءة الذكية غير مفعّلة. أضف GEMINI_API_KEY."
        : "فشل تحليل الصورة، حاول مرة أخرى";

    await supabase
      .from("extraction_jobs")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "unknown",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}