import "server-only";

import { GoogleGenAI } from "@google/genai";

import type { ExtractedMenu, PaletteColors } from "./types";
import { isPaletteAccessible } from "./theme";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    categories: {
      type: "array",
      description: "أقسام المنيو، مثل: المقبلات، الأطباق الرئيسية، المشروبات",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "اسم القسم بالعربية" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string", description: "اسم الطبق" },
                description: {
                  type: "string",
                  description: "وصف مختصر للطبق، أو نص فارغ إن لم يوجد",
                },
                price: {
                  type: "number",
                  nullable: true,
                  description:
                    "السعر كرقم فقط بدون رمز العملة. null إن لم يظهر السعر",
                },
              },
              required: ["name", "description", "price"],
            },
          },
        },
        required: ["name", "items"],
      },
    },
  },
  required: ["categories"],
};

const PALETTE_SCHEMA = {
  type: "object",
  properties: {
    palettes: {
      type: "array",
      description: "ثلاثة اقتراحات ألوان مختلفة جذرياً عن بعضها",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "اسم مقترح بالعربية" },
          primary: { type: "string", description: "لون أساسي بصيغة #RRGGBB" },
          accent: { type: "string", description: "لون تمييزي بصيغة #RRGGBB" },
          background: { type: "string", description: "لون الخلفية #RRGGBB" },
          foreground: { type: "string", description: "لون النص #RRGGBB" },
          muted: { type: "string", description: "لون خافت للفواصل #RRGGBB" },
          mode: { type: "string", enum: ["light", "dark"] },
        },
        required: [
          "name",
          "primary",
          "accent",
          "background",
          "foreground",
          "muted",
          "mode",
        ],
      },
    },
  },
  required: ["palettes"],
};

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY غير مهيأ");
    this.name = "GeminiNotConfiguredError";
  }
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "placeholder-gemini-key") {
    throw new GeminiNotConfiguredError();
  }
  return new GoogleGenAI({ apiKey });
}

function parseJson<T>(text: string | undefined): T {
  if (!text) throw new Error("لم يُرجع النموذج أي بيانات");
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

type RawExtraction = {
  categories?: {
    name?: string;
    items?: { name?: string; description?: string; price?: number | null }[];
  }[];
};

/**
 * Reads a menu photo and returns a normalised structure. Output is validated
 * and sanitised here — never trust model output as-is, and never write it to
 * the database without the user reviewing it first.
 */
export async function extractMenuFromImage(
  base64Data: string,
  mimeType: string,
): Promise<ExtractedMenu> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "أنت مساعد لتحويل صور قوائم المطاعم إلى بيانات منظمة.",
              "اقرأ الصورة بدقة واستخرج كل قسم وكل طبق مع سعره.",
              "أعد الأسعار كأرقام فقط دون رمز العملة.",
              "حافظ على النصوص العربية كما هي دون ترجمة.",
              "إذا كان العنصر غير واضح تماماً فتجاهله بدلاً من تخمينه.",
            ].join(" "),
          },
          { inlineData: { data: base64Data, mimeType } },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      responseMimeType: "application/json",
      responseJsonSchema: EXTRACTION_SCHEMA,
    },
  });

  const raw = parseJson<RawExtraction>(response.text);

  return {
    categories: (raw.categories ?? [])
      .map((category) => ({
        name: (category.name ?? "").trim(),
        items: (category.items ?? [])
          .map((item) => ({
            name: (item.name ?? "").trim(),
            description: (item.description ?? "").trim() || null,
            price:
              typeof item.price === "number" && Number.isFinite(item.price)
                ? Math.max(0, Math.round(item.price * 100) / 100)
                : null,
          }))
          .filter((item) => item.name.length > 0),
      }))
      .filter((category) => category.name.length > 0 && category.items.length > 0),
  };
}

type RawPalettes = {
  palettes?: (PaletteColors & { name?: string })[];
};

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Suggests three distinct, accessible colour palettes for a restaurant.
 * Any suggestion that fails contrast checks or returns malformed hex is
 * dropped, so the UI never renders an unreadable theme.
 */
export async function suggestPalettes(input: {
  restaurantName: string;
  description?: string | null;
}): Promise<{ name: string; colors: PaletteColors }[]> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              `اقترح ثلاث لوحات ألوان لمنيو إلكتروني لمطعم اسمه "${input.restaurantName}".`,
              input.description ? `وصفه: ${input.description}.` : "",
              "يجب أن تكون كل لوحة مختلفة جذرياً عن الأخريات في المزاج واللون.",
              "التزم بتباين كافٍ بين لون النص والخلفية (WCAG AA).",
              "أعد الألوان بصيغة hex مثل #RRGGBB.",
            ]
              .filter(Boolean)
              .join(" "),
          },
        ],
      },
    ],
    config: {
      temperature: 0.9,
      responseMimeType: "application/json",
      responseJsonSchema: PALETTE_SCHEMA,
    },
  });

  const raw = parseJson<RawPalettes>(response.text);

  return (raw.palettes ?? [])
    .filter(
      (palette) =>
        HEX.test(palette.primary ?? "") &&
        HEX.test(palette.accent ?? "") &&
        HEX.test(palette.background ?? "") &&
        HEX.test(palette.foreground ?? "") &&
        HEX.test(palette.muted ?? ""),
    )
    .map((palette) => ({
      name: palette.name?.trim() || "ثيم مقترح",
      colors: {
        primary: palette.primary,
        accent: palette.accent,
        background: palette.background,
        foreground: palette.foreground,
        muted: palette.muted,
        mode: palette.mode === "dark" ? ("dark" as const) : ("light" as const),
      },
    }))
    .filter((palette) => isPaletteAccessible(palette.colors))
    .slice(0, 3);
}