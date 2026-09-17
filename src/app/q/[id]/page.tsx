import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * The permanent QR entry point.
 *
 * The QR code always encodes `/q/<restaurant-uuid>`, which never changes. This
 * route resolves the restaurant's *current* slug and forwards the visitor
 * there, so the owner can rename their public link as often as they like
 * without ever reprinting a single code.
 */
export default async function PermanentQrPage({
  params,
}: PageProps<"/q/[id]">) {
  const { id } = await params;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (!isUuid) notFound();

  const supabase = await createClient();
  const { data: slug } = await supabase.rpc("current_slug", {
    p_restaurant_id: id,
  });

  if (!slug) notFound();

  // Temporary redirect on purpose: if this were cached as permanent, a browser
  // would keep following a stale slug after the owner renames their link.
  // Re-resolving on every visit is what keeps old QR codes valid forever.
  redirect(`/m/${slug}`);
}