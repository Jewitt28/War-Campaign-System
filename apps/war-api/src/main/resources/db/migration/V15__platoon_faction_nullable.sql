-- Allow unaligned nations (no faction) to own platoons in single-player campaigns
ALTER TABLE platoon ALTER COLUMN faction_id DROP NOT NULL;
