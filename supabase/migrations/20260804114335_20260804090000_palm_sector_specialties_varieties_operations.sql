/*
# Palm Sector Specialties, Varieties, and Per-Specialty Operations

## Purpose
Transforms the palm (النخيل) sector from generic sub-sectors into 7 dynamic
specialties, adds a varieties (أصناف) table for palm cultivars, and stores
allowed operations + filter configuration per specialty — all in the database,
editable by admin without code changes.

## 1. Sub-sector schema extensions
- Add `allowed_operations` jsonb column to `sub_sectors` — stores the list of
  operation types permitted for this specialty (e.g. offer, demand, project,
  auction_request, logistics_request, service_offer, service_request).
- Add `filter_configuration` jsonb column to `sub_sectors` — stores the filter
  definitions specific to this specialty (date variety, quantity, price, etc.).
- Add `specialty_metadata` jsonb column to `sub_sectors` — stores extra
  metadata such as card display hints, required fields, etc.

## 2. Palm varieties table (new)
- `palm_varieties` — dynamic list of palm cultivars (سكري، صقعي، خلاص، ...).
  Admin can add, rename, reorder, hide, and assign varieties to specialties.
  - `id` uuid PK
  - `name` text NOT NULL
  - `slug` text NOT NULL
  - `display_order` int default 0
  - `is_active` boolean default true
  - `applicable_specialty_ids` uuid[] — which specialties use this variety
  - `created_at` timestamptz

## 3. Palm specialty data
Renames/maps existing palm sub-sectors to the 7 approved specialties:
  1. ثمار النخيل (palm-fruits) — was "التمور"
  2. نقايل النخيل (palm-prunings)
  3. فسائل النخيل (palm-seedlings) — was "الفسائل"
  4. نخيل المشاريع (palm-projects) — was "المزارع"
  5. مخلفات النخيل (palm-residues) — was "المصانع" (repurposed)
  6. مستلزمات وتقنيات النخيل (palm-supplies)
  7. خدمات النخيل (palm-services) — was "الخدمات"

Existing data references are preserved by updating sub_sector_id where needed.

## 4. Per-specialty allowed operations
Each specialty gets its own `allowed_operations` jsonb:
  - ثمار النخيل: عرض, طلب, طلب مزاد
  - نقايل النخيل: عرض, طلب, مشروع, طلب مزاد, طلب لوجستي
  - فسائل النخيل: عرض, طلب, مشروع, طلب مزاد, طلب لوجستي
  - نخيل المشاريع: عرض, طلب, مشروع, طلب مزاد, طلب لوجستي
  - مخلفات النخيل: عرض, طلب, طلب مزاد, طلب لوجستي
  - مستلزمات وتقنيات النخيل: عرض, طلب
  - خدمات النخيل: عرض خدمة, طلب خدمة

## 5. Per-specialty filter configuration
Each specialty gets its own `filter_configuration` jsonb with relevant filters.

## 6. Palm varieties seed data
Inserts 6 initial varieties: سكري, صقعي, خلاص, برحي, مجدول, خضري.

## 7. Security
- RLS enabled on `palm_varieties`.
- Read access for anon + authenticated (public browsing).
- No write policies yet (admin-only in future).
*/

-- ── Extend sub_sectors with specialty config columns ──────────
ALTER TABLE sub_sectors
  ADD COLUMN IF NOT EXISTS allowed_operations jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE sub_sectors
  ADD COLUMN IF NOT EXISTS filter_configuration jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE sub_sectors
  ADD COLUMN IF NOT EXISTS specialty_metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ── Palm varieties table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS palm_varieties (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  slug                    text NOT NULL,
  display_order           int  NOT NULL DEFAULT 0,
  is_active               boolean NOT NULL DEFAULT true,
  applicable_specialty_ids uuid[] NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_palm_varieties_active
  ON palm_varieties(display_order) WHERE is_active = true;

ALTER TABLE palm_varieties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_palm_varieties" ON palm_varieties;
CREATE POLICY "read_palm_varieties" ON palm_varieties FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- ── Palm sector ID (constant for clarity) ─────────────────────
-- sector slug = 'palm', id = 1bddad2e-b634-4eee-8d4e-aee2ef698da3

-- ── Rename / repurpose existing palm sub-sectors ──────────────

-- 1. "التمور" (dates) → "ثمار النخيل" (palm-fruits)
UPDATE sub_sectors SET
  name = 'ثمار النخيل',
  slug = 'palm-fruits',
  icon = '🌴',
  display_order = 1,
  allowed_operations = '[
    {"id":"offer","label":"عرض","icon":"Tag"},
    {"id":"demand","label":"طلب","icon":"ShoppingCart"},
    {"id":"auction_request","label":"طلب مزاد","icon":"Gavel"}
  ]'::jsonb,
  filter_configuration = '[
    {"id":"variety","type":"select","label":"صنف التمور","options":["سكري","صقعي","خلاص","برحي","مجدول","خضري"]},
    {"id":"quantity","type":"range","label":"الكمية"},
    {"id":"price","type":"range","label":"السعر"},
    {"id":"location","type":"select","label":"الموقع","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
  ]'::jsonb,
  specialty_metadata = '{"card_type":"fruit","required_fields":["title","price","quantity"]}'::jsonb
WHERE slug = 'dates' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- 2. "الفسائل" (seedlings) → "فسائل النخيل" (palm-seedlings)
UPDATE sub_sectors SET
  name = 'فسائل النخيل',
  slug = 'palm-seedlings',
  icon = '🌿',
  display_order = 3,
  allowed_operations = '[
    {"id":"offer","label":"عرض","icon":"Tag"},
    {"id":"demand","label":"طلب","icon":"ShoppingCart"},
    {"id":"project","label":"مشروع","icon":"Briefcase"},
    {"id":"auction_request","label":"طلب مزاد","icon":"Gavel"},
    {"id":"logistics_request","label":"طلب لوجستي","icon":"Truck"}
  ]'::jsonb,
  filter_configuration = '[
    {"id":"variety","type":"select","label":"صنف الفسيلة","options":["سكري","صقعي","خلاص","برحي","مجدول","خضري"]},
    {"id":"age","type":"range","label":"العمر"},
    {"id":"quantity","type":"range","label":"الكمية"},
    {"id":"price","type":"range","label":"السعر"},
    {"id":"location","type":"select","label":"الموقع","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
  ]'::jsonb,
  specialty_metadata = '{"card_type":"seedling","required_fields":["title","price","quantity"]}'::jsonb
WHERE slug = 'seedlings' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- 3. "المزارع" (farms) → "نخيل المشاريع" (palm-projects)
UPDATE sub_sectors SET
  name = 'نخيل المشاريع',
  slug = 'palm-projects',
  icon = '🏗️',
  display_order = 4,
  allowed_operations = '[
    {"id":"offer","label":"عرض","icon":"Tag"},
    {"id":"demand","label":"طلب","icon":"ShoppingCart"},
    {"id":"project","label":"مشروع","icon":"Briefcase"},
    {"id":"auction_request","label":"طلب مزاد","icon":"Gavel"},
    {"id":"logistics_request","label":"طلب لوجستي","icon":"Truck"}
  ]'::jsonb,
  filter_configuration = '[
    {"id":"project_type","type":"select","label":"نوع المشروع","options":["استثمار","شراكة","تطوير","إدارة"]},
    {"id":"tree_count","type":"range","label":"عدد الأشجار"},
    {"id":"price","type":"range","label":"السعر"},
    {"id":"location","type":"select","label":"الموقع","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
  ]'::jsonb,
  specialty_metadata = '{"card_type":"project","required_fields":["title","price"]}'::jsonb
WHERE slug = 'farms' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- 4. "المصانع" (factories) → "مخلفات النخيل" (palm-residues)
--    Repurpose: no existing data references this sub-sector in opportunities/products/services
UPDATE sub_sectors SET
  name = 'مخلفات النخيل',
  slug = 'palm-residues',
  icon = '♻️',
  display_order = 5,
  allowed_operations = '[
    {"id":"offer","label":"عرض","icon":"Tag"},
    {"id":"demand","label":"طلب","icon":"ShoppingCart"},
    {"id":"auction_request","label":"طلب مزاد","icon":"Gavel"},
    {"id":"logistics_request","label":"طلب لوجستي","icon":"Truck"}
  ]'::jsonb,
  filter_configuration = '[
    {"id":"residue_type","type":"select","label":"نوع المخلفات","options":["سعف","ليف","جذوع","كرب","نوى","عذق"]},
    {"id":"quantity","type":"range","label":"الكمية"},
    {"id":"price","type":"range","label":"السعر"},
    {"id":"location","type":"select","label":"الموقع","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
  ]'::jsonb,
  specialty_metadata = '{"card_type":"residue","required_fields":["title","price","quantity"]}'::jsonb
WHERE slug = 'factories' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- 5. "الخدمات" (services) → "خدمات النخيل" (palm-services)
UPDATE sub_sectors SET
  name = 'خدمات النخيل',
  slug = 'palm-services',
  icon = '🔧',
  display_order = 7,
  allowed_operations = '[
    {"id":"service_offer","label":"عرض خدمة","icon":"Wrench"},
    {"id":"service_request","label":"طلب خدمة","icon":"Handshake"}
  ]'::jsonb,
  filter_configuration = '[
    {"id":"service_type","type":"select","label":"نوع الخدمة","options":["تقليم","تلقيح","حصاد","ري","تسميد","وقاية","نقل","أخرى"]},
    {"id":"price","type":"range","label":"السعر"},
    {"id":"location","type":"select","label":"الموقع","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
  ]'::jsonb,
  specialty_metadata = '{"card_type":"service","required_fields":["title","price"]}'::jsonb
WHERE slug = 'services' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- ── Insert NEW specialties (no existing rows to repurpose) ────

-- 6. نقايل النخيل (palm-prunings) — new
INSERT INTO sub_sectors (sector_id, parent_id, name, slug, icon, display_order, is_active, allowed_operations, filter_configuration, specialty_metadata)
VALUES (
  '1bddad2e-b634-4eee-8d4e-aee2ef698da3',
  NULL,
  'نقايل النخيل',
  'palm-prunings',
  '✂️',
  2,
  true,
  '[
    {"id":"offer","label":"عرض","icon":"Tag"},
    {"id":"demand","label":"طلب","icon":"ShoppingCart"},
    {"id":"project","label":"مشروع","icon":"Briefcase"},
    {"id":"auction_request","label":"طلب مزاد","icon":"Gavel"},
    {"id":"logistics_request","label":"طلب لوجستي","icon":"Truck"}
  ]'::jsonb,
  '[
    {"id":"variety","type":"select","label":"صنف النقايل","options":["سكري","صقعي","خلاص","برحي","مجدول","خضري"]},
    {"id":"quantity","type":"range","label":"الكمية"},
    {"id":"price","type":"range","label":"السعر"},
    {"id":"location","type":"select","label":"الموقع","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
  ]'::jsonb,
  '{"card_type":"pruning","required_fields":["title","price","quantity"]}'::jsonb
)
ON CONFLICT DO NOTHING;

-- 7. مستلزمات وتقنيات النخيل (palm-supplies) — new
INSERT INTO sub_sectors (sector_id, parent_id, name, slug, icon, display_order, is_active, allowed_operations, filter_configuration, specialty_metadata)
VALUES (
  '1bddad2e-b634-4eee-8d4e-aee2ef698da3',
  NULL,
  'مستلزمات وتقنيات النخيل',
  'palm-supplies',
  '⚙️',
  6,
  true,
  '[
    {"id":"offer","label":"عرض","icon":"Tag"},
    {"id":"demand","label":"طلب","icon":"ShoppingCart"}
  ]'::jsonb,
  '[
    {"id":"supply_type","type":"select","label":"نوع المستلزم","options":["شبوك","سلالم","حافظات","أسمدة","مبيدات","أنظمة ري","حصاد","أخرى"]},
    {"id":"price","type":"range","label":"السعر"},
    {"id":"location","type":"select","label":"الموقع","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
  ]'::jsonb,
  '{"card_type":"supply","required_fields":["title","price"]}'::jsonb
)
ON CONFLICT DO NOTHING;

-- ── Seed palm varieties ──────────────────────────────────────
-- Get the palm sector's sub-sector IDs for applicable_specialty_ids
-- We'll insert varieties and then update their applicable_specialty_ids

INSERT INTO palm_varieties (name, slug, display_order, is_active)
VALUES
  ('سكري',   'sukari',    1, true),
  ('صقعي',   'sugha',     2, true),
  ('خلاص',   'khalas',    3, true),
  ('برحي',   'barhi',     4, true),
  ('مجدول',  'majdoul',   5, true),
  ('خضري',   'khidri',    6, true)
ON CONFLICT DO NOTHING;

-- Link varieties to relevant specialties (fruits, prunings, seedlings, projects)
-- palm-fruits = the renamed 'dates' row, palm-prunings = new, palm-seedlings = renamed 'seedlings', palm-projects = renamed 'farms'
DO $$
DECLARE
  v_fruits   uuid;
  v_prunings uuid;
  v_seedlings uuid;
  v_projects uuid;
BEGIN
  SELECT id INTO v_fruits   FROM sub_sectors WHERE slug = 'palm-fruits'   AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';
  SELECT id INTO v_prunings FROM sub_sectors WHERE slug = 'palm-prunings' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';
  SELECT id INTO v_seedlings FROM sub_sectors WHERE slug = 'palm-seedlings' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';
  SELECT id INTO v_projects  FROM sub_sectors WHERE slug = 'palm-projects'  AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

  UPDATE palm_varieties
    SET applicable_specialty_ids = ARRAY[v_fruits, v_prunings, v_seedlings, v_projects]
    WHERE slug IN ('sukari','sugha','khalas','barhi','majdoul','khidri');
END $$;

-- ── Update palm sector's own available_actions to be generic ──
-- The sector-level actions are now a fallback; the specialty-level
-- allowed_operations take precedence in the UI.
UPDATE sectors SET
  available_actions = '[
    {"id":"offer","label":"عرض","icon":"Tag"},
    {"id":"demand","label":"طلب","icon":"ShoppingCart"},
    {"id":"auction_request","label":"طلب مزاد","icon":"Gavel"}
  ]'::jsonb,
  filter_configuration = '[]'::jsonb,
  search_placeholder = 'ابحث في قطاع النخيل...'
WHERE slug = 'palm';
