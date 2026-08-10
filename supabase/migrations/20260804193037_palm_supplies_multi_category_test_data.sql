/*
# Palm supplies (مستلزمات وتقنيات النخيل) multi-category test data

1. Purpose
   - Adds a test opportunity in the "palm-supplies" sub-sector with a
     structured `supplies` array containing 5 supply categories:
     irrigation_systems, harvest_equipment, pollination_tools,
     smart_tech, spare_parts.
   - Each supply entry has its own item_name, brand, model, condition,
     quantity, price, warranty, technical_specs, usage_scope, etc.
   - Also enriches the 2 existing single-supply opportunities with
     warranty, usage_range, and description for richer display.

2. Tables affected
   - `opportunities` — INSERT one new row, UPDATE 2 existing rows.

3. Security
   - No schema changes. No RLS changes. Uses existing policies.
*/

-- Insert a multi-supply offer
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
  'e5f6a7b8-c901-23de-f456-789012345678',
  '1bddad2e-b634-4eee-8d4e-aee2ef698da3',
  'ed5125f3-0be3-4831-baf3-441b9c17e0a1',
  'offer',
  'opportunity',
  'مستلزمات وتقنيات نخيل متكاملة - أنظمة ري ومعدات حصاد وأدوات تكريب وتقنيات ذكية وقطع غيار',
  'مجموعة متكاملة من المستلزمات والتقنيات الخاصة بالنخيل، تشمل أنظمة ري ذكية ومعدات حصاد وأدوات تكريب وتقنيات ذكية وقطع غيار.',
  'الرياض',
  'active',
  '{
    "supplies": [
      {
        "item_name": "نظام ري بالتنقيط ذكي",
        "category": "irrigation_systems",
        "category_label": "أنظمة الري",
        "brand": "نمره للري",
        "model": "Drip-Pro 2000",
        "condition": "new",
        "quantity": 5,
        "unit": "system",
        "manufacturing_year": 2024,
        "country_of_origin": "السعودية",
        "warranty_status": "ضمان ساري",
        "warranty_duration": "سنتان",
        "installation_available": true,
        "maintenance_available": true,
        "spare_parts_available": true,
        "training_available": true,
        "installation_duration": "يومان",
        "installation_cities": "الرياض، القصيم، المدينة المنورة",
        "technical_specs": [
          {"label": "القدرة", "value": "2000 لتر/ساعة"},
          {"label": "الجهد الكهربائي", "value": "220 فولت"},
          {"label": "نوع الطاقة", "value": "كهرباء + طاقة شمسية"},
          {"label": "معدل التدفق", "value": "4 لتر/ساعة لكل نقاط"}
        ],
        "usage_scope": "مخصص للري بالتنقيط",
        "farm_size_coverage": "يخدم 1,000 نخلة",
        "price": 45000,
        "pricing_type": "price",
        "tax_included": true,
        "installation_included": true,
        "transport_available": true,
        "availability_date": "جاهز للتسليم خلال أسبوع",
        "images": [],
        "video_url": null,
        "description": "نظام ري بالتنقيط ذكي مع تحكم عبر تطبيق الجوال، يشمل التركيب والصيانة لمدة سنتين."
      },
      {
        "item_name": "رافعة حصاد النخيل",
        "category": "harvest_equipent",
        "category_label": "معدات الحصاد",
        "brand": "الصناعات الزراعية",
        "model": "PH-300",
        "condition": "used",
        "quantity": 3,
        "unit": "unit",
        "manufacturing_year": 2020,
        "country_of_origin": "كوريا",
        "warranty_status": "انتهى الضمان",
        "warranty_duration": null,
        "installation_available": false,
        "maintenance_available": true,
        "spare_parts_available": true,
        "training_available": false,
        "installation_duration": null,
        "installation_cities": null,
        "technical_specs": [
          {"label": "الارتفاع الأقصى", "value": "12 متر"},
          {"label": "القدرة", "value": "300 كجم"},
          {"label": "نوع الطاقة", "value": "ديزل"}
        ],
        "usage_scope": "مناسب للحصاد والتحميل",
        "farm_size_coverage": "مناسب للمزارع الكبيرة",
        "price": 35000,
        "pricing_type": "price",
        "tax_included": false,
        "installation_included": false,
        "transport_available": false,
        "availability_date": "جاهز الآن",
        "images": [],
        "video_url": null,
        "description": "رافعة حصاد مستعملة بحالة جيدة، ارتفاع 12 متر، تعمل بالديزل."
      },
      {
        "item_name": "طقم أدوات تكريب وتقليم",
        "category": "pollination_tools",
        "category_label": "أدوات التكريب والتقليم",
        "brand": "المزارع الذكي",
        "model": "TK-Set-5",
        "condition": "new",
        "quantity": 20,
        "unit": "set",
        "manufacturing_year": 2024,
        "country_of_origin": "اليابان",
        "warranty_status": "ضمان ساري",
        "warranty_duration": "سنة واحدة",
        "installation_available": false,
        "maintenance_available": false,
        "spare_parts_available": true,
        "training_available": false,
        "installation_duration": null,
        "installation_cities": null,
        "technical_specs": [
          {"label": "عدد القطع", "value": "5 قطع"},
          {"label": "المواد", "value": "ستانلس ستيل"},
          {"label": "مقاس المنشار", "value": "30 سم"}
        ],
        "usage_scope": "مناسب لأعمال التكريب",
        "farm_size_coverage": null,
        "price": 350,
        "pricing_type": "price",
        "tax_included": true,
        "installation_included": null,
        "transport_available": true,
        "availability_date": "جاهز الآن",
        "images": [],
        "video_url": null,
        "description": "طقم أدوات تكريب وتقليم احترافي، 5 قطع من الستانلس ستيل الياباني."
      },
      {
        "item_name": "نظام مراقبة ذكي للنخيل",
        "category": "smart_tech",
        "category_label": "تقنيات ذكية",
        "brand": "سمارت فارم",
        "model": "SmartPalm-IoT",
        "condition": "new",
        "quantity": 1,
        "unit": "system",
        "manufacturing_year": 2025,
        "country_of_origin": "السعودية",
        "warranty_status": "ضمان ساري",
        "warranty_duration": "3 سنوات",
        "installation_available": true,
        "maintenance_available": true,
        "spare_parts_available": true,
        "training_available": true,
        "installation_duration": "3 أيام",
        "installation_cities": "جميع مدن المملكة",
        "technical_specs": [
          {"label": "عدد الحساسات", "value": "20 حساس"},
          {"label": "نوع الاتصال", "value": "WiFi + 4G"},
          {"label": "التطبيق", "value": "iOS + Android"},
          {"label": "القدرة", "value": "يخدم 500 نخلة"}
        ],
        "usage_scope": "للاستخدام الاحترافي",
        "farm_size_coverage": "يخدم 500 نخلة",
        "price": null,
        "pricing_type": "quote",
        "tax_included": null,
        "installation_included": true,
        "transport_available": true,
        "availability_date": "حسب الطلب",
        "images": [],
        "video_url": null,
        "description": "نظام IoT لمراقبة النخيل عبر حساسات التربة والطقس، مع تطبيق ذكي وإشعارات فورية."
      },
      {
        "item_name": "قطع غيار مضخات الري",
        "category": "spare_parts",
        "category_label": "قطع الغيار",
        "brand": "نمره للري",
        "model": "Drip-Pro series",
        "condition": "new",
        "quantity": 100,
        "unit": "piece",
        "manufacturing_year": null,
        "country_of_origin": "السعودية",
        "warranty_status": "ضمان القطع",
        "warranty_duration": "6 أشهر",
        "installation_available": false,
        "maintenance_available": false,
        "spare_parts_available": true,
        "training_available": false,
        "installation_duration": null,
        "installation_cities": null,
        "technical_specs": [
          {"label": "نوع القطعة", "value": "فلاتر + رؤوس تنقيط"},
          {"label": "التوافق", "value": "Drip-Pro 2000/3000"}
        ],
        "usage_scope": "قطع غيار فقط",
        "farm_size_coverage": null,
        "price": 25,
        "pricing_type": "price",
        "tax_included": true,
        "installation_included": null,
        "transport_available": true,
        "availability_date": "جاهز الآن",
        "images": [],
        "video_url": null,
        "description": "قطع غيار أصلية لمضخات وأنظمة ري نمره، تشمل فلاتر ورؤوس تنقيط."
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

-- Enrich existing single-supply opportunities
UPDATE opportunities
SET attributes = attributes || '{
  "warranty": "ضمان ساري - سنة واحدة",
  "usage_range": "مخصص للري بالتنقيط",
  "brand": "نمره للري",
  "installation_available": true,
  "supply_included": true,
  "description": "أنظمة ري ذكية للنخيل، جديدة، تشمل التركيب والضمان سنة واحدة."
}'::jsonb
WHERE id = '148bddc4-2267-4354-aea6-5e2dd2911341';

UPDATE opportunities
SET attributes = attributes || '{
  "warranty": "انتهى الضمان",
  "usage_range": "مناسب للحصاد والتحميل",
  "brand": "الصناعات الزراعية",
  "description": "معدات حصاد مستعملة بحالة جيدة، 3 وحدات متوفرة."
}'::jsonb
WHERE id = '4a78eb68-1de4-4470-95f4-383f89edb873';
