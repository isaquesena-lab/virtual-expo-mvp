import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

const requireFromVite = createRequire(import.meta.resolve("vite"));
const { build } = requireFromVite("esbuild");
const bundle = await build({
  entryPoints: [fileURLToPath(new URL("../worker/index.ts", import.meta.url))],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { default: app } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const BOOTH_ID = "booth-1";
const LIVE_TTL_SECONDS = 90;

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const GOOD_TOKEN = "good-token";
const GOOD_HASH = sha256(GOOD_TOKEN);
const WRONG_HASH = sha256("some-other-token");

/** Minimal synthetic PNG: 8-byte magic + IHDR chunk (length, type, 13 data bytes, CRC). */
function pngBytes(extra = 0) {
  const ihdr = new Uint8Array([
    0x00, 0x00, 0x00, 0x0d, // chunk length = 13
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    0x00, 0x00, 0x00, 0x01, // width 1
    0x00, 0x00, 0x00, 0x01, // height 1
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth / color type / etc.
    0x1f, 0x15, 0xc4, 0x89, // CRC
  ]);
  const magic = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const out = new Uint8Array(magic.length + ihdr.length + extra);
  out.set(magic, 0);
  out.set(ihdr, magic.length);
  return out;
}

const PNG = pngBytes();
const PNG_BASE64 = Buffer.from(PNG).toString("base64");

/**
 * Mocked D1 binding. `route(sql, values)` decides what first() resolves to;
 * all() returns `rows`; run() records into `writes`.
 */
function database({ route = () => null, rows = [] } = {}) {
  const writes = [];
  const queries = [];
  return {
    writes,
    queries,
    prepare(sql) {
      queries.push(sql);
      return {
        bind(...values) {
          return {
            async first() { return route(sql, values); },
            async all() { return { results: rows }; },
            async run() { writes.push({ sql, values }); return { success: true }; },
          };
        },
      };
    },
  };
}

const env = (db) => ({ DB: db, SUBMIT_LIMITER: { limit: async () => ({ success: true }) } });

/* ---------------------------------- LIVE ---------------------------------- */

test("POST live: missing edit token is rejected 401 without touching the DB", async () => {
  const db = database({ route: () => { throw new Error("Must not query without a token"); } });
  const response = await app.request(`/api/booths/${BOOTH_ID}/live`, { method: "POST" }, env(db));
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Missing edit token" });
  assert.equal(db.queries.length, 0);
  assert.equal(db.writes.length, 0);
});

test("POST live: wrong edit token is rejected 403 without a heartbeat write", async () => {
  const db = database({ route: () => ({ edit_token_hash: WRONG_HASH, status: "approved" }) });
  const response = await app.request(`/api/booths/${BOOTH_ID}/live`, {
    method: "POST",
    headers: { "x-edit-token": GOOD_TOKEN },
  }, env(db));
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Invalid edit token" });
  assert.equal(db.writes.length, 0);
});

test("POST live: correct token but pending booth is rejected 409", async () => {
  const db = database({ route: () => ({ edit_token_hash: GOOD_HASH, status: "pending" }) });
  const response = await app.request(`/api/booths/${BOOTH_ID}/live`, {
    method: "POST",
    headers: { "x-edit-token": GOOD_TOKEN },
  }, env(db));
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Only approved booths can go live" });
  assert.equal(db.writes.length, 0);
});

test("POST live: correct token + approved booth sets live_until to ~now+90", async () => {
  const db = database({ route: () => ({ edit_token_hash: GOOD_HASH, status: "approved" }) });
  const response = await app.request(`/api/booths/${BOOTH_ID}/live`, {
    method: "POST",
    headers: { "x-edit-token": GOOD_TOKEN },
  }, env(db));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { live: true, ttl: LIVE_TTL_SECONDS });

  assert.equal(db.writes.length, 1);
  const { sql, values } = db.writes[0];
  assert.match(sql, /UPDATE booths SET live_until = CAST\(strftime\('%s', 'now'\) AS INTEGER\) \+ \?1 WHERE id = \?2/);
  assert.deepEqual(values, [LIVE_TTL_SECONDS, BOOTH_ID]);
  // The SQL computes live_until = now + ttl server-side; ttl must be 90 so live_until ~ now+90.
});

test("DELETE live: missing edit token is rejected 401", async () => {
  const db = database({ route: () => { throw new Error("Must not query without a token"); } });
  const response = await app.request(`/api/booths/${BOOTH_ID}/live`, { method: "DELETE" }, env(db));
  assert.equal(response.status, 401);
  assert.equal(db.queries.length, 0);
  assert.equal(db.writes.length, 0);
});

test("DELETE live: wrong edit token is rejected 403 without clearing live_until", async () => {
  const db = database({ route: () => ({ edit_token_hash: WRONG_HASH }) });
  const response = await app.request(`/api/booths/${BOOTH_ID}/live`, {
    method: "DELETE",
    headers: { "x-edit-token": GOOD_TOKEN },
  }, env(db));
  assert.equal(response.status, 403);
  assert.equal(db.writes.length, 0);
});

test("DELETE live: correct token clears live_until", async () => {
  const db = database({ route: () => ({ edit_token_hash: GOOD_HASH }) });
  const response = await app.request(`/api/booths/${BOOTH_ID}/live`, {
    method: "DELETE",
    headers: { "x-edit-token": GOOD_TOKEN },
  }, env(db));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { live: false });
  assert.equal(db.writes.length, 1);
  assert.match(db.writes[0].sql, /UPDATE booths SET live_until = NULL WHERE id = \?/);
  assert.deepEqual(db.writes[0].values, [BOOTH_ID]);
});

test("GET /api/booths projects is_live but never exposes live_until", async () => {
  const db = database({ rows: [{ id: BOOTH_ID, company_name: "Example", status: "approved", is_live: 1 }] });
  const response = await app.request("/api/booths", {}, env(db));
  assert.equal(response.status, 200);
  const { booths } = await response.json();
  assert.equal(booths.length, 1);
  assert.equal(booths[0].is_live, 1);
  assert.equal("live_until" in booths[0], false);

  // The SELECT column list may only reference live_until inside the CASE
  // expression that derives is_live — never as a bare projected column.
  assert.equal(db.queries.length, 1);
  const sql = db.queries[0];
  const columns = sql.slice(sql.indexOf("SELECT") + "SELECT".length, sql.indexOf(" FROM "));
  assert.match(columns, /AS is_live/);
  const withoutCase = columns.replace(/CASE[\s\S]*?END AS \w+/gi, "");
  assert.doesNotMatch(withoutCase, /\blive_until\b/);
});

/* ---------------------------------- LOGO ---------------------------------- */

const logoPut = (db, body, token = GOOD_TOKEN, headers = {}) =>
  app.request(`https://wetexpo.prohound.io/api/booths/${BOOTH_ID}/logo`, {
    method: "PUT",
    headers: { ...(token == null ? {} : { "x-edit-token": token }), ...headers },
    body,
  }, env(db));

const ownerDb = (extra = {}) =>
  database({
    route: (sql) => {
      if (sql.includes("edit_token_hash")) return { edit_token_hash: GOOD_HASH };
      return extra.row ?? { id: BOOTH_ID, company_name: "Example", logo_url: `/api/booths/${BOOTH_ID}/logo?v=1` };
    },
  });

test("PUT logo: missing edit token is rejected 401", async () => {
  const db = database({ route: () => { throw new Error("Must not query without a token"); } });
  const response = await logoPut(db, PNG, null);
  assert.equal(response.status, 401);
  assert.equal(db.queries.length, 0);
  assert.equal(db.writes.length, 0);
});

test("PUT logo: wrong edit token is rejected 403 without storing bytes", async () => {
  const db = database({ route: () => ({ edit_token_hash: WRONG_HASH }) });
  const response = await logoPut(db, PNG);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Invalid edit token" });
  assert.equal(db.writes.length, 0);
});

test("PUT logo: SVG bytes are rejected 415 (sniffImage refuses vector formats)", async () => {
  const db = ownerDb();
  const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const response = await logoPut(db, svg);
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: "Unsupported image. Use PNG, JPEG or WebP." });
  assert.equal(db.writes.length, 0);
});

test("PUT logo: oversize upload (>512 KB) is rejected 413", async () => {
  const db = ownerDb();
  const oversize = new Uint8Array(513 * 1024);
  oversize.set(PNG.subarray(0, 8), 0); // PNG magic prefix
  const response = await logoPut(db, oversize);
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "Image is too large (max 512 KB)" });
  assert.equal(db.writes.length, 0);
});

test("PUT logo: valid PNG magic is accepted 200 and stored as base64", async () => {
  const db = ownerDb();
  const response = await logoPut(db, PNG);
  assert.equal(response.status, 200);
  const { booth } = await response.json();
  assert.equal(booth.id, BOOTH_ID);

  assert.equal(db.writes.length, 1);
  const { sql, values } = db.writes[0];
  assert.match(sql, /UPDATE booths SET logo_data = \?1, logo_type = \?2, logo_updated_at = CURRENT_TIMESTAMP/);
  assert.equal(values[0], PNG_BASE64);
  assert.equal(values[1], "image/png"); // sniffImage accepted the synthetic PNG
  assert.equal(values[2], BOOTH_ID);
});

const logoGet = (db, token) =>
  app.request(`/api/booths/${BOOTH_ID}/logo`, {
    headers: token === undefined ? {} : { "x-edit-token": token },
  }, env(db));

const logoRow = (status) => ({ logo_data: PNG_BASE64, logo_type: "image/png", status });

test("GET logo: missing row is 404", async () => {
  const response = await logoGet(database({ route: () => null }));
  assert.equal(response.status, 404);
});

test("GET logo: row without logo_data is 404", async () => {
  const db = database({ route: () => ({ logo_data: null, logo_type: null, status: "approved" }) });
  const response = await logoGet(db);
  assert.equal(response.status, 404);
});

test("GET logo: pending booth is 404 for anonymous visitors", async () => {
  const db = database({ route: () => logoRow("pending") });
  const response = await logoGet(db);
  assert.equal(response.status, 404);
});

test("GET logo: pending booth is served to the owner with nosniff + sandbox CSP", async () => {
  const db = database({
    route: (sql) =>
      sql.includes("logo_data") ? logoRow("pending") : { edit_token_hash: GOOD_HASH },
  });
  const response = await logoGet(db, GOOD_TOKEN);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(response.headers.get("Content-Security-Policy"), "default-src 'none'; sandbox");
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), PNG);
});

test("GET logo: approved booth is public with a long-lived cache header", async () => {
  const db = database({ route: () => logoRow("approved") });
  const response = await logoGet(db);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "image/png");
  assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
  assert.match(response.headers.get("Cache-Control"), /^public, max-age=\d+$/);
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), PNG);
});
