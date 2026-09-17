"use client";

import { useMemo, useState } from "react";
import {
  LayoutGridIcon,
  ListIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  SearchIcon,
  Share2Icon,
  UtensilsIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { MenuCategoryNav } from "@/components/public/menu-category-nav";
import { themeToStyle } from "@/lib/theme";
import { formatPrice } from "@/lib/utils";
import type {
  CategoryWithItems,
  MenuCategory,
  MenuItem,
  PublicRestaurant,
} from "@/lib/types";

export function PublicMenu({
  restaurant,
  categories,
  items,
}: {
  restaurant: PublicRestaurant;
  categories: MenuCategory[];
  items: MenuItem[];
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  const grouped: CategoryWithItems[] = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filteredItems = query
      ? items.filter(
          (item) =>
            item.name.toLowerCase().includes(query) ||
            (item.description &&
              item.description.toLowerCase().includes(query)),
        )
      : items;

    const list: CategoryWithItems[] = categories
      .map((category) => ({
        ...category,
        items: filteredItems.filter(
          (item) => item.category_id === category.id,
        ),
      }))
      .filter((category) => category.items.length > 0);

    const uncategorised = filteredItems.filter(
      (item) => item.category_id === null,
    );
    if (uncategorised.length > 0) {
      list.push({
        id: "uncategorised",
        restaurant_id: restaurant.id,
        name: "أطباق أخرى",
        description: null,
        sort_order: 9999,
        is_visible: true,
        created_at: restaurant.created_at,
        updated_at: restaurant.created_at,
        items: uncategorised,
      });
    }

    return list;
  }, [categories, items, restaurant, searchQuery]);

  const totalItemsCount = useMemo(
    () => grouped.reduce((acc, cat) => acc + cat.items.length, 0),
    [grouped],
  );

  const theme = themeToStyle(restaurant.theme);
  const rawWhatsapp = restaurant.whatsapp?.replace(/[^0-9]/g, "");

  function handleShare() {
    if (navigator.share) {
      navigator
        .share({
          title: restaurant.name,
          text: `منيو ${restaurant.name}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("تم نسخ رابط المنيو إلى الحافظة");
    }
  }

  function getWhatsAppOrderLink(item: MenuItem) {
    if (!rawWhatsapp) return null;
    const text = encodeURIComponent(
      `مرحباً، أود طلب: *${item.name}*${
        item.price !== null
          ? ` (السعر: ${formatPrice(item.price, restaurant.currency)})`
          : ""
      } من منيو ${restaurant.name}.`,
    );
    return `https://wa.me/${rawWhatsapp}?text=${text}`;
  }

  const navCategories = useMemo(
    () =>
      grouped.map((category) => ({
        id: category.id,
        name: category.name,
      })),
    [grouped],
  );

  return (
    <div
      className="min-h-dvh antialiased selection:bg-primary/20"
      style={{
        ...theme,
        backgroundColor: "var(--menu-background)",
        color: "var(--menu-foreground)",
      }}
    >
      {/* Top Banner & Header */}
      <header className="relative w-full">
        {restaurant.cover_url ? (
          <div className="relative w-full h-48 sm:h-60 md:h-72 overflow-hidden bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restaurant.cover_url}
              alt={restaurant.name}
              className="size-full object-cover object-center block"
            />
            {/* Subtle shade for share button visibility & depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/30" />
          </div>
        ) : (
          <div
            className="h-32 w-full shadow-inner sm:h-44"
            style={{
              background: `linear-gradient(135deg, var(--menu-primary), var(--menu-accent))`,
            }}
          />
        )}

        {/* Floating Share Button */}
        <div className="absolute right-4 top-4 z-10">
          <Button
            size="icon"
            variant="secondary"
            className="size-9 rounded-full bg-white/95 shadow-md backdrop-blur-md hover:bg-white text-gray-800 transition-transform active:scale-95"
            onClick={handleShare}
            title="مشاركة المنيو"
          >
            <Share2Icon className="size-4" />
          </Button>
        </div>

        {/* Restaurant Profile Info */}
        <div className="relative mx-auto -mt-14 max-w-3xl px-4 sm:-mt-16 sm:px-6">
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            {restaurant.logo_url ? (
              <div className="size-24 overflow-hidden rounded-2xl bg-white p-1 shadow-xl ring-4 ring-white sm:size-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="size-full rounded-xl object-contain bg-white"
                />
              </div>
            ) : (
              <div className="flex size-20 items-center justify-center rounded-2xl bg-white p-1.5 shadow-xl ring-4 ring-white sm:size-24">
                <div
                  className="flex size-full items-center justify-center rounded-xl"
                  style={{ backgroundColor: "var(--menu-muted)" }}
                >
                  <UtensilsIcon
                    className="size-8 sm:size-10"
                    style={{ color: "var(--menu-primary)" }}
                  />
                </div>
              </div>
            )}

            <h1
              className="mt-3 text-2xl font-black tracking-tight sm:text-3xl"
              style={{ color: "var(--menu-foreground)" }}
            >
              {restaurant.name}
            </h1>

            {restaurant.description && (
              <p
                className="mt-1.5 max-w-md text-sm leading-relaxed"
                style={{ color: "var(--menu-foreground)", opacity: 0.8 }}
              >
                {restaurant.description}
              </p>
            )}

            {/* Badges & Actions */}
            <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
              {restaurant.address && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border"
                  style={{
                    backgroundColor: "var(--menu-muted)",
                    borderColor: "color-mix(in srgb, var(--menu-foreground) 8%, transparent)",
                    color: "var(--menu-foreground)",
                  }}
                >
                  <MapPinIcon className="size-3.5 opacity-60" />
                  {restaurant.address}
                </span>
              )}
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-transform hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: "var(--menu-muted)",
                    borderColor: "color-mix(in srgb, var(--menu-foreground) 8%, transparent)",
                    color: "var(--menu-foreground)",
                  }}
                >
                  <PhoneIcon className="size-3.5 opacity-70" />
                  اتصال
                </a>
              )}
              {rawWhatsapp && (
                <a
                  href={`https://wa.me/${rawWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold text-white shadow-sm transition-transform hover:scale-105 active:scale-95 bg-[#25D366] hover:bg-[#20bd5a]"
                >
                  <MessageCircleIcon className="size-3.5" />
                  مراسلة واتساب
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Category Bar */}
      {navCategories.length > 0 && (
        <MenuCategoryNav categories={navCategories} />
      )}

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 sm:px-6">
        {/* Search & View Switcher */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <SearchIcon className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن طبق أو وجبة..."
              className="w-full rounded-2xl border py-2.5 pl-9 pr-10 text-sm transition-all focus:outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--menu-muted)",
                borderColor: "color-mix(in srgb, var(--menu-foreground) 10%, transparent)",
                color: "var(--menu-foreground)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 opacity-60 hover:opacity-100"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="text-xs opacity-60 tabular-nums">
              {totalItemsCount} {totalItemsCount === 1 ? "طبق" : "أطباق"}
            </span>

            <div
              className="flex items-center rounded-xl p-1 border"
              style={{
                backgroundColor: "var(--menu-muted)",
                borderColor: "color-mix(in srgb, var(--menu-foreground) 8%, transparent)",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="عرض شبكة بطاقات"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === "grid"
                    ? "shadow-sm bg-background text-foreground"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <LayoutGridIcon className="size-3.5" />
                شبكة
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="عرض قائمة أنيق"
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  viewMode === "list"
                    ? "shadow-sm bg-background text-foreground"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <ListIcon className="size-3.5" />
                قائمة
              </button>
            </div>
          </div>
        </div>

        {/* Categories & Dish Items */}
        {grouped.length === 0 ? (
          <div className="py-20 text-center">
            <UtensilsIcon className="mx-auto size-12 opacity-30" />
            <p className="mt-3 text-base font-medium opacity-80">
              {searchQuery
                ? "لم نجد أي طبق يطابق بحثك"
                : "المنيو قيد الإعداد، عد قريباً"}
            </p>
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => setSearchQuery("")}
              >
                مسح البحث
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map((category) => (
              <section
                key={category.id}
                id={`category-${category.id}`}
                className="scroll-mt-24"
              >
                {/* Category Header */}
                <div className="mb-4 flex items-center gap-3">
                  <h2
                    className="text-lg font-bold tracking-tight sm:text-xl"
                    style={{ color: "var(--menu-foreground)" }}
                  >
                    {category.name}
                  </h2>
                  <span
                    className="h-px flex-1 opacity-20"
                    style={{ backgroundColor: "var(--menu-foreground)" }}
                  />
                  <span
                    className="rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums"
                    style={{
                      backgroundColor: "var(--menu-muted)",
                      color: "var(--menu-primary)",
                    }}
                  >
                    {category.items.length}
                  </span>
                </div>

                {category.description && (
                  <p
                    className="mb-3.5 text-xs leading-relaxed opacity-70"
                    style={{ color: "var(--menu-foreground)" }}
                  >
                    {category.description}
                  </p>
                )}

                {/* Items Container */}
                {viewMode === "list" ? (
                  /* Modern App-Style List (Balanced Horizontal Cards) */
                  <div className="space-y-3">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        role="button"
                        tabIndex={0}
                        className="group flex cursor-pointer items-stretch justify-between gap-3.5 rounded-2xl border p-3 transition-all duration-200 hover:shadow-md hover:border-primary/30 active:scale-[0.99]"
                        style={{
                          backgroundColor: "var(--menu-muted)",
                          borderColor:
                            "color-mix(in srgb, var(--menu-foreground) 8%, transparent)",
                        }}
                      >
                        {/* Dish Details */}
                        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3
                                className="font-bold text-sm leading-snug group-hover:text-primary transition-colors sm:text-base"
                                style={{ color: "var(--menu-foreground)" }}
                              >
                                {item.name}
                              </h3>
                              {!item.is_available && (
                                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                                  غير متوفر
                                </span>
                              )}
                            </div>

                            {item.description && (
                              <p
                                className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-70"
                                style={{ color: "var(--menu-foreground)" }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            {item.price !== null ? (
                              <span
                                className="rounded-lg px-2.5 py-1 text-xs font-extrabold tabular-nums"
                                style={{
                                  backgroundColor: "var(--menu-background)",
                                  color: "var(--menu-primary)",
                                }}
                              >
                                {formatPrice(item.price, restaurant.currency)}
                              </span>
                            ) : (
                              <span />
                            )}

                            {rawWhatsapp && item.is_available && (
                              <span className="text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 hidden sm:inline">
                                اطلب الآن ↗
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dish Image Thumbnail */}
                        {item.image_url && (
                          <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-black/5 sm:size-28">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Balanced Grid Cards */
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        role="button"
                        tabIndex={0}
                        className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                        style={{
                          backgroundColor: "var(--menu-muted)",
                          borderColor:
                            "color-mix(in srgb, var(--menu-foreground) 8%, transparent)",
                        }}
                      >
                        {item.image_url ? (
                          <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                        ) : null}

                        <div className="flex flex-1 flex-col justify-between p-3">
                          <div>
                            <div className="flex items-start justify-between gap-1.5">
                              <h3
                                className="font-bold text-xs sm:text-sm leading-snug line-clamp-1"
                                style={{ color: "var(--menu-foreground)" }}
                              >
                                {item.name}
                              </h3>
                            </div>

                            {item.description && (
                              <p
                                className="mt-1 line-clamp-2 text-[11px] leading-relaxed opacity-70"
                                style={{ color: "var(--menu-foreground)" }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-2.5 flex items-center justify-between gap-1 pt-1 border-t border-black/5">
                            {item.price !== null ? (
                              <span
                                className="text-xs font-extrabold tabular-nums"
                                style={{ color: "var(--menu-primary)" }}
                              >
                                {formatPrice(item.price, restaurant.currency)}
                              </span>
                            ) : (
                              <span />
                            )}

                            {!item.is_available && (
                              <span className="text-[10px] text-destructive font-semibold">
                                غير متوفر
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer
          className="mt-16 border-t pt-6 text-center text-xs"
          style={{
            borderColor: "var(--menu-muted)",
            color: "var(--menu-foreground)",
            opacity: 0.6,
          }}
        >
          <p>جميع الأسعار تشمل ضريبة القيمة المضافة إن وجدت.</p>
          <p className="mt-1 font-semibold">{restaurant.name} © {new Date().getFullYear()}</p>
        </footer>
      </main>

      {/* Dish Detail Dialog */}
      {selectedItem && (
        <Dialog
          open={Boolean(selectedItem)}
          onOpenChange={(open) => !open && setSelectedItem(null)}
        >
          <DialogContent className="max-w-md overflow-hidden p-0 rounded-3xl border">
            {selectedItem.image_url && (
              <div className="relative aspect-[16/10] max-h-64 w-full overflow-hidden bg-black/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedItem.image_url}
                  alt={selectedItem.name}
                  className="size-full object-cover"
                />
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <DialogTitle className="text-xl font-bold">
                  {selectedItem.name}
                </DialogTitle>
                {selectedItem.price !== null && (
                  <span className="rounded-xl bg-primary/10 px-3 py-1 text-sm font-black text-primary tabular-nums">
                    {formatPrice(selectedItem.price, restaurant.currency)}
                  </span>
                )}
              </div>

              {selectedItem.description && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {selectedItem.description}
                </p>
              )}

              {!selectedItem.is_available && (
                <div className="rounded-xl bg-destructive/10 p-2.5 text-center text-xs font-semibold text-destructive">
                  هذا الطبق غير متوفر في الوقت الحالي
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {rawWhatsapp && selectedItem.is_available && (
                  <Button
                    asChild
                    className="flex-1 gap-2 bg-[#25D366] text-white hover:bg-[#20bd5a] font-bold rounded-xl"
                  >
                    <a
                      href={getWhatsAppOrderLink(selectedItem) ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircleIcon className="size-4" />
                      طلب هذا الطبق عبر واتساب
                    </a>
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 rounded-xl"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}