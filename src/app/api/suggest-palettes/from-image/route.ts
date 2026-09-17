import { NextResponse } from "next/server";

import { getCurrentUser, getOwnRestaurant } from "@/lib/dal";
import {
  GeminiNotConfiguredError,
  GeminiRateLimitError,
  extractPalettesFromImage,
} from "@/lib/gemini";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export const maxDuration = 45;

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
      { error: "صيغة الصورة غير مدعومة. استخدم JPG أو PNG أو WEBP." },
      { status: 415 },
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const base64Data = bytes.toString("base64");

    const palettes = await extractPalettesFromImage(
      base64Data,
      mimeType,
      restaurant.name,
    );

    if (palettes.length === 0) {
      return NextResponse.json(
        { error: "لم نتمكن من استخراج لوحة ألوان مناسبة من هذه الصورة، جرب صورة أخرى أكثر وضوحاً." },
        { status: 422 },
      );
    }

    return NextResponse.json({ palettes });
  } catch (error) {
    let message = "فشل استخراج الثيم من الصورة، حاول مرة أخرى";
    let status = 500;

    if (error instanceof GeminiNotConfiguredError) {
      message = "ميزة استخراج الألوان بالذكاء الاصطناعي غير مفعّلة. أضف GEMINI_API_KEY.";
      status = 503;
    } else if (
      error instanceof GeminiRateLimitError ||
      (error instanceof Error &&
        (error.message.includes("Rate Limit") || error.message.includes("429")))
    ) {
      message = "تم تجاوز حد الطلبات المؤقت لـ Gemini. يرجى المحاولة بعد قليل.";
      status = 429;
    } else if (error instanceof Error && error.message) {
      message = error.message;
    }

    return NextResponse.json({ error: message }, { status });
  }
}
