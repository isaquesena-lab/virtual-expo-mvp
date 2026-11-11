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

export const MEETING_TYPES = ["google_meet", "youtube_live"] as const;
const googleMeetUrl = httpsUrl.refine(
  (u) => new URL(u).hostname.toLowerCase() === "meet.google.com",
  { message: "Meeting URL must be a Google Meet link (meet.google.com)" },
);

const youtubeLiveUrl = httpsUrl.refine(
  (u) => {
    const url = new URL(u);
    const host = url.hostname.toLowerCase();
    if (host === "youtu.be") return url.pathname.length > 1;
    if (!["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)) return false;
    return (url.pathname === "/watch" && Boolean(url.searchParams.get("v"))) || url.pathname.startsWith("/live/");
  },
  { message: "Stream URL must be a YouTube Live watch or live link" },
);

const meetingFields = {
  meeting_type: z.enum(MEETING_TYPES).default("google_meet"),
  meet_url: httpsUrl,
};

function validateMeetingLink(data: { meeting_type?: (typeof MEETING_TYPES)[number]; meet_url?: string }, ctx: z.RefinementCtx) {
  if (data.meeting_type && !data.meet_url) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["meet_url"], message: "A meeting link is required when changing its type" });
    return;
  }
  if (!data.meet_url) return;
  const result = (data.meeting_type ?? "google_meet") === "youtube_live"
    ? youtubeLiveUrl.safeParse(data.meet_url)
    : googleMeetUrl.safeParse(data.meet_url);
  if (!result.success) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["meet_url"], message: result.error.issues[0]?.message ?? "Invalid meeting link" });
  }
}

/** Public submission payload (POST /api/booths). */
export const createBoothSchema = z.object({
  company_name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).optional().transform((v) => v || undefined),
  description: z.string().trim().min(20).max(2000),
  category: z.enum(CATEGORIES),
  // Chosen stand slot. The server resolves zone + map position from this code;
  // the client never sends coordinates directly.
  booth_code: z.string().trim().min(1).max(40),
  website_url: optionalHttpsUrl,
  logo_url: optionalHttpsUrl,
  ...meetingFields,
  owner_email: z.string().trim().email().max(254),
  // Anti-bot token from the client widget; verified server-side when configured.
  turnstile_token: z.string().optional(),
}).superRefine(validateMeetingLink);
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
    meeting_type: z.enum(MEETING_TYPES).optional(),
    meet_url: httpsUrl.optional(),
  })
  .partial()
  .superRefine(validateMeetingLink);
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
