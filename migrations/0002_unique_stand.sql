-- One company per stand slot: a booth_code may be held by at most one
-- non-rejected booth. A pending submission reserves its slot immediately;
-- rejecting a booth frees the slot again.
CREATE UNIQUE INDEX IF NOT EXISTS idx_booths_slot_unique
  ON booths(booth_code)
  WHERE booth_code IS NOT NULL AND status <> 'rejected';
