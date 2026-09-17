"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  deleteCategory,
  deleteItem,
  toggleCategoryVisibility,
  toggleItemAvailability,
} from "@/app/actions/menu";
import { CategoryDialog } from "@/components/dashboard/category-dialog";
import { ItemDialog } from "@/components/dashboard/item-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import type {
  CategoryWithItems,
  MenuCategory,
  MenuItem,
  Restaurant,
} from "@/lib/types";

export function MenuManager({
  restaurant,
  categories,
  uncategorised,
}: {
  restaurant: Restaurant;
  categories: CategoryWithItems[];
  uncategorised: MenuItem[];
}) {
  const [isPending, startTransition] = useTransition();

  const [categoryDialog, setCategoryDialog] = useState<
    { mode: "create" } | { mode: "edit"; category: MenuCategory } | null
  >(null);

  const [itemDialog, setItemDialog] = useState<
    | { mode: "create"; categoryId: string | null }
    | { mode: "edit"; item: MenuItem }
    | null
  >(null);

  function run(action: () => Promise<{ error?: string; success?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else toast.success(result.success ?? "تم");
    });
  }

  const isEmpty = categories.length === 0 && uncategorised.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">المنيو</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            أضف الأقسام والأطباق، ورتّبها كما تريد.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/import">
              <UploadIcon className="size-4" />
              استيراد من صورة
            </Link>
          </Button>
          <Button onClick={() => setCategoryDialog({ mode: "create" })}>
            <PlusIcon className="size-4" />
            قسم جديد
          </Button>
        </div>
      </div>

      {isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          جارٍ الحفظ...
        </div>
      )}

      {isEmpty && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-muted-foreground">
              لا توجد أصناف بعد. ابدأ برفع صورة المنيو أو أنشئ قسماً يدوياً.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/dashboard/import">رفع صورة</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => setCategoryDialog({ mode: "create" })}
              >
                إضافة قسم
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {categories.map((category) => (
        <Card key={category.id}>
          <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{category.name}</CardTitle>
              {!category.is_visible && (
                <Badge variant="secondary" className="text-[10px]">
                  مخفي
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                title={category.is_visible ? "إخفاء القسم" : "إظهار القسم"}
                onClick={() =>
                  run(() =>
                    toggleCategoryVisibility(category.id, !category.is_visible),
                  )
                }
              >
                {category.is_visible ? (
                  <EyeIcon className="size-4" />
                ) : (
                  <EyeOffIcon className="size-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="تعديل"
                onClick={() =>
                  setCategoryDialog({ mode: "edit", category })
                }
              >
                <PencilIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                title="حذف"
                onClick={() => {
                  if (!confirm(`حذف قسم "${category.name}"؟ سيتم حذف أصنافه أيضاً.`))
                    return;
                  run(() => deleteCategory(category.id));
                }}
              >
                <Trash2Icon className="size-4 text-destructive" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {category.description && (
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
            )}

            {category.items.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                لا توجد أطباق في هذا القسم.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {category.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    currency={restaurant.currency}
                    onEdit={() => setItemDialog({ mode: "edit", item })}
                    onToggle={() =>
                      run(() =>
                        toggleItemAvailability(item.id, !item.is_available),
                      )
                    }
                    onDelete={() => {
                      if (!confirm(`حذف "${item.name}"؟`)) return;
                      run(() => deleteItem(item.id));
                    }}
                  />
                ))}
              </ul>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setItemDialog({ mode: "create", categoryId: category.id })
              }
            >
              <PlusIcon className="size-4" />
              إضافة طبق
            </Button>
          </CardContent>
        </Card>
      ))}

      {uncategorised.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">بدون قسم</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {uncategorised.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  currency={restaurant.currency}
                  onEdit={() => setItemDialog({ mode: "edit", item })}
                  onToggle={() =>
                    run(() => toggleItemAvailability(item.id, !item.is_available))
                  }
                  onDelete={() => {
                    if (!confirm(`حذف "${item.name}"؟`)) return;
                    run(() => deleteItem(item.id));
                  }}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {categoryDialog && (
        <CategoryDialog
          restaurantId={restaurant.id}
          category={
            categoryDialog.mode === "edit" ? categoryDialog.category : undefined
          }
          open
          onOpenChange={(open) => !open && setCategoryDialog(null)}
        />
      )}

      {itemDialog && (
        <ItemDialog
          restaurantId={restaurant.id}
          categories={categories}
          item={itemDialog.mode === "edit" ? itemDialog.item : undefined}
          defaultCategoryId={
            itemDialog.mode === "create" ? itemDialog.categoryId : null
          }
          currency={restaurant.currency}
          open
          onOpenChange={(open) => !open && setItemDialog(null)}
        />
      )}
    </div>
  );
}

function ItemRow({
  item,
  currency,
  onEdit,
  onToggle,
  onDelete,
}: {
  item: MenuItem;
  currency: string;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{item.name}</span>
          {!item.is_available && (
            <Badge variant="secondary" className="text-[10px]">
              غير متوفر
            </Badge>
          )}
        </div>
        {item.description && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <span className="min-w-16 text-center text-sm font-medium tabular-nums">
          {formatPrice(item.price, currency) || "—"}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          title={item.is_available ? "تعيين كغير متوفر" : "تعيين كمتوفر"}
          onClick={onToggle}
        >
          {item.is_available ? (
            <EyeIcon className="size-4" />
          ) : (
            <EyeOffIcon className="size-4" />
          )}
        </Button>
        <Button variant="ghost" size="icon-sm" title="تعديل" onClick={onEdit}>
          <PencilIcon className="size-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" title="حذف" onClick={onDelete}>
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      </div>
    </li>
  );
}