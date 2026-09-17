"use client";

import { useState, useTransition } from "react";
import { CheckIcon, Loader2Icon, SparklesIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { applyTheme, deletePalette } from "@/app/actions/theme";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { resolveTheme, type ThemePreset } from "@/lib/theme";
import type { Palette, PaletteColors, Restaurant } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AppearanceEditor({
  restaurant,
  savedPalettes,
  systemPalettes,
  geminiConfigured,
}: {
  restaurant: Restaurant;
  savedPalettes: Palette[];
  systemPalettes: ThemePreset[];
  geminiConfigured: boolean;
}) {
  const current = resolveTheme(restaurant.theme);

  const [draft, setDraft] = useState<PaletteColors>({
    primary: current.primary,
    accent: current.accent,
    background: current.background,
    foreground: current.foreground,
    muted: current.muted,
    mode: current.mode,
  });
  const [radius, setRadius] = useState(current.radius);
  const [paletteId, setPaletteId] = useState<string | null>(
    restaurant.theme?.paletteId ?? null,
  );
  const [aiPalettes, setAiPalettes] = useState<
    { name: string; colors: PaletteColors }[]
  >([]);
  const [isPending, startTransition] = useTransition();
  const [isGenerating, setIsGenerating] = useState(false);

  function selectPalette(id: string, colors: PaletteColors) {
    setDraft(colors);
    setPaletteId(id);
  }

  function save() {
    startTransition(async () => {
      const data = new FormData();
      data.set("primary", draft.primary);
      data.set("accent", draft.accent);
      data.set("background", draft.background);
      data.set("foreground", draft.foreground);
      data.set("muted", draft.muted);
      data.set("mode", draft.mode);
      data.set("radius", String(radius));
      if (paletteId) data.set("paletteId", paletteId);

      const result = await applyTheme({}, data);
      if (result.error) toast.error(result.error);
      else toast.success(result.success ?? "تم تطبيق الثيم");
    });
  }

  async function generateWithAi() {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/suggest-palettes", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "فشل توليد الثيمات");
        return;
      }

      setAiPalettes(payload.palettes);
      toast.success("تم توليد ٣ اقتراحات");
    } catch {
      toast.error("تعذّر الاتصال بالخدمة");
    } finally {
      setIsGenerating(false);
    }
  }

  function removePalette(id: string) {
    startTransition(async () => {
      const result = await deletePalette(id);
      if (result.error) toast.error(result.error);
      else toast.success("تم حذف الثيم");
    });
  }

  const allSaved: { id: string; name: string; colors: PaletteColors }[] = [
    ...systemPalettes.map((preset) => ({
      id: preset.id,
      name: preset.name,
      colors: preset.colors,
    })),
    ...savedPalettes.map((palette) => ({
      id: palette.id,
      name: palette.name,
      colors: palette.colors,
    })),
    ...aiPalettes.map((palette, index) => ({
      id: `ai-${index}`,
      name: palette.name,
      colors: palette.colors,
    })),
  ];

  const draftIsValid =
    /^#[0-9a-fA-F]{6}$/.test(draft.primary) &&
    /^#[0-9a-fA-F]{6}$/.test(draft.accent) &&
    /^#[0-9a-fA-F]{6}$/.test(draft.background) &&
    /^#[0-9a-fA-F]{6}$/.test(draft.foreground);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المظهر والألوان</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          اختر ثيماً جاهزاً أو اطلب اقتراحات من الذكاء الاصطناعي، وشاهد النتيجة
          فوراً.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {geminiConfigured && (
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">اقتراحات الذكاء الاصطناعي</CardTitle>
                <Button
                  size="sm"
                  onClick={generateWithAi}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <SparklesIcon className="size-4" />
                  )}
                  اقترح ثيمات
                </Button>
              </CardHeader>
              <CardContent>
                {aiPalettes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    اضغط «اقترح ثيمات» لتحصل على ثلاث لوحات ألوان مناسبة لمطعمك.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    {aiPalettes.map((palette, index) => (
                      <PaletteSwatch
                        key={index}
                        name={palette.name}
                        colors={palette.colors}
                        isSelected={paletteId === `ai-${index}`}
                        onSelect={() => selectPalette(`ai-${index}`, palette.colors)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!geminiConfigured && (
            <Alert>
              <AlertDescription>
                فعّل <code dir="ltr">GEMINI_API_KEY</code> للحصول على اقتراحات
                ألوان تلقائية. لا تزال قادراً على اختيار الألوان يدوياً.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">الثيمات المتاحة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {allSaved.map((palette) => (
                  <PaletteSwatch
                    key={palette.id}
                    name={palette.name}
                    colors={palette.colors}
                    isSelected={paletteId === palette.id}
                    onSelect={() => selectPalette(palette.id, palette.colors)}
                    onDelete={
                      savedPalettes.some((p) => p.id === palette.id)
                        ? () => removePalette(palette.id)
                        : undefined
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">تخصيص يدوي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  label="اللون الأساسي"
                  value={draft.primary}
                  onChange={(value) => {
                    setDraft({ ...draft, primary: value });
                    setPaletteId(null);
                  }}
                />
                <ColorField
                  label="لون التمييز"
                  value={draft.accent}
                  onChange={(value) => {
                    setDraft({ ...draft, accent: value });
                    setPaletteId(null);
                  }}
                />
                <ColorField
                  label="الخلفية"
                  value={draft.background}
                  onChange={(value) => {
                    setDraft({ ...draft, background: value });
                    setPaletteId(null);
                  }}
                />
                <ColorField
                  label="لون النص"
                  value={draft.foreground}
                  onChange={(value) => {
                    setDraft({ ...draft, foreground: value });
                    setPaletteId(null);
                  }}
                />
                <ColorField
                  label="لون الفواصل"
                  value={draft.muted}
                  onChange={(value) => {
                    setDraft({ ...draft, muted: value });
                    setPaletteId(null);
                  }}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="radius">استدارة الحواف ({radius}px)</Label>
                <Input
                  id="radius"
                  type="range"
                  min={0}
                  max={28}
                  value={radius}
                  onChange={(event) => setRadius(Number(event.target.value))}
                />
              </div>
            </CardContent>
          </Card>

          <Button onClick={save} disabled={isPending || !draftIsValid} size="lg">
            {isPending && <Loader2Icon className="size-4 animate-spin" />}
            حفظ وتطبيق
          </Button>
        </div>

        <div className="lg:sticky lg:top-6 lg:h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">معاينة مباشرة</CardTitle>
            </CardHeader>
            <CardContent>
              <ThemePreview
                name={restaurant.name}
                colors={draft}
                radius={radius}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2" dir="ltr">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-lg border border-border bg-transparent"
          aria-label={label}
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono text-xs"
          maxLength={7}
        />
      </div>
    </div>
  );
}

function PaletteSwatch({
  name,
  colors,
  isSelected,
  onSelect,
  onDelete,
}: {
  name: string;
  colors: PaletteColors;
  isSelected: boolean;
  onSelect: () => void;
  onDelete?: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border p-3 transition-colors",
        isSelected ? "border-primary ring-2 ring-primary/20" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full text-start"
        aria-pressed={isSelected}
      >
        <div className="flex gap-1.5">
          {[colors.primary, colors.accent, colors.background, colors.foreground].map(
            (color, index) => (
              <span
                key={index}
                className="size-7 rounded-md border border-black/10"
                style={{ backgroundColor: color }}
              />
            ),
          )}
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{name}</span>
          {isSelected && <CheckIcon className="size-3.5 shrink-0 text-primary" />}
        </div>

        {colors.mode === "dark" && (
          <Badge variant="secondary" className="mt-1.5 text-[10px]">
            داكن
          </Badge>
        )}
      </button>

      {onDelete && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute end-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          title="حذف"
        >
          <Trash2Icon className="size-3 text-destructive" />
        </Button>
      )}
    </div>
  );
}

function ThemePreview({
  name,
  colors,
  radius,
}: {
  name: string;
  colors: PaletteColors;
  radius: number;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-black/10"
      style={{ backgroundColor: colors.background, borderRadius: radius }}
    >
      <div className="p-4" style={{ backgroundColor: colors.primary }}>
        <p
          className="text-sm font-bold"
          style={{
            color:
              luminance(colors.primary) > 0.5 ? "#141414" : "#ffffff",
          }}
        >
          {name}
        </p>
      </div>

      <div className="space-y-2.5 p-4">
        {[
          { item: "طبق تجريبي", price: "٤٥" },
          { item: "طبق آخر", price: "٣٠" },
        ].map((row) => (
          <div
            key={row.item}
            className="flex items-center justify-between rounded-lg px-3 py-2.5"
            style={{ backgroundColor: colors.muted, borderRadius: radius * 0.7 }}
          >
            <span className="text-sm" style={{ color: colors.foreground }}>
              {row.item}
            </span>
            <span
              className="text-sm font-medium"
              style={{ color: colors.primary }}
            >
              {row.price}
            </span>
          </div>
        ))}

        <button
          type="button"
          className="mt-2 w-full py-2.5 text-sm font-medium"
          style={{
            backgroundColor: colors.accent,
            color: luminance(colors.accent) > 0.5 ? "#141414" : "#ffffff",
            borderRadius: radius * 0.7,
          }}
        >
          زر تجريبي
        </button>
      </div>
    </div>
  );
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  if (value.length !== 6) return 0;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}