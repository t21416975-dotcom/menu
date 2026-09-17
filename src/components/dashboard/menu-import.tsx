"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ImageUpIcon,
  Loader2Icon,
  RotateCcwIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { applyExtraction } from "@/app/actions/menu";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExtractedMenu, Restaurant } from "@/lib/types";

type Stage = "upload" | "review";

export function MenuImport({
  restaurant,
  geminiConfigured,
}: {
  restaurant: Restaurant;
  geminiConfigured: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stage, setStage] = useState<Stage>("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menu, setMenu] = useState<ExtractedMenu>({ categories: [] });
  const [jobId, setJobId] = useState<string | null>(null);

  async function handleFile(file: File) {
    setPreview(URL.createObjectURL(file));
    setAnalyzing(true);

    try {
      const body = new FormData();
      body.append("image", file);

      const response = await fetch("/api/extract", { method: "POST", body });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload.error ?? "فشل تحليل الصورة");
        setPreview(null);
        return;
      }

      setMenu(payload.menu as ExtractedMenu);
      setJobId(payload.jobId as string);
      setStage("review");
      toast.success("تم استخراج الأصناف. راجعها قبل الحفظ.");
    } catch {
      toast.error("تعذّر الاتصال بالخدمة");
      setPreview(null);
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!jobId) return;
    setSaving(true);

    const result = await applyExtraction(
      {},
      (() => {
        const data = new FormData();
        data.set("restaurantId", restaurant.id);
        data.set("jobId", jobId);
        data.set("menu", JSON.stringify(menu));
        return data;
      })(),
    );

    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(result.success ?? "تم الحفظ");
    router.push("/dashboard/menu");
  }

  function reset() {
    setStage("upload");
    setPreview(null);
    setMenu({ categories: [] });
    setJobId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const totalItems = menu.categories.reduce(
    (sum, category) => sum + category.items.length,
    0,
  );

  if (stage === "upload") {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">استيراد المنيو من صورة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ارفع صورة واضحة لصفحة المنيو، وسنستخرج الأقسام والأطباق والأسعار.
          </p>
        </div>

        {!geminiConfigured && (
          <Alert variant="destructive">
            <AlertTitle>الميزة غير مفعّلة</AlertTitle>
            <AlertDescription>
              أضف مفتاح <code dir="ltr">GEMINI_API_KEY</code> في ملف البيئة لتفعيل
              قراءة الصور بالذكاء الاصطناعي.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="py-10">
            <label
              htmlFor="menu-image"
              className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border px-6 py-12 text-center transition-colors hover:border-primary/50 hover:bg-muted/40"
            >
              {analyzing ? (
                <>
                  <Loader2Icon className="size-8 animate-spin text-primary" />
                  <div>
                    <p className="font-medium">جارٍ تحليل الصورة...</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      قد يستغرق ذلك بضع ثوانٍ
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                    <ImageUpIcon className="size-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">اختر صورة المنيو</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      JPG أو PNG أو WebP — بحد أقصى 8 ميجابايت
                    </p>
                  </div>
                </>
              )}
            </label>

            <input
              ref={fileInputRef}
              id="menu-image"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic"
              className="hidden"
              disabled={analyzing || !geminiConfigured}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">راجع الأصناف</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            عدّل ما استخرجناه، ثم احفظه في منيوك.
          </p>
        </div>
        <Button variant="outline" onClick={reset}>
          <RotateCcwIcon className="size-4" />
          صورة أخرى
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {preview && (
          <Card className="h-fit lg:sticky lg:top-6">
            <CardHeader>
              <CardTitle className="text-base">الصورة الأصلية</CardTitle>
            </CardHeader>
            <CardContent>
              <Image
                src={preview}
                alt="صورة المنيو"
                width={480}
                height={640}
                unoptimized
                className="w-full rounded-lg border border-border object-contain"
              />
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="secondary">
              {menu.categories.length} أقسام
            </Badge>
            <Badge variant="secondary">{totalItems} طبق</Badge>
          </div>

          {menu.categories.map((category, categoryIndex) => (
            <Card key={categoryIndex}>
              <CardHeader>
                <Input
                  value={category.name}
                  onChange={(event) => {
                    const next = structuredClone(menu);
                    next.categories[categoryIndex].name = event.target.value;
                    setMenu(next);
                  }}
                  className="h-auto border-0 px-0 text-lg font-semibold shadow-none focus-visible:ring-0"
                />
              </CardHeader>
              <CardContent className="space-y-3">
                {category.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_120px_auto]"
                  >
                    <div className="space-y-2">
                      <Input
                        value={item.name}
                        placeholder="اسم الطبق"
                        onChange={(event) => {
                          const next = structuredClone(menu);
                          next.categories[categoryIndex].items[itemIndex].name =
                            event.target.value;
                          setMenu(next);
                        }}
                      />
                      <Input
                        value={item.description ?? ""}
                        placeholder="الوصف (اختياري)"
                        onChange={(event) => {
                          const next = structuredClone(menu);
                          next.categories[categoryIndex].items[itemIndex].description =
                            event.target.value || null;
                          setMenu(next);
                        }}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="sr-only">السعر</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        dir="ltr"
                        value={item.price ?? ""}
                        placeholder="السعر"
                        onChange={(event) => {
                          const value = event.target.value;
                          const next = structuredClone(menu);
                          next.categories[categoryIndex].items[itemIndex].price =
                            value === "" ? null : Number(value);
                          setMenu(next);
                        }}
                      />
                    </div>

                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="self-center"
                      onClick={() => {
                        const next = structuredClone(menu);
                        next.categories[categoryIndex].items.splice(itemIndex, 1);
                        setMenu(next);
                      }}
                    >
                      <Trash2Icon className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const next = structuredClone(menu);
                    next.categories[categoryIndex].items.push({
                      name: "",
                      description: null,
                      price: null,
                    });
                    setMenu(next);
                  }}
                >
                  إضافة طبق يدوياً
                </Button>
              </CardContent>
            </Card>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving || totalItems === 0}>
              {saving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <SparklesIcon className="size-4" />
              )}
              حفظ في المنيو
            </Button>
            <Button variant="outline" onClick={reset}>
              إلغاء
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}