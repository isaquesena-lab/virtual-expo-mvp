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

/** Columns safe to expose on public endpoints (never owner_email / edit_token_hash). */
const PUBLIC_COLUMNS = `
  id, slug, company_name, tagline, description, category, zone, booth_code,
  position_x, position_y, logo_url, website_url, meet_url, status,
  created_at, updated_at
`;

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

  const sql = `SELECT ${PUBLIC_COLUMNS} FROM booths WHERE ${where.join(" AND ")} ORDER BY company_name COLLATE NOCASE ASC`;
  const { results } = await c.env.DB.prepare(sql).bind(...binds).all();
  return json({ booths: results });
});

// Public client config (no secrets). The Turnstile site key is public by design.
app.get("/api/config", (c) =>
  json({ turnstile_site_key: c.env.TURNSTILE_SITE_KEY || null }),
);

// Which stand slots are already taken (held by a non-rejected booth).
// Returns codes only — no company or contact data.
app.get("/api/stands", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT booth_code FROM booths WHERE booth_code IS NOT NULL AND status <> 'rejected'",
  ).all<{ booth_code: string }>();
  const taken = results.map((r) => r.booth_code);
  return json({ taken });
});

// Single approved booth by slug.
app.get("/api/booths/:slug", async (c) => {
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

  // Reject early if the slot is already held by a non-rejected booth.
  const taken = await c.env.DB.prepare(
    "SELECT 1 FROM booths WHERE booth_code = ? AND status <> 'rejected' LIMIT 1",
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
  const status = c.req.query("status")?.trim();
  const sql = status
    ? "SELECT * FROM booths WHERE status = ? ORDER BY created_at DESC"
    : "SELECT * FROM booths ORDER BY created_at DESC";
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

  const booth = await c.env.DB.prepare("SELECT * FROM booths WHERE id = ?")
    .bind(id)
    .first();
  return json({ booth });
});

app.route("/api/admin", admin);

// Any other /api/* route.
app.all("/api/*", (c) => json({ error: "Not found" }, 404));

export default app;
