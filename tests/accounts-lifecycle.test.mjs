import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
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

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const now = () => Math.floor(Date.now() / 1000);

/** Tiny SQL-pattern mock: canned rows per statement shape, records every statement. */
function database(world = {}) {
  const w = {
    accountsByEmail: {},
    loginCodesByHash: {},
    sessionsByHash: {},
    boothsById: {},
    boothsByAccount: {},
    ...world,
  };
  const statements = [];
  const lookup = (sql, params) => {
    if (/FROM accounts WHERE email/.test(sql)) return w.accountsByEmail[params[0]] ?? null;
    if (/FROM login_codes\s+WHERE code_hash/.test(sql)) return w.loginCodesByHash[params[0]] ?? null;
    if (/FROM sessions s JOIN accounts/.test(sql)) return w.sessionsByHash[params[0]] ?? null;
    if (/edit_token_hash FROM booths WHERE id/.test(sql)) return w.boothsById[params[0]] ?? null;
    return null;
  };
  const record = (sql, params) => statements.push({ sql: sql.replace(/\s+/g, " ").trim(), params });
  const stmt = (sql, params) => ({
    async first() { return lookup(sql, params); },
    async all() {
      record(sql, params);
      if (/FROM booths WHERE account_id/.test(sql)) return { results: w.boothsByAccount[params[0]] ?? [] };
      return { results: [] };
    },
    async run() {
      record(sql, params);
      if (/INSERT INTO login_codes/.test(sql)) {
        w.loginCodesByHash[params[2]] = { id: params[0], account_id: params[1], code_hash: params[2], expires_at: params[3], consumed_at: null };
      }
      if (/INSERT INTO sessions/.test(sql)) {
        w.sessionsByHash[params[2]] = { token_hash: params[2], expires_at: params[3], account_id: params[1], email: "owner@example.com" };
      }
      if (/UPDATE login_codes SET consumed_at/.test(sql)) {
        const row = Object.values(w.loginCodesByHash).find((r) => r.id === params[1]);
        if (row) row.consumed_at = params[0];
      }
      if (/UPDATE sessions SET expires_at/.test(sql)) {
        const row = w.sessionsByHash[params[1]];
        if (row) row.expires_at = params[0];
      }
      return { success: true, meta: { changes: 1 } };
    },
  });
  return {
    statements,
    world: w,
    // D1 statements support bind() AND direct first/all/run with no params.
    prepare(sql) {
      const bound = stmt(sql, []);
      return { ...bound, bind: (...params) => stmt(sql, params) };
    },
    async batch(stmts) {
      for (const s of stmts) statements.push({ sql: "(batch)", params: s.__params ?? [] });
      return [];
    },
  };
}

// The mock's batch receives bound statement objects; capture their params by wrapping prepare.
function databaseWithBatch(world = {}) {
  const db = database(world);
  const origPrepare = db.prepare.bind(db);
  db.prepare = (sql) => {
    const base = origPrepare(sql);
    return {
      ...base,
      bind: (...params) => {
        const s = base.bind(...params);
        s.__params = params;
        s.__sql = sql;
        return s;
      },
    };
  };
  db.batch = async (stmts) => {
    for (const s of stmts) db.statements.push({ sql: s.__sql.replace(/\s+/g, " ").trim(), params: s.__params });
    return [];
  };
  return db;
}

const env = (db) => ({
  DB: db,
  SUBMIT_LIMITER: { limit: async () => ({ success: true }) },
  MAIL_FROM: "WetExpo <no-reply@wetexpo.com>",
});

test("login rejects malformed emails and reveals nothing about unknown ones", async (t) => {
  const db = databaseWithBatch();
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ ok: true }));
  const bad = await app.request("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "nope" }),
  }, env(db));
  assert.equal(bad.status, 422);

  const unknown = await app.request("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "ghost@example.com" }),
  }, env(db));
  assert.equal(unknown.status, 200);
  const body = await unknown.json();
  assert.match(body.message, /sign-in link is on its way/);
  assert.equal(fetchMock.mock.callCount(), 0); // no email for unknown accounts
});

test("login emails a magic link only to known owners and issues a session on redeem", async (t) => {
  const db = databaseWithBatch({ accountsByEmail: { "owner@example.com": { id: "acct-1" } } });
  const mails = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    mails.push({ url: String(url), body: JSON.parse(options.body) });
    return Response.json({ ok: true });
  });

  const res = await app.request("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "Owner@Example.com" }),
  }, env(db));
  assert.equal(res.status, 200);
  assert.equal(mails.length, 1);
  assert.equal(mails[0].url, "https://api.mailchannels.net/tx/v1/send");
  assert.equal(mails[0].body.personalizations[0].to[0].email, "owner@example.com");
  const link = mails[0].body.content[0].value.match(/#code=([0-9a-f]+)/)[1];
  assert.equal(link.length, 64);

  // Redeem the code from the email.
  const session = await app.request("/api/auth/session", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: link }),
  }, env(db));
  assert.equal(session.status, 200);
  const cookie = session.headers.get("set-cookie");
  assert.match(cookie, /wx_session=[0-9a-f]{64}/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);

  // Claims booths on first login.
  const claim = db.statements.find((s) => s.sql.startsWith("UPDATE booths SET account_id"));
  assert.ok(claim, "first login claims booths by owner_email");

  // Single use: second redeem fails.
  const again = await app.request("/api/auth/session", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: link }),
  }, env(db));
  assert.equal(again.status, 401);
});

test("expired and consumed codes are rejected", async (t) => {
  const db = databaseWithBatch({
    loginCodesByHash: {
      [sha256("old-code")]: { id: "lc-1", account_id: "acct-1", code_hash: sha256("old-code"), expires_at: now() - 10, consumed_at: null },
      [sha256("used-code")]: { id: "lc-2", account_id: "acct-1", code_hash: sha256("used-code"), expires_at: now() + 600, consumed_at: now() - 1 },
    },
  });
  t.mock.method(globalThis, "fetch", async () => Response.json({ ok: true }));
  for (const code of ["old-code", "used-code", "random"]) {
    const res = await app.request("/api/auth/session", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }),
    }, env(db));
    assert.equal(res.status, 401, `code ${code}`);
  }
});

test("me requires a session and lists the account booths", async (t) => {
  const db = databaseWithBatch({
    sessionsByHash: { [sha256("good-session")]: { token_hash: sha256("good-session"), expires_at: now() + 3600, account_id: "acct-1", email: "owner@example.com" } },
    boothsByAccount: { "acct-1": [{ id: "b1", company_name: "Acme" }] },
  });
  const anon = await app.request("/api/auth/me", {}, env(db));
  assert.equal(anon.status, 401);

  const me = await app.request("/api/auth/me", { headers: { cookie: "wx_session=good-session" } }, env(db));
  assert.equal(me.status, 200);
  const body = await me.json();
  assert.equal(body.email, "owner@example.com");
  assert.equal(body.booths.length, 1);
});

test("renew requires ownership and approval, then extends the window", async (t) => {
  const past = now() - 5000;
  const db = databaseWithBatch({
    boothsById: {
      b1: { id: "b1", account_id: null, status: "approved", expires_at: past, edit_token_hash: sha256("good-edit-token") },
      b2: { id: "b2", account_id: null, status: "pending", expires_at: null, edit_token_hash: sha256("good-edit-token") },
    },
  });
  const base = env(db);

  const noAuth = await app.request("/api/booths/b1/renew", { method: "POST" }, base);
  assert.equal(noAuth.status, 401);

  const wrong = await app.request("/api/booths/b1/renew", { method: "POST", headers: { "x-edit-token": "bad" } }, base);
  assert.equal(wrong.status, 403);

  const pending = await app.request("/api/booths/b2/renew", { method: "POST", headers: { "x-edit-token": "good-edit-token" } }, base);
  assert.equal(pending.status, 409);

  const ok = await app.request("/api/booths/b1/renew", { method: "POST", headers: { "x-edit-token": "good-edit-token" } }, base);
  assert.equal(ok.status, 200);
  const upd = db.statements.find((s) => s.sql.startsWith("UPDATE booths SET expires_at"));
  assert.ok(upd);
  const newExpiry = upd.params[0];
  assert.ok(newExpiry > now() + 29 * 86400 && newExpiry <= now() + 30 * 86400 + 5, `renewed ~30d: ${newExpiry}`);
});

test("reap marks overdue approved and stale pending booths expired and frees slots", async (t) => {
  const db = databaseWithBatch();
  await app.request("/api/stands", {}, env(db));
  const reaps = db.statements.filter((s) => s.sql.includes("SET status = 'expired'"));
  assert.equal(reaps.length, 2);
  assert.ok(reaps[0].params[0] >= now() - 5 && reaps[0].params[0] <= now() + 5, "approved reap uses current epoch");
  assert.equal(reaps[1].params[0], "-7 days", "pending reap window is 7 days");
  const stands = db.statements.find((s) => s.sql.includes("FROM booths WHERE booth_code IS NOT NULL"));
  assert.match(stands.sql, /NOT IN \('rejected', 'expired'\)/);
});

test("wrangler config keeps lifecycle-safe settings", async () => {
  const text = await (await import("node:fs/promises")).readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const { config, error } = ts.parseConfigFileTextToJson("wrangler.jsonc", text);
  assert.equal(error, undefined);
  assert.equal(config.workers_dev, false);
  assert.equal(config.preview_urls, false);
});
