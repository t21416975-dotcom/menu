import { NextResponse } from "next/server";

import { getCurrentUser, getOwnRestaurant } from "@/lib/dal";
import { GeminiNotConfiguredError, suggestPalettes } from "@/lib/gemini";

export const maxDuration = 45;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const restaurant = await getOwnRestaurant();
  if (!restaurant) {
    return NextResponse.json({ error: "لا يوجد مطعم" }, { status: 404 });
  }

  try {
    const palettes = await suggestPalettes({
      restaurantName: restaurant.name,
      description: restaurant.description,
    });

    if (palettes.length === 0) {
      return NextResponse.json(
        { error: "لم نتمكن من اقتراح ثيمات مناسبة، حاول لاحقاً" },
        { status: 422 },
      );
    }

    return NextResponse.json({ palettes });
  } catch (error) {
    const message =
      error instanceof GeminiNotConfiguredError
        ? "ميزة اقتراح الألوان غير مفعّلة. أضف GEMINI_API_KEY."
        : "فشل توليد الثيمات، حاول مرة أخرى";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}