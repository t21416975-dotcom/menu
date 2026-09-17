"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2Icon } from "lucide-react";

import { createRestaurant, type ActionState } from "@/app/actions/restaurant";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { isSlugAllowed, slugify } from "@/lib/utils";

const CURRENCIES = [
  { value: "SAR", label: "ريال سعودي (SAR)" },
  { value: "AED", label: "درهم إماراتي (AED)" },
  { value: "QAR", label: "ريال قطري (QAR)" },
  { value: "KWD", label: "دينار كويتي (KWD)" },
  { value: "BHD", label: "دينار بحريني (BHD)" },
  { value: "OMR", label: "ريال عماني (OMR)" },
  { value: "EGP", label: "جنيه مصري (EGP)" },
  { value: "JOD", label: "دينار أردني (JOD)" },
  { value: "USD", label: "دولار أمريكي (USD)" },
];

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export function CreateRestaurantForm({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createRestaurant,
    {},
  );

  const [name, setName] = useState(defaultName);
  const [manualSlug, setManualSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  // The slug is derived during render: it follows the name until the owner
  // edits it, at which point their explicit value takes over.
  const slug = slugTouched ? manualSlug : slugify(name);

  // Result of the debounced availability probe, keyed by the slug it belongs
  // to so a stale response can never leak into the current value.
  const [probe, setProbe] = useState<{
    slug: string;
    status: SlugStatus;
  } | null>(null);

  useEffect(() => {
    if (!slug || !isSlugAllowed(slug)) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("slug_available", { candidate: slug });
      if (cancelled) return;
      setProbe({ slug, status: data ? "available" : "taken" });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug]);

  const slugStatus: SlugStatus = !slug
    ? "idle"
    : !isSlugAllowed(slug)
      ? "invalid"
      : probe?.slug === slug
        ? probe.status
        : "checking";

  const slugMessage: Record<SlugStatus, string | null> = {
    idle: null,
    checking: "جارٍ التحقق...",
    available: "الرابط متاح",
    taken: "هذا الرابط مستخدم بالفعل",
    invalid: "الرابط غير صالح أو محجوز",
  };

  return (
    <form
      action={action}
      className="space-y-5 rounded-2xl border border-border bg-card p-6"
    >
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">اسم المطعم</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="مثال: مطعم البيك"
          required
          maxLength={120}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">رابط المنيو</Label>
        <div className="flex items-center gap-2" dir="ltr">
          <span className="shrink-0 text-sm text-muted-foreground">/m/</span>
          <Input
            id="slug"
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setManualSlug(slugify(event.target.value));
            }}
            placeholder="my-restaurant"
            required
          />
        </div>
        {slugMessage[slugStatus] && (
          <p
            className={
              slugStatus === "available"
                ? "text-xs text-emerald-600"
                : slugStatus === "checking"
                  ? "text-xs text-muted-foreground"
                  : "text-xs text-destructive"
            }
          >
            {slugMessage[slugStatus]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">العملة</Label>
        <Select name="currency" defaultValue="SAR">
          <SelectTrigger id="currency">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((currency) => (
              <SelectItem key={currency.value} value={currency.value}>
                {currency.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">رقم الهاتف (اختياري)</Label>
          <Input
            id="phone"
            name="phone"
            placeholder="+966 5X XXX XXXX"
            dir="ltr"
            className="text-start"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="whatsapp">واتساب (اختياري)</Label>
          <Input
            id="whatsapp"
            name="whatsapp"
            placeholder="+966 5X XXX XXXX"
            dir="ltr"
            className="text-start"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">العنوان (اختياري)</Label>
        <Input id="address" name="address" placeholder="الرياض، حي النخيل" />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || slugStatus === "taken" || slugStatus === "invalid"}
      >
        {pending && <Loader2Icon className="size-4 animate-spin" />}
        إنشاء المطعم
      </Button>
    </form>
  );
}