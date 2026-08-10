/*
# Create opportunity_items table

1. Purpose
   - A general-purpose table for items associated with an opportunity.
   - Serves ALL sectors: plants, palm varieties, fish, livestock, equipment, services, etc.
   - The name "opportunity_items" is deliberately sector-agnostic — no need for
     per-sector child tables (opportunity_plants, opportunity_fish, etc.).
   - Each item carries a `reference_source` + `reference_id` pair that can point to
     any catalog table (plant_catalog, palm_varieties, equipment_catalog, etc.).
   - `name_snapshot` and `secondary_name_snapshot` preserve the display text at
     publication time, so changing the catalog name later does not alter old opportunities.

2. New Table: opportunity_items
   - id (uuid PK)
   - opportunity_id (uuid FK → opportunities, CASCADE)
   - item_type (text, NOT NULL) — e.g. 'plant_variety', 'palm_variety', 'equipment_type'
   - reference_source (text, nullable) — e.g. 'plant_catalog', 'palm_varieties'
   - reference_id (uuid, nullable) — ID in the referenced catalog table
   - parent_item_id (uuid, nullable, self-FK SET NULL) — for parent-child (e.g. plant → variety)
   - name_snapshot (text, NOT NULL) — frozen display name
   - secondary_name_snapshot (text, nullable) — frozen secondary name
   - quantity (numeric, nullable)
   - unit (text, nullable)
   - minimum_quantity (numeric, nullable)
   - maximum_quantity (numeric, nullable)
   - unit_price (numeric, nullable)
   - pricing_type (text, nullable) — e.g. 'fixed', 'negotiable', 'auction'
   - available_from (date, nullable)
   - available_until (date, nullable)
   - images (text[], default '{}') — item-specific images
   - cover_image (text, nullable)
   - attributes (jsonb, default '{}') — item-specific extra fields
   - display_order (int, default 0)
   - is_active (boolean, default true)
   - created_at, updated_at (timestamptz)

3. Reference Architecture
   - reference_source + reference_id is a "soft" polymorphic FK.
   - PostgreSQL cannot enforce a multi-target FK natively, so we do NOT create
     a hard FK on reference_id. Instead:
     - The application service layer validates the reference before insert.
     - A trigger (future phase) can optionally validate if needed.
   - This is the standard pattern for polymorphic associations in Postgres.

4. Parent-Child
   - parent_item_id is a self-referential FK with ON DELETE SET NULL.
   - This allows a parent item (e.g. "سدر") to have child items (e.g. varieties).
   - SET NULL is safer than CASCADE — deleting a parent does not silently destroy children.

5. RLS
   - Public read when parent opportunity is active.
   - Owner can read their own draft/pending items.
   - Only the opportunity owner can insert/update/delete items.
   - Ownership verified via EXISTS subquery on opportunities.created_by = auth.uid().

6. Indexes
   - opportunity_id (FK lookups)
   - item_type (filtering by type)
   - reference_source (filtering by source)
   - reference_id (lookup by reference)
   - composite (reference_source, reference_id) (polymorphic lookup)
   - is_active (active filtering)
   - available_from (date-based queries)
*/

CREATE TABLE IF NOT EXISTS opportunity_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  reference_source text,
  reference_id uuid,
  parent_item_id uuid REFERENCES opportunity_items(id) ON DELETE SET NULL,
  name_snapshot text NOT NULL,
  secondary_name_snapshot text,
  quantity numeric,
  unit text,
  minimum_quantity numeric,
  maximum_quantity numeric,
  unit_price numeric,
  pricing_type text,
  available_from date,
  available_until date,
  images text[] NOT NULL DEFAULT '{}',
  cover_image text,
  attributes jsonb NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opp_items_opportunity_id
  ON opportunity_items (opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_items_item_type
  ON opportunity_items (item_type);
CREATE INDEX IF NOT EXISTS idx_opp_items_reference_source
  ON opportunity_items (reference_source);
CREATE INDEX IF NOT EXISTS idx_opp_items_reference_id
  ON opportunity_items (reference_id);
CREATE INDEX IF NOT EXISTS idx_opp_items_ref_source_ref_id
  ON opportunity_items (reference_source, reference_id);
CREATE INDEX IF NOT EXISTS idx_opp_items_is_active
  ON opportunity_items (is_active);
CREATE INDEX IF NOT EXISTS idx_opp_items_available_from
  ON opportunity_items (available_from);

-- RLS
ALTER TABLE opportunity_items ENABLE ROW LEVEL SECURITY;

-- SELECT: public can read items of active opportunities; owner can read their own
DROP POLICY IF EXISTS "read_opportunity_items" ON opportunity_items;
CREATE POLICY "read_opportunity_items"
  ON opportunity_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_items.opportunity_id
        AND (o.status = 'active' OR o.created_by = auth.uid())
    )
  );

-- INSERT: only opportunity owner
DROP POLICY IF EXISTS "insert_opportunity_items" ON opportunity_items;
CREATE POLICY "insert_opportunity_items"
  ON opportunity_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_items.opportunity_id
        AND o.created_by = auth.uid()
    )
  );

-- UPDATE: only opportunity owner
DROP POLICY IF EXISTS "update_opportunity_items" ON opportunity_items;
CREATE POLICY "update_opportunity_items"
  ON opportunity_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_items.opportunity_id
        AND o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_items.opportunity_id
        AND o.created_by = auth.uid()
    )
  );

-- DELETE: only opportunity owner
DROP POLICY IF EXISTS "delete_opportunity_items" ON opportunity_items;
CREATE POLICY "delete_opportunity_items"
  ON opportunity_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_items.opportunity_id
        AND o.created_by = auth.uid()
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_opportunity_items_updated_at ON opportunity_items;
CREATE TRIGGER trg_opportunity_items_updated_at
  BEFORE UPDATE ON opportunity_items
  FOR EACH ROW
  EXECUTE FUNCTION storage.update_updated_at_column();
