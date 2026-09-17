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
      `مرحباً، أود طلب طبق: *${item.name}*${
        item.price !== null ? ` (السعر: ${formatPrice(item.price, restaurant.currency)})` : ""
      } من منيو ${restaurant.name}.`,
    );
    return `https://wa.me/${rawWhatsapp}?text=${text}`;
  }

  return (
    <div
      className="min-h-dvh antialiased selection:bg-primary/20"
      style={{
        ...theme,
        backgroundColor: "var(--menu-background)",
        color: "var(--menu-foreground)",
      }}
    >
      {/* Top Header & Cover Photo */}
      <header className="relative">
        {restaurant.cover_url ? (
          <div className="relative h-48 w-full overflow-hidden sm:h-64 md:h-72">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restaurant.cover_url}
              alt={restaurant.name}
              className="size-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, var(--menu-background) 5%, rgba(0,0,0,0.4) 100%)`,
              }}
            />
          </div>
        ) : (
          <div
            className="h-28 w-full shadow-inner"
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
            className="size-9 rounded-full bg-background/80 shadow-md backdrop-blur-md hover:bg-background"
            onClick={handleShare}
            title="مشاركة المنيو"
          >
            <Share2Icon className="size-4" />
          </Button>
        </div>

        {/* Restaurant Profile Card */}
        <div className="mx-auto -mt-14 max-w-3xl px-4 sm:px-6">
          <div className="flex flex-col items-center text-center">
            {restaurant.logo_url ? (
              <div
                className="size-24 overflow-hidden rounded-2xl border-4 bg-white shadow-xl ring-1 ring-black/5 sm:size-28"
                style={{ borderColor: "var(--menu-background)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="size-full object-cover"
                />
              </div>
            ) : (
              <div
                className="flex size-20 items-center justify-center rounded-2xl border-4 bg-primary/10 shadow-lg"
                style={{ borderColor: "var(--menu-background)" }}
              >
                <UtensilsIcon className="size-8" style={{ color: "var(--menu-primary)" }} />
              </div>
            )}

            <h1
              className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl"
              style={{ color: "var(--menu-foreground)" }}
            >
              {restaurant.name}
            </h1>

            {restaurant.description && (
              <p
                className="mt-2 max-w-lg text-sm leading-relaxed"
                style={{ color: "var(--menu-foreground)", opacity: 0.8 }}
              >
                {restaurant.description}
              </p>
            )}

            {/* Contact & Location Actions */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {restaurant.address && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: "var(--menu-muted)",
                    color: "var(--menu-foreground)",
                  }}
                >
                  <MapPinIcon className="size-3.5 opacity-70" />
                  {restaurant.address}
                </span>
              )}
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-transform hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: "var(--menu-muted)",
                    color: "var(--menu-foreground)",
                  }}
                >
                  <PhoneIcon className="size-3.5" />
                  اتصال
                </a>
              )}
              {rawWhatsapp && (
                <a
                  href={`https://wa.me/${rawWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold shadow-sm transition-transform hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: "var(--menu-accent)",
                    color: "var(--menu-on-accent)",
                  }}
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
      {grouped.length > 0 && (
        <MenuCategoryNav
          categories={grouped.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
        />
      )}

      {/* Main Content Area */}
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 sm:px-6">
        {/* Search & View Controls */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <SearchIcon className="absolute right-3 top-1/2 size-4 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن طبق أو مكونات..."
              className="w-full rounded-xl border py-2.5 pl-9 pr-9 text-sm transition-all focus:outline-none focus:ring-2"
              style={{
                backgroundColor: "var(--menu-muted)",
                borderColor: "var(--menu-muted)",
                color: "var(--menu-foreground)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full p-1 opacity-60 hover:opacity-100"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="text-xs opacity-60">
              {totalItemsCount} {totalItemsCount === 1 ? "طبق" : "أطباق"}
            </span>

            <div
              className="flex items-center rounded-lg p-0.5"
              style={{ backgroundColor: "var(--menu-muted)" }}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="عرض بطاقات مصورة"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  viewMode === "grid" ? "shadow-sm" : "opacity-60 hover:opacity-100"
                }`}
                style={
                  viewMode === "grid"
                    ? {
                        backgroundColor: "var(--menu-background)",
                        color: "var(--menu-foreground)",
                      }
                    : {}
                }
              >
                <LayoutGridIcon className="size-3.5" />
                شبكة
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="عرض قائمة"
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                  viewMode === "list" ? "shadow-sm" : "opacity-60 hover:opacity-100"
                }`}
                style={
                  viewMode === "list"
                    ? {
                        backgroundColor: "var(--menu-background)",
                        color: "var(--menu-foreground)",
                      }
                    : {}
                }
              >
                <ListIcon className="size-3.5" />
                قائمة
              </button>
            </div>
          </div>
        </div>

        {/* Categories and Items */}
        {grouped.length === 0 ? (
          <div className="py-20 text-center">
            <UtensilsIcon className="mx-auto size-12 opacity-30" />
            <p className="mt-3 text-base font-medium opacity-80">
              {searchQuery ? "لم نجد أي طبق يطابق بحثك" : "المنيو قيد الإعداد، عد قريباً"}
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
          <div className="space-y-12">
            {grouped.map((category) => (
              <section key={category.id} id={`category-${category.id}`} className="scroll-mt-20">
                <div className="mb-4 flex items-center gap-3">
                  <h2
                    className="text-xl font-bold tracking-tight"
                    style={{ color: "var(--menu-foreground)" }}
                  >
                    {category.name}
                  </h2>
                  <span
                    className="h-px flex-1 opacity-30"
                    style={{ backgroundColor: "var(--menu-foreground)" }}
                  />
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
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
                    className="mb-4 text-sm leading-relaxed"
                    style={{ color: "var(--menu-foreground)", opacity: 0.7 }}
                  >
                    {category.description}
                  </p>
                )}

                {/* Grid View */}
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {category.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        role="button"
                        tabIndex={0}
                        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-1 hover:shadow-lg active:scale-[0.98]"
                        style={{
                          backgroundColor: "var(--menu-muted)",
                          borderColor: "color-mix(in srgb, var(--menu-foreground) 8%, transparent)",
                          borderRadius: "var(--menu-radius, 1rem)",
                        }}
                      >
                        {/* Dish Image */}
                        {item.image_url ? (
                          <div className="relative h-44 w-full overflow-hidden bg-black/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                              onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                              }}
                            />
                            {item.price !== null && (
                              <div
                                className="absolute bottom-2.5 right-2.5 rounded-full px-3 py-1 text-xs font-bold shadow-md backdrop-blur-md"
                                style={{
                                  backgroundColor: "var(--menu-primary)",
                                  color: "var(--menu-on-primary)",
                                }}
                              >
                                {formatPrice(item.price, restaurant.currency)}
                              </div>
                            )}
                          </div>
                        ) : null}

                        <div className="flex flex-1 flex-col justify-between p-4">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3
                                className="font-bold leading-snug group-hover:underline"
                                style={{ color: "var(--menu-foreground)" }}
                              >
                                {item.name}
                              </h3>
                              {!item.image_url && item.price !== null && (
                                <span
                                  className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold"
                                  style={{
                                    backgroundColor: "var(--menu-primary)",
                                    color: "var(--menu-on-primary)",
                                  }}
                                >
                                  {formatPrice(item.price, restaurant.currency)}
                                </span>
                              )}
                            </div>

                            {item.description && (
                              <p
                                className="mt-1.5 line-clamp-2 text-xs leading-relaxed"
                                style={{
                                  color: "var(--menu-foreground)",
                                  opacity: 0.7,
                                }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>

                          <div className="mt-3 flex items-center justify-between pt-2">
                            {!item.is_available ? (
                              <span
                                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                                style={{
                                  backgroundColor: "var(--menu-background)",
                                  color: "var(--menu-foreground)",
                                  opacity: 0.6,
                                }}
                              >
                                غير متوفر حالياً
                              </span>
                            ) : (
                              <span className="text-[11px] font-medium opacity-60 group-hover:opacity-100">
                                اضغط للتفاصيل والطلب ↗
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Compact List View */
                  <ul className="divide-y divide-border/40 overflow-hidden rounded-2xl border"
                    style={{
                      backgroundColor: "var(--menu-muted)",
                      borderColor: "color-mix(in srgb, var(--menu-foreground) 8%, transparent)",
                    }}
                  >
                    {category.items.map((item) => (
                      <li
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        role="button"
                        tabIndex={0}
                        className="flex cursor-pointer items-center justify-between gap-4 p-3.5 transition-colors hover:bg-black/5"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3.5">
                          {item.image_url && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="size-14 shrink-0 rounded-xl object-cover shadow-sm"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-semibold text-sm"
                                style={{ color: "var(--menu-foreground)" }}
                              >
                                {item.name}
                              </span>
                              {!item.is_available && (
                                <span className="rounded-full px-1.5 py-0.5 text-[9px] font-medium opacity-60">
                                  غير متوفر
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p
                                className="mt-0.5 line-clamp-1 text-xs"
                                style={{
                                  color: "var(--menu-foreground)",
                                  opacity: 0.65,
                                }}
                              >
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {item.price !== null && (
                          <span
                            className="shrink-0 font-bold text-sm tabular-nums"
                            style={{ color: "var(--menu-primary)" }}
                          >
                            {formatPrice(item.price, restaurant.currency)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer
          className="mt-16 border-t pt-8 text-center text-xs"
          style={{
            borderColor: "var(--menu-muted)",
            color: "var(--menu-foreground)",
            opacity: 0.6,
          }}
        >
          <p>جميع الأسعار تشمل ضريبة القيمة المضافة إن وجدت.</p>
          <p className="mt-1 font-medium">{restaurant.name} © {new Date().getFullYear()}</p>
        </footer>
      </main>

      {/* Item Detail & WhatsApp Order Modal */}
      {selectedItem && (
        <Dialog open={Boolean(selectedItem)} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="max-w-md overflow-hidden p-0 rounded-2xl">
            {selectedItem.image_url && (
              <div className="relative h-60 w-full overflow-hidden bg-black/10">
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
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-extrabold text-primary tabular-nums">
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
                <div className="rounded-lg bg-destructive/10 p-3 text-center text-xs font-semibold text-destructive">
                  هذا الطبق غير متوفر في الوقت الحالي
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {rawWhatsapp && selectedItem.is_available && (
                  <Button asChild className="flex-1 gap-2 bg-[#25D366] text-white hover:bg-[#20bd5a]">
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
                  className="px-4"
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