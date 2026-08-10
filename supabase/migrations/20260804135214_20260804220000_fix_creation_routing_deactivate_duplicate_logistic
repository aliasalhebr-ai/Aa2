/*
# Fix Creation Routing — Deactivate Duplicate Logistics Sub-sector, Activate Operations

## 1. Deactivate the duplicate "palm-logistics" sub-sector inside palm sector
   Logistics is a main sector, not a palm sub-sector. The logistics_request option
   should appear inside each palm specialty's creation menu instead.

## 2. Activate auction_request and logistics_request operations in palm specialties
   These were set to is_active: false — they should be true so they appear
   in the creation menu when a user is inside a palm specialty.

## 3. Create a main "اللوجستيات الزراعية" sector if it doesn't exist
   So users can access the Logistics Center from the main sector slider.
*/

-- ═══════════════════════════════════════════════════════════
-- 1. Deactivate duplicate palm-logistics sub-sector
-- ═══════════════════════════════════════════════════════════

UPDATE sub_sectors
SET is_active = false
WHERE slug = 'palm-logistics';

-- ═══════════════════════════════════════════════════════════
-- 2. Activate auction_request and logistics_request in palm specialties
--    Set is_active: true for these operations in allowed_operations
-- ═══════════════════════════════════════════════════════════

UPDATE sub_sectors
SET allowed_operations = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'id' IN ('auction_request', 'logistics_request') THEN
        jsonb_set(elem, '{is_active}', 'true')
      ELSE elem
    END
  )
  FROM jsonb_array_elements(allowed_operations) AS elem
)
WHERE sector_id = (SELECT id FROM sectors WHERE slug = 'palm')
  AND is_active = true
  AND allowed_operations IS NOT NULL
  AND jsonb_array_length(allowed_operations) > 0;

-- ═══════════════════════════════════════════════════════════
-- 3. Create main logistics sector if it doesn't exist
-- ═══════════════════════════════════════════════════════════

INSERT INTO sectors (name, slug, description, icon, display_order, is_active, is_featured, search_placeholder, available_actions, filter_configuration)
SELECT
  'اللوجستيات الزراعية', 'logistics',
  'نقل وتأجير المعدات والخدمات اللوجستية للقطاع الزراعي',
  'Truck', 5, true, false,
  'ابحث عن خدمة لوجستية...',
  '[]'::jsonb, '[]'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM sectors WHERE slug = 'logistics'
);
