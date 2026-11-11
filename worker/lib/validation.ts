import { z } from "zod";

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

/** Public submission payload (POST /api/booths). */
export const createBoothSchema = z.object({
  company_name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).optional().transform((v) => v || undefined),
  description: z.string().trim().min(20).max(2000),
  category: z.enum(CATEGORIES),
  website_url: optionalHttpsUrl,
  logo_url: optionalHttpsUrl,
  meet_url: httpsUrl,
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
    website_url: optionalHttpsUrl,
    logo_url: optionalHttpsUrl,
    meet_url: httpsUrl,
  })
  .partial();
export type EditBoothInput = z.infer<typeof editBoothSchema>;

/** Moderator actions (PATCH /api/admin/booths/:id). */
export const adminUpdateSchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected", "hidden"]).optional(),
    zone: z.string().trim().max(80).nullish(),
    booth_code: z.string().trim().max(40).nullish(),
    position_x: z.number().min(0).max(100).nullish(),
    position_y: z.number().min(0).max(100).nullish(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "No fields to update" });
export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;
