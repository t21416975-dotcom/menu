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

  // 1. Persist the original if storage is configured, but don't block AI extraction if bucket fails.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "menu.jpg";
  const imagePath = `${user.id}/${Date.now()}-${safeName}`;

  try {
    await supabase.storage
      .from("menu-uploads")
      .upload(imagePath, bytes, { contentType: mimeType, upsert: false });
  } catch {
    // Storage persistence is non-blocking for live AI extraction
  }

  // 2. Create the job row before calling the model so failures are traceable.
  let jobId: string | null = null;
  try {
    const { data: job } = await supabase
      .from("extraction_jobs")
      .insert({
        restaurant_id: restaurant.id,
        created_by: user.id,
        image_path: imagePath,
        status: "processing",
      })
      .select("id")
      .single();
    if (job) jobId = job.id;
  } catch {
    // Non-blocking if table is unavailable
  }

  try {
    const menu = await extractMenuFromImage(bytes.toString("base64"), mimeType);

    if (menu.categories.length === 0) {
      if (jobId) {
        await supabase
          .from("extraction_jobs")
          .update({
            status: "failed",
            error: "لم يتم العثور على أصناف في الصورة",
            completed_at: new Date().toISOString(),
          })
          .eq("id", jobId);
      }

      return NextResponse.json(
        { error: "لم نتمكن من قراءة أي أصناف من هذه الصورة. تأكد من وضوح الصورة وجرّب مرة أخرى." },
        { status: 422 },
      );
    }

    if (jobId) {
      await supabase
        .from("extraction_jobs")
        .update({
          status: "completed",
          result: menu,
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return NextResponse.json({ jobId: jobId ?? "temp-job", menu });
  } catch (error) {
    let message = "فشل تحليل الصورة، يرجى المحاولة مرة أخرى";
    let status = 500;

    if (error instanceof GeminiNotConfiguredError) {
      message = "ميزة القراءة الذكية غير مفعّلة. يرجى إضافة GEMINI_API_KEY في إعدادات البيئة.";
      status = 503;
    } else if (error instanceof Error && (error.name === "GeminiRateLimitError" || error.message.includes("Rate Limit") || error.message.includes("429"))) {
      message = "تم الوصول إلى الحد المؤقت للطلبات (Rate limit). انتظر دقيقة ثم أعد المحاولة.";
      status = 429;
    } else if (error instanceof Error && error.message) {
      message = `فشل التحليل: ${error.message}`;
    }

    if (jobId) {
      await supabase
        .from("extraction_jobs")
        .update({
          status: "failed",
          error: error instanceof Error ? error.message : "unknown",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    }

    return NextResponse.json({ error: message }, { status });
  }
}