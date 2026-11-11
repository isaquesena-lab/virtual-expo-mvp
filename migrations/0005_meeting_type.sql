-- The URL continues to be stored in meet_url for backwards compatibility.
-- Existing booths were all Google Meet booths before this column existed.
ALTER TABLE booths ADD COLUMN meeting_type TEXT NOT NULL DEFAULT 'google_meet'
  CHECK (meeting_type IN ('google_meet', 'youtube_live'));
