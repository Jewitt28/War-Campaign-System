-- Nation colour (for custom / unaligned nations that have no faction colour)
ALTER TABLE nation ADD COLUMN IF NOT EXISTS color VARCHAR(20);
