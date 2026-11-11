-- Where the company comes from. country is an ISO 3166-1 alpha-2 code (validated in the Worker).
ALTER TABLE booths ADD COLUMN city TEXT;
ALTER TABLE booths ADD COLUMN country TEXT;
