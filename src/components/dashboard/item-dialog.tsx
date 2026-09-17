"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createItem,
  updateItem,
  type MenuActionState,
} from "@/app/actions/menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryWithItems, MenuItem } from "@/lib/types";

const NO_CATEGORY = "__none__";

export function ItemDialog({
  restaurantId,
  categories,
  item,
  defaultCategoryId,
  currency,
  open,
  onOpenChange,
}: {
  restaurantId: string;
  categories: CategoryWithItems[];
  item?: MenuItem;
  defaultCategoryId?: string | null;
  currency: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(item);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل الطبق" : "طبق جديد"}</DialogTitle>
          <DialogDescription>
            أدخل بيانات الطبق، ويمكنك إضافة رابط مباشر لصورة عالية الجودة.
          </DialogDescription>
        </DialogHeader>

        {open && (
          <ItemDialogForm
            key={item?.id ?? "new-item"}
            restaurantId={restaurantId}
            categories={categories}
            item={item}
            defaultCategoryId={defaultCategoryId}
            currency={currency}
            isEdit={isEdit}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ItemDialogForm({
  restaurantId,
  categories,
  item,
  defaultCategoryId,
  currency,
  isEdit,
  onClose,
}: {
  restaurantId: string;
  categories: CategoryWithItems[];
  item?: MenuItem;
  defaultCategoryId?: string | null;
  currency: string;
  isEdit: boolean;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState<MenuActionState, FormData>(
    isEdit ? updateItem : createItem,
    {},
  );

  const [imageUrl, setImageUrl] = useState<string>(item?.image_url ?? "");

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      onClose();
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const initialCategory =
    item?.category_id ?? defaultCategoryId ?? NO_CATEGORY;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="restaurantId" value={restaurantId} />
      {item && <input type="hidden" name="id" value={item.id} />}

      <div className="space-y-2">
        <Label htmlFor="item-name">اسم الطبق</Label>
        <Input
          id="item-name"
          name="name"
          defaultValue={item?.name}
          placeholder="مثال: برجر دجاج مقرمش"
          required
          maxLength={120}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="item-price">السعر ({currency})</Label>
          <Input
            id="item-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={item?.price ?? ""}
            placeholder="اتركه فارغاً إن لم يوجد"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="item-category">القسم</Label>
          <Select name="categoryId" defaultValue={initialCategory}>
            <SelectTrigger id="item-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY}>بدون قسم</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="item-image-url">رابط صورة الطبق (مباشر)</Label>
        <Input
          id="item-image-url"
          name="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://images.unsplash.com/... أو رابط الصورة المباشر"
        />
        {imageUrl && (
          <div className="mt-2 flex items-center gap-3 rounded-lg border bg-muted/40 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="معاينة الصورة"
              className="size-16 rounded-md object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = "none";
              }}
            />
            <div className="flex-1 text-xs text-muted-foreground">
              معاينة مباشرة لصورة الطبق
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setImageUrl("")}
              className="text-xs text-destructive"
            >
              مسح الصورة
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="item-description">الوصف (اختياري)</Label>
        <Textarea
          id="item-description"
          name="description"
          defaultValue={item?.description ?? ""}
          placeholder="مكونات الطبق أو وصف قصير يوضح تفاصيله"
          rows={2}
          maxLength={400}
        />
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          إلغاء
        </Button>
        <Button type="submit" disabled={pending}>
          {isEdit ? "حفظ" : "إضافة"}
        </Button>
      </DialogFooter>
    </form>
  );
}