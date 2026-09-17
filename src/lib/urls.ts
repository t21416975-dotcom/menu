export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";

/** Canonical, never-changing QR target. Encodes the restaurant UUID. */
export function scanUrl(restaurantId: string): string {
  return `${SITE_URL}/q/${restaurantId}`;
}

/** Pretty, editable public menu URL. */
export function menuUrl(slug: string): string {
  return `${SITE_URL}/m/${slug}`;
}