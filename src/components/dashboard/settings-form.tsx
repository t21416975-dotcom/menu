"use client";

import { useActionState, useEffect, useState } from "react";
import {
  ImageIcon,
  InfoIcon,
  Loader2Icon,
  SparklesIcon,
  UtensilsIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  toggleRestaurantActive,
  updateRestaurantSettings,
  updateSlug,
  type ActionState,
} from "@/app/actions/restaurant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

  const [logoUrl, setLogoUrl] = useState(restaurant.logo_url ?? "");
  const [coverUrl, setCoverUrl] = useState(restaurant.cover_url ?? "");

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
          بيانات المطعم، صور الهوية والبنر، الرابط العام، وحالة العرض.
        </p>
      </div>

      {/* Public Link Card */}
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

      {/* Visibility Status Card */}
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
                {restaurant.is_active ? "المنيو معروض للزوار" : "المنيو موقوف مؤقتاً"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Restaurant Info & Branding Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">بيانات وصور المطعم</CardTitle>
          <CardDescription>
            قم بإضافة روابط مباشرة لشعار المطعم وصورة البنر لتظهر أعلى المنيو.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={settingsAction} className="space-y-6">
            {/* Branding Images Section */}
            <div className="rounded-xl border bg-muted/20 p-4 space-y-5">
              <h3 className="flex items-center gap-2 font-bold text-sm">
                <ImageIcon className="size-4 text-primary" />
                صور الهوية (الشعار والبنر)
              </h3>

              {/* Banner / Cover URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="coverUrl" className="font-semibold">
                    رابط صورة البنر (Banner / Cover)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    يظهر مكان الطيف اللوني خلف الأيقونة في أعلى المنيو
                  </span>
                </div>
                <Input
                  id="coverUrl"
                  name="coverUrl"
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/... أو رابط مباشر لصورة البنر العريضة"
                />

                {/* Banner Live Preview */}
                <div className="relative mt-2 h-36 w-full overflow-hidden rounded-xl border bg-muted/50">
                  {coverUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt="معاينة البنر"
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 right-3 flex items-center gap-2">
                        <span className="rounded-md bg-black/60 px-2 py-1 text-xs text-white backdrop-blur-sm">
                          معاينة البنر في أعلى المنيو
                        </span>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setCoverUrl("")}
                        >
                          <XIcon className="size-3.5" />
                          إزالة
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-1.5 text-center text-muted-foreground bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5">
                      <SparklesIcon className="size-5 opacity-40" />
                      <p className="text-xs">
                        لم يتم وضع رابط بنر (يتم استخدام الطيف اللوني الافتراضي حالياً)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Logo URL */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="logoUrl" className="font-semibold">
                    رابط صورة الشعار (Logo)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    أيقونة المطعم الدائرية/المربعة
                  </span>
                </div>
                <Input
                  id="logoUrl"
                  name="logoUrl"
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://... أو رابط مباشر لصورة اللوجو"
                />

                {/* Logo Live Preview */}
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 bg-white shadow-md">
                    {logoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={logoUrl}
                        alt="معاينة الشعار"
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <UtensilsIcon className="size-8 text-primary/40" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">
                      {logoUrl ? "تم التعرف على الشعار" : "لا يوجد شعار مخصص"}
                    </p>
                    <p>يظهر الشعار بشكل بارز فوق البنر في منتصف أعلى المنيو.</p>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-destructive"
                        onClick={() => setLogoUrl("")}
                      >
                        مسح رابط الشعار
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* General Info */}
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
                placeholder="وصف يظهر أسفل اسم المطعم في المنيو"
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
                  placeholder="0500000000"
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
                  placeholder="966500000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">العنوان</Label>
              <Input
                id="address"
                name="address"
                defaultValue={restaurant.address ?? ""}
                placeholder="المدينة، الحي، الشارع"
                maxLength={200}
              />
            </div>

            <Button type="submit" disabled={settingsPending} className="w-full sm:w-auto">
              {settingsPending && <Loader2Icon className="size-4 animate-spin" />}
              حفظ بيانات وصور المتجر
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription Card */}
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