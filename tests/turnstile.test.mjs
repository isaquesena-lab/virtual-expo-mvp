import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";

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

const keys = {
  TURNSTILE_SITE_KEY: "public-test-site-key",
  TURNSTILE_SECRET: "test-secret-not-a-real-key",
};
const payload = {
  company_name: "Example company",
  description: "A sufficiently detailed company description.",
  category: "Hardware",
  booth_code: "P1-001",
  meet_url: "https://meet.google.com/abc-defg-hij",
  owner_email: "owner@example.com",
};

function database() {
  const writes = [];
  return {
    writes,
    prepare(sql) {
      return {
        bind(...values) {
          return {
            async first() { return null; },
            async run() { writes.push({ sql, values }); return { success: true }; },
          };
        },
      };
    },
  };
}

function submit(env, token) {
  return app.request("https://wetexpo.prohound.io/api/booths", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "192.0.2.1" },
    body: JSON.stringify({ ...payload, turnstile_token: token }),
  }, { SUBMIT_LIMITER: { limit: async () => ({ success: true }) }, ...env });
}

test("public config disables the widget when no secret is configured", async () => {
  const response = await app.request("/api/config", {}, { TURNSTILE_SITE_KEY: keys.TURNSTILE_SITE_KEY });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { turnstile_site_key: null });
});

test("enabled public config exposes only the site key, never secrets", async () => {
  const response = await app.request("/api/config", {}, { ...keys, ADMIN_TOKEN: "test-admin-token" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { turnstile_site_key: keys.TURNSTILE_SITE_KEY });
});

test("missing site key fails closed when verification is enabled", async () => {
  const response = await app.request("/api/config", {}, { TURNSTILE_SECRET: keys.TURNSTILE_SECRET });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Anti-bot verification is not configured correctly" });
});

test("missing token is rejected before database access", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Must not verify missing tokens"); });
  const response = await submit(keys);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Anti-bot verification failed" });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("invalid token is rejected without reserving a stand", async (t) => {
  const db = database();
  t.mock.method(globalThis, "fetch", async () => Response.json({ success: false }));
  const response = await submit({ ...keys, DB: db }, "invalid-token");
  assert.equal(response.status, 403);
  assert.equal(db.writes.length, 0);
});

test("verification network failure is rejected without reserving a stand", async (t) => {
  const db = database();
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Network unavailable"); });
  const response = await submit({ ...keys, DB: db }, "test-token");
  assert.equal(response.status, 403);
  assert.equal(db.writes.length, 0);
});

test("verified token and client IP reach Siteverify before a pending booth is created", async (t) => {
  const db = database();
  const fetchMock = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(options.method, "POST");
    assert.equal(options.body.get("secret"), keys.TURNSTILE_SECRET);
    assert.equal(options.body.get("response"), "valid-test-token");
    assert.equal(options.body.get("remoteip"), "192.0.2.1");
    assert.equal(db.writes.length, 0);
    return Response.json({ success: true });
  });
  const response = await submit({ ...keys, DB: db }, "valid-test-token");
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.status, "pending");
  assert.match(result.edit_url, /#token=/);
  assert.equal(db.writes.length, 1);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("local submissions still work without a secret or token", async (t) => {
  const db = database();
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Must not contact Siteverify"); });
  const response = await submit({ DB: db });
  assert.equal(response.status, 201);
  assert.equal(db.writes.length, 1);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("rate-limited submissions are rejected before Siteverify or database access", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () => { throw new Error("Must not verify blocked requests"); });
  const response = await submit({
    ...keys,
    SUBMIT_LIMITER: {
      async limit({ key }) {
        assert.equal(key, "submit:192.0.2.1");
        return { success: false };
      },
    },
  }, "test-token");
  assert.equal(response.status, 429);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("Wrangler keeps the custom domain, rate limiter and disables alternative public routes", async () => {
  const text = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const { config, error } = ts.parseConfigFileTextToJson("wrangler.jsonc", text);
  assert.equal(error, undefined);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
  assert.deepEqual(config.routes, [
    { pattern: "wetexpo.prohound.io", custom_domain: true },
    { pattern: "wetexpo.com", custom_domain: true },
  ]);
  assert.ok(config.vars.TURNSTILE_SITE_KEY);
  assert.equal(Object.hasOwn(config.vars, "TURNSTILE_SECRET"), false);
  assert.deepEqual(config.assets.run_worker_first, ["/api/*"]);
  assert.equal(config.assets.not_found_handling, "single-page-application");
  assert.equal(config.d1_databases[0].binding, "DB");
  assert.deepEqual(config.ratelimits, [{
    name: "SUBMIT_LIMITER",
    namespace_id: "1001",
    simple: { limit: 5, period: 60 },
  }]);
});

test("static CSP permits Turnstile scripts and frames without broadening script sources", async () => {
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  assert.match(headers, /script-src 'self' https:\/\/challenges\.cloudflare\.com;/);
  assert.match(headers, /frame-src https:\/\/challenges\.cloudflare\.com;/);
  assert.doesNotMatch(headers, /script-src[^;]*'unsafe-inline'/);
});
