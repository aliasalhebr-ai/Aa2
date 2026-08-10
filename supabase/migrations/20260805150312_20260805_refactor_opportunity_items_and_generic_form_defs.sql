/*
# Refactor opportunity_items: merge variety into same row, add filterable columns, create item field definitions

## Purpose
Address review feedback on Phase 3:
1. Merge plant + variety into a single opportunity_items row (no more separate plant_variety rows).
2. Move filterable fields (age, height, quantity, unit, price, readiness, container_size, trunk_diameter)
   out of attributes JSONB into dedicated queryable columns.
3. Create opportunity_item_field_definitions table for data-driven item field definitions
   so OpportunityForm can render item fields dynamically per sector/sub_sector/operation_type/template_version.
4. Seed nursery sector item field definitions.

## Changes

### 1. ALTER TABLE opportunity_items — add columns
- plant_variety_id (uuid, nullable) — FK to plant_varieties, replaces the separate plant_variety row pattern
- variety_name_snapshot (text, nullable) — frozen variety name at time of save
- age_value (numeric, nullable) — plant age in years (filterable)
- height_value (numeric, nullable) — height in meters (filterable)
- trunk_diameter_value (numeric, nullable) — trunk diameter in cm (filterable)
- container_size (text, nullable) — container/pot size (filterable, enum-like)
- root_status (text, nullable) — rooting status (filterable, enum-like)
- readiness_status (text, nullable) — readiness status (filterable, enum-like)
- min_order_quantity (numeric, nullable) — minimum order quantity (filterable)

Note: quantity, unit, unit_price, pricing_type already exist as dedicated columns.

### 2. NEW TABLE opportunity_item_field_definitions
Data-driven item field definitions per sector + sub_sector + operation_type + template_version.
This is the item-level equivalent of specialty_field_definitions.
- id (uuid PK)
- sector_id (uuid FK, not null)
- sub_sector_id (uuid FK, nullable — null means applies to all sub_sectors in the sector)
- operation_type (text, not null) — 'offer' | 'demand' | 'partnership'
- template_version (integer, not null, default 1)
- field_key (text, not null)
- field_type (text, not null) — 'text' | 'number' | 'select' | 'boolean' | 'date' | 'image'
- label (text, not null)
- is_required (boolean, default false)
- display_order (integer, default 0)
- is_filterable (boolean, default false)
- is_card_visible (boolean, default false)
- options_source (text, nullable) — 'static' | 'plant_catalog' | 'plant_varieties' | 'units' etc.
- static_options (jsonb, nullable)
- validation_rules (jsonb, nullable)
- conditional_field_key (text, nullable)
- conditional_values (jsonb, nullable)
- unit (text, nullable)
- placeholder (text, nullable)
- column_name (text, nullable) — maps to a dedicated column on opportunity_items (e.g. 'age_value')
- created_at (timestamptz, default now())

### 3. Seed nursery sector item field definitions
Insert field definitions for nursery sector (slug='nursery'), operation_type='offer', template_version=2.
Fields: plant_id, variety_id, quantity, unit, min_order, age, height, trunk_diameter,
  container_size, root_status, readiness, price, pricing_type, is_negotiable, item_images.

### 4. RLS
- Enable RLS on opportunity_item_field_definitions.
- TO anon, authenticated SELECT (publicly readable, like specialty_field_definitions).
- TO authenticated INSERT/UPDATE/DELETE (admin only, but kept simple for now).

### 5. Index
- Index on (sector_id, operation_type, template_version) for fast field definition lookups.
*/

-- ── 1. Add columns to opportunity_items ──
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_items' AND column_name = 'plant_variety_id'
  ) THEN
    ALTER TABLE opportunity_items ADD COLUMN plant_variety_id uuid REFERENCES plant_varieties(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_items' AND column_name = 'variety_name_snapshot'
  ) THEN
    ALTER TABLE opportunity_items ADD COLUMN variety_name_snapshot text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_items' AND column_name = 'age_value'
  ) THEN
    ALTER TABLE opportunity_items ADD COLUMN age_value numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_items' AND column_name = 'height_value'
  ) THEN
    ALTER TABLE opportunity_items ADD COLUMN height_value numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_items' AND column_name = 'trunk_diameter_value'
  ) THEN
    ALTER TABLE opportunity_items ADD COLUMN trunk_diameter_value numeric;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_items' AND column_name = 'container_size'
  ) THEN
    ALTER TABLE opportunity_items ADD COLUMN container_size text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_items' AND column_name = 'root_status'
  ) THEN
    ALTER TABLE opportunity_items ADD COLUMN root_status text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_items' AND column_name = 'readiness_status'
  ) THEN
    ALTER TABLE opportunity_items ADD COLUMN readiness_status text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunity_items' AND column_name = 'min_order_quantity'
  ) THEN
    ALTER TABLE opportunity_items ADD COLUMN min_order_quantity numeric;
  END IF;
END $$;

-- ── 2. Create opportunity_item_field_definitions table ──
CREATE TABLE IF NOT EXISTS opportunity_item_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  sub_sector_id uuid REFERENCES sub_sectors(id) ON DELETE CASCADE,
  operation_type text NOT NULL,
  template_version integer NOT NULL DEFAULT 1,
  field_key text NOT NULL,
  field_type text NOT NULL,
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_filterable boolean NOT NULL DEFAULT false,
  is_card_visible boolean NOT NULL DEFAULT false,
  options_source text,
  static_options jsonb,
  validation_rules jsonb,
  conditional_field_key text,
  conditional_values jsonb,
  unit text,
  placeholder text,
  column_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one definition per sector/sub_sector/operation_type/template_version/field_key
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_item_field_defs_unique'
  ) THEN
    ALTER TABLE opportunity_item_field_definitions
    ADD CONSTRAINT uq_item_field_defs_unique UNIQUE (sector_id, sub_sector_id, operation_type, template_version, field_key);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_item_field_defs_lookup
  ON opportunity_item_field_definitions (sector_id, operation_type, template_version);

-- ── 3. Enable RLS ──
ALTER TABLE opportunity_item_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_item_field_defs" ON opportunity_item_field_definitions;
CREATE POLICY "anon_select_item_field_defs"
  ON opportunity_item_field_definitions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_item_field_defs" ON opportunity_item_field_definitions;
CREATE POLICY "auth_insert_item_field_defs"
  ON opportunity_item_field_definitions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_item_field_defs" ON opportunity_item_field_definitions;
CREATE POLICY "auth_update_item_field_defs"
  ON opportunity_item_field_definitions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_item_field_defs" ON opportunity_item_field_definitions;
CREATE POLICY "auth_delete_item_field_defs"
  ON opportunity_item_field_definitions FOR DELETE
  TO authenticated USING (true);

-- ── 4. Seed nursery sector item field definitions ──
-- Nursery sector id: 73e613d6-e10e-4b1d-aef1-b0f591df9d03
-- operation_type = 'offer', template_version = 2, sub_sector_id = NULL (applies to all nursery sub_sectors)

INSERT INTO opportunity_item_field_definitions
  (sector_id, sub_sector_id, operation_type, template_version, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder, column_name)
VALUES
  -- plant_id: the primary plant selector
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'plant_id', 'select', 'النبات', true, 0, true, true, 'plant_catalog', NULL, NULL, 'اختر النبات...', 'reference_id'),

  -- variety_id: optional variety selector (conditional on plant_id being set)
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'variety_id', 'select', 'الصنف', false, 1, true, true, 'plant_varieties', NULL, NULL, 'اختر الصنف...', 'plant_variety_id'),

  -- quantity: already a dedicated column on opportunity_items
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'quantity', 'number', 'الكمية', true, 2, true, true, NULL, NULL, NULL, '50', 'quantity'),

  -- unit: already a dedicated column
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'unit', 'select', 'الوحدة', true, 3, true, true, 'static',
    '["piece","pot","bag","box","dozen","hundred","thousand"]'::jsonb, NULL, NULL, 'unit'),

  -- min_order: dedicated column min_order_quantity
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'min_order', 'number', 'الحد الأدنى للطلب', false, 4, true, false, NULL, NULL, NULL, '10', 'min_order_quantity'),

  -- age: dedicated column age_value
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'age', 'number', 'العمر (سنة)', false, 5, true, true, NULL, NULL, 'سنة', '3', 'age_value'),

  -- height: dedicated column height_value
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'height', 'number', 'الارتفاع (متر)', false, 6, true, true, NULL, NULL, 'متر', '1.5', 'height_value'),

  -- trunk_diameter: dedicated column trunk_diameter_value
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'trunk_diameter', 'number', 'قطر الساق (سم)', false, 7, true, false, NULL, NULL, 'سم', '5', 'trunk_diameter_value'),

  -- container_size: dedicated column container_size
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'container_size', 'select', 'حجم الحاوية', false, 8, true, true, 'static',
    '["small_bag","medium_bag","large_bag","pot_15","pot_25","pot_40","ground"]'::jsonb, NULL, NULL, 'container_size'),

  -- root_status: dedicated column root_status
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'root_status', 'select', 'حالة الجذور', false, 9, true, false, 'static',
    '["rooted","not_rooted","partial"]'::jsonb, NULL, NULL, 'root_status'),

  -- readiness: dedicated column readiness_status
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'readiness', 'select', 'حالة الجاهزية', false, 10, true, true, 'static',
    '["ready","needs_prep","not_ready"]'::jsonb, NULL, NULL, 'readiness_status'),

  -- price: already a dedicated column unit_price
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'price', 'number', 'السعر', false, 11, true, true, NULL, NULL, NULL, '25', 'unit_price'),

  -- pricing_type: already a dedicated column
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'pricing_type', 'select', 'طريقة التسعير', false, 12, false, false, 'static',
    '["fixed","negotiable","auction"]'::jsonb, NULL, NULL, 'pricing_type'),

  -- is_negotiable: stored in attributes (not a filterable field, sector-specific)
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'is_negotiable', 'boolean', 'قابل للتفاوض', false, 13, false, false, NULL, NULL, NULL, NULL, NULL),

  -- item_images: stored in images[] array on opportunity_items
  ('73e613d6-e10e-4b1d-aef1-b0f591df9d03', NULL, 'offer', 2, 'item_images', 'image', 'صور العنصر', false, 14, false, false, NULL, NULL, NULL, NULL, 'images')
ON CONFLICT DO NOTHING;

-- ── 5. Add index for filterable columns on opportunity_items ──
CREATE INDEX IF NOT EXISTS idx_opp_items_age ON opportunity_items (age_value);
CREATE INDEX IF NOT EXISTS idx_opp_items_height ON opportunity_items (height_value);
CREATE INDEX IF NOT EXISTS idx_opp_items_trunk_diameter ON opportunity_items (trunk_diameter_value);
CREATE INDEX IF NOT EXISTS idx_opp_items_container_size ON opportunity_items (container_size);
CREATE INDEX IF NOT EXISTS idx_opp_items_root_status ON opportunity_items (root_status);
CREATE INDEX IF NOT EXISTS idx_opp_items_readiness ON opportunity_items (readiness_status);
CREATE INDEX IF NOT EXISTS idx_opp_items_plant_variety ON opportunity_items (plant_variety_id);
