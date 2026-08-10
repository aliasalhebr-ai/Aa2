/*
# Atomic V2 Opportunity Creation + Plant-Variety Validation + RLS Fix

## Purpose
Address Phase 3 closure requirements:
1. Make V2 opportunity + items save atomic (single RPC transaction, rollback on any failure).
2. Add DB-level constraint: plant_variety_id must belong to the plant in reference_id.
3. Fix RLS on opportunity_item_field_definitions: admin-only for writes, anon for reads.

## Changes

### 1. NEW FUNCTION: create_v2_opportunity (SECURITY DEFINER)
A single RPC function that:
- Inserts the opportunity row
- Inserts all item rows in the same transaction
- If ANY item fails, the entire transaction rolls back (opportunity + all items gone)
- Returns the opportunity id, title, and status

Parameters:
- p_sector_id, p_sub_sector_id, p_operation_type, p_template_version
- p_title, p_description, p_city
- p_general_images (text[])
- p_items (JSONB array of item objects)
- p_status ('draft' | 'pending_review')
- p_publisher_entity_id (uuid, nullable)

Each item object in p_items contains:
- item_type, reference_source, reference_id, name_snapshot, variety_name_snapshot
- plant_variety_id, quantity, unit, unit_price, pricing_type
- min_order_quantity, age_value, height_value, trunk_diameter_value
- container_size, root_status, readiness_status
- cover_image, images (text[]), attributes (JSONB), display_order

The function validates:
- Title not empty
- If status='pending_review', publisher_entity_id is required
- Each item's plant_variety_id (if present) belongs to the plant in reference_id

### 2. CHECK CONSTRAINT on opportunity_items
Add a constraint: if plant_variety_id is NOT NULL AND reference_source = 'plant_catalog',
then plant_variety_id must exist in plant_varieties WHERE plant_id = reference_id.
This is enforced via a CHECK constraint using a function.

### 3. RLS Fix on opportunity_item_field_definitions
- SELECT: anon, authenticated (publicly readable — app needs to load field defs)
- INSERT/UPDATE/DELETE: ONLY users with is_super_admin=true OR raw_app_meta_data->>'role' = 'admin'
  (regular authenticated users cannot modify field definitions)

### 4. Helper function: is_admin()
Returns true if the current user is super_admin or has admin role in app metadata.
Used in RLS policies.
*/

-- ── 1. Helper function: is_admin() ──
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM auth.users
        WHERE id = auth.uid()
        AND (
          is_super_admin = true
          OR raw_app_meta_data->>'role' = 'admin'
        )
      )
    )),
    false
  );
$$;

-- ── 2. Plant-variety validation function ──
CREATE OR REPLACE FUNCTION public.validate_item_plant_variety()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only validate when both reference_id (plant) and plant_variety_id are set
  IF NEW.reference_source = 'plant_catalog'
     AND NEW.reference_id IS NOT NULL
     AND NEW.plant_variety_id IS NOT NULL
  THEN
    -- Check that the variety belongs to the plant
    IF NOT EXISTS (
      SELECT 1 FROM plant_varieties pv
      WHERE pv.id = NEW.plant_variety_id
        AND pv.plant_id = NEW.reference_id
    ) THEN
      RAISE EXCEPTION 'INVALID_PLANT_VARIETY: الصنف (%) لا يتبع النبات (%)',
        NEW.plant_variety_id::text, NEW.reference_id::text;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 3. Attach trigger to opportunity_items ──
DROP TRIGGER IF EXISTS trg_validate_item_plant_variety ON opportunity_items;
CREATE TRIGGER trg_validate_item_plant_variety
  BEFORE INSERT OR UPDATE ON opportunity_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_item_plant_variety();

-- ── 4. Atomic RPC function: create_v2_opportunity ──
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
SET search_path = public
AS $$
DECLARE
  v_opportunity_id uuid;
  v_item jsonb;
  v_item_count integer := 0;
  v_result jsonb;
BEGIN
  -- ── Validation ──
  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: العنوان مطلوب';
  END IF;

  IF p_status = 'pending_review' AND p_publisher_entity_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: الجهة الناشرة مطلوبة للإرسال للمراجعة';
  END IF;

  -- Count items
  v_item_count := jsonb_array_length(p_items);
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: يجب إضافة عنصر واحد على الأقل';
  END IF;

  -- ── Insert opportunity ──
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
    p_template_version,
    p_title,
    p_description,
    p_city,
    '{}'::jsonb,
    COALESCE(p_general_images, ARRAY[]::text[]),
    p_status,
    p_publisher_entity_id
  )
  RETURNING id INTO v_opportunity_id;

  -- ── Insert items ──
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- Validate plant-variety consistency
    IF v_item->>'reference_source' = 'plant_catalog'
       AND v_item->>'reference_id' IS NOT NULL
       AND v_item->>'plant_variety_id' IS NOT NULL
       AND v_item->>'plant_variety_id' <> ''
    THEN
      IF NOT EXISTS (
        SELECT 1 FROM plant_varieties pv
        WHERE pv.id = (v_item->>'plant_variety_id')::uuid
          AND pv.plant_id = (v_item->>'reference_id')::uuid
      ) THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: الصنف لا يتبع النبات المحدد';
      END IF;
    END IF;

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
      true
    );
  END LOOP;

  -- ── Return result ──
  SELECT jsonb_build_object(
    'id', v_opportunity_id,
    'title', p_title,
    'status', p_status
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (they create opportunities)
GRANT EXECUTE ON FUNCTION public.create_v2_opportunity TO authenticated;

-- ── 5. Fix RLS on opportunity_item_field_definitions ──
-- Drop existing write policies (they were too permissive)
DROP POLICY IF EXISTS "anon_select_item_field_defs" ON opportunity_item_field_definitions;
DROP POLICY IF EXISTS "auth_insert_item_field_defs" ON opportunity_item_field_definitions;
DROP POLICY IF EXISTS "auth_update_item_field_defs" ON opportunity_item_field_definitions;
DROP POLICY IF EXISTS "auth_delete_item_field_defs" ON opportunity_item_field_definitions;

-- SELECT: publicly readable (app needs to load field definitions)
CREATE POLICY "read_item_field_defs"
  ON opportunity_item_field_definitions FOR SELECT
  TO anon, authenticated USING (true);

-- INSERT: admin only
CREATE POLICY "admin_insert_item_field_defs"
  ON opportunity_item_field_definitions FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

-- UPDATE: admin only
CREATE POLICY "admin_update_item_field_defs"
  ON opportunity_item_field_definitions FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- DELETE: admin only
CREATE POLICY "admin_delete_item_field_defs"
  ON opportunity_item_field_definitions FOR DELETE
  TO authenticated USING (public.is_admin());
