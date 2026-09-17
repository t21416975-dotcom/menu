"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PaletteIcon,
  QrCodeIcon,
  SettingsIcon,
  SparklesIcon,
  UtensilsCrossedIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "نظرة عامة", icon: SparklesIcon },
  { href: "/dashboard/menu", label: "المنيو", icon: UtensilsCrossedIcon },
  { href: "/dashboard/import", label: "من صورة", icon: SparklesIcon },
  { href: "/dashboard/appearance", label: "المظهر", icon: PaletteIcon },
  { href: "/dashboard/qr", label: "رمز QR", icon: QrCodeIcon },
  { href: "/dashboard/settings", label: "الإعدادات", icon: SettingsIcon },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border pb-px">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-t-lg border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}