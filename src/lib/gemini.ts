import "server-only";

import { GoogleGenAI } from "@google/genai";

import type { ExtractedMenu, PaletteColors } from "./types";
import { isPaletteAccessible } from "./theme";

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

const FALLBACK_MODELS = [
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash-lite",
];

function getModelCandidates(): string[] {
  const envModel = process.env.GEMINI_MODEL?.trim();
  const validEnvModel =
    envModel && envModel !== "gemini-2.5-flash" ? envModel : null;

  const list = [validEnvModel, ...FALLBACK_MODELS].filter(
    (m): m is string => Boolean(m),
  );
  return Array.from(new Set(list));
}

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("GEMINI_API_KEY غير مهيأ");
    this.name = "GeminiNotConfiguredError";
  }
}

export class GeminiRateLimitError extends Error {
  constructor(message?: string) {
    super(
      message ??
        "تم استنفاد حصة الاستخدام المؤقتة لـ Gemini (Rate Limit). يرجى الانتظار بضع ثوانٍ وإعادة المحاولة.",
    );
    this.name = "GeminiRateLimitError";
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

type GenerateContentParams = Omit<
  Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  "model"
>;

async function executeWithModelFallback(
  ai: GoogleGenAI,
  params: GenerateContentParams,
) {
  const models = getModelCandidates();
  let lastError: unknown = null;
  let encounteredRateLimit = false;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: unknown) {
        lastError = err;
        const message = String((err as { message?: string })?.message ?? "");
        const status = (err as { status?: number; statusCode?: number })?.status ??
          (err as { status?: number; statusCode?: number })?.statusCode;

        const isRateLimit =
          status === 429 ||
          message.includes("429") ||
          message.includes("RESOURCE_EXHAUSTED") ||
          message.toLowerCase().includes("quota");

        const isNotFound =
          status === 404 ||
          message.includes("404") ||
          message.toLowerCase().includes("not found");

        const isTransient =
          status === 503 ||
          status === 500 ||
          message.includes("503") ||
          message.toLowerCase().includes("overloaded");

        if (isRateLimit) {
          encounteredRateLimit = true;
          // Wait 1.5 seconds then try fallback model or next attempt
          await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1500));
          continue;
        }

        if (isNotFound) {
          // Model does not exist, immediately skip to next model
          break;
        }

        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          continue;
        }

        // If another model might succeed, break to outer loop to try next model
        break;
      }
    }
  }

  if (encounteredRateLimit) {
    throw new GeminiRateLimitError();
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("تعذّر الاتصال بخدمة الذكاء الاصطناعي");
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

  const response = await executeWithModelFallback(ai, {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: [
              "أنت مساعد فائق الدقة لتحويل صور وقوائم طعام المطاعم إلى بيانات منظمة.",
              "اقرأ الصورة بتمعن واستخرج كل قسم وكل طبق مع سعره ووصفه.",
              "أعد الأسعار كأرقام فقط دون رمز العملة (مثلاً 25 بدلاً من 25 ر.س).",
              "حافظ على النصوص باللغة الأصلية المكتوبة (مثل العربية).",
              "إذا كان العنصر غير واضح فاستخرج ما تراه واضحاً.",
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

  const response = await executeWithModelFallback(ai, {
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
      temperature: 0.8,
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