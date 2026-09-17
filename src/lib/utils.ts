export { cn } from "cn";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$/;

export const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "dashboard",
  "login",
  "logout",
  "signup",
  "m",
  "q",
  "about",
  "pricing",
  "terms",
  "privacy",
  "support",
  "help",
  "www",
  "app",
  "static",
]);

export function isSlugAllowed(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

export function formatPrice(
  price: number | null,
  currency: string,
): string {
  if (price === null || Number.isNaN(price)) return "";
  const value = new Intl.NumberFormat("ar", {
    minimumFractionDigits: price % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
  return `${value} ${currency}`;
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}