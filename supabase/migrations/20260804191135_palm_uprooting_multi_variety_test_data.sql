/*
# Palm uprooting (نقايل) multi-variety test data

1. Purpose
   - Adds a test opportunity in the "transplanted-palms" (نقايل النخيل) sub-sector
     with a structured `varieties` array containing 4 palm varieties.
   - This enables the variety slider + detail view in the detail page.
   - Also enriches the 3 existing single-variety opportunities with root_status
     and uprooting_date so the detail view has richer data to show.

2. Tables affected
   - `opportunities` — INSERT one new row, UPDATE 3 existing rows.

3. Security
   - No schema changes. No RLS changes. Uses existing policies.

4. Important notes
   - The new opportunity uses sub_sector_id = '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5'
     (transplanted-palms / نقايل النخيل).
   - The `varieties` array follows the UprootingVarietyEntry shape:
     variety_id, variety_name, count, min_height, max_height, trunk_diameter,
     age_years, readiness_status, health_status, root_status, uprooting_date,
     price, pricing_type, images, description.
*/

-- Insert a multi-variety uprooting offer
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
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '1bddad2e-b634-4eee-8d4e-aee2ef698da3',
  '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5',
  'offer',
  'opportunity',
  'للبيع 80 نقلة من أصناف متعددة - جاهزة للقلع',
  'نقايل نخيل من أصناف متعددة متوفرة للبيع، جميعها ممتازة الحالة وجاهزة للقلع خلال أسبوع.',
  'القصيم',
  'active',
  '{
    "varieties": [
      {
        "variety_id": "sukari",
        "variety_name": "سكري",
        "count": 25,
        "min_height": 3,
        "max_height": 4,
        "trunk_diameter": 45,
        "age_years": 8,
        "readiness_status": "جاهز",
        "health_status": "ممتازة",
        "root_status": "مجهزة للنقل",
        "uprooting_date": "جاهزة الآن",
        "price": 2500,
        "pricing_type": "price",
        "images": [],
        "description": "نقايل سكري ممتازة، ارتفاع 3-4 أمتار، مقلوعة وجاهزة للنقل مباشرة."
      },
      {
        "variety_id": "khalas",
        "variety_name": "خلاص",
        "count": 18,
        "min_height": 2,
        "max_height": 3,
        "trunk_diameter": 40,
        "age_years": 6,
        "readiness_status": "يحتاج تهيئة",
        "health_status": "جيدة",
        "root_status": "ملفوفة بالخيش",
        "uprooting_date": "بعد أسبوع",
        "price": 1800,
        "pricing_type": "price",
        "images": [],
        "description": "نقايل خلاص جيدة الحالة، تحتاج تجهيز قبل القلع، متوفرة بكميات."
      },
      {
        "variety_id": "barhi",
        "variety_name": "برحي",
        "count": 12,
        "min_height": 3,
        "max_height": 5,
        "trunk_diameter": 50,
        "age_years": 10,
        "readiness_status": "جاهز",
        "health_status": "ممتازة",
        "root_status": "جذور مكشوفة",
        "uprooting_date": "جاهزة الآن",
        "price": 3000,
        "pricing_type": "price",
        "images": [],
        "description": "نقايل برحي ممتازة، ارتفاع 3-5 أمتار، جذور مكشوفة وجاهزة للنقل."
      },
      {
        "variety_id": "saghai",
        "variety_name": "صقعي",
        "count": 9,
        "min_height": 4,
        "max_height": 6,
        "trunk_diameter": 55,
        "age_years": 12,
        "readiness_status": "غير جاهز",
        "health_status": "جيدة",
        "root_status": "داخل حاوية",
        "uprooting_date": "بعد شهر",
        "price": null,
        "pricing_type": "quote",
        "images": [],
        "description": "نقايل صقعي عالية الجودة، تحتاج وقت للتهيئة، السعر عند الطلب."
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

-- Enrich existing single-variety opportunities with root_status and uprooting_date
UPDATE opportunities
SET attributes = attributes || '{
  "root_status": "مجهزة للنقل",
  "uprooting_date": "جاهزة الآن",
  "trunk_diameter": 45,
  "age_years": 8,
  "price": 2500
}'::jsonb
WHERE id = 'ef3bfab9-0b11-49ed-a1e4-214ed3353b2c';

UPDATE opportunities
SET attributes = attributes || '{
  "root_status": "ملفوفة بالخيش",
  "uprooting_date": "بعد أسبوع",
  "trunk_diameter": 40,
  "age_years": 6,
  "price": 1800
}'::jsonb
WHERE id = 'f8caa697-b089-42b5-91d9-4e826a11c248';

UPDATE opportunities
SET attributes = attributes || '{
  "root_status": "جذور مكشوفة",
  "uprooting_date": "بعد شهر",
  "trunk_diameter": 50,
  "age_years": 10
}'::jsonb
WHERE id = '5b6a9faa-dbeb-4108-9a44-b4bb8254dcfa';
