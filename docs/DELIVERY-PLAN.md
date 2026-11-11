# Emergency delivery plan

Sequence work by completed vertical slice, not parallel speculative infrastructure.

## Phase A - Skeleton

- Create React/Vite SPA and one Worker with D1 binding.
- Create migration and seed an example company with a safe placeholder meeting link.
- Publish to staging and verify on mobile.

Exit: the app loads and fetches the example booth via API.

## Phase B - Complete visitor path

- Searchable directory + original responsive hall graphic.
- Click a booth to open company details.
- Direct `/booths/:slug` URL; external join button.

Exit: a visitor finds and joins a meeting from their phone.

## Phase C - Exhibitor path

- Public submission, server validation, Turnstile and rate limiting.
- Pending state and moderator approval.
- Capability-based edit or moderator-managed edits if email delivery cannot be completed safely.

Exit: a real verified exhibitor can submit a listing that is reviewed and published.

## Phase D - Hardening and sharing

- Add privacy notice, event-independence notice, moderation contact, accessibility checks.
- Test duplicate submissions, malicious URLs and accidental disclosure of edit links.
- Configure production domain, monitoring and backup/export plan.
- Recruit a small group of confirmed exhibitors and test actual meetings.

Exit: an independent public URL can be shared with live participants.

## Roles to assign

- Product/ops: onboarding exhibitors, verification and live moderation.
- Frontend: map, directory, detail modal, responsive UI.
- Backend: schema, API, tokens, protections and deployment.
- QA/release: device testing and production gates.

One person can cover several roles; ownership of moderation must be explicit.
