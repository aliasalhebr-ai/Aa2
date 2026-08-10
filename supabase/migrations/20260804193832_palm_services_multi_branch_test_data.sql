/*
# Palm services (خدمات النخيل) multi-branch test data

1. Purpose
   - Adds a test service_offer opportunity in the "palm-services" sub-sector
     with a structured `service` object containing 4 service branches:
     pollination, pruning, uprooting_planting, protection.
   - Each branch has multiple service items with individual pricing, duration,
     worker count, equipment, and inclusions.
   - Enriches the 2 existing service offers with structured `service` objects.

2. Tables affected
   - `opportunities` — INSERT one new row, UPDATE 2 existing rows.

3. Security
   - No schema changes. No RLS changes. Uses existing policies.
*/

-- Insert a multi-branch service offer
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
  '4c235525-d768-425e-b623-0e90e8403c0d',
  'service_offer',
  'opportunity',
  'مقاول نخيل متكامل - تكريب وتقليم وقلع وغرس ووقاية',
  'شركة متخصصة في خدمات النخيل، نقدم تكريب وتقليم وقلع وغرس ووقاية بأحدث المعدات وفريق محترف.',
  'القصيم',
  'active',
  '{
    "service": {
      "provider_name": "شركة النخلة الذهبية للخدمات الزراعية",
      "provider_type": "company",
      "provider_verified": true,
      "experience_years": 12,
      "completed_projects": 340,
      "covered_cities": ["القصيم", "الرياض", "حائل", "المدينة المنورة"],
      "coverage_radius": "يغطي مسافة 200 كم من مدينة بريدة",
      "service_branches": [
        {
          "branch_key": "pollination",
          "branch_label": "خدمات التلقيح",
          "items": [
            {
              "item_key": "pollination_service",
              "item_label": "تلقيح النخيل",
              "price": 35,
              "pricing_type": "per_palm",
              "estimated_duration": "يوم واحد لكل 100 نخلة",
              "worker_count": 4,
              "supervisor_available": true,
              "engineer_available": false,
              "equipment_included": true,
              "materials_included": true,
              "cleanup_included": false,
              "waste_removal_included": false,
              "followup_included": false,
              "minimum_palm_count": 50,
              "daily_capacity": 200,
              "images": [],
              "description": "تلقيح احترافي للنخيل بواسطة فريق متخصص مع توفير اللقاح."
            },
            {
              "item_key": "pollination_supply",
              "item_label": "توفير اللقاح",
              "price": 15,
              "pricing_type": "per_palm",
              "estimated_duration": "حسب الطلب",
              "worker_count": null,
              "supervisor_available": false,
              "engineer_available": false,
              "equipment_included": false,
              "materials_included": true,
              "cleanup_included": false,
              "waste_removal_included": false,
              "followup_included": false,
              "minimum_palm_count": 100,
              "daily_capacity": null,
              "images": [],
              "description": "توفير لقاح نخيل عالي الجودة من مصادر موثوقة."
            }
          ]
        },
        {
          "branch_key": "pruning",
          "branch_label": "خدمات التكريب والتقليم",
          "items": [
            {
              "item_key": "takreb",
              "item_label": "التكريب",
              "price": 40,
              "pricing_type": "per_palm",
              "estimated_duration": "يوم لكل 80 نخلة",
              "worker_count": 6,
              "supervisor_available": true,
              "engineer_available": false,
              "equipment_included": true,
              "materials_included": false,
              "cleanup_included": true,
              "waste_removal_included": true,
              "followup_included": true,
              "minimum_palm_count": 30,
              "daily_capacity": 80,
              "images": [],
              "description": "تكريب النخيل بإزالة الكرب والأشواك وتنظيف الجذع."
            },
            {
              "item_key": "pruning",
              "item_label": "التقليم",
              "price": 25,
              "pricing_type": "per_palm",
              "estimated_duration": "يوم لكل 150 نخلة",
              "worker_count": 4,
              "supervisor_available": true,
              "engineer_available": false,
              "equipment_included": true,
              "materials_included": false,
              "cleanup_included": true,
              "waste_removal_included": true,
              "followup_included": false,
              "minimum_palm_count": 50,
              "daily_capacity": 150,
              "images": [],
              "description": "تقليم السعف الجاف والميت وتشكيل التاج."
            },
            {
              "item_key": "frond_removal",
              "item_label": "إزالة السعف",
              "price": 15,
              "pricing_type": "per_palm",
              "estimated_duration": "يوم لكل 200 نخلة",
              "worker_count": 3,
              "supervisor_available": false,
              "engineer_available": false,
              "equipment_included": true,
              "materials_included": false,
              "cleanup_included": true,
              "waste_removal_included": true,
              "followup_included": false,
              "minimum_palm_count": 100,
              "daily_capacity": 200,
              "images": [],
              "description": "إزالة السعف الزائد والجاف مع تنظيف الموقع."
            }
          ]
        },
        {
          "branch_key": "uprooting_planting",
          "branch_label": "خدمات القلع والغرس",
          "items": [
            {
              "item_key": "uprooting",
              "item_label": "قلع النخيل",
              "price": 200,
              "pricing_type": "per_palm",
              "estimated_duration": "يوم لكل 10 نخلات",
              "worker_count": 8,
              "supervisor_available": true,
              "engineer_available": true,
              "equipment_included": true,
              "materials_included": false,
              "cleanup_included": true,
              "waste_removal_included": false,
              "followup_included": false,
              "minimum_palm_count": 5,
              "daily_capacity": 10,
              "images": [],
              "description": "قلع النخيل بمعدات متخصصة (حفار ورافعة) مع الحفاظ على الجذور."
            },
            {
              "item_key": "planting",
              "item_label": "غرس النخيل",
              "price": 150,
              "pricing_type": "per_palm",
              "estimated_duration": "يوم لكل 20 نخلة",
              "worker_count": 6,
              "supervisor_available": true,
              "engineer_available": true,
              "equipment_included": true,
              "materials_included": true,
              "cleanup_included": true,
              "waste_removal_included": false,
              "followup_included": true,
              "minimum_palm_count": 10,
              "daily_capacity": 20,
              "images": [],
              "description": "غرس النخيل مع تجهيز الحفرة والتسميد والمتابعة الأولية."
            },
            {
              "item_key": "transport_prep",
              "item_label": "تجهيز النخيل للنقل",
              "price": 80,
              "pricing_type": "per_palm",
              "estimated_duration": "يوم لكل 15 نخلة",
              "worker_count": 4,
              "supervisor_available": true,
              "engineer_available": false,
              "equipment_included": true,
              "materials_included": true,
              "cleanup_included": false,
              "waste_removal_included": false,
              "followup_included": false,
              "minimum_palm_count": 5,
              "daily_capacity": 15,
              "images": [],
              "description": "تجهيز النخيل للنقل بتغليف الجذع وتثبيت التاج."
            }
          ]
        },
        {
          "branch_key": "protection",
          "branch_label": "خدمات الوقاية والعلاج",
          "items": [
            {
              "item_key": "weevil_control",
              "item_label": "مكافحة سوسة النخيل",
              "price": 1200,
              "pricing_type": "per_treatment",
              "estimated_duration": "زيارة واحدة",
              "worker_count": 3,
              "supervisor_available": true,
              "engineer_available": true,
              "equipment_included": true,
              "materials_included": true,
              "cleanup_included": false,
              "waste_removal_included": true,
              "followup_included": true,
              "minimum_palm_count": 20,
              "daily_capacity": 100,
              "images": [],
              "description": "علاج ومكافحة سوسة النخيل الحمراء بمبيدات معتمدة ومتابعة دورية."
            },
            {
              "item_key": "pest_control",
              "item_label": "مكافحة الآفات",
              "price": 800,
              "pricing_type": "per_treatment",
              "estimated_duration": "زيارة واحدة",
              "worker_count": 3,
              "supervisor_available": true,
              "engineer_available": false,
              "equipment_included": true,
              "materials_included": true,
              "cleanup_included": false,
              "waste_removal_included": false,
              "followup_included": true,
              "minimum_palm_count": 30,
              "daily_capacity": 150,
              "images": [],
              "description": "مكافحة الآفات الزراعية التي تصيب النخيل بالرش المعتمد."
            }
          ]
        }
      ],
      "project_capacity": "حتى 500 نخلة في المشروع الواحد",
      "equipment_list": ["رافعة", "منشار كهربائي", "معدات تكريب", "معدات رش", "حفار", "معدات حماية", "سيارات خدمة"],
      "labor_info": "فريق محترف مدرب",
      "worker_count": 25,
      "supervisor_available": true,
      "engineer_available": true,
      "technician_available": true,
      "seasonality": "year_round",
      "min_work": "30 نخلة كحد أدنى",
      "contract_invoice": true,
      "transport_available": true,
      "transport_method": "شاحنات نقل النخيل",
      "transport_cities": "القصيم، الرياض، حائل",
      "transport_included": false,
      "availability_status": "available_now",
      "available_from": null,
      "working_days": "السبت - الخميس",
      "working_hours": "6 صباحاً - 6 مساءً",
      "safety_certifications": ["تدريب السلامة", "تأمين شامل", "اعتماد مهني"],
      "licenses": ["رخصة مقاولات زراعية", "شهادة مكافحة الآفات"],
      "portfolio": [
        {
          "image_before": null,
          "image_after": null,
          "service_type": "تكريب وتقليم",
          "city": "بريدة",
          "palm_count": 300,
          "duration": "4 أيام",
          "description": "تكريب وتقليم 300 نخلة في مزرعة ببريدة."
        },
        {
          "image_before": null,
          "image_after": null,
          "service_type": "قلع وغرس",
          "city": "الرياض",
          "palm_count": 50,
          "duration": "5 أيام",
          "description": "قلع وغرس 50 نخلة في مزرعة بالرياض."
        }
      ],
      "terms": "يشمل السعر العمالة والمعدات. لا يشمل النقل إلا باتفاق مسبق. الدفع بعد انتهاء العمل.",
      "cancellation_policy": "يمكن إلغاء الطلب قبل 24 ساعة من الموعد دون رسوم. الإلغاء بعد ذلك يترتب عليه 50% من القيمة.",
      "description": "شركة متخصصة في خدمات النخيل المتكاملة، 12 سنة خبرة، 340 عمل منفذ."
    }
  }'::jsonb,
  now()
)
ON CONFLICT (id) DO UPDATE SET
  attributes = EXCLUDED.attributes,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status;

-- Enrich existing service offers with structured service objects
UPDATE opportunities
SET attributes = attributes || '{
  "service": {
    "provider_name": "مؤسسة التلقيح الزراعية",
    "provider_type": "organization",
    "provider_verified": true,
    "experience_years": 8,
    "completed_projects": 120,
    "covered_cities": ["القصيم"],
    "coverage_radius": "يغطي مسافة 100 كم من مدينة بريدة",
    "service_branches": [
      {
        "branch_key": "pollination",
        "branch_label": "خدمات التلقيح",
        "items": [
          {
            "item_key": "pollination_service",
            "item_label": "تلقيح النخيل",
            "price": 30,
            "pricing_type": "per_palm",
            "estimated_duration": "يوم لكل 150 نخلة",
            "worker_count": 3,
            "supervisor_available": true,
            "engineer_available": false,
            "equipment_included": true,
            "materials_included": true,
            "cleanup_included": false,
            "waste_removal_included": false,
            "followup_included": false,
            "minimum_palm_count": 50,
            "daily_capacity": 150,
            "images": [],
            "description": "تلقيح احترافي للنخيل مع توفير اللقاح."
          },
          {
            "item_key": "pollination_supply",
            "item_label": "توفير اللقاح",
            "price": 12,
            "pricing_type": "per_palm",
            "estimated_duration": "حسب الطلب",
            "worker_count": null,
            "supervisor_available": false,
            "engineer_available": false,
            "equipment_included": false,
            "materials_included": true,
            "cleanup_included": false,
            "waste_removal_included": false,
            "followup_included": false,
            "minimum_palm_count": 100,
            "daily_capacity": null,
            "images": [],
            "description": "لقاح نخيل عالي الجودة."
          }
        ]
      }
    ],
    "project_capacity": "حتى 200 نخلة يومياً",
    "equipment_list": ["معدات تلقيح", "سيارات خدمة"],
    "worker_count": 8,
    "supervisor_available": true,
    "engineer_available": false,
    "technician_available": true,
    "seasonality": "seasonal",
    "min_work": "50 نخلة",
    "contract_invoice": true,
    "transport_available": true,
    "transport_method": "سيارات خدمة",
    "transport_cities": "القصيم",
    "transport_included": true,
    "availability_status": "available_now",
    "working_days": "السبت - الخميس",
    "working_hours": "6 صباحاً - 5 مساءً",
    "safety_certifications": ["تدريب السلامة"],
    "licenses": ["رخصة خدمات زراعية"],
    "portfolio": [],
    "terms": "يشمل السعر اللقاح والعمالة. الدفع بعد الانتهاء.",
    "cancellation_policy": "إلغاء قبل 48 ساعة دون رسوم.",
    "description": "مؤسسة متخصصة في تلقيح النخيل بالقصيم."
  }
}'::jsonb
WHERE id = 'ecdfdd32-ff65-4680-b98e-795b652a07d5';

UPDATE opportunities
SET attributes = attributes || '{
  "service": {
    "provider_name": "شركة المقاولات الزراعية الكبرى",
    "provider_type": "company",
    "provider_verified": true,
    "experience_years": 15,
    "completed_projects": 500,
    "covered_cities": ["الرياض", "القصيم"],
    "coverage_radius": "يغطي مسافة 300 كم",
    "service_branches": [
      {
        "branch_key": "pruning",
        "branch_label": "خدمات التكريب والتقليم",
        "items": [
          {
            "item_key": "takreb",
            "item_label": "التكريب",
            "price": 45,
            "pricing_type": "per_palm",
            "estimated_duration": "يوم لكل 70 نخلة",
            "worker_count": 8,
            "supervisor_available": true,
            "engineer_available": false,
            "equipment_included": true,
            "materials_included": false,
            "cleanup_included": true,
            "waste_removal_included": true,
            "followup_included": true,
            "minimum_palm_count": 20,
            "daily_capacity": 70,
            "images": [],
            "description": "تكريب احترافي مع إزالة الكرب وتنظيف الجذع."
          },
          {
            "item_key": "pruning",
            "item_label": "التقليم",
            "price": 30,
            "pricing_type": "per_palm",
            "estimated_duration": "يوم لكل 120 نخلة",
            "worker_count": 6,
            "supervisor_available": true,
            "engineer_available": false,
            "equipment_included": true,
            "materials_included": false,
            "cleanup_included": true,
            "waste_removal_included": true,
            "followup_included": false,
            "minimum_palm_count": 30,
            "daily_capacity": 120,
            "images": [],
            "description": "تقليم السعف وتشكيل التاج."
          }
        ]
      },
      {
        "branch_key": "uprooting_planting",
        "branch_label": "خدمات القلع والغرس",
        "items": [
          {
            "item_key": "uprooting",
            "item_label": "قلع النخيل",
            "price": 250,
            "pricing_type": "per_palm",
            "estimated_duration": "يوم لكل 8 نخلات",
            "worker_count": 10,
            "supervisor_available": true,
            "engineer_available": true,
            "equipment_included": true,
            "materials_included": false,
            "cleanup_included": true,
            "waste_removal_included": false,
            "followup_included": false,
            "minimum_palm_count": 3,
            "daily_capacity": 8,
            "images": [],
            "description": "قلع النخيل بحفار ورافعة مع الحفاظ على الجذور."
          },
          {
            "item_key": "planting",
            "item_label": "غرس النخيل",
            "price": 180,
            "pricing_type": "per_palm",
            "estimated_duration": "يوم لكل 15 نخلة",
            "worker_count": 8,
            "supervisor_available": true,
            "engineer_available": true,
            "equipment_included": true,
            "materials_included": true,
            "cleanup_included": true,
            "waste_removal_included": false,
            "followup_included": true,
            "minimum_palm_count": 5,
            "daily_capacity": 15,
            "images": [],
            "description": "غرس النخيل مع تجهيز الحفرة والمتابعة."
          }
        ]
      },
      {
        "branch_key": "protection",
        "branch_label": "خدمات الوقاية والعلاج",
        "items": [
          {
            "item_key": "weevil_control",
            "item_label": "مكافحة سوسة النخيل",
            "price": 1500,
            "pricing_type": "per_treatment",
            "estimated_duration": "زيارة واحدة",
            "worker_count": 4,
            "supervisor_available": true,
            "engineer_available": true,
            "equipment_included": true,
            "materials_included": true,
            "cleanup_included": false,
            "waste_removal_included": true,
            "followup_included": true,
            "minimum_palm_count": 10,
            "daily_capacity": 80,
            "images": [],
            "description": "علاج سوسة النخيل بمبيدات معتمدة."
          }
        ]
      },
      {
        "branch_key": "pollination",
        "branch_label": "خدمات التلقيح",
        "items": [
          {
            "item_key": "pollination_service",
            "item_label": "تلقيح النخيل",
            "price": 35,
            "pricing_type": "per_palm",
            "estimated_duration": "يوم لكل 100 نخلة",
            "worker_count": 5,
            "supervisor_available": true,
            "engineer_available": false,
            "equipment_included": true,
            "materials_included": true,
            "cleanup_included": false,
            "waste_removal_included": false,
            "followup_included": false,
            "minimum_palm_count": 30,
            "daily_capacity": 100,
            "images": [],
            "description": "تلقيح احترافي مع توفير اللقاح."
          }
        ]
      }
    ],
    "project_capacity": "حتى 1000 نخلة في المشروع",
    "equipment_list": ["رافعة كبيرة", "حفار", "منشار كهربائي", "معدات رش", "معدات حماية", "سيارات خدمة"],
    "worker_count": 40,
    "supervisor_available": true,
    "engineer_available": true,
    "technician_available": true,
    "seasonality": "year_round",
    "min_work": "20 نخلة",
    "contract_invoice": true,
    "transport_available": true,
    "transport_method": "شاحنات كبيرة",
    "transport_cities": "الرياض، القصيم",
    "transport_included": false,
    "availability_status": "accepting_bookings",
    "working_days": "السبت - الجمعة",
    "working_hours": "6 صباحاً - 7 مساءً",
    "safety_certifications": ["تدريب السلامة", "تأمين شامل", "شهادة مكافحة الآفات", "اعتماد مهني"],
    "licenses": ["رخصة مقاولات زراعية كبرى"],
    "portfolio": [
      {
        "image_before": null,
        "image_after": null,
        "service_type": "تكريب وتقليم",
        "city": "الرياض",
        "palm_count": 500,
        "duration": "7 أيام",
        "description": "تكريب وتقليم 500 نخلة في مزرعة كبرى بالرياض."
      }
    ],
    "terms": "يشمل السعر العمالة والمعدات. النقل باتفاق مسبق. الدفع على دفعات.",
    "cancellation_policy": "إلغاء قبل 48 ساعة دون رسوم. بعد ذلك 30% من القيمة.",
    "description": "أكبر شركة مقاولات نخيل في المنطقة، 15 سنة خبرة."
  }
}'::jsonb
WHERE id = '63c21c93-92b1-4a82-bf23-47ea4fb1ed87';
