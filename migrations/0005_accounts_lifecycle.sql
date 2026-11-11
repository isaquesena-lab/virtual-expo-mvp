-- Accounts, magic-link login and stand lifecycle.
--
-- accounts: one row per verified owner email. A booth is linked to the account
-- whose email matches its owner_email at first login (claim).
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- login_codes: single-use magic-link codes. Only the SHA-256 digest is stored.
-- expires_at / consumed_at are epoch seconds.
CREATE TABLE IF NOT EXISTS login_codes (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_codes_account ON login_codes(account_id);

-- sessions: cookie bearer tokens (digest only), 30-day sliding expiry.
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);

-- SQLite cannot alter a CHECK constraint, so rebuild `booths` to (a) accept the
-- new 'expired' status and (b) carry the lifecycle columns. Data is copied over;
-- indexes are recreated afterwards.
CREATE TABLE booths_v5 (
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
    CHECK (status IN ('pending', 'approved', 'rejected', 'hidden', 'expired')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  logo_data TEXT,
  logo_type TEXT,
  logo_updated_at TEXT,
  live_until INTEGER,
  account_id TEXT REFERENCES accounts(id),
  approved_at TEXT,
  expires_at INTEGER
);

INSERT INTO booths_v5
  (id, slug, company_name, tagline, description, category, zone, booth_code,
   position_x, position_y, logo_url, website_url, meet_url, owner_email,
   edit_token_hash, status, created_at, updated_at,
   logo_data, logo_type, logo_updated_at, live_until)
SELECT id, slug, company_name, tagline, description, category, zone, booth_code,
   position_x, position_y, logo_url, website_url, meet_url, owner_email,
   edit_token_hash, status, created_at, updated_at,
   logo_data, logo_type, logo_updated_at, live_until
FROM booths;

DROP TABLE booths;
ALTER TABLE booths_v5 RENAME TO booths;

CREATE INDEX IF NOT EXISTS idx_booths_public ON booths(status, category, zone);
CREATE INDEX IF NOT EXISTS idx_booths_code ON booths(booth_code);

-- Free stand slots held by expired booths: 'expired' (like 'rejected') no longer
-- reserves a slot.
CREATE UNIQUE INDEX IF NOT EXISTS idx_booths_slot_unique
  ON booths(booth_code)
  WHERE booth_code IS NOT NULL AND status NOT IN ('rejected', 'expired');
