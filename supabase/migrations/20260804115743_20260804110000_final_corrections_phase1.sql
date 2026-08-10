/*
# Final corrections for Phase 1

## 1. Create "مصانع التمور" (Date Factories) sector
Approved as an independent main sector after the Palm sector.
Includes: factories, industrial investment, sorting, packaging,
wrapping, processing, and packaged/manufactured products.

## 2. Move factory opportunity to date-factories sector
"فرصة استثمار في مصنع تعبئة تمور" does NOT belong in palm-projects.
It moves to the date-factories sector with sub_sector_id = NULL
(no sub-sectors created yet in that sector).

## 3. Move packaged date products to date-factories sector
Both products contain "معبأ" (packaged) in name/description — they are
manufactured products, not raw farm fruit. They move to date-factories
with sub_sector_id = NULL.

## 4. Fix palm-prunings slug → transplanted-palms
"prunings" means residues/pruning products, which is semantically wrong
for نقايل النخيل (transplanted palms). Changed to "transplanted-palms".
All relationships use UUID (id), not slug — no FK breakage.

## 5. Fix صقعي variety slug: sugha → saghai
"sugha" is an inconsistent transliteration. "saghai" is the standard
international spelling. Relationships use UUID (id), not slug.
*/

-- ── 1. Shift existing sectors to make room for date-factories at position 2 ──
UPDATE sectors SET display_order = display_order + 1
  WHERE display_order >= 2;

-- ── 2. Create date-factories sector ──
INSERT INTO sectors (id, name, slug, display_order, is_active)
VALUES (
  gen_random_uuid(),
  'مصانع التمور',
  'date-factories',
  2,
  true
)
ON CONFLICT (slug) DO NOTHING;

-- ── 3. Move factory opportunity to date-factories sector ──
UPDATE opportunities
SET sector_id = (SELECT id FROM sectors WHERE slug = 'date-factories'),
    sub_sector_id = NULL
WHERE id = 'e3c302c3-a797-425b-b306-40a209bbe8f7';

-- ── 4. Move packaged products to date-factories sector ──
UPDATE products
SET sector_id = (SELECT id FROM sectors WHERE slug = 'date-factories'),
    sub_sector_id = NULL
WHERE id IN (
  'c4bffb4b-03d0-465b-b1a8-be25f781c002',  -- تمر خلاص معبأ
  '387ce58f-72cc-4f19-bf66-7cac3b6cebbd'   -- تمر سكري فاخر
);

-- ── 5. Fix palm-prunings slug → transplanted-palms ──
UPDATE sub_sectors
SET slug = 'transplanted-palms'
WHERE slug = 'palm-prunings'
  AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- ── 6. Fix صقعي variety slug: sugha → saghai ──
UPDATE palm_varieties
SET slug = 'saghai'
WHERE slug = 'sugha';
