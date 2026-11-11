# Security, privacy, and event identity

This is an implementation checklist, not legal advice.

## Brand and map

- Present the platform as independently organized unless official permission is granted.
- Do not use official logos, names as implied endorsements, copied screenshots or floorplans without the necessary rights.
- Do not scrape attendee data or bulk-import exhibitor records from restricted sources.
- If organizers approve reuse, document the license, attribution and data provenance.
- Let booth owners claim voluntarily and verify claimed identifiers.

## Personal data

- Visitors browse anonymously; do not require an account or collect an email.
- Only collect an exhibitor email when needed to verify/administer their booth.
- Publish a clear privacy notice: purposes, legal basis, retention period, controller contact, processors, and correction/deletion channel.
- Do not conflate booth registration with consent for marketing emails.
- Decide retention after the temporary event; remove unnecessary personal data.
- Review GDPR implications before collecting analytics or distributing leads.

## Abuse prevention

- Cloudflare Turnstile token validation on every public submission.
- Rate limit registration by reasonable signals; avoid logging sensitive payloads.
- Server-side authorization on all edit and admin endpoints.
- Random high-entropy editing tokens; store only token digests.
- Prefer a separate admin login with strong authentication. Do not ship a shared admin password in frontend code.
- Approve each booth before publishing; provide a fast takedown process.
- Validate and encode all untrusted text and URLs. Block `javascript:` and HTTP links where HTTPS is expected.
- Open third-party meetings in a new tab with `rel="noopener noreferrer"`.
- Keep secrets in environment bindings, not files or client bundles.

## Third-party meeting expectations

- The exhibitor controls Google Meet admission or YouTube Live access policy.
- Meeting owners should check settings and be present to admit external visitors.
- Show an external-service notice before or near the outbound button.
- The application is not a video service and cannot guarantee room availability.

## Operational safety

- Verify mobile, desktop, keyboard accessibility, and fallback listing.
- Track error rates and ensure rollbacks are possible.
- Test form abuse, bad URLs, duplicate booth claims, and access to hidden booths.
