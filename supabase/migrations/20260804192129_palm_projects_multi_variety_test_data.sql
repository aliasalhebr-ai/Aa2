/*
# Palm projects (نخيل المشاريع) multi-variety test data

1. Purpose
   - Adds a test opportunity in the "palm-projects" (نخيل المشاريع) sub-sector
     with a structured `varieties` array containing 4 palm varieties and
     full project info (project type, requesting entity, service scope,
     delivery schedule, inclusions).
   - Also enriches the existing single-variety project opportunity with
     root_condition, trunk_diameter, and age for richer detail display.

2. Tables affected
   - `opportunities` — INSERT one new row, UPDATE one existing row.

3. Security
   - No schema changes. No RLS changes. Uses existing policies.

4. Important notes
   - The new opportunity uses sub_sector_id = 'bccaaa64-539d-42fd-9abb-614acc24c7b8'
     (palm-projects / نخيل المشاريع).
   - The `varieties` array follows the ProjectVarietyEntry shape.
   - The project-level fields follow the ProjectInfo shape.
*/

-- Insert a multi-variety project offer
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
  'c3d4e5f6-a7b8-9012-cdef-345678901234',
  '1bddad2e-b634-4eee-8d4e-aee2ef698da3',
  'bccaaa64-539d-42fd-9abb-614acc24c7b8',
  'offer',
  'opportunity',
  'توريد وغرس 850 نخلة لمشروع تشجير الطرق - أصناف متعددة',
  'مشروع تشجير طرق يتطلب توريد وغرس 850 نخلة من أصناف متعددة، يشمل القلع والنقل والغرس والتكريب والصيانة لمدة 6 أشهر.',
  'الرياض',
  'active',
  '{
    "project_name": "مشروع تشجير طريق الملك عبدالله",
    "project_type": "مشاريع الطرق",
    "requesting_entity": "أمانة منطقة الرياض",
    "project_location": "الرياض - طريق الملك عبدالله",
    "total_quantity": 850,
    "start_date": "1 أكتوبر 2026",
    "execution_duration": "3 أشهر",
    "offer_deadline": "15 سبتمبر 2026",
    "delivery_schedule": "3 دفعات · 100 نخلة كل أسبوع",
    "total_price": 750000,
    "pricing_type": "price",
    "service_scope": ["توريد النخيل", "القلع", "النقل", "الغرس", "التكريب", "التقليم", "الصيانة", "استبدال النخيل التالف"],
    "includes_planting": true,
    "includes_uprooting": true,
    "includes_transport": true,
    "includes_pruning": true,
    "includes_maintenance": true,
    "project_description": "مشروع متكامل لتوريد وغرس نخيل الطرق بأصناف متعددة مع ضمان الصيانة لمدة 6 أشهر واستبدال التالف.",
    "varieties": [
      {
        "variety_id": "sukari",
        "variety_name": "سكري",
        "palm_count": 300,
        "min_height": 4,
        "max_height": 5,
        "height_range": "4–5 أمتار",
        "age": 8,
        "trunk_diameter": 45,
        "kerb_status": "سليم",
        "takreb_type": "هلالي",
        "root_status": "مجهزة للغرس",
        "readiness_status": "جاهزة للنقل والغرس",
        "unit_price": 2500,
        "pricing_type": "price",
        "delivery_date": "1 أكتوبر 2026",
        "images": [],
        "description": "نخيل سكري بارتفاع 4-5 أمتار، كرب سليم، تكريب هلالي، جاهز للنقل والغرس مباشرة."
      },
      {
        "variety_id": "khalas",
        "variety_name": "خلاص",
        "palm_count": 200,
        "min_height": 3,
        "max_height": 4,
        "height_range": "3–4 أمتار",
        "age": 6,
        "trunk_diameter": 40,
        "kerb_status": "سليم مع ملاحظات",
        "takreb_type": "عادي",
        "root_status": "ملفوفة بالخيش",
        "readiness_status": "تحتاج تجهيز",
        "unit_price": 1800,
        "pricing_type": "price",
        "delivery_date": "15 أكتوبر 2026",
        "images": [],
        "description": "نخيل خلاص بارتفاع 3-4 أمتار، يحتاج تجهيز قبل النقل، تكريب عادي."
      },
      {
        "variety_id": "barhi",
        "variety_name": "برحي",
        "palm_count": 150,
        "min_height": 3,
        "max_height": 5,
        "height_range": "3–5 أمتار",
        "age": 10,
        "trunk_diameter": 50,
        "kerb_status": "سليم",
        "takreb_type": "هلالي",
        "root_status": "مقلوعة حديثًا",
        "readiness_status": "جاهزة للقلع",
        "unit_price": 3000,
        "pricing_type": "price",
        "delivery_date": "1 نوفمبر 2026",
        "images": [],
        "description": "نخيل برحي ممتاز، ارتفاع 3-5 أمتار، مقلوع حديثاً وجاهز للنقل."
      },
      {
        "variety_id": "saghai",
        "variety_name": "صقعي",
        "palm_count": 200,
        "min_height": 5,
        "max_height": 7,
        "height_range": "5–7 أمتار",
        "age": 12,
        "trunk_diameter": 55,
        "kerb_status": "سليم",
        "takreb_type": "حسب طلب المشروع",
        "root_status": "داخل حاوية",
        "readiness_status": "متوفرة على دفعات",
        "unit_price": null,
        "pricing_type": "quote",
        "delivery_date": "حسب جدول المشروع",
        "images": [],
        "description": "نخيل صقعي عالي الجودة بارتفاع 5-7 أمتار، متوفر على دفعات، السعر حسب الطلب."
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

-- Enrich existing single-variety project opportunity
UPDATE opportunities
SET attributes = attributes || '{
  "root_condition": "سليمة",
  "trunk_diameter": 45,
  "age": 8,
  "project_type": "مشاريع التشجير",
  "requesting_entity": "وزارة البيئة",
  "project_location": "الرياض",
  "execution_duration": "2 أشهر",
  "offer_deadline": "1 سبتمبر 2026",
  "includes_planting": true,
  "includes_transport": true,
  "includes_pruning": true,
  "includes_maintenance": false,
  "service_scope": ["توريد النخيل", "النقل", "الغرس", "التكريب"]
}'::jsonb
WHERE id = '2e76de26-c0f9-4507-80fc-d22babed0192';
