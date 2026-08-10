/*
# Phase 2: Opportunities attributes + images + storage bucket

## Summary
Upgrades the `opportunities` table to support dynamic field values and image uploads,
and creates a public storage bucket for opportunity images.

## 1. Modified Tables

### opportunities
- `attributes` (jsonb, default '{}'): stores all dynamic/specialty-specific field values.
- `operation_type` (text): the operation kind — 'offer', 'demand', 'project', etc.
- `images` (text[], default '{}'): array of storage public URLs for uploaded images.
- `company_id` relaxed to nullable (no company-creation flow yet).

### network_pulse (view)
- Dropped and recreated to include new `attributes` and `images` columns from opportunities.

## 2. New Storage Bucket
- `opportunity-images` (public): stores user-uploaded images.

## 3. Security
- Opportunities: anon+authenticated CRUD (no-auth app pattern).
- Storage: anon+authenticated can INSERT/SELECT/DELETE in opportunity-images bucket.

## 4. Notes
- Idempotent: uses IF NOT EXISTS / DO blocks.
- No data lost: company_id relaxed without dropping data.
- View must be dropped before recreation because column list changed.
*/

-- ── 1. Add columns to opportunities ──────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'attributes'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN attributes jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'operation_type'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN operation_type text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'images'
  ) THEN
    ALTER TABLE opportunities ADD COLUMN images text[] NOT NULL DEFAULT '{}'::text[];
  END IF;
END $$;

-- Relax company_id to nullable
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'opportunities' AND column_name = 'company_id' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE opportunities ALTER COLUMN company_id DROP NOT NULL;
  END IF;
END $$;

-- ── 2. RLS policies for opportunities (anon+authenticated, no-auth app) ──
DROP POLICY IF EXISTS "read_opportunities" ON opportunities;
CREATE POLICY "read_opportunities" ON opportunities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_opportunities" ON opportunities;
CREATE POLICY "insert_opportunities" ON opportunities FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_opportunities" ON opportunities;
CREATE POLICY "update_opportunities" ON opportunities FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_opportunities" ON opportunities;
CREATE POLICY "delete_opportunities" ON opportunities FOR DELETE
  TO anon, authenticated USING (true);

-- ── 3. Storage bucket for opportunity images ───────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('opportunity-images', 'opportunity-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "anon_upload_opportunity_images" ON storage.objects;
CREATE POLICY "anon_upload_opportunity_images" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'opportunity-images');

DROP POLICY IF EXISTS "anon_read_opportunity_images" ON storage.objects;
CREATE POLICY "anon_read_opportunity_images" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'opportunity-images');

DROP POLICY IF EXISTS "anon_delete_opportunity_images" ON storage.objects;
CREATE POLICY "anon_delete_opportunity_images" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'opportunity-images');

-- ── 4. Drop and recreate network_pulse view with new columns ──
DROP VIEW IF EXISTS network_pulse;

CREATE VIEW network_pulse AS
SELECT
  o.id, 'opportunity'::text AS activity_type, o.operation_type AS activity_subtype,
  o.title, o.description, o.image, o.city, o.sector_id, o.sub_sector_id,
  o.company_id, o.quantity, o.quality, o.price,
  NULL::text AS auction_status, NULL::text AS time_remaining,
  o.attributes, o.images, o.created_at
FROM opportunities o
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
