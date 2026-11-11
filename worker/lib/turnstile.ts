/**
 * Verify a Cloudflare Turnstile token. Returns true when verification passes,
 * or when no secret is configured (so local dev works without Turnstile set up).
 */
export async function verifyTurnstile(
  secret: string | undefined,
  token: string | undefined,
  ip: string | null,
): Promise<boolean> {
  if (!secret) return true; // Not configured — skip (dev / pre-launch).
  if (!token) return false;

  const body = new FormData();
  body.append("secret", secret);
  body.append("response", token);
  if (ip) body.append("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { success: boolean; "error-codes"?: string[] };
    if (data.success !== true) {
      // error-codes are safe to log (not secret). `invalid-input-secret` means
      // TURNSTILE_SECRET does not match the site key; `invalid-input-response`
      // / `timeout-or-duplicate` point at the client token instead.
      console.warn("Turnstile siteverify rejected token", {
        errorCodes: data["error-codes"] ?? [],
      });
    }
    return data.success === true;
  } catch (err) {
    console.warn("Turnstile siteverify request failed", { error: String(err) });
    return false;
  }
}
