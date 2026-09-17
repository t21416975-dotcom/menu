import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/dal";

export default async function DashboardLayout({
  children,
}: LayoutProps<"/dashboard">) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            منيو
            <Badge variant="secondary" className="text-[10px] font-medium">
              لوحة التحكم
            </Badge>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-sm text-muted-foreground underline-offset-4 hover:underline sm:block"
            >
              عرض الموقع
            </Link>
            <UserMenu profile={profile} />
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-6">
          <DashboardNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}