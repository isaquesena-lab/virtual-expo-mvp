/** Session + magic-link auth for booth owners (accounts). */

import { generateEditToken, hashEditToken, timingSafeEqual } from "./tokens";

export const SESSION_COOKIE = "wx_session";
export const SESSION_DAYS = 30;
export const LOGIN_CODE_MINUTES = 15;

const nowEpoch = () => Math.floor(Date.now() / 1000);

export interface SessionInfo {
  accountId: string;
  email: string;
}

/** Create a login code row and return the plaintext code (shown in the email only). */
export async function createLoginCode(db: D1Database, accountId: string): Promise<string> {
  const code = generateEditToken();
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO login_codes (id, account_id, code_hash, expires_at)
       VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(id, accountId, await hashEditToken(code), nowEpoch() + LOGIN_CODE_MINUTES * 60)
    .run();
  return code;
}

/** Consume a login code; returns the account id when valid. Single use, time-boxed. */
export async function consumeLoginCode(db: D1Database, code: string): Promise<string | null> {
  const hash = await hashEditToken(code);
  const row = await db
    .prepare(
      `SELECT id, account_id, code_hash, expires_at, consumed_at FROM login_codes
        WHERE code_hash = ?1 LIMIT 1`,
    )
    .bind(hash)
    .first<{ id: string; account_id: string; code_hash: string; expires_at: number; consumed_at: number | null }>();
  if (!row) return null;
  if (row.consumed_at !== null || row.expires_at < nowEpoch()) return null;
  if (!timingSafeEqual(hash, row.code_hash)) return null;
  await db.prepare("UPDATE login_codes SET consumed_at = ?1 WHERE id = ?2").bind(nowEpoch(), row.id).run();
  return row.account_id;
}

/** Create a session row and return the plaintext cookie value. */
export async function createSession(db: D1Database, accountId: string): Promise<string> {
  const token = generateEditToken();
  await db
    .prepare(
      `INSERT INTO sessions (id, account_id, token_hash, expires_at)
       VALUES (?1, ?2, ?3, ?4)`,
    )
    .bind(crypto.randomUUID(), accountId, await hashEditToken(token), nowEpoch() + SESSION_DAYS * 86400)
    .run();
  return token;
}

/** Resolve a session cookie to account info, or null. Sliding expiry on use. */
export async function resolveSession(db: D1Database, cookieHeader: string | undefined): Promise<SessionInfo | null> {
  if (!cookieHeader) return null;
  const value = cookieHeader
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${SESSION_COOKIE}=`))
    ?.slice(SESSION_COOKIE.length + 1);
  if (!value) return null;
  const hash = await hashEditToken(value);
  const row = await db
    .prepare(
      `SELECT s.token_hash, s.expires_at, s.account_id, a.email
         FROM sessions s JOIN accounts a ON a.id = s.account_id
        WHERE s.token_hash = ?1 LIMIT 1`,
    )
    .bind(hash)
    .first<{ token_hash: string; expires_at: number; account_id: string; email: string }>();
  if (!row || row.expires_at < nowEpoch()) return null;
  if (!timingSafeEqual(hash, row.token_hash)) return null;
  // Sliding expiry: push the deadline forward on each authenticated request.
  await db
    .prepare("UPDATE sessions SET expires_at = ?1 WHERE token_hash = ?2")
    .bind(nowEpoch() + SESSION_DAYS * 86400, hash)
    .run();
  return { accountId: row.account_id, email: row.email };
}

export function sessionCookie(token: string, maxAgeSeconds: number): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export const clearSessionCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
