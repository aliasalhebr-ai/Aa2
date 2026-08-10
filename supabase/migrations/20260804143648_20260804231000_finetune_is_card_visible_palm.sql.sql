/*
# Fine-tune is_card_visible flags for palm specialties

## Summary
Hide additional fields that should not appear as card indicators:
- varieties (multiselect, shown only in detail page)
- quantity_available (shown via quantity top-level field)
- unit_of_measure (meta field, not a key indicator on card)
- total_height (secondary to trunk_height for transplanted palms)
- min_trunk_height, max_trunk_height (demand fields, shown via quantity)

Keep only the 3-4 most important indicators per specialty/operation_type visible on the card.
*/

UPDATE specialty_field_definitions SET is_card_visible = false
WHERE field_key IN (
  'varieties', 'quantity_available', 'unit_of_measure',
  'total_height', 'min_trunk_height', 'max_trunk_height',
  'min_weight', 'max_weight'
)
AND specialty_id IN (
  SELECT id FROM sub_sectors WHERE sector_id = (SELECT id FROM sectors WHERE slug = 'palm')
);

-- Re-enable min_weight/max_weight for seedlings only (they ARE key indicators for seedlings)
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = 'c98aeb45-ac09-413a-8e34-b5b3d75985fe'
AND field_key IN ('min_weight', 'max_weight');

-- Re-enable min_trunk_height/max_trunk_height for transplanted palms demand
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5'
AND operation_type_id = 'demand'
AND field_key IN ('min_trunk_height', 'max_trunk_height');

-- Re-enable min_trunk_height for palm projects demand
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = 'bccaaa64-539d-42fd-9abb-614acc24c7b8'
AND operation_type_id = 'demand'
AND field_key = 'min_trunk_height';
