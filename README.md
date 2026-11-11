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

---

## Architecture

```
index.html                 # SPA entry
src/                       # React SPA (client)
  main.tsx                 # router (/, /booths/:slug, /register, /edit/:id, /admin)
  components/              # Layout, BoothCard, HallMap
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
   # optional anti-bot:
   npx wrangler secret put TURNSTILE_SECRET
   ```
4. **Deploy:**
   ```bash
   pnpm deploy
   ```

The first deploy ships to a `*.workers.dev` subdomain (free). Add a custom domain later.

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
