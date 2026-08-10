-- Add parent_id to sub_sectors for branching (sub-sectors can have sub-branches)
ALTER TABLE sub_sectors ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES sub_sectors(id) ON DELETE SET NULL;

-- Add index for faster parent lookups
CREATE INDEX IF NOT EXISTS idx_sub_sectors_parent_id ON sub_sectors(parent_id) WHERE parent_id IS NOT NULL;

-- Insert some sample sub-branches under existing sub-sectors
-- First, let's find a few sub-sectors to add branches to
INSERT INTO sub_sectors (sector_id, parent_id, name, slug, icon, display_order, is_active)
SELECT s.sector_id, s.id, 'بذور عضوية', 'organic-seeds', '🌱', 1, true
FROM sub_sectors s
WHERE s.slug = 'seeds' AND s.parent_id IS NULL
LIMIT 1;

INSERT INTO sub_sectors (sector_id, parent_id, name, slug, icon, display_order, is_active)
SELECT s.sector_id, s.id, 'بذور تقليدية', 'traditional-seeds', '🌾', 2, true
FROM sub_sectors s
WHERE s.slug = 'seeds' AND s.parent_id IS NULL
LIMIT 1;

INSERT INTO sub_sectors (sector_id, parent_id, name, slug, icon, display_order, is_active)
SELECT s.sector_id, s.id, 'أبقار حلوب', 'dairy-cows', '🐄', 1, true
FROM sub_sectors s
WHERE s.slug = 'cattle' AND s.parent_id IS NULL
LIMIT 1;

INSERT INTO sub_sectors (sector_id, parent_id, name, slug, icon, display_order, is_active)
SELECT s.sector_id, s.id, 'أبقار لحم', 'beef-cows', '🐂', 2, true
FROM sub_sectors s
WHERE s.slug = 'cattle' AND s.parent_id IS NULL
LIMIT 1;

INSERT INTO sub_sectors (sector_id, parent_id, name, slug, icon, display_order, is_active)
SELECT s.sector_id, s.id, 'دواجن بيض', 'egg-poultry', '🐔', 1, true
FROM sub_sectors s
WHERE s.slug = 'poultry' AND s.parent_id IS NULL
LIMIT 1;

INSERT INTO sub_sectors (sector_id, parent_id, name, slug, icon, display_order, is_active)
SELECT s.sector_id, s.id, 'دواجن لحم', 'meat-poultry', '🦃', 2, true
FROM sub_sectors s
WHERE s.slug = 'poultry' AND s.parent_id IS NULL
LIMIT 1;
