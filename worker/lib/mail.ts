/** Outbound email via MailChannels (free egress on Cloudflare Workers). */

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Send a transactional email. Requires an SPF record on the sending domain:
 *   v=spf1 include:relay.mailchannels.net -all
 * and the MAIL_FROM var configured as "Name <no-reply@domain>".
 * Returns true on success; never throws (callers degrade gracefully).
 */
export async function sendMail(from: string | undefined, msg: MailMessage): Promise<boolean> {
  if (!from) return false;
  const [name, address] = from.includes("<")
    ? [from.slice(0, from.indexOf("<")).trim(), from.slice(from.indexOf("<") + 1, from.indexOf(">"))]
    : ["WetExpo", from];
  try {
    const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: msg.to }] }],
        from: { email: address, name },
        subject: msg.subject,
        content: [
          { type: "text/plain", value: msg.text },
          ...(msg.html ? [{ type: "text/html", value: msg.html }] : []),
        ],
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
