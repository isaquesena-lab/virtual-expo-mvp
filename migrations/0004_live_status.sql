-- Live presence: the exhibitor's open booth page sends a heartbeat that pushes
-- live_until (unix seconds) forward. A booth counts as live while now < live_until,
-- so a closed tab or lost connection expires on its own.
ALTER TABLE booths ADD COLUMN live_until INTEGER;
