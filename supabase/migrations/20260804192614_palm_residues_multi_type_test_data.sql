/*
# Palm residues (مخلفات النخيل) multi-type test data

1. Purpose
   - Adds a test opportunity in the "palm-residues" (مخلفات النخيل) sub-sector
     with a structured `residues` array containing 6 residue types:
     سعف (fronds), جريد (frond_strips), كرب (kerb), ليف (fiber),
     جذوع (trunks), مخلفات مختلطة (mixed).
   - Each residue entry has its own quantity_method, condition, preparation,
     price, loading/transport info, and suggested uses.
   - Also enriches the 4 existing single-residue opportunities with
     residue_condition, loading_readiness, and description for richer display.

2. Tables affected
   - `opportunities` — INSERT one new row, UPDATE 4 existing rows.

3. Security
   - No schema changes. No RLS changes. Uses existing policies.

4. Important notes
   - The new opportunity uses sub_sector_id = '7f56b186-0755-42c0-a4a1-113e5717dde7'
     (palm-residues / مخلفات النخيل).
   - The `residues` array follows the ResidueEntry shape.
*/

-- Insert a multi-residue offer
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
  'd4e5f6a7-b8c9-0123-def4-456789012345',
  '1bddad2e-b634-4eee-8d4e-aee2ef698da3',
  '7f56b186-0755-42c0-a4a1-113e5717dde7',
  'offer',
  'opportunity',
  'مخلفات نخيل متنوعة من مزرعة كاملة - سعف وجريد وكرب وليف وجذوع',
  'مخلفات نخيل ناتجة من تكريب وتقليم وقلع مزرعة كاملة، أنواع متعددة متوفرة للبيع أو التسليم.',
  'القصيم',
  'active',
  '{
    "residues": [
      {
        "residue_type": "fronds",
        "residue_label": "السعف",
        "quantity_method": "weight",
        "weight_value": 3,
        "weight_unit": "ton",
        "measurement_accuracy": "وزن مؤكد",
        "residue_condition": "جاف",
        "preparation_form": "مربوط في حزم",
        "average_length": 2.5,
        "length_range": "2-3 متر",
        "bundle_weight": 15,
        "residue_source": "تكريب",
        "suggested_uses": ["أعلاف", "سماد عضوي", "حطب أو وقود حيوي"],
        "loading_available": true,
        "labor_available": true,
        "equipment_available": false,
        "transport_available": true,
        "truck_access": "طريق ممهد مناسب للشاحنات",
        "availability_date": "جاهز الآن",
        "pickup_window": "خلال أسبوعين",
        "price": 300,
        "pricing_type": "price",
        "images": [],
        "description": "سعف جاف مربوط في حزم، وزن مؤكد 3 أطنان، ناتج عن تكريب مزرعة كاملة."
      },
      {
        "residue_type": "frond_strips",
        "residue_label": "الجريد",
        "quantity_method": "count",
        "count_value": 420,
        "count_unit": "piece",
        "measurement_accuracy": "عدد دقيق",
        "residue_condition": "طازج",
        "preparation_form": "كامل",
        "average_length": 3,
        "residue_source": "تقليم",
        "suggested_uses": "أعمال حرفية",
        "loading_available": true,
        "labor_available": true,
        "equipment_available": true,
        "transport_available": false,
        "truck_access": "طريق ترابي",
        "availability_date": "جاهز بعد 3 أيام",
        "pickup_window": "خلال 10 أيام",
        "price": 2,
        "pricing_type": "price",
        "images": [],
        "description": "جريد طازج كامل، 420 قطعة، مناسب للأعمال الحرفية."
      },
      {
        "residue_type": "kerb",
        "residue_label": "الكرب",
        "quantity_method": "manual_desc",
        "manual_quantity_desc": "كمية تقديرية حسب الطلب، مخلفات كرب ناتجة من قلع 50 نخلة",
        "residue_condition": "مختلط",
        "preparation_form": "غير مجهز",
        "residue_source": "قلع نخيل",
        "suggested_uses": ["سماد عضوي", "إعادة تدوير"],
        "loading_available": false,
        "labor_available": false,
        "equipment_available": false,
        "transport_available": null,
        "truck_access": null,
        "availability_date": "حسب الطلب",
        "pickup_window": "حسب الاتفاق",
        "price": null,
        "pricing_type": "quote",
        "images": [],
        "description": "كرب ناتج من قلع 50 نخلة، كمية تقديرية، يحتاج تجهيز قبل التحميل."
      },
      {
        "residue_type": "fiber",
        "residue_label": "الليف",
        "quantity_method": "weight",
        "weight_value": 500,
        "weight_unit": "kg",
        "measurement_accuracy": "وزن تقديري",
        "residue_condition": "جاف",
        "preparation_form": "مفروم",
        "residue_source": "تكريب",
        "suggested_uses": "أعمال حرفية",
        "loading_available": true,
        "labor_available": false,
        "equipment_available": false,
        "transport_available": true,
        "truck_access": "طريق ممهد",
        "availability_date": "جاهز الآن",
        "pickup_window": "خلال شهر",
        "price": null,
        "pricing_type": "free",
        "images": [],
        "description": "ليف جاف مفروم، مجاناً مقابل النقل والتحميل."
      },
      {
        "residue_type": "trunks",
        "residue_label": "الجذوع",
        "quantity_method": "count",
        "count_value": 50,
        "count_unit": "piece",
        "measurement_accuracy": "عدد دقيق",
        "residue_condition": "جاف",
        "preparation_form": "مقطع",
        "average_length": 2,
        "length_range": "1.5-3 متر",
        "residue_source": "قلع نخيل",
        "suggested_uses": ["حطب أو وقود حيوي", "تصنيع ألواح"],
        "loading_available": true,
        "labor_available": true,
        "equipment_available": true,
        "transport_available": true,
        "truck_access": "تحتاج رافعة للتحميل",
        "availability_date": "جاهز بعد أسبوع",
        "pickup_window": "خلال شهر",
        "price": 150,
        "pricing_type": "price",
        "images": [],
        "description": "جذوع مقطوعة من قلع 50 نخلة، تحتاج رافعة للتحميل."
      },
      {
        "residue_type": "mixed",
        "residue_label": "مخلفات مختلطة",
        "quantity_method": "manual_desc",
        "manual_quantity_desc": "مخلفات مختلطة متراكمة من موسم كامل، تشمل سعف وجريد وليف، الكمية حسب الحاجة",
        "residue_condition": "مختلط",
        "preparation_form": "غير مجهز",
        "residue_source": "مخلفات موسمية",
        "suggested_uses": ["سماد عضوي", "إعادة تدوير", "حطب أو وقود حيوي"],
        "loading_available": true,
        "labor_available": true,
        "equipment_available": false,
        "transport_available": true,
        "truck_access": "طريق ممهد مناسب",
        "availability_date": "جاهز الآن",
        "pickup_window": "حسب الاتفاق",
        "price": null,
        "pricing_type": "quote",
        "images": [],
        "description": "مخلفات مختلطة متراكمة، مناسبة لمشاريع إعادة التدوير والسماد."
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

-- Enrich existing single-residue opportunities
UPDATE opportunities
SET attributes = attributes || '{
  "residue_condition": "جاف",
  "loading_readiness": "جاهز",
  "description": "سعف جاف للبيع، 5 أطنان، جاهز للتحميل والنقل."
}'::jsonb
WHERE id = 'f94dc6bd-bfdd-4eb9-ba95-8881e58bc4db';

UPDATE opportunities
SET attributes = attributes || '{
  "residue_condition": "طازج",
  "loading_readiness": "جاهز",
  "description": "جريد طازج للبيع، 500 قطعة، مناسب للأعمال الحرفية."
}'::jsonb
WHERE id = 'd5fc173e-8bb7-40e4-bbfe-993970b53d31';

UPDATE opportunities
SET attributes = attributes || '{
  "residue_condition": "مختلط",
  "loading_readiness": "يحتاج تجهيز",
  "description": "مخلفات مختلطة، كمية تقديرية حسب الطلب."
}'::jsonb
WHERE id = '985f0996-246a-4483-8bbd-f6853506f9b0';

UPDATE opportunities
SET attributes = attributes || '{
  "residue_condition": "جاف",
  "loading_readiness": "يحتاج تجهيز",
  "description": "مخلفات كرب للبيع، كمية صغيرة حسب الطلب."
}'::jsonb
WHERE id = '02db93ec-273e-4e0b-8af7-2d206cd261e0';
