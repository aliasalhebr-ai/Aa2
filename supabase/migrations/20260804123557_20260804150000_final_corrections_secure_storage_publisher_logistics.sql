/*
# Phase 2 Final Corrections

## 1. Secure image storage
- Make bucket PRIVATE — images served via signed URLs only.
- Read: owner can read their own files. Public reads via app using signed URLs for active opportunities.
- Upload: authenticated only, path = opportunities/{user_id}/
- Delete: owner only (path prefix check)
- Draft/pending_review images are NOT publicly readable.

## 2. Publisher entity
- Create `publisher_entities` table.
- Add FK from opportunities.publisher_entity_id to publisher_entities.id.
- Add CHECK constraint: status = 'pending_review' requires publisher_entity_id IS NOT NULL.

## 3. Logistics sub_sector
- Add "اللوجستيات" (palm-logistics) as sub_sector #8 in palm sector.
- Gateway to the Logistics Center.

## 4. Restore inactive operations
- Re-add auction_request and logistics_request with is_active: false.
- UI filters to is_active: true only.
*/

-- ── 1. Make bucket private ──────────────────────────────────────
UPDATE storage.buckets SET public = false WHERE id = 'opportunity-images';

-- ── 2. Storage policies: secure read/upload/delete ─────────────
DROP POLICY IF EXISTS "public_read_opportunity_images" ON storage.objects;
DROP POLICY IF EXISTS "auth_upload_opportunity_images" ON storage.objects;
DROP POLICY IF EXISTS "owner_delete_opportunity_images" ON storage.objects;

CREATE POLICY "owner_read_opportunity_images" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'opportunity-images'
    AND strpos(name, 'opportunities/' || auth.uid()::text || '/') = 1
  );

CREATE POLICY "auth_upload_opportunity_images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'opportunity-images'
    AND strpos(name, 'opportunities/' || auth.uid()::text || '/') = 1
  );

CREATE POLICY "owner_delete_opportunity_images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'opportunity-images'
    AND strpos(name, 'opportunities/' || auth.uid()::text || '/') = 1
  );

-- ── 3. Publisher entities table ────────────────────────────────
CREATE TABLE IF NOT EXISTS publisher_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('company', 'farm', 'organization', 'individual', 'professional')),
  name text NOT NULL,
  description text,
  city text,
  is_verified boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE publisher_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_publisher_entities" ON publisher_entities FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "insert_own_publisher_entities" ON publisher_entities FOR INSERT
  TO authenticated WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "update_own_publisher_entities" ON publisher_entities FOR UPDATE
  TO authenticated USING (owner_user_id = auth.uid()) WITH CHECK (owner_user_id = auth.uid());

CREATE POLICY "delete_own_publisher_entities" ON publisher_entities FOR DELETE
  TO authenticated USING (owner_user_id = auth.uid());

-- ── 4. FK + CHECK on opportunities ──────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'opportunities_publisher_entity_id_fkey'
  ) THEN
    ALTER TABLE opportunities
    ADD CONSTRAINT opportunities_publisher_entity_id_fkey
    FOREIGN KEY (publisher_entity_id) REFERENCES publisher_entities(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'opportunities_pending_review_requires_publisher'
  ) THEN
    ALTER TABLE opportunities
    ADD CONSTRAINT opportunities_pending_review_requires_publisher
    CHECK (
      status != 'pending_review' OR publisher_entity_id IS NOT NULL
    );
  END IF;
END $$;

-- ── 5. Add logistics sub_sector to palm sector ──────────────────
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM sub_sectors WHERE slug = 'palm-logistics' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3') THEN
    INSERT INTO sub_sectors (sector_id, name, slug, icon, display_order, is_active, allowed_operations)
    VALUES (
      '1bddad2e-b634-4eee-8d4e-aee2ef698da3',
      'اللوجستيات',
      'palm-logistics',
      '🚛',
      8,
      true,
      '[{"id":"logistics_request","icon":"Truck","label":"طلب خدمة لوجستية","is_active":false}]'::jsonb
    );
  END IF;
END $$;

-- ── 6. Restore inactive auction_request and logistics_request ──
DO $$
DECLARE
  r RECORD;
  current_ops jsonb;
  has_auction boolean;
  has_logistics boolean;
  op_val jsonb;
BEGIN
  FOR r IN SELECT id, slug, allowed_operations FROM sub_sectors
    WHERE sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3'
      AND slug IN ('palm-fruits','transplanted-palms','palm-seedlings','palm-projects','palm-residues')
  LOOP
    current_ops := r.allowed_operations;
    has_auction := false;
    has_logistics := false;
    FOR op_val IN SELECT * FROM jsonb_array_elements(current_ops) LOOP
      IF op_val->>'id' = 'auction_request' THEN has_auction := true; END IF;
      IF op_val->>'id' = 'logistics_request' THEN has_logistics := true; END IF;
    END LOOP;

    IF NOT has_auction THEN
      current_ops := current_ops || jsonb_build_object('id', 'auction_request', 'icon', 'Gavel', 'label', 'طلب مزاد', 'is_active', false);
    END IF;

    IF NOT has_logistics AND r.slug != 'palm-fruits' THEN
      current_ops := current_ops || jsonb_build_object('id', 'logistics_request', 'icon', 'Truck', 'label', 'طلب لوجستي', 'is_active', false);
    END IF;

    UPDATE sub_sectors SET allowed_operations = current_ops WHERE id = r.id;
  END LOOP;
END $$;
