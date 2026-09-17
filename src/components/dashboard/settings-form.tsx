"use client";

import { useActionState, useEffect, useState } from "react";
import { InfoIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import {
  toggleRestaurantActive,
  updateRestaurantSettings,
  updateSlug,
  type ActionState,
} from "@/app/actions/restaurant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import type { Restaurant, Subscription } from "@/lib/types";
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

export function SettingsForm({
  restaurant,
  currentSlug,
  slugHistory,
  subscription,
}: {
  restaurant: Restaurant;
  currentSlug: string;
  slugHistory: { slug: string; created_at: string }[];
  subscription: Subscription | null;
}) {
  const [slugState, setSlugState] = useState(currentSlug);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugPending, setSlugPending] = useState(false);

  const [settingsState, settingsAction, settingsPending] = useActionState<
    ActionState,
    FormData
  >(updateRestaurantSettings, {});

  const [slugActionState, setSlugActionState] = useState<ActionState>({});

  useEffect(() => {
    if (settingsState.success) toast.success(settingsState.success);
    if (settingsState.error) toast.error(settingsState.error);
  }, [settingsState]);

  useEffect(() => {
    if (slugActionState.success) toast.success(slugActionState.success);
    if (slugActionState.error) toast.error(slugActionState.error);
  }, [slugActionState]);

  const normalisedSlug = slugify(slugState);
  const slugChanged = normalisedSlug !== currentSlug;
  const slugValid = isSlugAllowed(normalisedSlug);

  async function handleSlugSave() {
    setSlugPending(true);
    const data = new FormData();
    data.set("slug", normalisedSlug);
    data.set("restaurantId", restaurant.id);
    const result = await updateSlug({}, data);
    setSlugPending(false);
    setSlugActionState(result);
    if (result.success) setSlugTouched(false);
  }

  const planLabels: Record<string, string> = {
    free: "مجاني",
    pro: "احترافي",
    business: "أعمال",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          بيانات المطعم، الرابط العام، وحالة العرض.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الرابط العام</CardTitle>
          <CardDescription className="leading-relaxed">
            هذا هو الرابط الذي تشاركه مع زبائنك. يمكنك تغييره بحرية — رمز QR
            المطبوع يبقى يعمل، والروابط القديمة تُحوَّل تلقائياً.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slug">رابط المنيو</Label>
            <div className="flex items-center gap-2" dir="ltr">
              <span className="shrink-0 text-sm text-muted-foreground">/m/</span>
              <Input
                id="slug"
                value={slugState}
                onChange={(event) => {
                  setSlugTouched(true);
                  setSlugState(slugify(event.target.value));
                }}
                placeholder="my-restaurant"
              />
            </div>
            {slugTouched && !slugValid && (
              <p className="text-xs text-destructive">
                الرابط غير صالح أو محجوز
              </p>
            )}
            {slugTouched && slugValid && !slugChanged && (
              <p className="text-xs text-muted-foreground">
                هذا هو الرابط الحالي
              </p>
            )}
          </div>

          {slugChanged && slugValid && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSlugSave} disabled={slugPending}>
                {slugPending && <Loader2Icon className="size-4 animate-spin" />}
                حفظ الرابط الجديد
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSlugState(currentSlug);
                  setSlugTouched(false);
                }}
              >
                إلغاء
              </Button>
            </div>
          )}

          {slugHistory.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <InfoIcon className="size-3.5" />
                  روابط سابقة (تحوَّل تلقائياً إلى رابطك الحالي)
                </p>
                <div className="flex flex-wrap gap-1.5" dir="ltr">
                  {slugHistory.map((entry) => (
                    <Badge key={entry.slug} variant="outline" className="font-mono text-[10px]">
                      /m/{entry.slug}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">حالة العرض</CardTitle>
          <CardDescription>
            عند الإيقاف، يتوقف عرض المنيو للزوار دون حذف أي بيانات.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={restaurant.is_active}
                disabled={settingsPending}
                onCheckedChange={(checked) => {
                  const data = new FormData();
                  data.set("isActive", String(checked));
                  void toggleRestaurantActive({}, data).then((result) => {
                    if (result.error) toast.error(result.error);
                    else toast.success(result.success ?? "تم التحديث");
                  });
                }}
              />
              <span className="text-sm">
                {restaurant.is_active ? "المنيو معروض" : "المنيو موقوف"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات المطعم</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={settingsAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">اسم المطعم</Label>
              <Input
                id="name"
                name="name"
                defaultValue={restaurant.name}
                required
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">الوصف</Label>
              <Input
                id="description"
                name="description"
                defaultValue={restaurant.description ?? ""}
                placeholder="وصف يظهر أعلى المنيو"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">العملة</Label>
              <Select name="currency" defaultValue={restaurant.currency}>
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
                <Label htmlFor="phone">الهاتف</Label>
                <Input
                  id="phone"
                  name="phone"
                  defaultValue={restaurant.phone ?? ""}
                  dir="ltr"
                  className="text-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">واتساب</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  defaultValue={restaurant.whatsapp ?? ""}
                  dir="ltr"
                  className="text-start"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">العنوان</Label>
              <Input
                id="address"
                name="address"
                defaultValue={restaurant.address ?? ""}
                maxLength={200}
              />
            </div>

            <Button type="submit" disabled={settingsPending}>
              {settingsPending && <Loader2Icon className="size-4 animate-spin" />}
              حفظ البيانات
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">الاشتراك</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge>
              {planLabels[subscription?.plan ?? "free"] ?? "مجاني"}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {subscription?.status === "active" ? "نشط" : "غير نشط"}
            </span>
          </div>
          <Button variant="outline" disabled>
            ترقية (قريباً)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}