"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { setRestaurantActive } from "@/app/actions/admin";
import { Switch } from "@/components/ui/switch";

export function RestaurantActiveToggle({
  restaurantId,
  isActive,
}: {
  restaurantId: string;
  isActive: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Switch
      checked={isActive}
      disabled={isPending}
      onCheckedChange={(checked) => {
        startTransition(async () => {
          const result = await setRestaurantActive(restaurantId, checked);
          if (result.error) toast.error(result.error);
          else toast.success(checked ? "تم التفعيل" : "تم الإيقاف");
        });
      }}
    />
  );
}