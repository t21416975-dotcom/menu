"use client";

import { useActionState, useEffect } from "react";
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
  const [state, action, pending] = useActionState<MenuActionState, FormData>(
    isEdit ? updateItem : createItem,
    {},
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.success);
      onOpenChange(false);
    }
    if (state.error) toast.error(state.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const initialCategory =
    item?.category_id ?? defaultCategoryId ?? NO_CATEGORY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل الطبق" : "طبق جديد"}</DialogTitle>
          <DialogDescription>
            أدخل اسم الطبق وسعره. يمكنك تركه بلا سعر إن لم ترغب بعرضه.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          {item && <input type="hidden" name="id" value={item.id} />}

          <div className="space-y-2">
            <Label htmlFor="item-name">اسم الطبق</Label>
            <Input
              id="item-name"
              name="name"
              defaultValue={item?.name}
              placeholder="مثال: حمص بالطحينة"
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
            <Label htmlFor="item-description">الوصف (اختياري)</Label>
            <Textarea
              id="item-description"
              name="description"
              defaultValue={item?.description ?? ""}
              placeholder="مكونات الطبق أو وصف قصير"
              rows={2}
              maxLength={400}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              إلغاء
            </Button>
            <Button type="submit" disabled={pending}>
              {isEdit ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}