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
  meeting_type: MeetingType;
  meet_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  /** 1 while the exhibitor is present (heartbeat within the last ~90s). */
  is_live: number;
  /** When a moderator approved the booth (null for legacy/approved-before-migration). */
  approved_at: string | null;
  /** Epoch seconds when an approved booth stops being public (null = no expiry set). */
  expires_at: number | null;
}

export type MeetingType = "google_meet" | "youtube_live";

export const MEETING_TYPE_COPY: Record<MeetingType, { label: string; cta: string; placeholder: string; hint: string }> = {
  google_meet: {
    label: "Google Meet",
    cta: "Join meeting",
    placeholder: "https://meet.google.com/xxx-xxxx-xxx",
    hint: "Use a Google Meet link. It opens in a new tab when visitors join.",
  },
  youtube_live: {
    label: "YouTube Live",
    cta: "Watch live stream",
    placeholder: "https://www.youtube.com/watch?v=...",
    hint: "Use a YouTube Live watch or live link. It opens in a new tab for visitors.",
  },
};

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
