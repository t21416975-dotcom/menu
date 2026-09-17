export type UserRole = "super_admin" | "owner";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type RestaurantTheme = {
  paletteId?: string | null;
  primary?: string;
  accent?: string;
  background?: string;
  foreground?: string;
  muted?: string;
  mode?: "light" | "dark";
  font?: string;
  radius?: number;
};

export type Restaurant = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  currency: string;
  theme: RestaurantTheme;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicRestaurant = {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  currency: string;
  theme: RestaurantTheme;
  created_at: string;
  slug: string;
};

export type MenuCategory = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  is_available: boolean;
  is_visible: boolean;
  tags: string[];
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ExtractionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "applied";

export type ExtractionJob = {
  id: string;
  restaurant_id: string;
  created_by: string;
  image_path: string;
  status: ExtractionStatus;
  result: ExtractedMenu | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export type Palette = {
  id: string;
  restaurant_id: string | null;
  name: string;
  colors: PaletteColors;
  source: "ai" | "manual" | "system";
  created_at: string;
};

export type PaletteColors = {
  primary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  mode: "light" | "dark";
};

export type Subscription = {
  id: string;
  restaurant_id: string;
  plan: "free" | "pro" | "business";
  status: "active" | "trialing" | "past_due" | "canceled";
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
};

export type ExtractedMenuItem = {
  name: string;
  description: string | null;
  price: number | null;
};

export type ExtractedMenuCategory = {
  name: string;
  items: ExtractedMenuItem[];
};

export type ExtractedMenu = {
  categories: ExtractedMenuCategory[];
};

export type CategoryWithItems = MenuCategory & { items: MenuItem[] };