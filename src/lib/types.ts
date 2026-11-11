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
  city: string | null;
  /** ISO 3166-1 alpha-2 code */
  country: string | null;
  logo_url: string | null;
  website_url: string | null;
  meet_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  /** 1 while the exhibitor is present (heartbeat within the last ~90s). */
  is_live: number;
  /** Unix seconds; only returned to the owner (manage endpoint). */
  live_until?: number | null;
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

export { ZONES } from "../../shared/stands";
