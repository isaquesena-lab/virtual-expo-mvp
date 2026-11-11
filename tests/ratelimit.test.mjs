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

const BOOTH_ID = "11111111-1111-4111-8111-111111111111";
const EDIT_TOKEN = "test-edit-token";
const EDIT_TOKEN_HASH = createHash("sha256").update(EDIT_TOKEN).digest("hex");

/** Minimal PNG signature + padding so sniffImage() accepts the upload. */
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
]);

/** Mock D1: records every prepare/run, answers first()/all() from `rows`. */
function database(rows = {}) {
  const state = { prepares: [], writes: [] };
  return {
    state,
    prepare(sql) {
      state.prepares.push(sql);
      return {
        bind(...values) {
          return {
            async first() {
              if (sql.includes("edit_token_hash, status")) {
                return { edit_token_hash: EDIT_TOKEN_HASH, status: "approved" };
              }
              if (sql.includes("edit_token_hash")) {
                return { edit_token_hash: EDIT_TOKEN_HASH };
              }
              return rows.first ?? null;
            },
            async all() {
              return { results: rows.all ?? [] };
            },
            async run() {
              state.writes.push({ sql, values });
              return { success: true };
            },
          };
        },
      };
    },
  };
}

const allowAll = { limit: async () => ({ success: true }) };
const denyAll = {
  limit: async ({ key }) => {
    assert.equal(key, "mutate:192.0.2.7");
    return { success: false };
  },
};

function env(db, mutateLimiter) {
  return { DB: db, SUBMIT_LIMITER: allowAll, MUTATE_LIMITER: mutateLimiter };
}

function postLive(db, mutateLimiter) {
  return app.request(`https://wetexpo.prohound.io/api/booths/${BOOTH_ID}/live`, {
    method: "POST",
    headers: { "x-edit-token": EDIT_TOKEN, "CF-Connecting-IP": "192.0.2.7" },
  }, env(db, mutateLimiter));
}

function putLogo(db, mutateLimiter) {
  return app.request(`https://wetexpo.prohound.io/api/booths/${BOOTH_ID}/logo`, {
    method: "PUT",
    headers: {
      "x-edit-token": EDIT_TOKEN,
      "CF-Connecting-IP": "192.0.2.7",
      "Content-Type": "image/png",
    },
    body: PNG_BYTES,
  }, env(db, mutateLimiter));
}

test("rate-limited heartbeat is rejected before auth, database or Siteverify", async (t) => {
  const db = database();
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Must not contact Siteverify"); });
  const response = await postLive(db, denyAll);
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "Too many requests. Please slow down." });
  assert.equal(db.state.prepares.length, 0);
  assert.equal(db.state.writes.length, 0);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("rate-limited logo upload is rejected before auth, database or Siteverify", async (t) => {
  const db = database();
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Must not contact Siteverify"); });
  const response = await putLogo(db, denyAll);
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { error: "Too many requests. Please slow down." });
  assert.equal(db.state.prepares.length, 0);
  assert.equal(db.state.writes.length, 0);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("heartbeat proceeds normally when under the mutation limit", async (t) => {
  const db = database();
  t.mock.method(globalThis, "fetch", () => { throw new Error("Must not contact Siteverify"); });
  const response = await postLive(db, allowAll);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.live, true);
  assert.equal(db.state.writes.length, 1);
  assert.match(db.state.writes[0].sql, /UPDATE booths SET live_until/);
});

test("logo upload proceeds normally when under the mutation limit", async (t) => {
  const db = database();
  t.mock.method(globalThis, "fetch", () => { throw new Error("Must not contact Siteverify"); });
  const response = await putLogo(db, allowAll);
  assert.equal(response.status, 200);
  assert.equal(db.state.writes.length, 1);
  assert.match(db.state.writes[0].sql, /UPDATE booths SET logo_data/);
});

test("booth list allows a short public cache while config stays no-store", async () => {
  const db = database();
  const list = await app.request("https://wetexpo.prohound.io/api/booths", {}, env(db, allowAll));
  assert.equal(list.status, 200);
  assert.equal(list.headers.get("Cache-Control"), "public, max-age=15");
  assert.deepEqual(await list.json(), { booths: [] });

  const config = await app.request("https://wetexpo.prohound.io/api/config", {}, env(db, allowAll));
  assert.equal(config.status, 200);
  assert.equal(config.headers.get("Cache-Control"), "no-store");
});
