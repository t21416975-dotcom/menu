import { NextResponse } from "next/server";

import { requireRestaurant } from "@/lib/dal";
import { renderQrBadgeSvg, renderQrDataUrl, renderQrSvg } from "@/lib/qr";

type RouteContext = { params: Promise<{ format: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  const restaurant = await requireRestaurant();
  const { format } = await params;

  const { searchParams } = new URL(request.url);
  const rawSize = Number(searchParams.get("size"));
  const size = Number.isFinite(rawSize)
    ? Math.min(2048, Math.max(256, Math.round(rawSize)))
    : 1024;

  const options = { theme: restaurant.theme, size };

  if (format === "svg") {
    const svg = await renderQrSvg(restaurant.id, options);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="qr-${restaurant.id.slice(0, 8)}.svg"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "badge") {
    const svg = await renderQrBadgeSvg(restaurant.id, restaurant.name, options);
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="badge-${restaurant.id.slice(0, 8)}.svg"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "png") {
    const dataUrl = await renderQrDataUrl(restaurant.id, options);
    const base64 = dataUrl.split(",")[1] ?? "";
    return new NextResponse(Buffer.from(base64, "base64"), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="qr-${restaurant.id.slice(0, 8)}.png"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return NextResponse.json({ error: "صيغة غير مدعومة" }, { status: 400 });
}