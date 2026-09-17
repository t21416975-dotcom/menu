-- ============================================================================
-- MenuQR — initial schema
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- ============================================================================

-- gen_random_uuid() is built into Postgres 13+ (Supabase runs 15+), so no
-- extension is required here.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  avatar_url  text,
  role        text not null default 'owner'
              check (role in ('super_admin', 'owner')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'Application user profile, 1:1 with auth.users.';

-- ---------------------------------------------------------------------------
-- restaurants
-- ---------------------------------------------------------------------------
create table if not exists public.restaurants (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  description  text,
  logo_url     text,
  cover_url    text,
  phone        text,
  whatsapp     text,
  address      text,
  currency     text not null default 'SAR',
  theme        jsonb not null default '{}'::jsonb,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists restaurants_owner_id_idx on public.restaurants (owner_id);

comment on column public.restaurants.theme is
  'Resolved visual theme: {paletteId, primary, accent, background, foreground, muted, mode, font, radius}';

-- ---------------------------------------------------------------------------
-- slugs — single source of truth for every slug ever used.
-- The primary key gives global uniqueness across current AND historical slugs,
-- so a slug can never be reused by another restaurant.
-- ---------------------------------------------------------------------------
create table if not exists public.slugs (
  slug          text primary key,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  is_current    boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint slugs_format_check
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$')
);

create unique index if not exists slugs_one_current_per_restaurant_idx
  on public.slugs (restaurant_id) where is_current;

create index if not exists slugs_restaurant_id_idx on public.slugs (restaurant_id);

-- ---------------------------------------------------------------------------
-- menu_categories
-- ---------------------------------------------------------------------------
create table if not exists public.menu_categories (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name          text not null,
  description   text,
  sort_order    integer not null default 0,
  is_visible    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists menu_categories_restaurant_idx
  on public.menu_categories (restaurant_id, sort_order);

-- ---------------------------------------------------------------------------
-- menu_items
-- ---------------------------------------------------------------------------
create table if not exists public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id   uuid references public.menu_categories (id) on delete set null,
  name          text not null,
  description   text,
  price         numeric(10, 2),
  image_url     text,
  is_available  boolean not null default true,
  is_visible    boolean not null default true,
  tags          text[] not null default '{}',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists menu_items_restaurant_idx
  on public.menu_items (restaurant_id, sort_order);
create index if not exists menu_items_category_idx
  on public.menu_items (category_id, sort_order);

-- ---------------------------------------------------------------------------
-- extraction_jobs — one row per uploaded menu photo processed by Gemini
-- ---------------------------------------------------------------------------
create table if not exists public.extraction_jobs (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  created_by    uuid not null references auth.users (id) on delete cascade,
  image_path    text not null,
  status        text not null default 'pending'
                check (status in ('pending', 'processing', 'completed', 'failed', 'applied')),
  result        jsonb,
  error         text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists extraction_jobs_restaurant_idx
  on public.extraction_jobs (restaurant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- palettes — AI- or manually-created colour themes
-- restaurant_id null  =>  global/system preset available to everyone
-- ---------------------------------------------------------------------------
create table if not exists public.palettes (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants (id) on delete cascade,
  name          text not null,
  colors        jsonb not null,
  source        text not null default 'ai'
                check (source in ('ai', 'manual', 'system')),
  created_at    timestamptz not null default now()
);

create index if not exists palettes_restaurant_idx on public.palettes (restaurant_id);

-- ---------------------------------------------------------------------------
-- scans — anonymous view analytics for the public menu
-- ---------------------------------------------------------------------------
create table if not exists public.scans (
  id            bigint generated always as identity primary key,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  scanned_at    timestamptz not null default now(),
  user_agent    text,
  referrer      text,
  country       text
);

create index if not exists scans_restaurant_time_idx
  on public.scans (restaurant_id, scanned_at desc);

-- ---------------------------------------------------------------------------
-- subscriptions — intentionally inert today, ready for Stripe/Paddle later
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  restaurant_id            uuid not null unique
                           references public.restaurants (id) on delete cascade,
  plan                     text not null default 'free'
                           check (plan in ('free', 'pro', 'business')),
  status                   text not null default 'active'
                           check (status in ('active', 'trialing', 'past_due', 'canceled')),
  provider                 text,
  provider_customer_id     text,
  provider_subscription_id text,
  current_period_end       timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- ============================================================================
-- Helper functions
-- ============================================================================

-- Updated-at bookkeeping
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'restaurants', 'menu_categories', 'menu_items', 'subscriptions'
  ]
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at before update on public.%I
         for each row execute function public.touch_updated_at();',
      t, t
    );
  end loop;
end $$;

-- Create a profile for every new auth user. The very first user bootstraps
-- as super_admin; everyone after them is a restaurant owner.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_first_user boolean;
begin
  select not exists (select 1 from public.profiles) into is_first_user;

  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    case when is_first_user then 'super_admin' else 'owner' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Authorization helper. Returns whether the *current* user is a super admin.
-- SECURITY DEFINER is required so the lookup is not filtered by profiles RLS,
-- but it exposes nothing beyond a boolean about the caller, so it is safe.
create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'super_admin'
       from public.profiles p
      where p.id = (select auth.uid())),
    false
  );
$$;

revoke execute on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- Check whether a slug can be claimed (used by the app for instant feedback).
create or replace function public.slug_available(candidate text)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select not exists (select 1 from public.slugs s where s.slug = lower(candidate));
$$;

grant execute on function public.slug_available(text) to authenticated, anon;

-- Is this restaurant's menu publicly visible?
--
-- Anonymous visitors must never hold SELECT on public.restaurants (it exposes
-- owner_id), but several RLS policies need to know whether a restaurant is
-- active. SECURITY DEFINER lets those policies ask the question without the
-- caller needing table access — and without RLS recursing back on itself.
-- It leaks exactly one bit about a restaurant the caller already has an id for.
create or replace function public.is_restaurant_public(p_restaurant_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.restaurants r
     where r.id = p_restaurant_id and r.is_active
  );
$$;

grant execute on function public.is_restaurant_public(uuid) to authenticated, anon;

-- Resolve ANY slug (current or historical) to the restaurant's current slug.
-- The QR entry point and the old-link redirect both need this, and neither
-- should be able to enumerate the whole slug history — so we answer exactly
-- the question asked instead of exposing the table.
create or replace function public.resolve_slug(p_slug text)
returns table (restaurant_id uuid, current_slug text, is_current boolean)
language sql
security definer
stable
set search_path = ''
as $$
  select s.restaurant_id, cur.slug, s.is_current
    from public.slugs s
    join public.slugs cur
      on cur.restaurant_id = s.restaurant_id and cur.is_current
   where s.slug = lower(p_slug)
   limit 1;
$$;

grant execute on function public.resolve_slug(text) to anon, authenticated;

-- The permanent QR target: restaurant UUID -> its current slug.
create or replace function public.current_slug(p_restaurant_id uuid)
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select s.slug
    from public.slugs s
   where s.restaurant_id = p_restaurant_id and s.is_current
   limit 1;
$$;

grant execute on function public.current_slug(uuid) to anon, authenticated;

-- Atomically switch a restaurant's current slug, preserving the old one in
-- slug_history so previously printed QR codes and shared links keep working.
create or replace function public.set_restaurant_slug(
  p_restaurant_id uuid,
  p_new_slug      text
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_new  text := lower(trim(p_new_slug));
  v_old  text;
begin
  if v_new !~ '^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])?$' then
    raise exception 'INVALID_SLUG' using message = 'صيغة الرابط غير صحيحة';
  end if;

  -- RLS on restaurants enforces ownership; this also verifies existence.
  if not exists (
    select 1 from public.restaurants r where r.id = p_restaurant_id
  ) then
    raise exception 'NOT_FOUND' using message = 'المطعم غير موجود';
  end if;

  select s.slug into v_old
    from public.slugs s
   where s.restaurant_id = p_restaurant_id and s.is_current;

  if v_old = v_new then
    return v_new;
  end if;

  if exists (select 1 from public.slugs s where s.slug = v_new) then
    raise exception 'SLUG_TAKEN' using message = 'هذا الرابط مستخدم بالفعل';
  end if;

  update public.slugs
     set is_current = false
   where restaurant_id = p_restaurant_id and is_current;

  insert into public.slugs (slug, restaurant_id, is_current)
  values (v_new, p_restaurant_id, true);

  return v_new;
end;
$$;

grant execute on function public.set_restaurant_slug(uuid, text) to authenticated;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles         enable row level security;
alter table public.restaurants      enable row level security;
alter table public.slugs            enable row level security;
alter table public.menu_categories  enable row level security;
alter table public.menu_items       enable row level security;
alter table public.extraction_jobs  enable row level security;
alter table public.palettes         enable row level security;
alter table public.scans            enable row level security;
alter table public.subscriptions    enable row level security;

-- --- profiles ---------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id or (select public.is_super_admin()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Privilege escalation guard.
-- A table-wide UPDATE grant is additive with column grants, so a column-level
-- REVOKE would NOT stop a user from promoting themselves to super_admin. The
-- only reliable fix is to never grant table-wide UPDATE in the first place:
-- grant UPDATE on the safe columns only. `role` therefore stays unwritable by
-- any client, and can only change via the service role or direct SQL.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url) on public.profiles to authenticated;

-- --- restaurants ------------------------------------------------------------
-- No anonymous policy: the raw table exposes owner_id, so visitors read the
-- shop window through public_restaurants (a security-definer view) instead.
drop policy if exists "restaurants_select_public" on public.restaurants;
drop policy if exists "restaurants_select_own" on public.restaurants;
create policy "restaurants_select_own" on public.restaurants
  for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_super_admin()));

drop policy if exists "restaurants_insert_own" on public.restaurants;
create policy "restaurants_insert_own" on public.restaurants
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "restaurants_update_own" on public.restaurants;
create policy "restaurants_update_own" on public.restaurants
  for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_super_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_super_admin()));

drop policy if exists "restaurants_delete_own" on public.restaurants;
create policy "restaurants_delete_own" on public.restaurants
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_super_admin()));

-- --- slugs ------------------------------------------------------------------
-- Slug lookup for visitors goes through resolve_slug()/current_slug(), which
-- answer one precise question each. The table itself stays private so nobody
-- can enumerate every slug a restaurant has ever used.
drop policy if exists "slugs_select_own" on public.slugs;
create policy "slugs_select_own" on public.slugs
  for select to authenticated
  using (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id
         and (r.owner_id = (select auth.uid()) or (select public.is_super_admin()))
    )
  );

drop policy if exists "slugs_insert_own" on public.slugs;
create policy "slugs_insert_own" on public.slugs
  for insert to authenticated
  with check (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id and r.owner_id = (select auth.uid())
    )
  );

drop policy if exists "slugs_update_own" on public.slugs;
create policy "slugs_update_own" on public.slugs
  for update to authenticated
  using (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id and r.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id and r.owner_id = (select auth.uid())
    )
  );

drop policy if exists "slugs_delete_own" on public.slugs;
create policy "slugs_delete_own" on public.slugs
  for delete to authenticated
  using (is_current = false and exists (
    select 1 from public.restaurants r
     where r.id = restaurant_id and r.owner_id = (select auth.uid())
  ));

-- --- menu_categories --------------------------------------------------------
drop policy if exists "categories_select_public" on public.menu_categories;
create policy "categories_select_public" on public.menu_categories
  for select to anon, authenticated
  using (
    is_visible = true
    and (select public.is_restaurant_public(restaurant_id))
  );

drop policy if exists "categories_all_own" on public.menu_categories;
create policy "categories_all_own" on public.menu_categories
  for all to authenticated
  using (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id
         and (r.owner_id = (select auth.uid()) or (select public.is_super_admin()))
    )
  )
  with check (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id
         and (r.owner_id = (select auth.uid()) or (select public.is_super_admin()))
    )
  );

-- --- menu_items -------------------------------------------------------------
drop policy if exists "items_select_public" on public.menu_items;
create policy "items_select_public" on public.menu_items
  for select to anon, authenticated
  using (
    is_visible = true
    and (select public.is_restaurant_public(restaurant_id))
  );

drop policy if exists "items_all_own" on public.menu_items;
create policy "items_all_own" on public.menu_items
  for all to authenticated
  using (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id
         and (r.owner_id = (select auth.uid()) or (select public.is_super_admin()))
    )
  )
  with check (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id
         and (r.owner_id = (select auth.uid()) or (select public.is_super_admin()))
    )
  );

-- --- extraction_jobs --------------------------------------------------------
drop policy if exists "extraction_jobs_all_own" on public.extraction_jobs;
create policy "extraction_jobs_all_own" on public.extraction_jobs
  for all to authenticated
  using (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id
         and (r.owner_id = (select auth.uid()) or (select public.is_super_admin()))
    )
  )
  with check (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id
         and (r.owner_id = (select auth.uid()) or (select public.is_super_admin()))
    )
  );

-- --- palettes ---------------------------------------------------------------
-- --- palettes ---------------------------------------------------------------
-- Dashboard-only surface. System presets ship in code (src/lib/theme.ts), so
-- visitors never need to read this table.
drop policy if exists "palettes_select" on public.palettes;
create policy "palettes_select" on public.palettes
  for select to authenticated
  using (
    restaurant_id is null
    or exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id
         and (r.owner_id = (select auth.uid()) or (select public.is_super_admin()))
    )
  );

drop policy if exists "palettes_insert_own" on public.palettes;
create policy "palettes_insert_own" on public.palettes
  for insert to authenticated
  with check (
    restaurant_id is not null
    and exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id and r.owner_id = (select auth.uid())
    )
  );

drop policy if exists "palettes_delete_own" on public.palettes;
create policy "palettes_delete_own" on public.palettes
  for delete to authenticated
  using (
    restaurant_id is not null
    and exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id and r.owner_id = (select auth.uid())
    )
  );

-- --- scans ------------------------------------------------------------------
-- Anyone may record a scan for an active restaurant; only owners may read.
drop policy if exists "scans_insert_public" on public.scans;
create policy "scans_insert_public" on public.scans
  for insert to anon, authenticated
  with check ((select public.is_restaurant_public(restaurant_id)));

drop policy if exists "scans_select_own" on public.scans;
create policy "scans_select_own" on public.scans
  for select to authenticated
  using (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id
         and (r.owner_id = (select auth.uid()) or (select public.is_super_admin()))
    )
  );

-- --- subscriptions ----------------------------------------------------------
drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
  for select to authenticated
  using (
    exists (
      select 1 from public.restaurants r
       where r.id = restaurant_id
         and (r.owner_id = (select auth.uid()) or (select public.is_super_admin()))
    )
  );

-- ============================================================================
-- Public read model — bypasses RLS safely via security_invoker = false.
-- Only ever exposes shop-window columns for active restaurants.
-- ============================================================================
create or replace view public.public_restaurants
with (security_invoker = off)
as
  select
    r.id,
    r.name,
    r.description,
    r.logo_url,
    r.cover_url,
    r.phone,
    r.whatsapp,
    r.address,
    r.currency,
    r.theme,
    r.created_at,
    s.slug
  from public.restaurants r
  join public.slugs s
    on s.restaurant_id = r.id and s.is_current
  where r.is_active = true;

grant select on public.public_restaurants to anon, authenticated;

-- ============================================================================
-- Storage buckets
-- ============================================================================
insert into storage.buckets (id, name, public)
values
  ('restaurant-assets', 'restaurant-assets', true),
  ('menu-uploads', 'menu-uploads', false)
on conflict (id) do nothing;

-- Public assets: anyone reads, owners write inside their own folder.
drop policy if exists "restaurant_assets_read" on storage.objects;
create policy "restaurant_assets_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'restaurant-assets');

drop policy if exists "restaurant_assets_write" on storage.objects;
create policy "restaurant_assets_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'restaurant-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "restaurant_assets_update" on storage.objects;
create policy "restaurant_assets_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'restaurant-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'restaurant-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "restaurant_assets_delete" on storage.objects;
create policy "restaurant_assets_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'restaurant-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Private menu uploads: owner-only, path is `<user_id>/<file>`.
drop policy if exists "menu_uploads_read" on storage.objects;
create policy "menu_uploads_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'menu-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "menu_uploads_write" on storage.objects;
create policy "menu_uploads_write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'menu-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "menu_uploads_delete" on storage.objects;
create policy "menu_uploads_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'menu-uploads'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
-- ============================================================================
-- Explicit Data API grants.
-- RLS controls *which rows* are reachable; grants control whether the table is
-- reachable at all. Newly created tables are not always auto-exposed, so we
-- state the intended surface explicitly.
-- ============================================================================
grant usage on schema public to anon, authenticated;

-- Public menu surface: read-only for visitors.
grant select on public.public_restaurants to anon, authenticated;
grant select on public.menu_categories to anon, authenticated;
grant select on public.menu_items to anon, authenticated;

-- Owners manage their own data (RLS still applies on top of these grants).
-- public.restaurants is authenticated-only: visitors use public_restaurants.
grant select, insert, update, delete on public.restaurants to authenticated;
grant select, insert, update, delete on public.slugs to authenticated;
grant select, insert, update, delete on public.menu_categories to authenticated;
grant select, insert, update, delete on public.menu_items to authenticated;
grant select, insert, update, delete on public.extraction_jobs to authenticated;
grant select, insert, delete on public.palettes to authenticated;
grant select on public.subscriptions to authenticated;

-- Anyone may record a scan; only owners may read it back.
grant insert on public.scans to anon, authenticated;
grant select on public.scans to authenticated;

-- NOTE: public.profiles is deliberately absent from this block. Its grants are
-- declared next to its policies above, where UPDATE is restricted to the
-- non-privileged columns (full_name, avatar_url) so `role` cannot be escalated.
grant select on public.profiles to authenticated;
