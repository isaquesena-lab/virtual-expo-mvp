/** Stand lifecycle: expiry of approved booths and abandonment of pending ones. */

export const RENEWAL_DAYS = 30;
export const PENDING_EXPIRY_DAYS = 7;

const nowEpoch = () => Math.floor(Date.now() / 1000);

/**
 * Move overdue booths to status 'expired':
 * - approved booths past their expires_at (renewal window missed);
 * - pending submissions older than PENDING_EXPIRY_DAYS (moderator never acted).
 * Expired booths release their stand slot (see idx_booths_slot_unique).
 * Idempotent and cheap; callers invoke it on read paths.
 */
export async function reapExpired(db: D1Database): Promise<void> {
  const now = nowEpoch();
  await db.batch([
    db.prepare(
      `UPDATE booths SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'approved' AND expires_at IS NOT NULL AND expires_at < ?1`,
    ).bind(now),
    db.prepare(
      `UPDATE booths SET status = 'expired', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'pending'
          AND created_at < datetime('now', ?1)`,
    ).bind(`-${PENDING_EXPIRY_DAYS} days`),
  ]);
}

/** Epoch seconds for an approval/renewal window starting now. */
export function expiryFromNow(days: number = RENEWAL_DAYS): number {
  return nowEpoch() + days * 86400;
}

/** Renew from the later of now or the current expiry so early renewals don't lose days. */
export function renewedExpiry(currentExpiresAt: number | null, days: number = RENEWAL_DAYS): number {
  const base = Math.max(nowEpoch(), currentExpiresAt ?? 0);
  return base + days * 86400;
}
