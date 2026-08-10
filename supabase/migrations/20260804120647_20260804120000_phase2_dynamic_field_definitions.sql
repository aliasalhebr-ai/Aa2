/*
# Phase 2: Dynamic Field Definitions Engine + Reference Data

## Purpose
Build a data-driven form engine where field definitions are stored in the database,
keyed by (specialty_id, operation_type_id). The frontend reads these definitions
and renders the appropriate form fields dynamically — no hardcoded if/else logic.

## New Tables

### 1. specialty_field_definitions
The core engine table. Each row defines one field for one (specialty, operation) pair.
- id (uuid PK)
- specialty_id (uuid FK → sub_sectors.id, ON DELETE CASCADE)
- operation_type_id (text) — matches operation id from allowed_operations JSON (e.g. 'offer', 'demand', 'service_offer')
- field_key (text) — stable technical key (e.g. 'farm_location', 'trunk_height')
- field_type (text) — 'text' | 'number' | 'select' | 'multiselect' | 'textarea' | 'date' | 'boolean' | 'image' | 'radio' | 'conditional'
- label (text) — Arabic display label
- is_required (boolean, default false)
- display_order (integer, default 0)
- is_filterable (boolean, default false)
- is_card_visible (boolean, default true)
- options_source (text, nullable) — 'static' | 'variety' | 'units' | 'residue_types' | 'service_branches' | 'service_items' | 'project_types' | 'kerb_status' | 'takreb_type' | 'supply_categories' | 'provider_type' | 'quantity_method'
- static_options (jsonb, nullable) — inline options array for 'static' source
- validation_rules (jsonb, nullable) — { min, max, pattern, minLength, maxLength, ... }
- conditional_field_key (text, nullable) — field_key that controls visibility (for conditional fields)
- conditional_values (jsonb, nullable) — array of values that trigger visibility
- unit (text, nullable) — default measurement unit
- placeholder (text, nullable)
- created_at (timestamptz)

### 2. measurement_units
Reference table for measurement units (kg, ton, box, etc.).
- id (uuid PK)
- key (text unique) — 'kg', 'ton', 'box', 'unit', 'tree', 'year'
- label (text) — Arabic label
- display_order (integer)

### 3. palm_service_branches
Service branches for the palm-services specialty (7 branches).
- id (uuid PK)
- key (text unique) — 'pollination', 'pruning', 'uprooting_planting', 'protection', 'agricultural', 'consulting'
- label (text) — Arabic label
- display_order (integer)
- is_active (boolean, default true)

### 4. palm_service_items
Detailed service items under each branch.
- id (uuid PK)
- branch_id (uuid FK → palm_service_branches.id, ON DELETE CASCADE)
- key (text) — stable technical key
- label (text) — Arabic label
- display_order (integer)
- is_active (boolean, default true)

### 5. palm_residue_types
Dynamic list of residue types for the palm-residues specialty.
- id (uuid PK)
- key (text unique) — 'fronds', 'frond_strips', 'kerb', 'fiber', 'trunks', 'mixed', 'other'
- label (text) — Arabic label
- display_order (integer)
- is_active (boolean, default true)

## Security
All new tables have RLS enabled with anon+authenticated full access (single-tenant, no auth).

## Notes
- All relationships use UUID (id), not slug.
- Adding a new field = INSERT a row, no code change.
- Adding a new service branch/item = INSERT a row, no code change.
- Field visibility can be conditional on another field's value.
*/
-- ═══════════════════════════════════════════════════════════
-- 1. measurement_units
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS measurement_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0
);

ALTER TABLE measurement_units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_crud_measurement_units" ON measurement_units;
CREATE POLICY "anon_crud_measurement_units" ON measurement_units FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO measurement_units (key, label, display_order) VALUES
  ('kg', 'كيلوجرام', 1),
  ('ton', 'طن', 2),
  ('box', 'صندوق', 3),
  ('unit', 'وحدة', 4),
  ('tree', 'شجرة', 5),
  ('year', 'سنة', 6),
  ('piece', 'قطعة', 7),
  ('bunch', 'عذق', 8)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, display_order = EXCLUDED.display_order;

-- ═══════════════════════════════════════════════════════════
-- 2. palm_service_branches
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS palm_service_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE palm_service_branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_palm_service_branches" ON palm_service_branches;
CREATE POLICY "anon_select_palm_service_branches" ON palm_service_branches FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO palm_service_branches (key, label, display_order) VALUES
  ('pollination', 'خدمات التلقيح', 1),
  ('pruning', 'خدمات التكريب والتقليم', 2),
  ('uprooting_planting', 'خدمات القلع والغرس', 3),
  ('protection', 'خدمات الوقاية والعلاج', 4),
  ('agricultural', 'الخدمات الزراعية', 5),
  ('consulting', 'الخدمات الاستشارية والمشاريع', 6)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, display_order = EXCLUDED.display_order;

-- ═══════════════════════════════════════════════════════════
-- 3. palm_service_items
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS palm_service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES palm_service_branches(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(branch_id, key)
);

ALTER TABLE palm_service_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_palm_service_items" ON palm_service_items;
CREATE POLICY "anon_select_palm_service_items" ON palm_service_items FOR SELECT
  TO anon, authenticated USING (true);

-- Pollination branch
INSERT INTO palm_service_items (branch_id, key, label, display_order)
SELECT id, 'pollination_service', 'تلقيح النخيل', 1 FROM palm_service_branches WHERE key = 'pollination'
UNION ALL SELECT id, 'pollination_supply', 'توفير اللقاح', 2 FROM palm_service_branches WHERE key = 'pollination'
ON CONFLICT DO NOTHING;

-- Pruning branch
INSERT INTO palm_service_items (branch_id, key, label, display_order)
SELECT id, 'takreb', 'التكريب', 1 FROM palm_service_branches WHERE key = 'pruning'
UNION ALL SELECT id, 'pruning', 'التقليم', 2 FROM palm_service_branches WHERE key = 'pruning'
UNION ALL SELECT id, 'cleaning', 'تنظيف النخيل', 3 FROM palm_service_branches WHERE key = 'pruning'
UNION ALL SELECT id, 'frond_removal', 'إزالة السعف', 4 FROM palm_service_branches WHERE key = 'pruning'
UNION ALL SELECT id, 'cutting_prep', 'القص والتجهيز', 5 FROM palm_service_branches WHERE key = 'pruning'
ON CONFLICT DO NOTHING;

-- Uprooting/planting branch
INSERT INTO palm_service_items (branch_id, key, label, display_order)
SELECT id, 'uprooting', 'قلع النخيل', 1 FROM palm_service_branches WHERE key = 'uprooting_planting'
UNION ALL SELECT id, 'transport_prep', 'تجهيز النخيل للنقل', 2 FROM palm_service_branches WHERE key = 'uprooting_planting'
UNION ALL SELECT id, 'planting', 'غرس النخيل', 3 FROM palm_service_branches WHERE key = 'uprooting_planting'
UNION ALL SELECT id, 'replanting', 'إعادة زراعة النخيل', 4 FROM palm_service_branches WHERE key = 'uprooting_planting'
UNION ALL SELECT id, 'post_planting_followup', 'متابعة ما بعد الغرس', 5 FROM palm_service_branches WHERE key = 'uprooting_planting'
ON CONFLICT DO NOTHING;

-- Protection branch
INSERT INTO palm_service_items (branch_id, key, label, display_order)
SELECT id, 'weevil_control', 'مكافحة سوسة النخيل', 1 FROM palm_service_branches WHERE key = 'protection'
UNION ALL SELECT id, 'pest_control', 'مكافحة الآفات', 2 FROM palm_service_branches WHERE key = 'protection'
UNION ALL SELECT id, 'disease_treatment', 'علاج الأمراض', 3 FROM palm_service_branches WHERE key = 'protection'
UNION ALL SELECT id, 'preventive_spray', 'الرش الوقائي', 4 FROM palm_service_branches WHERE key = 'protection'
UNION ALL SELECT id, 'diagnosis_inspection', 'التشخيص والفحص', 5 FROM palm_service_branches WHERE key = 'protection'
ON CONFLICT DO NOTHING;

-- Agricultural branch
INSERT INTO palm_service_items (branch_id, key, label, display_order)
SELECT id, 'fertilization', 'التسميد', 1 FROM palm_service_branches WHERE key = 'agricultural'
UNION ALL SELECT id, 'irrigation_programs', 'برامج الري', 2 FROM palm_service_branches WHERE key = 'agricultural'
UNION ALL SELECT id, 'soil_improvement', 'تحسين التربة', 3 FROM palm_service_branches WHERE key = 'agricultural'
UNION ALL SELECT id, 'growth_monitoring', 'متابعة النمو', 4 FROM palm_service_branches WHERE key = 'agricultural'
ON CONFLICT DO NOTHING;

-- Consulting branch
INSERT INTO palm_service_items (branch_id, key, label, display_order)
SELECT id, 'agricultural_consulting', 'الاستشارات الزراعية', 1 FROM palm_service_branches WHERE key = 'consulting'
UNION ALL SELECT id, 'agricultural_supervision', 'الإشراف الزراعي', 2 FROM palm_service_branches WHERE key = 'consulting'
UNION ALL SELECT id, 'farm_evaluation', 'تقييم المزارع', 3 FROM palm_service_branches WHERE key = 'consulting'
UNION ALL SELECT id, 'palm_evaluation', 'تقييم النخيل', 4 FROM palm_service_branches WHERE key = 'consulting'
UNION ALL SELECT id, 'project_management', 'إدارة مشاريع النخيل', 5 FROM palm_service_branches WHERE key = 'consulting'
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 4. palm_residue_types
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS palm_residue_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE palm_residue_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_palm_residue_types" ON palm_residue_types;
CREATE POLICY "anon_select_palm_residue_types" ON palm_residue_types FOR SELECT
  TO anon, authenticated USING (true);

INSERT INTO palm_residue_types (key, label, display_order) VALUES
  ('fronds', 'السعف', 1),
  ('frond_strips', 'الجريد', 2),
  ('kerb', 'الكرب', 3),
  ('fiber', 'الليف', 4),
  ('trunks', 'الجذوع', 5),
  ('mixed', 'مخلفات مختلطة', 6),
  ('other', 'أخرى', 7)
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, display_order = EXCLUDED.display_order;

-- ═══════════════════════════════════════════════════════════
-- 5. specialty_field_definitions
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS specialty_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id uuid NOT NULL REFERENCES sub_sectors(id) ON DELETE CASCADE,
  operation_type_id text NOT NULL,
  field_key text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_filterable boolean NOT NULL DEFAULT false,
  is_card_visible boolean NOT NULL DEFAULT true,
  options_source text,
  static_options jsonb,
  validation_rules jsonb,
  conditional_field_key text,
  conditional_values jsonb,
  unit text,
  placeholder text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(specialty_id, operation_type_id, field_key)
);

ALTER TABLE specialty_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_specialty_field_definitions" ON specialty_field_definitions;
CREATE POLICY "anon_select_specialty_field_definitions" ON specialty_field_definitions FOR SELECT
  TO anon, authenticated USING (true);

-- ═══════════════════════════════════════════════════════════
-- 6. Seed field definitions for all 7 specialties
-- ═══════════════════════════════════════════════════════════

-- ── 1. ثمار النخيل (palm-fruits) — offer operation ──
-- Sub-classification: sale_model (full harvest vs by kilo)
INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, options_source, static_options, conditional_field_key, conditional_values)
VALUES
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'sale_model', 'radio', 'نموذج البيع', true, 1, true, 'static', '["full_harvest","by_kilo"]'::jsonb, NULL, NULL),
  -- Full harvest fields
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'title', 'text', 'عنوان العرض', true, 2, false, NULL, NULL, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'farm_location', 'select', 'موقع المزرعة', true, 3, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'farm_area', 'number', 'مساحة المزرعة', false, 4, false, NULL, NULL, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'tree_count', 'number', 'عدد النخيل', true, 5, false, NULL, NULL, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'varieties', 'multiselect', 'الأصناف الموجودة', true, 6, true, 'variety', NULL, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'season', 'select', 'الموسم', true, 7, true, 'static', '["موسم 2025","موسم 2026","موسم 2027"]'::jsonb, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'expected_yield', 'text', 'الإنتاج المتوقع', false, 8, false, NULL, NULL, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'harvest_start', 'date', 'موعد بداية الجني', false, 9, false, NULL, NULL, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'harvest_end', 'date', 'موعد نهاية الجني', false, 10, false, NULL, NULL, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'full_sale', 'boolean', 'هل البيع يشمل كامل الإنتاج؟', true, 11, false, NULL, NULL, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'images', 'image', 'الصور', false, 12, false, NULL, NULL, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'description', 'textarea', 'وصف إضافي', false, 13, false, NULL, NULL, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'contact_info', 'text', 'بيانات الجهة', true, 14, false, NULL, NULL, NULL, NULL),
  -- By kilo fields (conditional on sale_model = by_kilo)
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'variety_kilo', 'select', 'الصنف', true, 15, true, 'variety', NULL, 'sale_model', '["by_kilo"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'fruit_condition', 'select', 'حالة الثمار', true, 16, false, 'static', '["رطب","تمر","بسر","خلال"]'::jsonb, 'sale_model', '["by_kilo"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'quantity_available', 'number', 'الكمية المتاحة', true, 17, true, NULL, NULL, 'sale_model', '["by_kilo"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'unit_of_measure', 'select', 'وحدة القياس', true, 18, false, 'units', NULL, 'sale_model', '["by_kilo"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'min_order', 'number', 'الحد الأدنى للطلب', false, 19, false, NULL, NULL, 'sale_model', '["by_kilo"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'price_or_quote', 'radio', 'السعر أو طلب عرض سعر', true, 20, true, 'static', '["price","quote"]'::jsonb, 'sale_model', '["by_kilo"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'price_kilo', 'number', 'السعر', false, 21, true, NULL, NULL, 'sale_model', '["by_kilo"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'location_kilo', 'select', 'الموقع', true, 22, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb, 'sale_model', '["by_kilo"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'availability_date', 'date', 'موعد التوفر', false, 23, false, NULL, NULL, 'sale_model', '["by_kilo"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'images_kilo', 'image', 'الصور', false, 24, false, NULL, NULL, 'sale_model', '["by_kilo"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 'description_kilo', 'textarea', 'وصف إضافي', false, 25, false, NULL, NULL, 'sale_model', '["by_kilo"]'::jsonb)
ON CONFLICT (specialty_id, operation_type_id, field_key) DO UPDATE SET
  field_type = EXCLUDED.field_type,
  label = EXCLUDED.label,
  is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order,
  is_filterable = EXCLUDED.is_filterable,
  options_source = EXCLUDED.options_source,
  static_options = EXCLUDED.static_options,
  conditional_field_key = EXCLUDED.conditional_field_key,
  conditional_values = EXCLUDED.conditional_values;

-- ── 1b. ثمار النخيل — demand operation ──
INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, options_source, static_options)
VALUES
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 'title', 'text', 'عنوان الطلب', true, 1, false, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 'variety', 'select', 'الصنف', false, 2, true, 'variety', NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 'quantity_needed', 'number', 'الكمية المطلوبة', true, 3, true, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 'unit_of_measure', 'select', 'وحدة القياس', true, 4, false, 'units', NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 'location', 'select', 'الموقع', false, 5, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 'description', 'textarea', 'وصف الطلب', false, 6, false, NULL, NULL),
  ('6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 'contact_info', 'text', 'بيانات الجهة', true, 7, false, NULL, NULL)
ON CONFLICT (specialty_id, operation_type_id, field_key) DO UPDATE SET
  field_type = EXCLUDED.field_type, label = EXCLUDED.label, is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order, is_filterable = EXCLUDED.is_filterable,
  options_source = EXCLUDED.options_source, static_options = EXCLUDED.static_options;

-- ── 2. نقايل النخيل (transplanted-palms) — offer & demand ──
INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, options_source, static_options, unit, conditional_field_key, conditional_values)
VALUES
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'variety', 'select', 'الصنف', true, 1, true, 'variety', NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'count', 'number', 'العدد', true, 2, true, NULL, NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'trunk_height', 'number', 'ارتفاع الجذع الصافي', true, 3, true, NULL, NULL, 'meter', NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'total_height', 'number', 'الارتفاع الكلي', false, 4, false, NULL, NULL, 'meter', NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'trunk_diameter', 'number', 'قطر الجذع', false, 5, false, NULL, NULL, 'cm', NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'palm_condition', 'select', 'حالة النخيل', true, 6, false, 'static', '["ممتازة","جيدة","مقبولة"]'::jsonb, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'location', 'select', 'موقع النخيل', true, 7, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'uprooting_readiness', 'select', 'جاهزية القلع', true, 8, true, 'static', '["جاهز","يحتاج تهيئة","غير جاهز"]'::jsonb, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'images', 'image', 'الصور', false, 9, false, NULL, NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'video', 'text', 'الفيديو (رابط)', false, 10, false, NULL, NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'min_order', 'number', 'الحد الأدنى للطلب', false, 11, false, NULL, NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'price_or_quote', 'radio', 'السعر أو طلب عرض سعر', true, 12, true, 'static', '["price","quote"]'::jsonb, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'price', 'number', 'السعر', false, 13, true, NULL, NULL, 'SAR', NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'logistics_available', 'boolean', 'إمكانية طلب خدمة لوجستية', false, 14, false, NULL, NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'description', 'textarea', 'وصف إضافي', false, 15, false, NULL, NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'offer', 'contact_info', 'text', 'بيانات الجهة', true, 16, false, NULL, NULL, NULL, NULL, NULL),
  -- demand
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'demand', 'title', 'text', 'عنوان الطلب', true, 1, false, NULL, NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'demand', 'variety', 'select', 'الصنف', false, 2, true, 'variety', NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'demand', 'count', 'number', 'العدد المطلوب', true, 3, true, NULL, NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'demand', 'min_trunk_height', 'number', 'أدنى ارتفاع للجذع', false, 4, true, NULL, NULL, 'meter', NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'demand', 'max_trunk_height', 'number', 'أعلى ارتفاع للجذع', false, 5, true, NULL, NULL, 'meter', NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'demand', 'location', 'select', 'الموقع', false, 6, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'demand', 'description', 'textarea', 'وصف الطلب', false, 7, false, NULL, NULL, NULL, NULL, NULL),
  ('1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'demand', 'contact_info', 'text', 'بيانات الجهة', true, 8, false, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (specialty_id, operation_type_id, field_key) DO UPDATE SET
  field_type = EXCLUDED.field_type, label = EXCLUDED.label, is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order, is_filterable = EXCLUDED.is_filterable,
  options_source = EXCLUDED.options_source, static_options = EXCLUDED.static_options,
  unit = EXCLUDED.unit, conditional_field_key = EXCLUDED.conditional_field_key,
  conditional_values = EXCLUDED.conditional_values;

-- ── 3. فسائل النخيل (palm-seedlings) — offer & demand ──
INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, options_source, static_options, unit)
VALUES
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'variety', 'select', 'الصنف', true, 1, true, 'variety', NULL, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'count', 'number', 'عدد الفسائل', true, 2, true, NULL, NULL, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'min_weight', 'number', 'الوزن الأدنى', true, 3, true, NULL, NULL, 'kg'),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'max_weight', 'number', 'الوزن الأعلى', true, 4, true, NULL, NULL, 'kg'),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'rooting_status', 'select', 'حالة التجذير', true, 5, true, 'static', '["متجذر","غير متجذر","جزئي"]'::jsonb, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'age', 'number', 'العمر', false, 6, false, NULL, NULL, 'year'),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'seedling_condition', 'select', 'حالة الفسيلة', true, 7, false, 'static', '["ممتازة","جيدة","مقبولة"]'::jsonb, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'location', 'select', 'الموقع', true, 8, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'min_order', 'number', 'الحد الأدنى للطلب', false, 9, false, NULL, NULL, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'price_or_quote', 'radio', 'السعر أو طلب عرض سعر', true, 10, true, 'static', '["price","quote"]'::jsonb, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'price', 'number', 'السعر', false, 11, true, NULL, NULL, 'SAR'),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'images', 'image', 'الصور', false, 12, false, NULL, NULL, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'logistics_available', 'boolean', 'إمكانية طلب خدمة لوجستية', false, 13, false, NULL, NULL, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'description', 'textarea', 'وصف إضافي', false, 14, false, NULL, NULL, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'offer', 'contact_info', 'text', 'بيانات الجهة', true, 15, false, NULL, NULL, NULL),
  -- demand
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'demand', 'title', 'text', 'عنوان الطلب', true, 1, false, NULL, NULL, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'demand', 'variety', 'select', 'الصنف', false, 2, true, 'variety', NULL, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'demand', 'count', 'number', 'العدد المطلوب', true, 3, true, NULL, NULL, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'demand', 'min_weight', 'number', 'أدنى وزن', false, 4, true, NULL, NULL, 'kg'),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'demand', 'max_weight', 'number', 'أعلى وزن', false, 5, true, NULL, NULL, 'kg'),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'demand', 'location', 'select', 'الموقع', false, 6, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'demand', 'description', 'textarea', 'وصف الطلب', false, 7, false, NULL, NULL, NULL),
  ('c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'demand', 'contact_info', 'text', 'بيانات الجهة', true, 8, false, NULL, NULL, NULL)
ON CONFLICT (specialty_id, operation_type_id, field_key) DO UPDATE SET
  field_type = EXCLUDED.field_type, label = EXCLUDED.label, is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order, is_filterable = EXCLUDED.is_filterable,
  options_source = EXCLUDED.options_source, static_options = EXCLUDED.static_options, unit = EXCLUDED.unit;

-- ── 4. نخيل المشاريع (palm-projects) — offer & demand ──
INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, options_source, static_options, unit)
VALUES
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'variety', 'select', 'الصنف', true, 1, true, 'variety', NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'tree_count', 'number', 'عدد النخيل', true, 2, true, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'trunk_height', 'number', 'ارتفاع الجذع الصافي', true, 3, true, NULL, NULL, 'meter'),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'height_range', 'text', 'نطاق الارتفاعات', false, 4, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'uniformity_grade', 'select', 'درجة تجانس الارتفاعات', false, 5, false, 'static', '["عالي","متوسط","منخفض"]'::jsonb, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'kerb_status', 'select', 'حالة الكرب', true, 6, true, 'static', '["سليم","سليم مع ملاحظات","يحتاج معالجة"]'::jsonb, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'takreb_type', 'select', 'نوع التكريب', true, 7, true, 'static', '["هلالي","عادي"]'::jsonb, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'trunk_diameter', 'number', 'قطر الجذع', false, 8, false, NULL, NULL, 'cm'),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'root_condition', 'select', 'حالة الجذور', false, 9, false, 'static', '["سليمة","تحتاج معالجة","محدودة"]'::jsonb, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'location', 'select', 'موقع النخيل', true, 10, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'uprooting_readiness', 'select', 'جاهزية القلع', true, 11, true, 'static', '["جاهز","يحتاج تهيئة","غير جاهز"]'::jsonb, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'prep_duration', 'text', 'مدة التجهيز', false, 12, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'planting_capability', 'boolean', 'إمكانية الغرس', false, 13, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'project_specs', 'textarea', 'مواصفات المشروع', true, 14, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'images', 'image', 'الصور والفيديو', false, 15, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'min_order', 'number', 'الحد الأدنى للطلب', false, 16, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'price_or_quote', 'radio', 'السعر أو طلب عرض سعر', true, 17, true, 'static', '["price","quote"]'::jsonb, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'price', 'number', 'السعر', false, 18, true, NULL, NULL, 'SAR'),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'auction_available', 'boolean', 'إمكانية طلب مزاد', false, 19, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'logistics_available', 'boolean', 'إمكانية طلب لوجستيات', false, 20, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'description', 'textarea', 'وصف إضافي', false, 21, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'offer', 'contact_info', 'text', 'بيانات الجهة', true, 22, false, NULL, NULL, NULL),
  -- demand
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'demand', 'title', 'text', 'عنوان الطلب', true, 1, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'demand', 'variety', 'select', 'الصنف', false, 2, true, 'variety', NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'demand', 'tree_count', 'number', 'عدد النخيل المطلوب', true, 3, true, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'demand', 'min_trunk_height', 'number', 'أدنى ارتفاع للجذع', false, 4, true, NULL, NULL, 'meter'),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'demand', 'kerb_status', 'select', 'حالة الكرب المطلوبة', false, 5, true, 'static', '["سليم","سليم مع ملاحظات","يحتاج معالجة"]'::jsonb, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'demand', 'takreb_type', 'select', 'نوع التكريب المطلوب', false, 6, true, 'static', '["هلالي","عادي"]'::jsonb, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'demand', 'location', 'select', 'الموقع', false, 7, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'demand', 'description', 'textarea', 'وصف الطلب', false, 8, false, NULL, NULL, NULL),
  ('bccaaa64-539d-42fd-9abb-614acc24c7b8', 'demand', 'contact_info', 'text', 'بيانات الجهة', true, 9, false, NULL, NULL, NULL)
ON CONFLICT (specialty_id, operation_type_id, field_key) DO UPDATE SET
  field_type = EXCLUDED.field_type, label = EXCLUDED.label, is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order, is_filterable = EXCLUDED.is_filterable,
  options_source = EXCLUDED.options_source, static_options = EXCLUDED.static_options, unit = EXCLUDED.unit;

-- ── 5. مخلفات النخيل (palm-residues) — offer & demand ──
INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, options_source, static_options, unit, conditional_field_key, conditional_values)
VALUES
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'residue_type', 'select', 'نوع المخلفات', true, 1, true, 'residue_types', NULL, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'quantity_method', 'radio', 'طريقة تحديد الكمية', true, 2, true, 'static', '["weight","count","manual_desc"]'::jsonb, NULL, NULL, NULL),
  -- Weight conditional fields
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'weight_value', 'number', 'الوزن', true, 3, false, NULL, NULL, 'kg', 'quantity_method', '["weight"]'::jsonb),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'weight_unit', 'select', 'وحدة الوزن', true, 4, false, 'static', '["kg","ton"]'::jsonb, NULL, 'quantity_method', '["weight"]'::jsonb),
  -- Count conditional fields
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'count_value', 'number', 'العدد', true, 5, false, NULL, NULL, NULL, 'quantity_method', '["count"]'::jsonb),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'count_unit', 'select', 'وحدة العد', true, 6, false, 'static', '["piece","bunch","box"]'::jsonb, NULL, 'quantity_method', '["count"]'::jsonb),
  -- Manual description conditional fields
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'manual_quantity_desc', 'textarea', 'وصف الكمية', true, 7, false, NULL, NULL, NULL, 'quantity_method', '["manual_desc"]'::jsonb),
  -- Common fields
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'location', 'select', 'الموقع', true, 8, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'material_condition', 'select', 'حالة المواد', true, 9, false, 'static', '["جافة","طازجة","مخلوطة"]'::jsonb, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'loading_readiness', 'select', 'جاهزية التحميل', true, 10, true, 'static', '["جاهز","يحتاج تجهيز","غير جاهز"]'::jsonb, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'images', 'image', 'الصور', false, 11, false, NULL, NULL, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'price_or_quote', 'radio', 'السعر أو طلب عرض سعر', true, 12, true, 'static', '["price","quote"]'::jsonb, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'price', 'number', 'السعر', false, 13, true, NULL, NULL, 'SAR', NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'logistics_available', 'boolean', 'إمكانية طلب لوجستيات', false, 14, false, NULL, NULL, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'description', 'textarea', 'وصف إضافي', false, 15, false, NULL, NULL, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'offer', 'contact_info', 'text', 'بيانات الجهة', true, 16, false, NULL, NULL, NULL, NULL, NULL),
  -- demand
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'demand', 'title', 'text', 'عنوان الطلب', true, 1, false, NULL, NULL, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'demand', 'residue_type', 'select', 'نوع المخلفات', false, 2, true, 'residue_types', NULL, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'demand', 'quantity_needed', 'text', 'الكمية المطلوبة', true, 3, false, NULL, NULL, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'demand', 'location', 'select', 'الموقع', false, 4, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'demand', 'description', 'textarea', 'وصف الطلب', false, 5, false, NULL, NULL, NULL, NULL, NULL),
  ('7f56b186-0755-42c0-a4a1-113e5717dde7', 'demand', 'contact_info', 'text', 'بيانات الجهة', true, 6, false, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (specialty_id, operation_type_id, field_key) DO UPDATE SET
  field_type = EXCLUDED.field_type, label = EXCLUDED.label, is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order, is_filterable = EXCLUDED.is_filterable,
  options_source = EXCLUDED.options_source, static_options = EXCLUDED.static_options,
  unit = EXCLUDED.unit, conditional_field_key = EXCLUDED.conditional_field_key,
  conditional_values = EXCLUDED.conditional_values;

-- ── 6. مستلزمات وتقنيات النخيل (palm-supplies) — offer & demand ──
INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, options_source, static_options)
VALUES
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'supply_category', 'select', 'الفئة', true, 1, true, 'static', '["irrigation_systems","fertilization","pest_control","pollination_tools","harvest_equipment","smart_tech","packing_supplies"]'::jsonb),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'supply_type', 'text', 'نوع المستلزم أو التقنية', true, 2, false, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'brand', 'text', 'الشركة أو العلامة', false, 3, true, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'condition', 'radio', 'جديد أو مستعمل', true, 4, true, 'static', '["new","used"]'::jsonb),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'quantity', 'number', 'الكمية', true, 5, false, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'unit_of_measure', 'select', 'وحدة القياس', true, 6, false, 'units', NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'price_or_quote', 'radio', 'السعر أو طلب عرض سعر', true, 7, true, 'static', '["price","quote"]'::jsonb),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'price', 'number', 'السعر', false, 8, true, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'warranty', 'text', 'الضمان', false, 9, false, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'usage_range', 'text', 'نطاق الاستخدام', false, 10, true, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'farm_size_coverage', 'text', 'حجم المزرعة أو عدد النخيل الذي يخدمه', false, 11, true, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'location', 'select', 'الموقع', true, 12, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'supply_included', 'boolean', 'التوريد', false, 13, false, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'installation_available', 'boolean', 'التركيب', false, 14, true, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'images', 'image', 'الصور', false, 15, false, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'description', 'textarea', 'وصف إضافي', false, 16, false, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'offer', 'contact_info', 'text', 'بيانات الجهة', true, 17, false, NULL, NULL),
  -- demand
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'demand', 'title', 'text', 'عنوان الطلب', true, 1, false, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'demand', 'supply_category', 'select', 'الفئة', false, 2, true, 'static', '["irrigation_systems","fertilization","pest_control","pollination_tools","harvest_equipment","smart_tech","packing_supplies"]'::jsonb),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'demand', 'description', 'textarea', 'وصف الطلب', false, 3, false, NULL, NULL),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'demand', 'location', 'select', 'الموقع', false, 4, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb),
  ('ed5125f3-0be3-4831-baf3-441b9c17e0a1', 'demand', 'contact_info', 'text', 'بيانات الجهة', true, 5, false, NULL, NULL)
ON CONFLICT (specialty_id, operation_type_id, field_key) DO UPDATE SET
  field_type = EXCLUDED.field_type, label = EXCLUDED.label, is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order, is_filterable = EXCLUDED.is_filterable,
  options_source = EXCLUDED.options_source, static_options = EXCLUDED.static_options;

-- ── 7. خدمات النخيل (palm-services) — service_offer & service_request ──
INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, options_source, static_options)
VALUES
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'service_branches', 'multiselect', 'الفروع المختارة', true, 1, true, 'service_branches', NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'service_items', 'multiselect', 'الخدمات المختارة', true, 2, false, 'service_items', NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'provider_name', 'text', 'اسم مقدم الخدمة', true, 3, false, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'provider_type', 'select', 'نوع مقدم الخدمة', true, 4, true, 'static', '["individual","team","organization","company"]'::jsonb),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'coverage_areas', 'multiselect', 'المدن والمناطق التي يغطيها', true, 5, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'project_capacity', 'text', 'حجم المشاريع التي يستطيع تنفيذها', false, 6, true, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'equipment_available', 'boolean', 'المعدات المتوفرة', false, 7, true, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'labor_available', 'text', 'العمالة المتوفرة', false, 8, false, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'seasonality', 'select', 'موسمية الخدمة', false, 9, false, 'static', '["year_round","seasonal"]'::jsonb),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'min_work', 'text', 'الحد الأدنى للعمل', false, 10, false, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'expected_duration', 'text', 'المدة المتوقعة', false, 11, false, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'contract_invoice', 'boolean', 'إمكانية إصدار عقد أو فاتورة', false, 12, false, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'transport_available', 'boolean', 'توفير النقل', false, 13, true, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'images', 'image', 'الصور والأعمال السابقة', false, 14, false, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'description', 'textarea', 'وصف إضافي', false, 15, false, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_offer', 'contact_info', 'text', 'بيانات الجهة', true, 16, false, NULL, NULL),
  -- service_request
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_request', 'title', 'text', 'عنوان الطلب', true, 1, false, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_request', 'service_branches', 'multiselect', 'الفروع المطلوبة', true, 2, true, 'service_branches', NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_request', 'service_items', 'multiselect', 'الخدمات المطلوبة', false, 3, false, 'service_items', NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_request', 'location', 'select', 'الموقع', true, 4, true, 'static', '["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]'::jsonb),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_request', 'description', 'textarea', 'وصف الطلب', false, 5, false, NULL, NULL),
  ('4c235525-d768-425e-b623-0e90e8403c0d', 'service_request', 'contact_info', 'text', 'بيانات الجهة', true, 6, false, NULL, NULL)
ON CONFLICT (specialty_id, operation_type_id, field_key) DO UPDATE SET
  field_type = EXCLUDED.field_type, label = EXCLUDED.label, is_required = EXCLUDED.is_required,
  display_order = EXCLUDED.display_order, is_filterable = EXCLUDED.is_filterable,
  options_source = EXCLUDED.options_source, static_options = EXCLUDED.static_options;
