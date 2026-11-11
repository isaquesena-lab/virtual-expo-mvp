-- Virtual Expo MVP — initial schema (Cloudflare D1 / SQLite)
CREATE TABLE IF NOT EXISTS booths (
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
  meet_url TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  edit_token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'hidden')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_booths_public ON booths(status, category, zone);
CREATE INDEX IF NOT EXISTS idx_booths_code ON booths(booth_code);
