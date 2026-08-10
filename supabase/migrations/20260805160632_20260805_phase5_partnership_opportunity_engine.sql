/*
# Phase 5: Partnership Opportunity Engine

## Overview
Builds the "partnership" opportunity type for the nursery sector using the
generic Opportunity Template V2 engine. No standalone form — all field
definitions are driven from the database.

## 1. New Tables
- `partnership_role_catalog` — reference catalog of partnership roles
  (nursery_producer, farm_producer, supplier, planting_contractor, etc.)
  Read-only for all; write for admins only.
- `partnership_roles` — one row per role requirement in a partnership
  opportunity. Linked to opportunities.id via ON DELETE CASCADE.

## 2. Modified Tables
- `partnership_opportunity_profiles` — extended with new columns:
  - `partnership_type` (already exists)
  - `lead_entity_id` (already exists)
  - `project_size` (already exists)
  - `project_location` (already exists)
  - `start_date` (already exists) → renamed conceptually to project_start_date
  - `join_deadline` (already exists)
  - `required_partners_count` (already exists)
  - `summary` (already exists)
  - `expected_duration` text (NEW)
  - `partners_count_mode` text (NEW: 'fixed' | 'open')
  - `project_value` numeric (NEW)
  - `project_value_visibility` boolean (NEW)
  - `participation_terms` jsonb (NEW)
  - `coverage_mode` text (NEW: 'single_partner' | 'multiple_partners' | 'mixed')
  - `project_phases` integer (NEW)
  - `project_sites` integer (NEW)
  - `is_splittable` boolean (NEW)
  - `total_quantity` numeric (NEW)
  - `total_quantity_unit` text (NEW)
  - `work_scope` text (NEW)

## 3. Field Definitions
- Seeds `opportunity_item_field_definitions` for operation_type='partnership',
  template_version=2, nursery sector. Fields: plant_id, variety_id, quantity,
  unit, age, height, trunk_diameter, container_size, root_status,
  readiness_status, item_supply_date, item_images, notes.

## 4. RPC Extension
- Extends `create_v2_opportunity` with two new optional params:
  `p_partnership_profile jsonb` and `p_partnership_roles jsonb`.
- When operation_type='partnership': validates partnership_type, creates
  profile, inserts roles atomically within the same transaction.
- When operation_type != 'partnership': ignores the new params (backward
  compatible).

## 5. Security (RLS)
- `partnership_role_catalog`: SELECT for anon+authenticated (active rows),
  write for authenticated (admin-managed via service role in practice).
- `partnership_roles`: SELECT public if opportunity is active OR owner;
  INSERT/UPDATE/DELETE owner only (via opportunity ownership check).
- `partnership_opportunity_profiles`: existing policies remain; unique
  constraint on opportunity_id added.

## 6. Nursery Sector Action
- Adds "partnership" to nursery sector available_actions.
*/

-- ═══════════════════════════════════════════════════════════════
-- 1. Extend partnership_opportunity_profiles
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE partnership_opportunity_profiles
  ADD COLUMN IF NOT EXISTS expected_duration text,
  ADD COLUMN IF NOT EXISTS partners_count_mode text DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS project_value numeric,
  ADD COLUMN IF NOT EXISTS project_value_visibility boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS participation_terms jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS coverage_mode text DEFAULT 'single_partner',
  ADD COLUMN IF NOT EXISTS project_phases integer,
  ADD COLUMN IF NOT EXISTS project_sites integer,
  ADD COLUMN IF NOT EXISTS is_splittable boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_quantity numeric,
  ADD COLUMN IF NOT EXISTS total_quantity_unit text,
  ADD COLUMN IF NOT EXISTS work_scope text;

-- Ensure one profile per opportunity
CREATE UNIQUE INDEX IF NOT EXISTS partnership_profiles_one_per_opp
  ON partnership_opportunity_profiles(opportunity_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. partnership_role_catalog
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS partnership_role_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_key text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  description text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partnership_role_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_active_role_catalog" ON partnership_role_catalog;
CREATE POLICY "read_active_role_catalog"
  ON partnership_role_catalog FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Seed basic roles
INSERT INTO partnership_role_catalog (role_key, name_ar, name_en, description, icon, display_order) VALUES
  ('nursery_producer', 'مشتل منتج', 'Nursery Producer', 'مشتل ينتج الشتلات والنباتات', 'Sprout', 0),
  ('farm_producer', 'مزرعة منتجة', 'Farm Producer', 'مزرعة تنتج النباتات أو المحاصيل', 'Wheat', 1),
  ('supplier', 'مورد', 'Supplier', 'جهة توريد للمواد أو النباتات', 'Truck', 2),
  ('planting_contractor', 'مقاول غرس', 'Planting Contractor', 'مقاول متخصص في الغرس والزراعة', 'Shovel', 3),
  ('logistics_provider', 'شركة نقل', 'Logistics Provider', 'جهة نقل وتوصيل', 'Truck', 4),
  ('irrigation_provider', 'شركة ري', 'Irrigation Provider', 'جهة متخصصة في أنظمة الري', 'Droplets', 5),
  ('maintenance_provider', 'شركة صيانة', 'Maintenance Provider', 'جهة صيانة النباتات والمشاريع', 'Wrench', 6),
  ('consultant', 'مكتب استشاري', 'Consultant', 'مكتب استشاري زراعي', 'Briefcase', 7),
  ('agricultural_supervisor', 'مشرف زراعي', 'Agricultural Supervisor', 'مشرف ميداني على التنفيذ الزراعي', 'ClipboardCheck', 8),
  ('distributor', 'موزع', 'Distributor', 'جهة توزيع وتسويق', 'Store', 9)
ON CONFLICT (role_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. partnership_roles
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS partnership_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  role_key text NOT NULL,
  role_label_snapshot text NOT NULL,
  description text,
  required_count integer,
  required_quantity numeric,
  unit text,
  minimum_capacity numeric,
  coverage_area jsonb DEFAULT '{}'::jsonb,
  requirements jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partnership_roles_opp_id
  ON partnership_roles(opportunity_id);

ALTER TABLE partnership_roles ENABLE ROW LEVEL SECURITY;

-- SELECT: public if opportunity is active, or owner sees their own
DROP POLICY IF EXISTS "read_partnership_roles" ON partnership_roles;
CREATE POLICY "read_partnership_roles"
  ON partnership_roles FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = partnership_roles.opportunity_id
        AND (o.status = 'active' OR o.created_by = auth.uid())
    )
  );

-- INSERT: owner only
DROP POLICY IF EXISTS "insert_partnership_roles" ON partnership_roles;
CREATE POLICY "insert_partnership_roles"
  ON partnership_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = partnership_roles.opportunity_id
        AND o.created_by = auth.uid()
    )
  );

-- UPDATE: owner only
DROP POLICY IF EXISTS "update_partnership_roles" ON partnership_roles;
CREATE POLICY "update_partnership_roles"
  ON partnership_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = partnership_roles.opportunity_id
        AND o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = partnership_roles.opportunity_id
        AND o.created_by = auth.uid()
    )
  );

-- DELETE: owner only
DROP POLICY IF EXISTS "delete_partnership_roles" ON partnership_roles;
CREATE POLICY "delete_partnership_roles"
  ON partnership_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = partnership_roles.opportunity_id
        AND o.created_by = auth.uid()
    )
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. Seed partnership field definitions for nursery sector
-- ═══════════════════════════════════════════════════════════════

INSERT INTO opportunity_item_field_definitions (
  sector_id, sub_sector_id, operation_type, template_version,
  field_key, field_type, label, column_name, options_source, static_options,
  is_required, is_filterable, is_card_visible, display_order,
  unit, placeholder, validation_rules, conditional_field_key, conditional_values
)
VALUES
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'plant_id', 'select', 'النبات المرتبط', 'reference_id', 'plant_catalog', NULL,
   false, false, true, 0, NULL, 'اختر النبات إن وجد', NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'variety_id', 'select', 'الصنف', 'plant_variety_id', 'plant_varieties', NULL,
   false, false, true, 1, NULL, 'اختر الصنف', NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'quantity', 'number', 'الكمية أو الحصة المطلوبة', 'quantity', NULL, NULL,
   false, true, true, 2, NULL, '0', NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'unit', 'select', 'الوحدة', 'unit', 'static',
   '["seedling","tree","thousand_seedlings","tray","box","unit","contract"]'::jsonb,
   false, true, true, 3, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'age', 'number', 'العمر (سنة)', 'age_value', NULL, NULL,
   false, false, false, 4, 'سنة', NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'height', 'number', 'الارتفاع (متر)', 'height_value', NULL, NULL,
   false, false, false, 5, 'متر', NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'trunk_diameter', 'number', 'قطر الساق (سم)', 'trunk_diameter_value', NULL, NULL,
   false, false, false, 6, 'سم', NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'container_size', 'select', 'حجم الحاوية', 'container_size', 'static',
   '["small_bag","medium_bag","large_bag","pot_15","pot_25","pot_40","ground"]'::jsonb,
   false, false, false, 7, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'root_status', 'select', 'حالة الجذور', 'root_status', 'static',
   '["rooted","not_rooted","partial"]'::jsonb,
   false, false, false, 8, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'readiness_status', 'select', 'حالة الجاهزية', 'readiness_status', 'static',
   '["ready","needs_prep","not_ready"]'::jsonb,
   false, false, false, 9, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'item_supply_date', 'date', 'تاريخ الجاهزية أو التوريد', NULL, NULL, NULL,
   false, false, false, 10, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'item_images', 'image', 'صور مرجعية', 'images', NULL, NULL,
   false, false, false, 11, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'partnership', 2,
   'notes', 'text', 'ملاحظات العنصر', NULL, NULL, NULL,
   false, false, false, 12, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 5. Add "partnership" action to nursery sector
-- ═══════════════════════════════════════════════════════════════

UPDATE sectors
SET available_actions = available_actions || jsonb_build_array(
  jsonb_build_object('id', 'partnership', 'icon', 'Handshake', 'label', 'فرصة شراكة', 'is_active', true)
)
WHERE id = '73e613d6-e10e-4b1d-aef1-b0f591df9d03'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(available_actions) AS elem
    WHERE elem->>'id' = 'partnership'
  );

-- ═══════════════════════════════════════════════════════════════
-- 6. Extend create_v2_opportunity RPC for partnership
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_v2_opportunity(
  p_sector_id uuid,
  p_sub_sector_id uuid,
  p_operation_type text,
  p_template_version integer,
  p_title text,
  p_description text,
  p_city text,
  p_general_images text[],
  p_items jsonb,
  p_status text,
  p_publisher_entity_id uuid,
  p_opportunity_attributes jsonb DEFAULT '{}'::jsonb,
  p_partnership_profile jsonb DEFAULT NULL,
  p_partnership_roles jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_opportunity_id uuid;
  v_item jsonb;
  v_sector_template_version integer;
  v_is_valid_sub_sector boolean;
  v_allowed_item_keys text[] := ARRAY[
    'item_type', 'reference_source', 'reference_id', 'name_snapshot',
    'variety_name_snapshot', 'plant_variety_id', 'quantity', 'unit',
    'unit_price', 'pricing_type', 'min_order_quantity', 'age_value',
    'height_value', 'trunk_diameter_value', 'container_size',
    'root_status', 'readiness_status', 'cover_image', 'images',
    'attributes', 'display_order', 'is_active'
  ];
  v_key text;
  v_plant_active boolean;
  v_variety_active boolean;
  v_variety_belongs boolean;
  v_qty numeric;
  v_min_qty numeric;
  v_min_price numeric;
  v_max_price numeric;
  v_opp_type text;
  v_timing text;
  v_partnership_type text;
  v_partners_count_mode text;
  v_required_partners integer;
  v_join_deadline date;
  v_start_date date;
  v_role jsonb;
  v_role_key text;
  v_role_label text;
  v_role_exists boolean;
  v_role_active boolean;
  v_coverage_mode text;
BEGIN
  -- ── 1. Authentication ──
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_ERROR: يجب تسجيل الدخول لإنشاء فرصة';
  END IF;

  -- ── 2. Status whitelist ──
  IF p_status NOT IN ('draft', 'pending_review') THEN
    RAISE EXCEPTION 'AUTH_ERROR: الحالة المطلوبة غير مسموحة. مسموح فقط: draft, pending_review';
  END IF;

  -- ── 3. Title validation ──
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: العنوان مطلوب';
  END IF;

  -- ── 4. Publisher ownership ──
  IF p_status = 'pending_review' THEN
    IF p_publisher_entity_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: الجهة الناشرة مطلوبة للإرسال للمراجعة';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM publisher_entities
      WHERE id = p_publisher_entity_id
        AND owner_user_id = v_user_id
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'AUTH_ERROR: لا تملك صلاحية النشر باسم هذه الجهة';
    END IF;
  END IF;

  -- ── 5. Sector template version must be 2 ──
  SELECT opportunity_template_version INTO v_sector_template_version
  FROM sectors WHERE id = p_sector_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: القطاع غير موجود';
  END IF;
  IF v_sector_template_version IS NULL OR v_sector_template_version <> 2 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: هذا القطاع لا يستخدم قوالب V2';
  END IF;

  -- ── 6. Sub-sector must belong to sector ──
  IF p_sub_sector_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM sub_sectors
      WHERE id = p_sub_sector_id AND sector_id = p_sector_id
    ) INTO v_is_valid_sub_sector;
    IF NOT v_is_valid_sub_sector THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: الفرع لا يتبع هذا القطاع';
    END IF;
  END IF;

  -- ── 7. Determine opportunity_type ──
  v_opp_type := p_operation_type;

  -- ── 8. Determine opportunity_timing ──
  v_timing := COALESCE(p_opportunity_attributes->>'opportunity_timing', 'flexible');
  IF v_timing NOT IN ('scheduled', 'flexible', 'available_now') THEN
    v_timing := 'flexible';
  END IF;
  IF p_operation_type = 'demand' AND v_timing = 'available_now' THEN
    v_timing := 'flexible';
  END IF;
  -- Partnership: never default to available_now
  IF p_operation_type = 'partnership' AND v_timing = 'available_now' THEN
    v_timing := 'flexible';
  END IF;

  -- ── 9. Partnership-specific validation ──
  IF p_operation_type = 'partnership' THEN
    -- partnership_type must be valid
    v_partnership_type := p_partnership_profile->>'partnership_type';
    IF v_partnership_type IS NULL OR v_partnership_type NOT IN (
      'production', 'supply', 'project_execution', 'distribution_expansion'
    ) THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: نوع الشراكة مطلوب ويجب أن يكون أحد: production, supply, project_execution, distribution_expansion';
    END IF;

    -- partners_count_mode
    v_partners_count_mode := COALESCE(p_partnership_profile->>'partners_count_mode', 'fixed');
    IF v_partners_count_mode NOT IN ('fixed', 'open') THEN
      v_partners_count_mode := 'fixed';
    END IF;

    -- required_partners_count > 0 when mode = fixed
    v_required_partners := NULLIF(p_partnership_profile->>'required_partners_count', '')::integer;
    IF v_partners_count_mode = 'fixed' THEN
      IF v_required_partners IS NULL OR v_required_partners <= 0 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: عدد الشركاء المطلوب يجب أن يكون أكبر من صفر في الوضع fixed';
      END IF;
    END IF;

    -- join_deadline validation
    v_join_deadline := NULLIF(p_partnership_profile->>'join_deadline', '')::date;
    IF v_join_deadline IS NOT NULL AND v_join_deadline < CURRENT_DATE THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: آخر موعد للانضمام لا يسبق تاريخ اليوم';
    END IF;

    -- start_date must not precede join_deadline (unless flexible timing)
    v_start_date := NULLIF(p_partnership_profile->>'start_date', '')::date;
    IF v_start_date IS NOT NULL AND v_join_deadline IS NOT NULL
       AND v_start_date < v_join_deadline AND v_timing = 'scheduled' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: تاريخ بداية المشروع لا يسبق آخر موعد للانضمام (إلا إذا كان الموعد مرنًا)';
    END IF;

    -- coverage_mode
    v_coverage_mode := COALESCE(p_partnership_profile->>'coverage_mode', 'single_partner');
    IF v_coverage_mode NOT IN ('single_partner', 'multiple_partners', 'mixed') THEN
      v_coverage_mode := 'single_partner';
    END IF;

    -- Roles validation: for project_execution or supply with multiple_partners,
    -- at least one role is required
    IF p_partnership_roles IS NULL
       OR jsonb_typeof(p_partnership_roles) <> 'array'
       OR jsonb_array_length(p_partnership_roles) = 0 THEN
      IF v_partnership_type IN ('project_execution', 'supply')
         AND v_coverage_mode IN ('multiple_partners', 'mixed') THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: يجب تحديد دور واحد على الأقل لشراكات التنفيذ والتوريد الجماعي';
      END IF;
    END IF;

    -- Validate each role
    IF p_partnership_roles IS NOT NULL AND jsonb_typeof(p_partnership_roles) = 'array' THEN
      FOR v_role IN SELECT * FROM jsonb_array_elements(p_partnership_roles) LOOP
        v_role_key := v_role->>'role_key';
        v_role_label := v_role->>'role_label_snapshot';
        IF v_role_key IS NULL OR btrim(v_role_key) = '' THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: role_key مطلوب لكل دور';
        END IF;
        IF v_role_label IS NULL OR btrim(v_role_label) = '' THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: role_label_snapshot مطلوب لكل دور';
        END IF;

        -- Check role_key is in catalog and active
        SELECT is_active INTO v_role_active
        FROM partnership_role_catalog WHERE role_key = v_role_key;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: دور الشراكة غير موجود في الكتالوج: %', v_role_key;
        END IF;
        IF NOT v_role_active THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: دور الشراكة غير نشط: %', v_role_key;
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- ── 10. Items validation ──
  -- Partnership may have zero items (e.g. distribution partnership)
  IF p_operation_type != 'partnership' THEN
    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: يجب إضافة عنصر واحد على الأقل';
    END IF;
  END IF;

  -- ── 11. Insert opportunity ──
  INSERT INTO opportunities (
    sector_id, sub_sector_id, type, operation_type, opportunity_type,
    opportunity_timing, template_version, title, description, city,
    attributes, images, status, publisher_entity_id
  ) VALUES (
    p_sector_id,
    p_sub_sector_id,
    'opportunity',
    p_operation_type,
    v_opp_type,
    v_timing,
    2,
    p_title,
    p_description,
    p_city,
    COALESCE(p_opportunity_attributes, '{}'::jsonb),
    COALESCE(p_general_images, ARRAY[]::text[]),
    p_status,
    p_publisher_entity_id
  )
  RETURNING id INTO v_opportunity_id;

  -- ── 12. Insert items with full validation ──
  IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      -- 12a. Reject unexpected JSON keys
      FOR v_key IN SELECT * FROM jsonb_object_keys(v_item) LOOP
        IF NOT (v_key = ANY(v_allowed_item_keys)) THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: مفتاح JSON غير مسموح: %', v_key;
        END IF;
      END LOOP;

      -- 12b. Plant/variety validation
      IF v_item->>'reference_source' = 'plant_catalog'
         AND v_item->>'reference_id' IS NOT NULL
         AND v_item->>'reference_id' <> ''
      THEN
        SELECT is_active INTO v_plant_active
        FROM plant_catalog WHERE id = (v_item->>'reference_id')::uuid;
        IF NOT FOUND OR NOT v_plant_active THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: النبات غير موجود أو غير نشط';
        END IF;

        IF v_item->>'plant_variety_id' IS NOT NULL AND v_item->>'plant_variety_id' <> '' THEN
          SELECT is_active INTO v_variety_active
          FROM plant_varieties WHERE id = (v_item->>'plant_variety_id')::uuid;
          IF NOT FOUND OR NOT v_variety_active THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: الصنف غير موجود أو غير نشط';
          END IF;

          SELECT EXISTS(
            SELECT 1 FROM plant_varieties
            WHERE id = (v_item->>'plant_variety_id')::uuid
              AND plant_id = (v_item->>'reference_id')::uuid
          ) INTO v_variety_belongs;
          IF NOT v_variety_belongs THEN
            RAISE EXCEPTION 'VALIDATION_ERROR: الصنف لا يتبع النبات المحدد';
          END IF;
        END IF;
      END IF;

      -- 12c. Demand-specific validation
      IF p_operation_type = 'demand' THEN
        v_qty := NULLIF(v_item->>'quantity', '')::numeric;
        IF v_qty IS NOT NULL AND v_qty <= 0 THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: الكمية يجب أن تكون أكبر من صفر';
        END IF;

        v_min_qty := NULLIF(v_item->>'min_order_quantity', '')::numeric;
        IF v_qty IS NOT NULL AND v_min_qty IS NOT NULL AND v_min_qty > v_qty THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: الحد الأدنى من المورد لا يمكن أن يتجاوز الكمية الإجمالية';
        END IF;

        v_min_price := NULLIF(v_item->'attributes'->>'min_price', '')::numeric;
        v_max_price := NULLIF(v_item->'attributes'->>'max_price', '')::numeric;
        IF v_min_price IS NOT NULL AND v_max_price IS NOT NULL AND v_min_price > v_max_price THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: الحد الأدنى للسعر لا يمكن أن يتجاوز الحد الأعلى';
        END IF;
      END IF;

      -- 12d. Insert the item
      INSERT INTO opportunity_items (
        opportunity_id, item_type, reference_source, reference_id,
        name_snapshot, variety_name_snapshot, plant_variety_id,
        quantity, unit, unit_price, pricing_type,
        min_order_quantity, age_value, height_value, trunk_diameter_value,
        container_size, root_status, readiness_status,
        cover_image, images, attributes, display_order, is_active
      ) VALUES (
        v_opportunity_id,
        COALESCE(v_item->>'item_type', 'plant'),
        v_item->>'reference_source',
        NULLIF(v_item->>'reference_id', '')::uuid,
        COALESCE(v_item->>'name_snapshot', 'بدون اسم'),
        NULLIF(v_item->>'variety_name_snapshot', ''),
        NULLIF(v_item->>'plant_variety_id', '')::uuid,
        NULLIF(v_item->>'quantity', '')::numeric,
        NULLIF(v_item->>'unit', ''),
        NULLIF(v_item->>'unit_price', '')::numeric,
        NULLIF(v_item->>'pricing_type', ''),
        NULLIF(v_item->>'min_order_quantity', '')::numeric,
        NULLIF(v_item->>'age_value', '')::numeric,
        NULLIF(v_item->>'height_value', '')::numeric,
        NULLIF(v_item->>'trunk_diameter_value', '')::numeric,
        NULLIF(v_item->>'container_size', ''),
        NULLIF(v_item->>'root_status', ''),
        NULLIF(v_item->>'readiness_status', ''),
        NULLIF(v_item->>'cover_image', ''),
        COALESCE(
          CASE WHEN jsonb_typeof(v_item->'images') = 'array'
            THEN ARRAY(SELECT jsonb_array_elements_text(v_item->'images'))
            ELSE ARRAY[]::text[]
          END,
          ARRAY[]::text[]
        ),
        COALESCE(v_item->'attributes', '{}'::jsonb),
        COALESCE((v_item->>'display_order')::integer, 0),
        COALESCE((v_item->>'is_active')::boolean, true)
      );
    END LOOP;
  END IF;

  -- ── 13. Insert partnership profile + roles (atomic) ──
  IF p_operation_type = 'partnership' THEN
    -- 13a. Insert partnership profile
    INSERT INTO partnership_opportunity_profiles (
      opportunity_id, partnership_type, lead_entity_id,
      project_size, project_location, start_date, join_deadline,
      required_partners_count, summary, expected_duration,
      partners_count_mode, project_value, project_value_visibility,
      participation_terms, coverage_mode, project_phases, project_sites,
      is_splittable, total_quantity, total_quantity_unit, work_scope
    ) VALUES (
      v_opportunity_id,
      v_partnership_type,
      p_publisher_entity_id,
      NULLIF(p_partnership_profile->>'project_size', ''),
      NULLIF(p_partnership_profile->>'project_location', ''),
      NULLIF(p_partnership_profile->>'start_date', '')::date,
      v_join_deadline,
      v_required_partners,
      NULLIF(p_partnership_profile->>'summary', ''),
      NULLIF(p_partnership_profile->>'expected_duration', ''),
      v_partners_count_mode,
      NULLIF(p_partnership_profile->>'project_value', '')::numeric,
      COALESCE((p_partnership_profile->>'project_value_visibility')::boolean, false),
      COALESCE(p_partnership_profile->'participation_terms', '{}'::jsonb),
      v_coverage_mode,
      NULLIF(p_partnership_profile->>'project_phases', '')::integer,
      NULLIF(p_partnership_profile->>'project_sites', '')::integer,
      COALESCE((p_partnership_profile->>'is_splittable')::boolean, false),
      NULLIF(p_partnership_profile->>'total_quantity', '')::numeric,
      NULLIF(p_partnership_profile->>'total_quantity_unit', ''),
      NULLIF(p_partnership_profile->>'work_scope', '')
    );

    -- 13b. Insert partnership roles
    IF p_partnership_roles IS NOT NULL AND jsonb_typeof(p_partnership_roles) = 'array' THEN
      FOR v_role IN SELECT * FROM jsonb_array_elements(p_partnership_roles) LOOP
        INSERT INTO partnership_roles (
          opportunity_id, role_key, role_label_snapshot,
          description, required_count, required_quantity, unit,
          minimum_capacity, coverage_area, requirements, status, display_order
        ) VALUES (
          v_opportunity_id,
          v_role->>'role_key',
          v_role->>'role_label_snapshot',
          NULLIF(v_role->>'description', ''),
          NULLIF(v_role->>'required_count', '')::integer,
          NULLIF(v_role->>'required_quantity', '')::numeric,
          NULLIF(v_role->>'unit', ''),
          NULLIF(v_role->>'minimum_capacity', '')::numeric,
          COALESCE(v_role->'coverage_area', '{}'::jsonb),
          COALESCE(v_role->'requirements', '{}'::jsonb),
          'open',
          COALESCE((v_role->>'display_order')::integer, 0)
        );
      END LOOP;
    END IF;
  END IF;

  -- ── 14. Prevent partnership profile for non-partnership types ──
  IF p_operation_type != 'partnership' AND p_partnership_profile IS NOT NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: لا يمكن إنشاء ملف شراكة لفرصة ليست من نوع partnership';
  END IF;

  RETURN jsonb_build_object(
    'id', v_opportunity_id,
    'title', p_title,
    'status', p_status
  );
END;
$$;

-- Re-grant permissions
REVOKE EXECUTE ON FUNCTION public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid, jsonb, jsonb, jsonb
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid, jsonb, jsonb, jsonb
) FROM anon;

GRANT EXECUTE ON FUNCTION public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid, jsonb, jsonb, jsonb
) TO authenticated;
