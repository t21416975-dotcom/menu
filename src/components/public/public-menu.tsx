import Image from "next/image";
import { MapPinIcon, PhoneIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  const grouped: CategoryWithItems[] = categories
    .map((category) => ({
      ...category,
      items: items.filter((item) => item.category_id === category.id),
    }))
    .filter((category) => category.items.length > 0);

  const uncategorised = items.filter((item) => item.category_id === null);
  if (uncategorised.length > 0) {
    grouped.push({
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

  const theme = themeToStyle(restaurant.theme);
  const whatsapp = restaurant.whatsapp?.replace(/[^0-9]/g, "");

  return (
    <div
      className="min-h-dvh"
      style={{ ...theme, backgroundColor: "var(--menu-background)" }}
    >
      <header className="relative">
        {restaurant.cover_url ? (
          <div className="relative h-44 w-full sm:h-60">
            <Image
              src={restaurant.cover_url}
              alt={restaurant.name}
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to top, var(--menu-background), transparent 65%)`,
              }}
            />
          </div>
        ) : (
          <div
            className="h-24 w-full"
            style={{ backgroundColor: "var(--menu-primary)" }}
          />
        )}

        <div className="mx-auto -mt-14 max-w-2xl px-5">
          <div className="flex flex-col items-center text-center">
            {restaurant.logo_url && (
              <div
                className="size-24 overflow-hidden rounded-2xl border-4 bg-white shadow-lg"
                style={{ borderColor: "var(--menu-background)" }}
              >
                <Image
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  width={96}
                  height={96}
                  className="size-full object-cover"
                />
              </div>
            )}

            <h1
              className="mt-3 text-2xl font-bold sm:text-3xl"
              style={{ color: "var(--menu-foreground)" }}
            >
              {restaurant.name}
            </h1>

            {restaurant.description && (
              <p
                className="mt-2 max-w-md text-sm leading-relaxed"
                style={{ color: "var(--menu-foreground)", opacity: 0.7 }}
              >
                {restaurant.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {restaurant.address && (
                <Badge variant="secondary" className="gap-1.5 font-normal">
                  <MapPinIcon className="size-3" />
                  {restaurant.address}
                </Badge>
              )}
              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    backgroundColor: "var(--menu-muted)",
                    color: "var(--menu-foreground)",
                  }}
                >
                  <PhoneIcon className="size-3" />
                  اتصال
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: "var(--menu-accent)",
                    color: "var(--menu-on-accent)",
                  }}
                >
                  واتساب
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      {grouped.length > 0 && (
        <MenuCategoryNav
          categories={grouped.map((category) => ({
            id: category.id,
            name: category.name,
          }))}
        />
      )}

      <main className="mx-auto max-w-2xl px-5 pb-20 pt-6">
        {grouped.length === 0 ? (
          <p
            className="py-20 text-center text-sm"
            style={{ color: "var(--menu-foreground)", opacity: 0.6 }}
          >
            المنيو قيد الإعداد، عد قريباً.
          </p>
        ) : (
          <div className="space-y-10">
            {grouped.map((category) => (
              <section key={category.id} id={`category-${category.id}`}>
                <div className="mb-4 flex items-center gap-3">
                  <h2
                    className="text-lg font-bold"
                    style={{ color: "var(--menu-foreground)" }}
                  >
                    {category.name}
                  </h2>
                  <span
                    className="h-px flex-1"
                    style={{ backgroundColor: "var(--menu-muted)" }}
                  />
                  <span
                    className="text-xs font-medium tabular-nums"
                    style={{ color: "var(--menu-primary)" }}
                  >
                    {category.items.length}
                  </span>
                </div>

                {category.description && (
                  <p
                    className="mb-3 text-sm"
                    style={{ color: "var(--menu-foreground)", opacity: 0.6 }}
                  >
                    {category.description}
                  </p>
                )}

                <ul className="space-y-2">
                  {category.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-4 rounded-xl p-3.5"
                      style={{
                        backgroundColor: "var(--menu-muted)",
                        borderRadius: "calc(var(--menu-radius) * 0.8)",
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-medium"
                            style={{ color: "var(--menu-foreground)" }}
                          >
                            {item.name}
                          </span>
                          {!item.is_available && (
                            <span
                              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: "var(--menu-background)",
                                color: "var(--menu-foreground)",
                                opacity: 0.7,
                              }}
                            >
                              غير متوفر
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p
                            className="mt-0.5 text-sm leading-relaxed"
                            style={{ color: "var(--menu-foreground)", opacity: 0.65 }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>

                      {item.price !== null && (
                        <span
                          className="shrink-0 pt-0.5 text-sm font-bold tabular-nums"
                          style={{ color: "var(--menu-primary)" }}
                        >
                          {formatPrice(item.price, restaurant.currency)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <footer
          className="mt-14 border-t pt-6 text-center text-xs"
          style={{
            borderColor: "var(--menu-muted)",
            color: "var(--menu-foreground)",
            opacity: 0.5,
          }}
        >
          الأسعار تشمل ضريبة القيمة المضافة إن وجدت.
        </footer>
      </main>
    </div>
  );
}