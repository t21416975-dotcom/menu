import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "./supabase/server";
import type { Profile, Restaurant } from "./types";

/**
 * Secure session check. Always relies on `getUser()`, which validates the JWT
 * against Supabase, rather than `getSession()` which trusts the cookie.
 * Memoised per render pass so repeated calls cost nothing.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
});

/** Redirects to /login when there is no authenticated user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireSuperAdmin() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "super_admin") redirect("/dashboard");
  return profile;
}

/**
 * Loads a restaurant the caller is allowed to manage. RLS does the real
 * enforcement; this exists so pages can render a clean 404 instead of an
 * empty shell.
 */
export const requireRestaurant = cache(async (): Promise<Restaurant> => {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) redirect("/onboarding");
  return data as Restaurant;
});

/** Same as requireRestaurant but returns null instead of redirecting. */
export const getOwnRestaurant = cache(async (): Promise<Restaurant | null> => {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (data as Restaurant | null) ?? null;
});