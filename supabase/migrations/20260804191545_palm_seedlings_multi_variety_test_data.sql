/*
# Palm seedlings (فسائل النخيل) multi-variety test data

1. Purpose
   - Adds a test opportunity in the "palm-seedlings" (فسائل النخيل) sub-sector
     with a structured `varieties` array containing 3 palm seedling varieties.
   - This enables the variety slider + detail view in the detail page.
   - Also enriches the 3 existing single-variety opportunities with
     growth_status, planting_ready, height, leaf_count, and age_unit so
     the detail view has richer data to show.

2. Tables affected
   - `opportunities` — INSERT one new row, UPDATE 3 existing rows.

3. Security
   - No schema changes. No RLS changes. Uses existing policies.

4. Important notes
   - The new opportunity uses sub_sector_id = 'c98aeb45-ac09-413a-8e34-b5b3d75985fe'
     (palm-seedlings / فسائل النخيل).
   - The `varieties` array follows the SeedlingVarietyEntry shape:
     variety_id, variety_name, seedling_count, min_weight, max_weight, avg_weight,
     age, age_unit, height, leaf_count, rooting_status, growth_status,
     planting_ready, price, pricing_type, images, description.
*/

-- Insert a multi-variety seedling offer
INSERT INTO opportunities (
  id,
  sector_id,
  sub_sector_id,
  operation_type,
  type,
  title,
  description,
  city,
  status,
  attributes,
  created_at
) VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f23456789012',
  '1bddad2e-b634-4eee-8d4e-aee2ef698da3',
  'c98aeb45-ac09-413a-8e34-b5b3d75985fe',
  'offer',
  'opportunity',
  'للبيع 350 فسيلة من أصناف متعددة - متجذرة وجاهزة للزراعة',
  'فسائل نخيل من أصناف متعددة متوفرة للبيع، جميعها متجذرة وجاهزة للزراعة مباشرة.',
  'الرياض',
  'active',
  '{
    "varieties": [
      {
        "variety_id": "sukari",
        "variety_name": "سكري",
        "seedling_count": 150,
        "min_weight": 15,
        "max_weight": 20,
        "avg_weight": 18,
        "age": 18,
        "age_unit": "month",
        "height": 1.2,
        "leaf_count": 8,
        "rooting_status": "متجذر",
        "growth_status": "ممتازة",
        "planting_ready": "جاهزة للزراعة",
        "price": 150,
        "pricing_type": "price",
        "images": [],
        "description": "فسائل سكري متجذرة بالكامل، عمر 18 شهر، وزن 15-20 كجم، جاهزة للزراعة مباشرة."
      },
      {
        "variety_id": "khalas",
        "variety_name": "خلاص",
        "seedling_count": 80,
        "min_weight": 12,
        "max_weight": 18,
        "avg_weight": 15,
        "age": 2,
        "age_unit": "year",
        "height": 1,
        "leaf_count": 7,
        "rooting_status": "جزئي",
        "growth_status": "جيدة",
        "planting_ready": "تحتاج فترة تجهيز",
        "price": 120,
        "pricing_type": "price",
        "images": [],
        "description": "فسائل خلاص متجذرة جزئياً، تحتاج فترة تجهيز قبل الزراعة، وزن 12-18 كجم."
      },
      {
        "variety_id": "barhi",
        "variety_name": "برحي",
        "seedling_count": 120,
        "min_weight": 18,
        "max_weight": 25,
        "avg_weight": 22,
        "age": 2,
        "age_unit": "year",
        "height": 1.5,
        "leaf_count": 10,
        "rooting_status": "متجذر",
        "growth_status": "ممتازة",
        "planting_ready": "جاهزة للزراعة",
        "price": 200,
        "pricing_type": "price",
        "images": [],
        "description": "فسائل برحي ممتازة، متجذرة بالكامل، وزن 18-25 كجم، جاهزة للزراعة مباشرة."
      }
    ]
  }'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  attributes = EXCLUDED.attributes,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status;

-- Enrich existing single-variety seedling opportunities
UPDATE opportunities
SET attributes = attributes || '{
  "growth_status": "ممتازة",
  "planting_ready": "جاهزة للزراعة",
  "height": 1.5,
  "leaf_count": 9,
  "age_unit": "year"
}'::jsonb
WHERE id = '4f7b6bcd-fb61-455f-b2fd-3daf250579ee';

UPDATE opportunities
SET attributes = attributes || '{
  "growth_status": "جيدة",
  "planting_ready": "جاهزة للزراعة",
  "height": 1.2,
  "leaf_count": 7,
  "age_unit": "year"
}'::jsonb
WHERE id = '3c8a5471-1479-4f3b-86f8-1f0e908b134a';

UPDATE opportunities
SET attributes = attributes || '{
  "growth_status": "ممتازة",
  "planting_ready": "جاهزة للزراعة",
  "height": 1.4,
  "leaf_count": 8,
  "age_unit": "year"
}'::jsonb
WHERE id = '48f8e40c-ec4e-4c0e-8f71-0a7ac64e08fb';
