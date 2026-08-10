/*
# Phase 4: Demand Opportunity Field Definitions + Nursery Sector Action + RPC
*/

-- ── 1. Add "demand" action to nursery sector ──
UPDATE sectors
SET available_actions = available_actions || jsonb_build_array(
  jsonb_build_object('id', 'demand', 'icon', 'ShoppingCart', 'label', 'فرصة احتياج', 'is_active', true)
)
WHERE id = '73e613d6-e10e-4b1d-aef1-b0f591df9d03'
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(available_actions) AS elem
    WHERE elem->>'id' = 'demand'
  );

-- ── 2. Seed demand field definitions ──
INSERT INTO opportunity_item_field_definitions (
  sector_id, sub_sector_id, operation_type, template_version,
  field_key, field_type, label, column_name, options_source, static_options,
  is_required, is_filterable, is_card_visible, display_order,
  unit, placeholder, validation_rules, conditional_field_key, conditional_values
)
VALUES
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'plant_id', 'select', 'النبات المطلوب', 'reference_id', 'plant_catalog', NULL,
   true, false, true, 0, NULL, 'اختر النبات المطلوب', NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'variety_id', 'select', 'الصنف', 'plant_variety_id', 'plant_varieties', NULL,
   false, false, true, 1, NULL, 'اختر الصنف أو اقبل جميع الأصناف', NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'quantity', 'number', 'الكمية المطلوبة', 'quantity', NULL, NULL,
   true, true, true, 2, NULL, '0', NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'unit', 'select', 'الوحدة', 'unit', 'static',
   '["seedling","tree","thousand_seedlings","tray","box","unit","contract"]'::jsonb,
   true, true, true, 3, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'min_supplier_qty', 'number', 'الحد الأدنى من المورد الواحد', 'min_order_quantity', NULL, NULL,
   false, false, false, 4, NULL, '0', NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'age', 'number', 'العمر المطلوب (سنة)', 'age_value', NULL, NULL,
   false, true, true, 5, 'سنة', NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'min_height', 'number', 'الحد الأدنى للارتفاع (متر)', NULL, NULL, NULL,
   false, false, false, 6, 'متر', NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'max_height', 'number', 'الحد الأعلى للارتفاع (متر)', NULL, NULL, NULL,
   false, false, false, 7, 'متر', NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'trunk_diameter', 'number', 'قطر الساق (سم)', 'trunk_diameter_value', NULL, NULL,
   false, false, false, 8, 'سم', NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'container_size', 'select', 'حجم الحاوية', 'container_size', 'static',
   '["small_bag","medium_bag","large_bag","pot_15","pot_25","pot_40","ground"]'::jsonb,
   false, false, false, 9, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'root_status', 'select', 'حالة الجذور المطلوبة', 'root_status', 'static',
   '["rooted","not_rooted","partial"]'::jsonb,
   false, false, false, 10, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'readiness_status', 'select', 'حالة الجاهزية المطلوبة', 'readiness_status', 'static',
   '["ready","needs_prep","not_ready"]'::jsonb,
   false, false, false, 11, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'supply_date', 'date', 'تاريخ التوريد المطلوب', NULL, NULL, NULL,
   false, false, false, 12, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'pricing_type', 'select', 'طريقة التسعير', 'pricing_type', 'static',
   '["quote","budget","range_unit","range_project"]'::jsonb,
   false, false, true, 13, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'min_price', 'number', 'الحد الأدنى للسعر', NULL, NULL, NULL,
   false, false, false, 14, NULL, '0', NULL, 'pricing_type',
   '["range_unit","range_project"]'::jsonb),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'max_price', 'number', 'الحد الأعلى للسعر', NULL, NULL, NULL,
   false, false, false, 15, NULL, '0', NULL, 'pricing_type',
   '["range_unit","range_project"]'::jsonb),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'item_images', 'image', 'صور مرجعية للنبات', 'images', NULL, NULL,
   false, false, false, 16, NULL, NULL, NULL, NULL, NULL),

  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'demand', 2,
   'notes', 'text', 'ملاحظات خاصة بهذا النبات', NULL, NULL, NULL,
   false, false, false, 17, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- ── 3. Replace RPC with demand-aware version (adds p_opportunity_attributes) ──
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
  p_opportunity_attributes jsonb DEFAULT '{}'::jsonb
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

  -- ── 9. Items validation ──
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: يجب إضافة عنصر واحد على الأقل';
  END IF;

  -- ── 10. Insert opportunity ──
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

  -- ── 11. Insert items with full validation ──
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- 11a. Reject unexpected JSON keys
    FOR v_key IN SELECT * FROM jsonb_object_keys(v_item) LOOP
      IF NOT (v_key = ANY(v_allowed_item_keys)) THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: مفتاح JSON غير مسموح: %', v_key;
      END IF;
    END LOOP;

    -- 11b. Plant/variety validation
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

    -- 11c. Demand-specific validation
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

    -- 11d. Insert the item
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

  RETURN jsonb_build_object(
    'id', v_opportunity_id,
    'title', p_title,
    'status', p_status
  );
END;
$$;

-- Re-grant permissions
REVOKE EXECUTE ON FUNCTION public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid, jsonb
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid, jsonb
) FROM anon;

GRANT EXECUTE ON FUNCTION public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid, jsonb
) TO authenticated;
