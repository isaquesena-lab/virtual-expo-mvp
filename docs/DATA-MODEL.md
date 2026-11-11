# Initial data model

This schema is a sketch for Cloudflare D1 (SQLite) and should evolve alongside actual API validation.

```sql
CREATE TABLE booths (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  tagline TEXT,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  zone TEXT,
  booth_code TEXT,
  position_x REAL CHECK (position_x BETWEEN 0 AND 100),
  position_y REAL CHECK (position_y BETWEEN 0 AND 100),
  logo_url TEXT,
  website_url TEXT,
  meeting_type TEXT NOT NULL DEFAULT 'google_meet',
  meet_url TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  edit_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_booths_public ON booths(status, category, zone);
CREATE INDEX idx_booths_code ON booths(booth_code);
```

## Public projection

Return only fields needed to render a booth. Never return `owner_email` or `edit_token_hash` from public queries. Do not expose moderation notes if such fields are added later.

## Edit token lifecycle

- Generate at least 32 cryptographically random bytes on the server.
- Store only a one-way digest. Use timing-safe comparison where applicable.
- Treat the URL as a bearer credential; never put it into analytics or referrer logs.
- Prefer edit-token delivery after email ownership verification. Otherwise consider disabling public editing for launch and using moderator-mediated changes.
- Allow token rotation/revocation and maintain recovery procedure.

## Registration handling

- Validate company size and descriptions; trim and normalize input.
- Validate meeting and website URLs with allowlisted HTTPS schemes; validate the selected provider's host and URL shape for Google Meet or YouTube Live.
- Escape rendered text; reject injected markup and unsafe image URLs.
- Do not accept arbitrary `position_x/y`, status or moderation flags from the public form.
- Check for duplicates and impersonation before approval.

## Coordinate behavior

- Zone and position are optional while a submission is pending.
- A new hall can be created using an additional `zones` table later.
- For launch, a generic placement grid is sufficient; exact reproduction requires approved data.
