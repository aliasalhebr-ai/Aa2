/*
# Phase 5: Drop old create_v2_opportunity overloads

The RPC was extended with new params but old 11-param and 12-param overloads
still exist, causing ambiguity errors when calling with named params.
This migration drops the old overloads, keeping only the 14-param version.
Also fixes the partnership_profile guard: only reject when the profile
is non-null AND has actual content (not just an empty object).
*/

DROP FUNCTION IF EXISTS public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid
);

DROP FUNCTION IF EXISTS public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid, jsonb
);

-- Fix the guard: only reject non-partnership types if partnership_profile
-- has actual content (not NULL and not empty jsonb)
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

  -- ── 11. Prevent partnership profile for non-partnership types ──
  IF p_operation_type != 'partnership' THEN
    IF p_partnership_profile IS NOT NULL
       AND p_partnership_profile != '{}'::jsonb
       AND p_partnership_profile != 'null'::jsonb THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: لا يمكن إنشاء ملف شراكة لفرصة ليست من نوع partnership';
    END IF;
  END IF;

  -- ── 12. Insert opportunity ──
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

  -- ── 13. Insert items with full validation ──
  IF p_items IS NOT NULL AND jsonb_typeof(p_items) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
      -- 13a. Reject unexpected JSON keys
      FOR v_key IN SELECT * FROM jsonb_object_keys(v_item) LOOP
        IF NOT (v_key = ANY(v_allowed_item_keys)) THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: مفتاح JSON غير مسموح: %', v_key;
        END IF;
      END LOOP;

      -- 13b. Plant/variety validation
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

      -- 13c. Demand-specific validation
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

      -- 13d. Insert the item
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

  -- ── 14. Insert partnership profile + roles (atomic) ──
  IF p_operation_type = 'partnership' THEN
    -- 14a. Insert partnership profile
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

    -- 14b. Insert partnership roles
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
