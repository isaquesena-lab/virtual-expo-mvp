-- Uploaded company logo, stored as base64 text (small, re-encoded client-side) so no
-- extra storage binding is needed. When logo_data is set it wins over logo_url.
ALTER TABLE booths ADD COLUMN logo_data TEXT;
ALTER TABLE booths ADD COLUMN logo_type TEXT;
ALTER TABLE booths ADD COLUMN logo_updated_at TEXT;
