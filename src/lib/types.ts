export interface Booth {
  id: string;
  slug: string;
  company_name: string;
  tagline: string | null;
  description: string;
  category: string;
  zone: string | null;
  booth_code: string | null;
  position_x: number | null;
  position_y: number | null;
  logo_url: string | null;
  website_url: string | null;
  meet_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/** Keep in sync with worker/lib/validation.ts CATEGORIES. */
export const CATEGORIES = [
  "AI & Data",
  "Fintech",
  "Healthtech",
  "SaaS",
  "Hardware",
  "Marketing",
  "Developer Tools",
  "Other",
] as const;

export const ZONES = ["North Hall", "South Hall", "Startup Alley"] as const;
