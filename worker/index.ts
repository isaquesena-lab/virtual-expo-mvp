import { Hono } from "hono";
import type { Env } from "./env";
import {
  adminUpdateSchema,
  createBoothSchema,
  editBoothSchema,
} from "./lib/validation";
import { generateEditToken, hashEditToken, timingSafeEqual } from "./lib/tokens";
import { uniqueSlug } from "./lib/slug";
import { verifyTurnstile } from "./lib/turnstile";
import { STAND_BY_CODE } from "../shared/stands";
import { MAX_LOGO_BYTES, fromBase64, sniffImage, toBase64 } from "./lib/image";
import { expiryFromNow, reapExpired, renewedExpiry } from "./lib/lifecycle";
import { sendMail } from "./lib/mail";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  clearSessionCookie,
  consumeLoginCode,
  createLoginCode,
  createSession,
  resolveSession,
  sessionCookie,
} from "./lib/auth";

/** Columns safe to expose on public endpoints (never owner_email / edit_token_hash). */
const PUBLIC_COLUMNS = `
  id, slug, company_name, tagline, description, category, zone, booth_code,
  position_x, position_y,
  CASE WHEN logo_data IS NOT NULL
       THEN '/api/booths/' || id || '/logo?v=' || COALESCE(strftime('%s', logo_updated_at), '0')
       ELSE logo_url END AS logo_url,
  website_url, meet_url, status,
  created_at, updated_at, approved_at, expires_at,
  CASE WHEN live_until > CAST(strftime('%s', 'now') AS INTEGER) THEN 1 ELSE 0 END AS is_live
`;

/** Seconds a heartbeat keeps a booth live. The owner page pings well inside this window. */
const LIVE_TTL_SECONDS = 90;

const app = new Hono<{ Bindings: Env }>();

const json = (data: unknown, status = 200) =>
  Response.json(data as Record<string, unknown>, {
    status,
    headers: {
      // API responses are per-request and may include private data; never cache.
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });

/* --------------------------------- Public -------------------------------- */

// List approved booths, with optional search / category / zone filters.
app.get("/api/booths", async (c) => {
  const q = c.req.query("q")?.trim();
  const category = c.req.query("category")?.trim();
  const zone = c.req.query("zone")?.trim();
  const liveOnly = c.req.query("live") === "1";
  await reapExpired(c.env.DB);

  const where: string[] = ["status = 'approved'"];
  const binds: unknown[] = [];

  if (q) {
    where.push("(company_name LIKE ?1 OR tagline LIKE ?1 OR description LIKE ?1 OR booth_code LIKE ?1)");
    binds.push(`%${q}%`);
  }
  if (category) {
    binds.push(category);
    where.push(`category = ?${binds.length}`);
  }
  if (zone) {
    binds.push(zone);
    where.push(`zone = ?${binds.length}`);
  }

  if (liveOnly) where.push("live_until > CAST(strftime('%s', 'now') AS INTEGER)");

  // Live booths first, then alphabetical.
  const sql = `SELECT ${PUBLIC_COLUMNS} FROM booths WHERE ${where.join(" AND ")} ORDER BY is_live DESC, company_name COLLATE NOCASE ASC`;
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return json({ booths: results });
});

// Public client config (no secrets). The Turnstile site key is public by design.
app.get("/api/config", (c) => {
  if (c.env.TURNSTILE_SECRET && !c.env.TURNSTILE_SITE_KEY) {
    return json({ error: "Anti-bot verification is not configured correctly" }, 503);
  }
  return json({
    turnstile_site_key: c.env.TURNSTILE_SECRET ? c.env.TURNSTILE_SITE_KEY : null,
  });
});

/* ------------------------- Owner accounts (login) ------------------------- */

// Request a magic login link/code for the owner email of one or more booths.
// Same response whether or not the email exists (no account enumeration).
app.post("/api/auth/login", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? null;
  const { success: underLimit } = await c.env.SUBMIT_LIMITER.limit({ key: `login:${ip ?? "anon"}` });
  if (!underLimit) {
    return json({ error: "Too many sign-in requests. Please wait a minute." }, 429);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const email = String((body as Record<string, unknown>)?.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "Enter a valid email address" }, 422);
  }

  const account = await c.env.DB.prepare("SELECT id FROM accounts WHERE email = ?1")
    .bind(email)
    .first<{ id: string }>();
  if (account) {
    const code = await createLoginCode(c.env.DB, account.id);
    const url = new URL(c.req.url);
    const link = `${url.origin}/login#code=${code}`;
    await sendMail(c.env.MAIL_FROM, {
      to: email,
      subject: "Your WetExpo sign-in link",
      text: `Use this link to manage your WetExpo stands (valid 15 minutes):\n${link}\n\nIf you did not request it, ignore this email.`,
    });
  }
  // Always the same answer so the endpoint cannot reveal which emails exist.
  return json({ message: "If that email manages a booth, a sign-in link is on its way." });
});

// Exchange a magic code for a session cookie.
app.post("/api/auth/session", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const code = String((body as Record<string, unknown>)?.code ?? "").trim();
  if (!code) return json({ error: "Missing code" }, 422);

  const accountId = await consumeLoginCode(c.env.DB, code);
  if (!accountId) return json({ error: "That sign-in link is invalid or has expired" }, 401);

  // First login claims every booth whose owner_email matches the account.
  await c.env.DB.prepare(
    "UPDATE booths SET account_id = ?1 WHERE owner_email = (SELECT email FROM accounts WHERE id = ?1) AND account_id IS NULL",
  )
    .bind(accountId)
    .run();

  const token = await createSession(c.env.DB, accountId);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Set-Cookie": sessionCookie(token, SESSION_DAYS * 86400),
    },
  });
});

// Who am I + which booths does this session manage.
app.get("/api/auth/me", async (c) => {
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (!session) return json({ error: "Not signed in" }, 401);
  await reapExpired(c.env.DB);
  const { results } = await c.env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS} FROM booths WHERE account_id = ?1 ORDER BY company_name COLLATE NOCASE ASC`,
  )
    .bind(session.accountId)
    .all();
  return json({ email: session.email, booths: results });
});

app.post("/api/auth/logout", async (c) => {
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  if (session) {
    await c.env.DB.prepare("DELETE FROM sessions WHERE account_id = ?1").bind(session.accountId).run();
  }
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", "Set-Cookie": clearSessionCookie },
  });
});

// Owner renew: extend an approved booth's expiry (session or edit token).
app.post("/api/booths/:id/renew", async (c) => {
  const id = c.req.param("id");
  const session = await resolveSession(c.env.DB, c.req.header("cookie"));
  let row = await c.env.DB.prepare(
    "SELECT id, account_id, status, expires_at, edit_token_hash FROM booths WHERE id = ?1",
  )
    .bind(id)
    .first<{ id: string; account_id: string | null; status: string; expires_at: number | null; edit_token_hash: string }>();
  if (!row) return json({ error: "Booth not found" }, 404);

  const ownsBySession = !!session && row.account_id === session.accountId;
  if (!ownsBySession) {
    const token = c.req.header("x-edit-token") ?? "";
    if (!token) return json({ error: "Sign in or provide your edit token" }, 401);
    if (!timingSafeEqual(await hashEditToken(token), row.edit_token_hash)) {
      return json({ error: "Invalid edit token" }, 403);
    }
  }
  if (row.status !== "approved") {
    return json({ error: "Only approved booths can be renewed" }, 409);
  }

  const expiresAt = renewedExpiry(row.expires_at);
  await c.env.DB.prepare("UPDATE booths SET expires_at = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = ?2")
    .bind(expiresAt, id)
    .run();
  row = await c.env.DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM booths WHERE id = ?1`).bind(id).first();
  return json({ booth: row });
});

// Which stand slots are already taken (held by a non-rejected, non-expired booth).
// Returns codes only — no company or contact data.
app.get("/api/stands", async (c) => {
  await reapExpired(c.env.DB);
  const { results } = await c.env.DB.prepare(
    "SELECT booth_code FROM booths WHERE booth_code IS NOT NULL AND status NOT IN ('rejected', 'expired')",
  ).all<{ booth_code: string }>();
  const taken = results.map((r) => r.booth_code);
  return json({ taken });
});

// Single approved booth by slug.
app.get("/api/booths/:slug", async (c) => {
  await reapExpired(c.env.DB);
  const slug = c.req.param("slug");
  const booth = await c.env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS} FROM booths WHERE slug = ? AND status = 'approved'`,
  )
    .bind(slug)
    .first();
  if (!booth) return json({ error: "Booth not found" }, 404);
  return json({ booth });
});

// Public submission — stored as 'pending' until a moderator approves it.
app.post("/api/booths", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? null;

  // Per-IP rate limit (anti-spam / slot squatting).
  const { success: underLimit } = await c.env.SUBMIT_LIMITER.limit({ key: `submit:${ip ?? "anon"}` });
  if (!underLimit) {
    return json({ error: "Too many submissions from your network. Please wait a minute and try again." }, 429);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = createBoothSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Validation failed", issues: parsed.error.flatten() }, 422);
  }
  const data = parsed.data;

  const human = await verifyTurnstile(c.env.TURNSTILE_SECRET, data.turnstile_token, ip);
  if (!human) return json({ error: "Anti-bot verification failed" }, 403);

  // Resolve the chosen stand from the authoritative floor plan.
  const stand = STAND_BY_CODE.get(data.booth_code);
  if (!stand) return json({ error: "Unknown stand slot" }, 422);

  // Reject early if the slot is already held by a non-rejected, non-expired booth.
  const taken = await c.env.DB.prepare(
    "SELECT 1 FROM booths WHERE booth_code = ? AND status NOT IN ('rejected', 'expired') LIMIT 1",
  )
    .bind(stand.code)
    .first();
  if (taken) {
    return json({ error: `Stand ${stand.code} is already taken. Please choose another.`, code: "slot_taken" }, 409);
  }

  const id = crypto.randomUUID();
  const slug = uniqueSlug(data.company_name);
  const editToken = generateEditToken();
  const editTokenHash = await hashEditToken(editToken);

  try {
    await c.env.DB.prepare(
      `INSERT INTO booths
         (id, slug, company_name, tagline, description, category,
          zone, booth_code, position_x, position_y,
          logo_url, website_url, meet_url, owner_email, edit_token_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    )
      .bind(
        id,
        slug,
        data.company_name,
        data.tagline ?? null,
        data.description,
        data.category,
        stand.zone,
        stand.code,
        stand.x,
        stand.y,
        data.logo_url ?? null,
        data.website_url ?? null,
        data.meet_url,
        data.owner_email,
        editTokenHash,
      )
      .run();
  } catch (err) {
    // Unique index race: another submission took the slot first.
    if (String(err).includes("UNIQUE")) {
      return json({ error: `Stand ${stand.code} was just taken. Please choose another.`, code: "slot_taken" }, 409);
    }
    throw err;
  }

  const url = new URL(c.req.url);
  return json(
    {
      id,
      slug,
      status: "pending",
      edit_token: editToken,
      edit_url: `${url.origin}/edit/${id}#token=${editToken}`,
      message:
        "Submission received. Your booth is pending moderator approval. Save your edit link — it is shown only once.",
    },
    201,
  );
});

// Owner view of their own booth (any status) using the capability token.
app.get("/api/booths/:id/manage", async (c) => {
  await reapExpired(c.env.DB);
  const id = c.req.param("id");
  const token = c.req.header("x-edit-token") ?? "";
  if (!token) return json({ error: "Missing edit token" }, 401);

  const row = await c.env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS}, owner_email, edit_token_hash FROM booths WHERE id = ?`,
  )
    .bind(id)
    .first<Record<string, unknown> & { edit_token_hash: string }>();
  if (!row) return json({ error: "Booth not found" }, 404);

  const provided = await hashEditToken(token);
  if (!timingSafeEqual(provided, row.edit_token_hash)) {
    return json({ error: "Invalid edit token" }, 403);
  }
  const { edit_token_hash: _omit, ...booth } = row;
  return json({ booth });
});

// Owner edit using the capability token (header `x-edit-token`).
app.patch("/api/booths/:id", async (c) => {
  const id = c.req.param("id");
  const token = c.req.header("x-edit-token") ?? "";
  if (!token) return json({ error: "Missing edit token" }, 401);

  const row = await c.env.DB.prepare(
    "SELECT edit_token_hash FROM booths WHERE id = ?",
  )
    .bind(id)
    .first<{ edit_token_hash: string }>();
  if (!row) return json({ error: "Booth not found" }, 404);

  const provided = await hashEditToken(token);
  if (!timingSafeEqual(provided, row.edit_token_hash)) {
    return json({ error: "Invalid edit token" }, 403);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = editBoothSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Validation failed", issues: parsed.error.flatten() }, 422);
  }

  const fields = parsed.data;
  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const [key, value] of Object.entries(fields)) {
    binds.push(value ?? null);
    sets.push(`${key} = ?${binds.length}`);
  }
  if (sets.length === 0) return json({ error: "No fields to update" }, 422);
  sets.push("updated_at = CURRENT_TIMESTAMP");

  binds.push(id);
  await c.env.DB.prepare(
    `UPDATE booths SET ${sets.join(", ")} WHERE id = ?${binds.length}`,
  )
    .bind(...binds)
    .run();

  const booth = await c.env.DB.prepare(
    `SELECT ${PUBLIC_COLUMNS} FROM booths WHERE id = ?`,
  )
    .bind(id)
    .first();
  return json({ booth });
});

/* ---------------------------------- Logo ---------------------------------- */

/** Returns an error Response if the edit token is missing/invalid for this booth, else null. */
async function checkOwner(c: { env: Env; req: { header: (n: string) => string | undefined } }, id: string): Promise<Response | null> {
  const token = c.req.header("x-edit-token") ?? "";
  if (!token) return json({ error: "Missing edit token" }, 401);
  const row = await c.env.DB.prepare("SELECT edit_token_hash FROM booths WHERE id = ?")
    .bind(id)
    .first<{ edit_token_hash: string }>();
  if (!row) return json({ error: "Booth not found" }, 404);
  if (!timingSafeEqual(await hashEditToken(token), row.edit_token_hash)) {
    return json({ error: "Invalid edit token" }, 403);
  }
  return null;
}

// Serve an uploaded logo. Public for approved booths; owner/moderator only otherwise.
app.get("/api/booths/:id/logo", async (c) => {
  const id = c.req.param("id");
  const row = await c.env.DB.prepare("SELECT logo_data, logo_type, status FROM booths WHERE id = ?")
    .bind(id)
    .first<{ logo_data: string | null; logo_type: string | null; status: string }>();
  if (!row || !row.logo_data || !row.logo_type) return new Response("Not found", { status: 404 });

  const isPublic = row.status === "approved";
  if (!isPublic) {
    const adminToken = c.req.header("x-admin-token") ?? "";
    const expected = c.env.ADMIN_TOKEN;
    const isAdmin = !!expected && adminToken.length === expected.length && timingSafeEqual(adminToken, expected);
    if (!isAdmin && (await checkOwner(c, id))) return new Response("Not found", { status: 404 });
  }
  return new Response(fromBase64(row.logo_data), {
    headers: {
      "Content-Type": row.logo_type,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
      // URL carries ?v=<updated_at>, so a long cache is safe for public logos.
      "Cache-Control": isPublic ? "public, max-age=86400" : "private, no-store",
    },
  });
});

// Upload/replace the logo (raw image bytes in the body). Owner only.
app.put("/api/booths/:id/logo", async (c) => {
  const id = c.req.param("id");
  const denied = await checkOwner(c, id);
  if (denied) return denied;

  const declared = Number(c.req.header("content-length") ?? "0");
  if (declared > MAX_LOGO_BYTES) return json({ error: "Image is too large (max 512 KB)" }, 413);
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.length === 0) return json({ error: "Empty upload" }, 400);
  if (bytes.length > MAX_LOGO_BYTES) return json({ error: "Image is too large (max 512 KB)" }, 413);
  const type = sniffImage(bytes);
  if (!type) return json({ error: "Unsupported image. Use PNG, JPEG or WebP." }, 415);

  await c.env.DB.prepare(
    "UPDATE booths SET logo_data = ?1, logo_type = ?2, logo_updated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?3",
  )
    .bind(toBase64(bytes), type, id)
    .run();
  const booth = await c.env.DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM booths WHERE id = ?`).bind(id).first();
  return json({ booth });
});

// Remove the uploaded logo (and any external logo URL). Owner only.
app.delete("/api/booths/:id/logo", async (c) => {
  const id = c.req.param("id");
  const denied = await checkOwner(c, id);
  if (denied) return denied;
  await c.env.DB.prepare(
    "UPDATE booths SET logo_data = NULL, logo_type = NULL, logo_updated_at = NULL, logo_url = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  )
    .bind(id)
    .run();
  const booth = await c.env.DB.prepare(`SELECT ${PUBLIC_COLUMNS} FROM booths WHERE id = ?`).bind(id).first();
  return json({ booth });
});

// Live presence heartbeat. Requires the owner token; only approved booths can go live.
app.post("/api/booths/:id/live", async (c) => {
  const id = c.req.param("id");
  const token = c.req.header("x-edit-token") ?? "";
  if (!token) return json({ error: "Missing edit token" }, 401);
  const row = await c.env.DB.prepare("SELECT edit_token_hash, status FROM booths WHERE id = ?")
    .bind(id)
    .first<{ edit_token_hash: string; status: string }>();
  if (!row) return json({ error: "Booth not found" }, 404);
  if (!timingSafeEqual(await hashEditToken(token), row.edit_token_hash)) {
    return json({ error: "Invalid edit token" }, 403);
  }
  if (row.status !== "approved") {
    return json({ error: "Only approved booths can go live" }, 409);
  }
  await c.env.DB.prepare(
    "UPDATE booths SET live_until = CAST(strftime('%s', 'now') AS INTEGER) + ?1 WHERE id = ?2",
  )
    .bind(LIVE_TTL_SECONDS, id)
    .run();
  return json({ live: true, ttl: LIVE_TTL_SECONDS });
});

// Go offline immediately.
app.delete("/api/booths/:id/live", async (c) => {
  const id = c.req.param("id");
  const token = c.req.header("x-edit-token") ?? "";
  if (!token) return json({ error: "Missing edit token" }, 401);
  const row = await c.env.DB.prepare("SELECT edit_token_hash FROM booths WHERE id = ?")
    .bind(id)
    .first<{ edit_token_hash: string }>();
  if (!row) return json({ error: "Booth not found" }, 404);
  if (!timingSafeEqual(await hashEditToken(token), row.edit_token_hash)) {
    return json({ error: "Invalid edit token" }, 403);
  }
  await c.env.DB.prepare("UPDATE booths SET live_until = NULL WHERE id = ?").bind(id).run();
  return json({ live: false });
});

/* --------------------------------- Admin --------------------------------- */

const admin = new Hono<{ Bindings: Env }>();

// Simple shared-secret guard. Replace with real auth before scaling moderators.
admin.use("*", async (c, next) => {
  // Trim to tolerate a stray trailing newline/whitespace in the stored secret
  // (common when the secret is piped from a file on Windows).
  const expected = (c.env.ADMIN_TOKEN ?? "").trim();
  if (!expected) return json({ error: "Moderation is not configured (ADMIN_TOKEN unset)" }, 503);
  const given = (c.req.header("x-admin-token") ?? "").trim();
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return json({ error: "Unauthorized" }, 401);
  }
  await next();
});

// Review queue — includes owner_email for verification. Filter by ?status=.
admin.get("/booths", async (c) => {
  await reapExpired(c.env.DB);
  const status = c.req.query("status")?.trim();
  const sql = status
    ? `SELECT ${PUBLIC_COLUMNS}, owner_email FROM booths WHERE status = ? ORDER BY created_at DESC`
    : `SELECT ${PUBLIC_COLUMNS}, owner_email FROM booths ORDER BY created_at DESC`;
  const stmt = status ? c.env.DB.prepare(sql).bind(status) : c.env.DB.prepare(sql);
  const { results } = await stmt.all();
  return json({ booths: results });
});

// Approve / reject / hide, and place booths on the map.
admin.patch("/booths/:id", async (c) => {
  const id = c.req.param("id");
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = adminUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: "Validation failed", issues: parsed.error.flatten() }, 422);
  }

  const data = parsed.data;
  const sets: string[] = [];
  const binds: unknown[] = [];

  if (data.status !== undefined) {
    binds.push(data.status);
    sets.push(`status = ?${binds.length}`);
    if (data.status === "approved") {
      // Approving (re)starts the renewal window.
      sets.push("approved_at = CURRENT_TIMESTAMP");
      binds.push(expiryFromNow());
      sets.push(`expires_at = ?${binds.length}`);
    }
  }

  if (data.booth_code !== undefined) {
    if (data.booth_code === null || data.booth_code === "") {
      // Un-place the booth from the map.
      sets.push("booth_code = NULL", "zone = NULL", "position_x = NULL", "position_y = NULL");
    } else {
      const stand = STAND_BY_CODE.get(data.booth_code);
      if (!stand) return json({ error: "Unknown stand slot" }, 422);
      binds.push(stand.code);
      sets.push(`booth_code = ?${binds.length}`);
      binds.push(stand.zone);
      sets.push(`zone = ?${binds.length}`);
      binds.push(stand.x);
      sets.push(`position_x = ?${binds.length}`);
      binds.push(stand.y);
      sets.push(`position_y = ?${binds.length}`);
    }
  }

  if (sets.length === 0) return json({ error: "No fields to update" }, 422);
  sets.push("updated_at = CURRENT_TIMESTAMP");
  binds.push(id);

  let info;
  try {
    info = await c.env.DB.prepare(
      `UPDATE booths SET ${sets.join(", ")} WHERE id = ?${binds.length}`,
    )
      .bind(...binds)
      .run();
  } catch (err) {
    if (String(err).includes("UNIQUE")) {
      return json({ error: "That stand is already taken by another booth.", code: "slot_taken" }, 409);
    }
    throw err;
  }
  if (!info.meta.changes) return json({ error: "Booth not found" }, 404);

  const booth = await c.env.DB.prepare(`SELECT ${PUBLIC_COLUMNS}, owner_email FROM booths WHERE id = ?`)
    .bind(id)
    .first();
  return json({ booth });
});

app.route("/api/admin", admin);

// Any other /api/* route.
app.all("/api/*", (c) => json({ error: "Not found" }, 404));

export default app;
