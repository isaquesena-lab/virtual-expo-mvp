# MVP scope

## Must-have (P0)

- Landing page with independent-event disclaimer and English copy.
- Public booth directory with search (company, sector, booth number).
- Mobile-first virtual hall / zone selector with original graphics.
- Booth detail modal and directly linkable /booths/:slug page.
- Form to request a new booth (company, pitch, category, website, meeting URL, email).
- Verified anti-bot token and server-side input validation.
- Pending approval by default; moderator-only publish/unpublish.
- Capability-based editing using a private, unpredictable token, stored hashed.
- Outbound Google Meet or YouTube Live link opened in a new tab with noreferrer/noopener.
- Responsive layout, loading/empty/error states, basic SEO metadata.
- Privacy notice, contact for corrections/removal, and no official affiliation claim.

## Should-have after the complete end-to-end flow (P1)

- Booth placement UI for moderators.
- Verified email delivery for edit links / ownership claims.
- Basic anonymous counters with minimal retention and privacy review.
- Multiple hall/zone filters.
- Availability status set manually with expiration.

## Explicitly excluded from launch (P2)

- Native audio/video, chat, presence sockets, calendars, and meeting creation APIs.
- OAuth/social login, attendee profiles, lead capture, bulk email.
- Self-service graphics/logo uploads; use vetted external image URLs or omit logos.
- Sponsor payments, recommendations powered by AI, complex analytics.
- Importing organizers' proprietary maps or participant information without consent.

## Release acceptance criteria

- An unregistered visitor can find a booth and open its meeting on iOS and Android.
- A submission is not public until moderator approval.
- Only its secret holder or a moderator can edit a booth.
- URLs are safe and use https; user-supplied HTML is not executed.
- Moderator account credentials are not present in client bundles.
- Search/list fallback works with the map unavailable.
- No official event branding/assets are used without appropriate permission.
- A clear escalation/contact method exists for false or unsafe listings.
