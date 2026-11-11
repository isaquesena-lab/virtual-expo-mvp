export interface Env {
  /** D1 database binding (see wrangler.jsonc). */
  DB: D1Database;
  /** Shared secret for moderator/admin endpoints. Set via `wrangler secret put ADMIN_TOKEN`. */
  ADMIN_TOKEN?: string;
  /** Cloudflare Turnstile secret. When set, public submissions must pass a Turnstile check. */
  TURNSTILE_SECRET?: string;
  /** Public Turnstile site key (plaintext var). When set, the widget renders on the form. */
  TURNSTILE_SITE_KEY?: string;
  /** Per-IP rate limiter for public booth submissions. */
  SUBMIT_LIMITER: RateLimit;
  /** Per-IP rate limiter for owner mutations (live heartbeat, logo upload). */
  MUTATE_LIMITER: RateLimit;
}
