"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import {
  createCategory,
  updateCategory,
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
import { Textarea } from "@/components/ui/textarea";
import type { MenuCategory } from "@/lib/types";

export function CategoryDialog({
  restaurantId,
  category,
  open,
  onOpenChange,
}: {
  restaurantId: string;
  category?: MenuCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = Boolean(category);
  const [state, action, pending] = useActionState<MenuActionState, FormData>(
    isEdit ? updateCategory : createCategory,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "تعديل القسم" : "قسم جديد"}</DialogTitle>
          <DialogDescription>
            الأقسام تساعد الزوار على تصفح المنيو بسرعة.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="space-y-4">
          <input type="hidden" name="restaurantId" value={restaurantId} />
          {category && <input type="hidden" name="id" value={category.id} />}

          <div className="space-y-2">
            <Label htmlFor="category-name">اسم القسم</Label>
            <Input
              id="category-name"
              name="name"
              defaultValue={category?.name}
              placeholder="مثال: المقبلات"
              required
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description">وصف مختصر (اختياري)</Label>
            <Textarea
              id="category-description"
              name="description"
              defaultValue={category?.description ?? ""}
              placeholder="وصف يظهر تحت اسم القسم"
              rows={2}
              maxLength={300}
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