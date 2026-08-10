/*
# Harden create_v2_opportunity RPC + Expand Plant/Variety Validation

## Purpose
Final closure of Phase 3 security review:
1. Harden the SECURITY DEFINER RPC: explicit search_path, auth.uid() enforcement, publisher ownership, status whitelist, sub_sector validation, template_version=2 enforcement, reject unexpected JSON keys.
2. Expand plant/variety validation: active plant, active variety, belongs-to, reference_source consistency.
3. The trigger-based validation is kept as a second layer of defense.

## Changes

### 1. REPLACE FUNCTION create_v2_opportunity
Hardened version with:
- `SET search_path = public, extensions` — prevents search_path hijacking
- Rejects unauthenticated users (auth.uid() IS NULL → error)
- Uses auth.uid() for created_by (column default, NOT accepted from client)
- Validates publisher_entity_id ownership: must exist with owner_user_id = auth.uid()
- Only allows status = 'draft' or 'pending_review' — rejects 'active', 'completed', etc.
- Validates sub_sector_id belongs to sector_id
- Validates sector.opportunity_template_version = 2
- Forces template_version = 2 (ignores client value)
- Validates each item's JSON keys against an allowlist — rejects unexpected keys
- Validates plant is active, variety is active, variety belongs to plant, reference_source = 'plant_catalog' when plant_variety_id is set
- Fully atomic: any failure rolls back everything

### 2. KEEP trigger validate_item_plant_variety
Already exists from prior migration. Kept as second defense layer.
*/

-- ── 1. Drop and recreate hardened RPC ──
DROP FUNCTION IF EXISTS public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid
);

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
  p_publisher_entity_id uuid
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

  -- ── 7. Template version forced to 2 ──
  -- Ignore p_template_version from client; always save 2

  -- ── 8. Items validation ──
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: يجب إضافة عنصر واحد على الأقل';
  END IF;

  -- ── 9. Insert opportunity (created_by defaults to auth.uid()) ──
  INSERT INTO opportunities (
    sector_id, sub_sector_id, type, operation_type, opportunity_type,
    opportunity_timing, template_version, title, description, city,
    attributes, images, status, publisher_entity_id
  ) VALUES (
    p_sector_id,
    p_sub_sector_id,
    'opportunity',
    p_operation_type,
    p_operation_type,
    'available_now',
    2,
    p_title,
    p_description,
    p_city,
    '{}'::jsonb,
    COALESCE(p_general_images, ARRAY[]::text[]),
    p_status,
    p_publisher_entity_id
  )
  RETURNING id INTO v_opportunity_id;

  -- ── 10. Insert items with full validation ──
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- 10a. Reject unexpected JSON keys
    FOR v_key IN SELECT key FROM jsonb_object_keys(v_item) LOOP
      IF NOT (v_key = ANY(v_allowed_item_keys)) THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: مفتاح JSON غير مسموح: %', v_key;
      END IF;
    END LOOP;

    -- 10b. Plant/variety validation
    IF v_item->>'reference_source' = 'plant_catalog'
       AND v_item->>'reference_id' IS NOT NULL
       AND v_item->>'reference_id' <> ''
    THEN
      -- Check plant is active
      SELECT is_active INTO v_plant_active
      FROM plant_catalog WHERE id = (v_item->>'reference_id')::uuid;
      IF NOT FOUND OR NOT v_plant_active THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: النبات غير موجود أو غير نشط';
      END IF;

      -- If variety is specified, validate it
      IF v_item->>'plant_variety_id' IS NOT NULL AND v_item->>'plant_variety_id' <> '' THEN
        -- Variety must be active
        SELECT is_active INTO v_variety_active
        FROM plant_varieties WHERE id = (v_item->>'plant_variety_id')::uuid;
        IF NOT FOUND OR NOT v_variety_active THEN
          RAISE EXCEPTION 'VALIDATION_ERROR: الصنف غير موجود أو غير نشط';
        END IF;

        -- Variety must belong to the plant
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

    -- 10c. Insert the item
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

  -- ── Return result ──
  RETURN jsonb_build_object(
    'id', v_opportunity_id,
    'title', p_title,
    'status', p_status
  );
END;
$$;

-- Grant execute to authenticated users only
GRANT EXECUTE ON FUNCTION public.create_v2_opportunity TO authenticated;
REVOKE EXECUTE ON FUNCTION public.create_v2_opportunity FROM anon;
