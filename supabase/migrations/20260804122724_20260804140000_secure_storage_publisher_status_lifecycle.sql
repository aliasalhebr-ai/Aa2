/*
# Phase 2 Corrections: Secure storage, publisher linkage, record status lifecycle

## Summary
1. Secures storage policies — no anon upload/delete, authenticated-only upload, owner-based delete.
2. Adds publisher_entity_id and created_by columns to opportunities.
3. Changes default opportunity status from 'active' to 'draft'.
4. Hides auction_request and logistics_request from sub_sectors allowed_operations.
5. Updates network_pulse view to only show active opportunities.

## Storage path convention
Files stored at: `opportunities/{user_id}/{filename}`

## RLS on opportunities
- SELECT: anon sees active only; authenticated sees active + own records.
- INSERT/UPDATE/DELETE: authenticated, owner-scoped via created_by.
*/

-- ── 1. Add publisher_entity_id and created_by to opportunities ────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'publisher_entity_id'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN publisher_entity_id uuid;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN created_by uuid DEFAULT auth.uid();
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'status'
      AND column_default = '''active''::text'
  ) THEN
    ALTER TABLE opportunities ALTER COLUMN status SET DEFAULT 'draft';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_opportunities_created_by ON opportunities(created_by);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);

-- ── 2. RLS policies for opportunities ─────────────────────────────
DROP POLICY IF EXISTS "read_opportunities" ON opportunities;
DROP POLICY IF EXISTS "insert_opportunities" ON opportunities;
DROP POLICY IF EXISTS "update_opportunities" ON opportunities;
DROP POLICY IF EXISTS "delete_opportunities" ON opportunities;

CREATE POLICY "read_opportunities" ON opportunities FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    OR (auth.uid() IS NOT NULL AND created_by = auth.uid())
  );

CREATE POLICY "insert_opportunities" ON opportunities FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "update_opportunities" ON opportunities FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "delete_opportunities" ON opportunities FOR DELETE
  TO authenticated
  USING (created_by = auth.uid());

-- ── 3. Storage policies: secure opportunity-images bucket ─────────
DROP POLICY IF EXISTS "anon_upload_opportunity_images" ON storage.objects;
DROP POLICY IF EXISTS "anon_read_opportunity_images" ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_opportunity_images" ON storage.objects;

CREATE POLICY "public_read_opportunity_images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'opportunity-images');

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

-- ── 4. Hide auction_request and logistics_request from sub_sectors ─
DO $$
DECLARE
  r RECORD;
  new_ops jsonb;
BEGIN
  FOR r IN SELECT id, allowed_operations FROM sub_sectors WHERE allowed_operations IS NOT NULL LOOP
    new_ops := COALESCE((
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(r.allowed_operations) AS elem
      WHERE elem->>'id' NOT IN ('auction_request', 'logistics_request')
    ), '[]'::jsonb);
    IF new_ops IS DISTINCT FROM r.allowed_operations THEN
      UPDATE sub_sectors SET allowed_operations = new_ops WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- ── 5. Recreate network_pulse view: only active opportunities ────
DROP VIEW IF EXISTS network_pulse;

CREATE VIEW network_pulse AS
SELECT
  o.id, 'opportunity'::text AS activity_type, o.operation_type AS activity_subtype,
  o.title, o.description, o.image, o.city, o.sector_id, o.sub_sector_id,
  o.company_id, o.quantity, o.quality, o.price,
  NULL::text AS auction_status, NULL::text AS time_remaining,
  o.attributes, o.images, o.created_at
FROM opportunities o
WHERE o.status = 'active'
UNION ALL
SELECT
  a.id, 'auction'::text, a.status, a.title, a.description, a.image, a.city,
  a.sector_id, a.source_sub_sector_id, a.company_id,
  NULL::text, NULL::text, a.current_price,
  a.status AS auction_status, NULL::text,
  NULL::jsonb, NULL::text[], a.created_at
FROM auctions a
UNION ALL
SELECT
  a.id, 'auction'::text, a.status, a.title, a.description, a.image, a.city,
  a.source_sector_id, a.source_sub_sector_id, a.company_id,
  NULL::text, NULL::text, a.current_price,
  a.status AS auction_status, NULL::text,
  NULL::jsonb, NULL::text[], a.created_at
FROM auctions a
WHERE a.source_sector_id IS NOT NULL
UNION ALL
SELECT
  p.id, 'product'::text, 'new'::text, p.name, p.description, p.image, p.city,
  p.sector_id, p.sub_sector_id, p.company_id,
  NULL::text, NULL::text, p.price,
  NULL::text, NULL::text,
  NULL::jsonb, NULL::text[], p.created_at
FROM products p
UNION ALL
SELECT
  s.id, 'service'::text, 'request'::text, s.name, s.description, s.image, s.city,
  s.sector_id, s.sub_sector_id, s.company_id,
  NULL::text, NULL::text, s.price,
  NULL::text, NULL::text,
  NULL::jsonb, NULL::text[], s.created_at
FROM services s
UNION ALL
SELECT
  e.id, 'event'::text, 'announcement'::text, e.title, e.description, e.image, e.city,
  e.sector_id, NULL::uuid, e.company_id,
  NULL::text, NULL::text, NULL::text,
  NULL::text, NULL::text,
  NULL::jsonb, NULL::text[], e.created_at
FROM events e;
