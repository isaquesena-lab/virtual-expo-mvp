export interface Env {
  /** D1 database binding (see wrangler.jsonc). */
  DB: D1Database;
  /** Shared secret for moderator/admin endpoints. Set via `wrangler secret put ADMIN_TOKEN`. */
  ADMIN_TOKEN?: string;
  /** Cloudflare Turnstile secret. When set, public submissions must pass a Turnstile check. */
  TURNSTILE_SECRET?: string;
}
