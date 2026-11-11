# Virtual Expo MVP

> Independent, private initiative. **Not affiliated with or endorsed by any event organizer.**

A lightweight, mobile-first directory of virtual expo booths. Each exhibitor gets a
shareable booth page with its pitch and an external meeting link. Visitors discover
booths through a searchable virtual hall and join a meeting hosted by each exhibitor —
no account required.

Built as a single deployable app on **Cloudflare Workers** (React SPA + JSON API) with
**D1** for storage.

---

## Quickstart

Requirements: Node 20+ and [pnpm](https://pnpm.io). (This repo was scaffolded with Node 25 / pnpm 10.)

```bash
pnpm install              # install dependencies
cp .dev.vars.example .dev.vars   # local secrets (ADMIN_TOKEN, optional Turnstile)
pnpm db:setup             # create local D1 tables + load example booths
pnpm dev                  # start the dev server → http://localhost:5173
```

Open http://localhost:5173. The home page shows the virtual hall + directory seeded with
example booths. The moderator area is at `/admin` (token = the `ADMIN_TOKEN` in `.dev.vars`).

### Useful scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Vite dev server with the Worker + local D1 (hot reload) |
| `pnpm build` | Production build (client + Worker) |
| `pnpm db:setup` | Apply migrations **and** seed the local DB |
| `pnpm db:migrate:local` / `:remote` | Apply migrations |
| `pnpm db:seed:local` / `:remote` | Load `seed.sql` |
| `pnpm db:create` | Create the remote D1 database (run once) |
| `pnpm deploy` | Build and deploy to Cloudflare |
| `pnpm typecheck` | TypeScript check across app + worker |
| `pnpm test` | Turnstile configuration, submission and rate-limit regression tests |

---

## Architecture

```
index.html                 # SPA entry
src/                       # React SPA (client)
  main.tsx                 # router (/, /booths/:slug, /register, /edit/:id, /admin)
  components/              # Layout, BoothCard, HallMap, Turnstile
  pages/                  # Home, BoothDetail, Register, EditBooth, Admin, NotFound
  lib/                    # api client + shared types
worker/                    # Cloudflare Worker (Hono) — the JSON API at /api/*
  index.ts                # routes + handlers
  lib/                    # validation (zod), tokens, slug, turnstile
migrations/0001_init.sql   # D1 schema
seed.sql                   # example booths for local dev
wrangler.jsonc             # Worker config (D1 binding, SPA routing)
docs/                      # product, scope, data model, decisions, delivery plan
```

The Worker serves `/api/*`; everything else is the React SPA (via `not_found_handling:
single-page-application`). Google Meet is an **outbound link**, never a backend dependency —
the app does not relay audio or video.

### API

| Method | Path | Access |
| --- | --- | --- |
| `GET` | `/api/config` | Public — widget site key when Turnstile is enabled, otherwise `null` (never secrets) |
| `GET` | `/api/booths?q=&category=&zone=` | Public — approved booths only |
| `GET` | `/api/booths/:slug` | Public — approved booth detail |
| `POST` | `/api/booths` | Public — creates a `pending` submission |
| `PATCH` | `/api/booths/:id` | Owner — requires `x-edit-token` capability token |
| `GET` | `/api/admin/booths?status=` | Moderator — `x-admin-token` |
| `PATCH` | `/api/admin/booths/:id` | Moderator — approve / reject / hide / place on map |

Public responses never include `owner_email` or `edit_token_hash`.

---

## Deploy to Cloudflare

1. **Create the database** and copy the returned `database_id` into `wrangler.jsonc`:
   ```bash
   pnpm db:create
   ```
2. **Apply the schema** to the remote DB:
   ```bash
   pnpm db:migrate:remote
   ```
3. **Set secrets** (never commit these):
   ```bash
   npx wrangler secret put ADMIN_TOKEN
   ```
4. **Deploy:**
   ```bash
   pnpm deploy
   ```

Production is configured for the custom domain `https://wetexpo.prohound.io`.
The `workers_dev: false` and `preview_urls: false` settings disable the alternative
`*.workers.dev` route and version/preview URLs so they cannot bypass the custom
domain's zone-level WAF. These settings take effect after deployment; local development
with `pnpm dev` is unchanged.

### Geographic access policy (Cloudflare dashboard)

The intended policy is **Lisbon, Portugal, plus explicit administrative/monitoring
exceptions**. WAF rules are managed separately in the Cloudflare dashboard, not by
this repository; deploying the Worker does not create or validate them.

Use a custom rule with action **Block** matching:

```text
(http.host eq "wetexpo.prohound.io")
and not (ip.src.country eq "PT" and ip.src.city eq "Lisbon")
```

Before enabling it, configure the approved exceptions. Place the block before any
unrelated Skip rules that bypass remaining custom rules. Express exceptions explicitly
in the block condition, or place only the intended exception Skip rules before it;
review existing zone-wide skips rather than treating all of them as approved exceptions.
IP Access rules with action Allow bypass custom rules independently of this ordering.
A geographic Skip by itself does not block visitors outside Lisbon.

Location is inferred from the client IP, not verified physical presence. VPNs and
mobile networks may produce misleading city values; unknown locations match the block
unless explicitly exempted. Validate access from Lisbon, denial from another Portuguese
city and another country, and access for each approved exception. Confirm the rule ID
in Security Events for blocked requests and verify that alternative Worker URLs are
unavailable after deployment.

### Turnstile configuration

The public widget site key is configured as `vars.TURNSTILE_SITE_KEY` in
`wrangler.jsonc`. The registration form loads it through `GET /api/config` only when
`TURNSTILE_SECRET` is configured. Confirm the key and the allowed hostname
`wetexpo.prohound.io` in the Turnstile dashboard before deploying.

Deploy the widget integration before setting the secret on an existing deployment.
The form requires a valid widget token when verification is enabled, clears expired
tokens, and obtains a fresh token after every submission attempt. Loading failures
block submission and offer a retry. The server verifies tokens before reserving a stand.
Only public booth creation is protected by this widget; it is not a geographic access
rule and does not protect browsing or moderator authentication.

Without `TURNSTILE_SECRET`, the config endpoint returns a `null` site key and local
registration works without the widget, preserving the development flow. If the secret
is set but the site key is missing, the config endpoint returns 503 and the form stays
blocked. To test locally with verification enabled, configure a matching test site key
and secret in `.dev.vars` (see `.dev.vars.example`).

Keep the secret key out of source files, public variables, and chat. If exposed,
rotate it in the Turnstile dashboard. After deploying the widget integration, store the
replacement through the interactive prompt:

```bash
npx wrangler secret put TURNSTILE_SECRET
```

Verify a real widget-backed submission and rejection of missing/invalid tokens before
launching publicly.

---

## Security & privacy notes

- Submissions are **pending by default**; nothing is public until a moderator approves it.
- Edit links are **capability tokens**: 32 random bytes, stored only as a SHA-256 digest,
  shown to the owner once. They live in the URL fragment (`#token=…`) so they stay out of
  server logs and referrers.
- All submitted URLs must be **https**; user text is rendered as plain text (no raw HTML).
- `ADMIN_TOKEN` guards moderator endpoints — this is a simple shared secret for the MVP;
  replace it with real auth before adding multiple moderators.
- Turnstile verification is skipped when `TURNSTILE_SECRET` is unset (for local dev); set it
  before a public launch.

See [`docs/`](docs/) for the full product brief, MVP scope, data model, decisions and delivery plan.

## Status

MVP scaffold — complete end-to-end flow (discover → join, submit → moderate → publish → edit).
Not yet a production launch; see [`docs/DELIVERY-PLAN.md`](docs/DELIVERY-PLAN.md) for what's next.
