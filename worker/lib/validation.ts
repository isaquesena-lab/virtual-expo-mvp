import { z } from "zod";
import { isCountryCode } from "../../shared/countries";

/** Allowed booth categories. Keep in sync with src/lib/types.ts. */
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

/** An https URL, trimmed, with a sane length bound. */
const httpsUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine((u) => u.startsWith("https://"), { message: "URL must use https" });

const optionalHttpsUrl = z
  .union([httpsUrl, z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

/** Allowed hosts for the exhibitor meeting link. Keep narrow to prevent phishing links. */
export const MEET_HOSTS = ["meet.google.com"];

/** An https URL whose host is an allowlisted meeting provider. */
const meetUrl = httpsUrl.refine(
  (u) => {
    try {
      return MEET_HOSTS.includes(new URL(u).hostname.toLowerCase());
    } catch {
      return false;
    }
  },
  { message: `Meeting URL must be a Google Meet link (${MEET_HOSTS.join(", ")})` },
);

/** Optional city (free text) and country (ISO 3166-1 alpha-2 code). Empty string clears the value. */
const optionalCity = z.string().trim().max(80).optional().transform((v) => v || undefined);
const optionalCountry = z
  .union([z.literal(""), z.string().trim().toUpperCase().refine(isCountryCode, { message: "Unknown country" })])
  .optional()
  .transform((v) => v || undefined);

/** Public submission payload (POST /api/booths). */
export const createBoothSchema = z.object({
  company_name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).optional().transform((v) => v || undefined),
  description: z.string().trim().min(20).max(2000),
  category: z.enum(CATEGORIES),
  // Chosen stand slot. The server resolves zone + map position from this code;
  // the client never sends coordinates directly.
  booth_code: z.string().trim().min(1).max(40),
  city: optionalCity,
  country: optionalCountry,
  website_url: optionalHttpsUrl,
  logo_url: optionalHttpsUrl,
  meet_url: meetUrl,
  owner_email: z.string().trim().email().max(254),
  // Anti-bot token from the client widget; verified server-side when configured.
  turnstile_token: z.string().optional(),
});
export type CreateBoothInput = z.infer<typeof createBoothSchema>;

/** Fields an owner may change with their edit token (PATCH /api/booths/:id). */
export const editBoothSchema = z
  .object({
    company_name: z.string().trim().min(2).max(120),
    tagline: z.string().trim().max(160).optional().transform((v) => v || undefined),
    description: z.string().trim().min(20).max(2000),
    category: z.enum(CATEGORIES),
    city: optionalCity,
    country: optionalCountry,
    website_url: optionalHttpsUrl,
    logo_url: optionalHttpsUrl,
    meet_url: meetUrl,
  })
  .partial();
export type EditBoothInput = z.infer<typeof editBoothSchema>;

/**
 * Moderator actions (PATCH /api/admin/booths/:id). `booth_code` assigns a stand by
 * code (zone + map coordinates are derived server-side from the floor plan); null
 * un-places the booth. Arbitrary zones/coordinates are not accepted.
 */
export const adminUpdateSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected", "hidden"]).optional(),
    booth_code: z.string().trim().max(40).nullish(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });
export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;
