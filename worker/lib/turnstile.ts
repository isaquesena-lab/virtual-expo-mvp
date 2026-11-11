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
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
