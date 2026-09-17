import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLinkIcon } from "lucide-react";

import { RestaurantActiveToggle } from "@/components/admin/restaurant-active-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireSuperAdmin } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "لوحة الإدارة" };

type AdminRow = {
  id: string;
  name: string;
  owner_id: string;
  is_active: boolean;
  created_at: string;
  currency: string;
};

export default async function AdminPage() {
  await requireSuperAdmin();

  const admin = createAdminClient();

  const [{ data: restaurants }, { data: profileRows }, { count: scanCount }] =
    await Promise.all([
      admin
        .from("restaurants")
        .select("id, name, owner_id, is_active, created_at, currency")
        .order("created_at", { ascending: false }),
      admin.from("profiles").select("id, email, full_name, role"),
      admin.from("scans").select("id", { count: "exact", head: true }),
    ]);

  const owners = new Map(
    (profileRows ?? []).map((profile) => [profile.id, profile]),
  );

  const { data: slugRows } = await admin.from("slugs").select("slug, restaurant_id").eq("is_current", true);
  const slugs = new Map(
    (slugRows ?? []).map((row) => [row.restaurant_id, row.slug]),
  );

  const rows = (restaurants ?? []) as AdminRow[];

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← لوحة المطعم
          </Link>
          <h1 className="mt-2 text-2xl font-bold">لوحة الإدارة</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            جميع المطاعم المسجلة في المنصة.
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>المطاعم</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>المستخدمون</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{profileRows?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>مرات المسح</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{scanCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">كل المطاعم</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">المطعم</TableHead>
                <TableHead className="text-start">المالك</TableHead>
                <TableHead className="text-start">الرابط</TableHead>
                <TableHead className="text-start">التسجيل</TableHead>
                <TableHead className="text-start">الحالة</TableHead>
                <TableHead className="text-start">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((restaurant) => {
                const owner = owners.get(restaurant.owner_id);
                const slug = slugs.get(restaurant.id);

                return (
                  <TableRow key={restaurant.id}>
                    <TableCell className="font-medium">{restaurant.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {owner?.email ?? "—"}
                    </TableCell>
                    <TableCell>
                      {slug ? (
                        <Link
                          href={`/m/${slug}`}
                          target="_blank"
                          dir="ltr"
                          className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                        >
                          /m/{slug}
                          <ExternalLinkIcon className="size-3" />
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(restaurant.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={restaurant.is_active ? "default" : "secondary"}>
                        {restaurant.is_active ? "نشط" : "موقوف"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <RestaurantActiveToggle
                        restaurantId={restaurant.id}
                        isActive={restaurant.is_active}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}