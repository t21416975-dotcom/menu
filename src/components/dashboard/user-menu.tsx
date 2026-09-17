"use client";

import { LogOutIcon, ShieldIcon, UserIcon } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Profile } from "@/lib/types";

export function UserMenu({ profile }: { profile: Profile }) {
  const initials = (profile.full_name || profile.email || "?").trim().charAt(0);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Avatar className="size-8">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name ?? ""} />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-start">
          <span className="block truncate font-medium">
            {profile.full_name || "مستخدم"}
          </span>
          <span className="block truncate text-xs font-normal text-muted-foreground">
            {profile.email}
          </span>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {profile.role === "super_admin" && (
          <>
            <DropdownMenuItem asChild>
              <a href="/admin">
                <ShieldIcon className="size-4" />
                لوحة الإدارة
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem asChild>
          <a href="/dashboard/settings">
            <UserIcon className="size-4" />
            إعدادات الحساب
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <form action={signOut}>
          <DropdownMenuItem asChild variant="destructive">
            <button type="submit" className="w-full">
              <LogOutIcon className="size-4" />
              تسجيل الخروج
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}