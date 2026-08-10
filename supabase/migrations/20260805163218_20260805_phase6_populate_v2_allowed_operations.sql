/*
# Phase 6: Populate allowed_operations for V2 sub-sectors

The Publishing Engine reads allowed operation types from sub_sectors.allowed_operations.
For V2 sectors (nursery), the sub-sectors need to have offer/demand/partnership operations.
*/

-- Update nursery sub-sectors to include V2 operation types
UPDATE sub_sectors
SET allowed_operations = '[
  {"id": "offer", "label": "عرض", "icon": "Tag", "is_active": true},
  {"id": "demand", "label": "احتياج", "icon": "ShoppingCart", "is_active": true},
  {"id": "partnership", "label": "شراكة", "icon": "Handshake", "is_active": true}
]'::jsonb
WHERE sector_id = '73e613d6-e10e-4b1d-aef1-b0f591df9d03'
  AND is_active = true
  AND (allowed_operations IS NULL OR jsonb_array_length(COALESCE(allowed_operations, '[]'::jsonb)) = 0);

-- Verify
SELECT id, name, slug,
       jsonb_array_length(COALESCE(allowed_operations, '[]'::jsonb)) as ops_count
FROM sub_sectors
WHERE sector_id = '73e613d6-e10e-4b1d-aef1-b0f591df9d03'
  AND is_active = true
ORDER BY display_order;
