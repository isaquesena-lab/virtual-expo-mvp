-- Seed data for local development.
-- All companies below are fictional. Meeting links are safe placeholders.
-- Stand codes map to the shared floor plan (shared/stands.ts): 4 pavilions,
-- 880 stands across the ALPHA / BETA / GROWTH tiers.
-- edit_token_hash is a non-matching placeholder: seed booths cannot be edited
-- via the public edit flow (edit them through the moderator endpoint instead).

DELETE FROM booths WHERE id LIKE 'seed-%';

INSERT INTO booths
  (id, slug, company_name, tagline, description, category, zone, booth_code,
   logo_url, website_url, meet_url, owner_email, edit_token_hash, status)
VALUES
  ('seed-01', 'northwind-ai', 'Northwind AI',
   'Decision intelligence for operations teams',
   'Northwind AI builds forecasting and anomaly-detection tooling that plugs into existing data warehouses. Visit our booth for a live demo of real-time alerting.',
   'AI & Data', 'Pavilhão 1', 'P1-005',
   NULL, 'https://example.com', 'https://meet.google.com/abc-defg-hij',
   'seed@example.com', '0000000000000000000000000000000000000000000000000000000000000000', 'approved'),

  ('seed-02', 'lumen-pay', 'Lumen Pay',
   'Instant settlement for marketplaces',
   'Lumen Pay offers embedded payments and payout rails for digital marketplaces, with built-in reconciliation and fraud scoring.',
   'Fintech', 'Pavilhão 1', 'P1-030',
   NULL, 'https://example.com', 'https://meet.google.com/abc-defg-hij',
   'seed@example.com', '0000000000000000000000000000000000000000000000000000000000000000', 'approved'),

  ('seed-03', 'verdant-health', 'Verdant Health',
   'Remote care coordination made simple',
   'Verdant Health connects clinics and patients through lightweight follow-up workflows and secure messaging. Stop by to see our triage assistant.',
   'Healthtech', 'Pavilhão 2', 'P2-012',
   NULL, 'https://example.com', 'https://meet.google.com/abc-defg-hij',
   'seed@example.com', '0000000000000000000000000000000000000000000000000000000000000000', 'approved'),

  ('seed-04', 'bridge-ops', 'Bridge Ops',
   'Workflow automation for logistics',
   'Bridge Ops automates dispatch, tracking and exception handling for mid-size carriers. Talk to our team about pilot programs.',
   'SaaS', 'Pavilhão 2', 'P2-170',
   NULL, 'https://example.com', 'https://meet.google.com/abc-defg-hij',
   'seed@example.com', '0000000000000000000000000000000000000000000000000000000000000000', 'approved'),

  ('seed-05', 'atlas-robotics', 'Atlas Robotics',
   'Affordable automation for small warehouses',
   'Atlas Robotics designs compact pick-and-place units that fit existing shelving. Live hardware demo at our booth.',
   'Hardware', 'Pavilhão 3', 'P3-008',
   NULL, 'https://example.com', 'https://meet.google.com/abc-defg-hij',
   'seed@example.com', '0000000000000000000000000000000000000000000000000000000000000000', 'approved'),

  ('seed-06', 'signal-loop', 'Signal Loop',
   'Customer feedback that routes itself',
   'Signal Loop collects product feedback across channels and routes it to the right team automatically with sentiment tagging.',
   'Marketing', 'Pavilhão 3', 'P3-210',
   NULL, 'https://example.com', 'https://meet.google.com/abc-defg-hij',
   'seed@example.com', '0000000000000000000000000000000000000000000000000000000000000000', 'approved'),

  ('seed-07', 'cobalt-labs', 'Cobalt Labs',
   'Developer tooling for edge apps',
   'Cobalt Labs ships SDKs and observability for applications running at the edge. Pending review — not yet visible to visitors.',
   'Developer Tools', 'Pavilhão 4', 'P4-015',
   NULL, 'https://example.com', 'https://meet.google.com/abc-defg-hij',
   'seed@example.com', '0000000000000000000000000000000000000000000000000000000000000000', 'pending');
