import type { PaletteColors, RestaurantTheme } from "./types";

export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  colors: PaletteColors;
};

/**
 * System presets. These are always available and act as the fallback when a
 * restaurant has not chosen a theme yet. They intentionally avoid pure black
 * and pure white so text contrast stays comfortable on phone screens.
 */
export const SYSTEM_PALETTES: ThemePreset[] = [
  {
    id: "system-ember",
    name: "جمر",
    description: "دفء المطبخ الشرقي مع لمسة ذهبية",
    colors: {
      primary: "#c2410c",
      accent: "#f59e0b",
      background: "#fffbf5",
      foreground: "#1c1917",
      muted: "#f5ede3",
      mode: "light",
    },
  },
  {
    id: "system-olive",
    name: "زيتون",
    description: "أخضر هادئ يناسب المقاهي والمطاعم الصحية",
    colors: {
      primary: "#3f6212",
      accent: "#84cc16",
      background: "#f8faf3",
      foreground: "#1a2e05",
      muted: "#eaf0dc",
      mode: "light",
    },
  },
  {
    id: "system-midnight",
    name: "منتصف الليل",
    description: "داكن أنيق يبرز صور الأطباق",
    colors: {
      primary: "#e2b04a",
      accent: "#f4d58d",
      background: "#12100e",
      foreground: "#f7f3ea",
      muted: "#241f1a",
      mode: "dark",
    },
  },
  {
    id: "system-rose",
    name: "ورد",
    description: "لمسة عصرية لحلويات ومخابز",
    colors: {
      primary: "#be123c",
      accent: "#fb7185",
      background: "#fff7f8",
      foreground: "#271217",
      muted: "#fbe4e9",
      mode: "light",
    },
  },
  {
    id: "system-ocean",
    name: "محيط",
    description: "أزرق نظيف يناسب المأكولات البحرية",
    colors: {
      primary: "#0e7490",
      accent: "#22d3ee",
      background: "#f4fbfd",
      foreground: "#082f3a",
      muted: "#dcf1f6",
      mode: "light",
    },
  },
  {
    id: "system-charcoal",
    name: "فحمي",
    description: "أحادي محايد لا يشتت عن الطعام",
    colors: {
      primary: "#3f3f46",
      accent: "#a1a1aa",
      background: "#fafafa",
      foreground: "#18181b",
      muted: "#f0f0f1",
      mode: "light",
    },
  },
];

export const DEFAULT_THEME: Required<
  Pick<
    RestaurantTheme,
    "primary" | "accent" | "background" | "foreground" | "muted" | "mode" | "radius"
  >
> = {
  ...SYSTEM_PALETTES[0].colors,
  radius: 14,
};

export function resolveTheme(theme: RestaurantTheme | null | undefined) {
  return {
    primary: theme?.primary ?? DEFAULT_THEME.primary,
    accent: theme?.accent ?? DEFAULT_THEME.accent,
    background: theme?.background ?? DEFAULT_THEME.background,
    foreground: theme?.foreground ?? DEFAULT_THEME.foreground,
    muted: theme?.muted ?? DEFAULT_THEME.muted,
    mode: theme?.mode ?? DEFAULT_THEME.mode,
    radius: typeof theme?.radius === "number" ? theme.radius : DEFAULT_THEME.radius,
  };
}

/**
 * Serialises a theme into the inline `style` object consumed by the public
 * menu. We set the variables the shadcn tokens already read from, so every
 * primitive (buttons, badges, cards) inherits the restaurant's colours.
 */
export function themeToStyle(theme: RestaurantTheme | null | undefined) {
  const t = resolveTheme(theme);
  const onPrimary = readableForeground(t.primary);
  const onAccent = readableForeground(t.accent);

  return {
    "--menu-primary": t.primary,
    "--menu-accent": t.accent,
    "--menu-background": t.background,
    "--menu-foreground": t.foreground,
    "--menu-muted": t.muted,
    "--menu-on-primary": onPrimary,
    "--menu-on-accent": onAccent,
    "--menu-radius": `${t.radius}px`,
    "--primary": t.primary,
    "--primary-foreground": onPrimary,
    "--accent": t.accent,
    "--accent-foreground": onAccent,
    "--background": t.background,
    "--foreground": t.foreground,
    "--card": t.background,
    "--card-foreground": t.foreground,
    "--muted": t.muted,
    "--muted-foreground": mixColour(t.foreground, t.background, 0.35),
    "--radius": `${t.radius}px`,
  } as React.CSSProperties;
}

function parseHex(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, "");
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) return null;

  return [
    parseInt(expanded.slice(0, 2), 16),
    parseInt(expanded.slice(2, 4), 16),
    parseInt(expanded.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 0;

  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Picks a readable foreground (near-black or near-white) for a colour. */
export function readableForeground(background: string): string {
  return contrastRatio(background, "#ffffff") >= 4.5 ? "#ffffff" : "#141414";
}

function toHex(rgb: [number, number, number]): string {
  return (
    "#" +
    rgb
      .map((c) => Math.round(c).toString(16).padStart(2, "0"))
      .join("")
  );
}

/** Blends two hex colours. `amount` = 0 keeps `a`, `amount` = 1 returns `b`. */
export function mixColour(a: string, b: string, amount: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  if (!ca || !cb) return a;

  return toHex([
    ca[0] + (cb[0] - ca[0]) * amount,
    ca[1] + (cb[1] - ca[1]) * amount,
    ca[2] + (cb[2] - ca[2]) * amount,
  ]);
}

/** True when a palette passes basic WCAG AA for text on background. */
export function isPaletteAccessible(colors: PaletteColors): boolean {
  return (
    contrastRatio(colors.foreground, colors.background) >= 4.5 &&
    contrastRatio(readableForeground(colors.primary), colors.primary) >= 4.5
  );
}