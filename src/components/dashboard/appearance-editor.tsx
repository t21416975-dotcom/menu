"use client";

import { useState, useTransition, useRef } from "react";
import {
  CheckIcon,
  ImageIcon,
  Loader2Icon,
  SparklesIcon,
  Trash2Icon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { applyTheme, deletePalette } from "@/app/actions/theme";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    { name: string; colors: PaletteColors; source?: "image" | "text" }[]
  >([]);
  const [isPending, startTransition] = useTransition();
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setIsGeneratingText(true);
    try {
      const response = await fetch("/api/suggest-palettes", { method: "POST" });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "فشل توليد الثيمات");
        return;
      }

      const formatted = (payload.palettes || []).map(
        (p: { name: string; colors: PaletteColors }) => ({
          ...p,
          source: "text" as const,
        }),
      );

      setAiPalettes(formatted);
      if (formatted.length > 0) {
        selectPalette("ai-0", formatted[0].colors);
      }
      toast.success("تم توليد ٣ اقتراحات بناءً على بيانات المطعم");
    } catch {
      toast.error("تعذّر الاتصال بالخدمة");
    } finally {
      setIsGeneratingText(false);
    }
  }

  function handleFileSelected(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار ملف صورة صالح");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("حجم الصورة يجب ألا يتجاوز 8 ميجابايت");
      return;
    }

    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  }

  async function extractThemeFromImage() {
    if (!selectedImageFile) {
      toast.error("يرجى اختيار صورة أولاً");
      return;
    }

    setIsExtractingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", selectedImageFile);

      const response = await fetch("/api/suggest-palettes/from-image", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "فشل استخراج الثيم من الصورة");
        return;
      }

      const formatted = (payload.palettes || []).map(
        (p: { name: string; colors: PaletteColors }) => ({
          ...p,
          source: "image" as const,
        }),
      );

      setAiPalettes(formatted);
      if (formatted.length > 0) {
        selectPalette("ai-0", formatted[0].colors);
      }
      toast.success("تم استخراج لوحات الألوان من الصورة بنجاح!");
    } catch {
      toast.error("تعذّر الاتصال بالخدمة لتحليل الصورة");
    } finally {
      setIsExtractingImage(false);
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
          اختر ثيماً جاهزاً أو استخرج لوحة ألوان ذكية من صورة شعارك وديكور مطعمك بالذكاء الاصطناعي.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {geminiConfigured && (
            <Card className="border-primary/20 bg-gradient-to-b from-primary/[0.03] to-transparent">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <SparklesIcon className="size-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base">توليد واستخراج الثيم بالذكاء الاصطناعي</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      استخرج ألواناً متناسقة من صورة (شعار / بنر / ديكور) أو احصل على اقتراحات تلقائية.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs defaultValue="image" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-2">
                    <TabsTrigger value="image" className="flex items-center gap-2">
                      <ImageIcon className="size-4" />
                      استخراج من صورة
                    </TabsTrigger>
                    <TabsTrigger value="text" className="flex items-center gap-2">
                      <SparklesIcon className="size-4" />
                      اقتراح تلقائي
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="image" className="space-y-3 pt-2 w-full max-w-full overflow-hidden">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelected(file);
                      }}
                    />

                    {imagePreview ? (
                      <div className="relative flex w-full max-w-full flex-col items-center gap-3.5 overflow-hidden rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-center">
                        <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imagePreview}
                            alt="صورة الثيم"
                            className="size-full object-cover"
                          />
                        </div>
                        <div className="flex w-full min-w-0 flex-1 flex-col items-center sm:items-start text-center sm:text-start overflow-hidden">
                          <p
                            className="block w-full max-w-full truncate font-medium text-sm text-foreground"
                            title={selectedImageFile?.name}
                            dir="auto"
                          >
                            {selectedImageFile?.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {selectedImageFile
                              ? `${(selectedImageFile.size / (1024 * 1024)).toFixed(2)} MB`
                              : ""}
                          </p>
                          <div className="mt-3 flex w-full flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Button
                              size="sm"
                              onClick={extractThemeFromImage}
                              disabled={isExtractingImage}
                              className="w-full sm:w-auto"
                            >
                              {isExtractingImage ? (
                                <Loader2Icon className="size-4 animate-spin" />
                              ) : (
                                <SparklesIcon className="size-4" />
                              )}
                              استخراج الثيم من الصورة
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedImageFile(null);
                                setImagePreview(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                              }}
                              disabled={isExtractingImage}
                              className="w-full sm:w-auto"
                            >
                              <XIcon className="size-3.5" />
                              إلغاء
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDragging(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) handleFileSelected(file);
                        }}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors",
                          isDragging
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50 hover:bg-muted/30",
                        )}
                      >
                        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UploadCloudIcon className="size-6" />
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          اضغط لاختيار صورة أو اسحبها هنا
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          يدعم صور الشعار، البنر، ديكور المطعم، أو أطباقك (JPG, PNG, WEBP حتى 8MB)
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="text" className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border p-4 bg-card">
                      <div>
                        <p className="text-sm font-medium">اقتراح ذكي حسب نشاط المطعم</p>
                        <p className="text-xs text-muted-foreground">
                          يتم إنشاء لوحات ألوان ملائمة بناءً على اسم «{restaurant.name}» ووصفه.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={generateWithAi}
                        disabled={isGeneratingText}
                        className="shrink-0 w-full sm:w-auto"
                      >
                        {isGeneratingText ? (
                          <Loader2Icon className="size-4 animate-spin" />
                        ) : (
                          <SparklesIcon className="size-4" />
                        )}
                        اقترح ثيمات الآن
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* AI Palettes Results */}
                {aiPalettes.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        الاقتراحات المستخرجة بالذكاء الاصطناعي:
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        اضغط على أي لوحة لمعاينتها وتطبيقها
                      </span>
                    </div>
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