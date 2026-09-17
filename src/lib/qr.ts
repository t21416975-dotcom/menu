import "server-only";

import QRCode from "qrcode";

import { scanUrl } from "./urls";
import { readableForeground } from "./theme";
import type { RestaurantTheme } from "./types";

type QrOptions = {
  theme?: RestaurantTheme | null;
  logoUrl?: string | null;
  size?: number;
};

const DEFAULT_SIZE = 1024;

/**
 * Renders the permanent scan URL as an SVG string. SVG is preferred over PNG
 * because it stays crisp at any print size — the code goes on table tents,
 * window decals and flyers.
 */
export async function renderQrSvg(
  restaurantId: string,
  options: QrOptions = {},
): Promise<string> {
  const url = scanUrl(restaurantId);
  const dark = options.theme?.foreground ?? "#141414";
  const light = options.theme?.background ?? "#ffffff";

  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    color: {
      dark: normaliseHex(dark, "#141414"),
      light: normaliseHex(light, "#ffffff"),
    },
  });
}

/** Renders the same code as a PNG data URL for on-screen preview and download. */
export async function renderQrDataUrl(
  restaurantId: string,
  options: QrOptions = {},
): Promise<string> {
  const url = scanUrl(restaurantId);
  const dark = options.theme?.foreground ?? "#141414";
  const light = options.theme?.background ?? "#ffffff";

  return QRCode.toDataURL(url, {
    width: options.size ?? DEFAULT_SIZE,
    errorCorrectionLevel: "H",
    margin: 2,
    color: {
      dark: normaliseHex(dark, "#141414"),
      light: normaliseHex(light, "#ffffff"),
    },
  });
}

/**
 * Produces a printable SVG badge: the QR code, a title, and the restaurant
 * name — ready to be dropped on a table. Kept simple so it works without any
 * external image dependency (no server-side logo fetching).
 */
export async function renderQrBadgeSvg(
  restaurantId: string,
  restaurantName: string,
  options: QrOptions = {},
): Promise<string> {
  const qrSvg = await renderQrSvg(restaurantId, options);
  const primary = options.theme?.primary ?? "#c2410c";
  const background = options.theme?.background ?? "#ffffff";
  const foreground = options.theme?.foreground ?? "#141414";
  const onPrimary = readableForeground(primary);

  // QRCode emits a standalone <svg>; lift its inner markup and viewBox so we
  // can place it inside a larger badge document.
  const viewBoxMatch = qrSvg.match(/viewBox="([^"]+)"/);
  const viewBox = viewBoxMatch?.[1] ?? "0 0 100 100";
  const inner = qrSvg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const [, vbY, vbW] = viewBox.split(/\s+/).map(Number);
  const qrSize = 640;
  const scale = qrSize / vbW;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1040" viewBox="0 0 800 1040" fill="none">
  <rect width="800" height="1040" rx="48" fill="${background}"/>
  <rect x="0" y="0" width="800" height="176" rx="48" fill="${primary}"/>
  <rect x="0" y="128" width="800" height="48" fill="${primary}"/>
  <text x="400" y="84" text-anchor="middle" font-family="sans-serif" font-size="40" font-weight="700" fill="${onPrimary}">امسح لعرض المنيو</text>
  <text x="400" y="134" text-anchor="middle" font-family="sans-serif" font-size="26" fill="${onPrimary}" opacity="0.9">Scan for our menu</text>
  <g transform="translate(${(800 - qrSize) / 2} ${200 - vbY * scale}) scale(${scale})">
    ${inner}
  </g>
  <text x="400" y="912" text-anchor="middle" font-family="sans-serif" font-size="40" font-weight="700" fill="${foreground}">${escapeXml(restaurantName)}</text>
  <text x="400" y="962" text-anchor="middle" font-family="sans-serif" font-size="24" fill="${foreground}" opacity="0.6">امسح الكود بكاميرا الجوال</text>
</svg>`;
}

function normaliseHex(value: string, fallback: string): string {
  const candidate = value?.trim() ?? "";
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(candidate)
    ? candidate
    : fallback;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}