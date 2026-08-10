/*
# Logistics Engine — Phase 2: Source Specialties, Offers, Lifecycle Expansion

## Purpose
Corrects the logistics schema so requests track their TRUE source specialty
(not the logistics branch), adds a logistics_offers table for service-provider
bidding, and expands the lifecycle with `scheduled`, `delivered`, `failed`.

## Changes to logistics_requests

### New Columns
- `source_sector_id` (uuid FK → sectors) — the sector the request originated from
  (e.g. palm). Distinct from the logistics branch's own sector.
- `source_specialty_id` (uuid FK → sub_sectors, nullable) — the TRUE specialty the
  request came from (e.g. "نقايل النخيل"). This is NOT the logistics sub_sector.
- `logistics_category_id` (uuid FK → sub_sectors, nullable) — the logistics category
  within the logistics branch (e.g. "نقل النخيل"). Used when the request is created
  from the logistics branch directly.
- `source_opportunity_id` — already exists; links to a parent opportunity when the
  request is spawned from a real transaction (not auto-created from "أوفر النقل").

### Constraint Changes
- `status` CHECK expanded to include: `scheduled`, `delivered`, `failed`.
- Old columns `sector_id` and `sub_sector_id` are RETAINED for backward compatibility
  (they point to the logistics branch's sector/sub_sector) but new code uses
  `source_sector_id` and `source_specialty_id` for the true origin.

### Data Migration
Existing rows (if any) get `source_sector_id` copied from `sector_id` and
`source_specialty_id` copied from `sub_sector_id` so nothing is lost.

## New Table: logistics_offers
Allows service providers to submit offers on available logistics requests.
- `id` (uuid PK)
- `logistics_request_id` (uuid FK → logistics_requests, ON DELETE CASCADE)
- `provider_user_id` (uuid, default auth.uid()) — the service provider making the offer
- `provider_entity_id` (uuid FK → publisher_entities, nullable) — provider's entity
- `price` (numeric, nullable) — offered price
- `currency` (text, default 'SAR')
- `vehicle_type` (text, nullable) — vehicle offered
- `estimated_duration` (text, nullable) — e.g. "2 days"
- `notes` (text, nullable)
- `status` (text, default 'pending') — pending / accepted / rejected / withdrawn
- `created_at` (timestamptz, default now())

### RLS on logistics_offers
- Owner (provider) can CRUD their own offers.
- Request owner can SELECT offers on their requests (to review them).
- This is enforced via a JOIN to logistics_requests.created_by.

## New Table: logistics_categories
Sub-categories within the logistics branch, scoped by sector.
- `id` (uuid PK)
- `sector_id` (uuid FK → sectors) — which sector this logistics category serves
- `sub_sector_id` (uuid FK → sub_sectors) — the logistics branch sub_sector
- `source_specialty_id` (uuid FK → sub_sectors, nullable) — which specialty it serves
- `key` (text) — e.g. "palm_transplant_transport"
- `label` (text) — Arabic label
- `is_active` (boolean, default true)
- `display_order` (integer, default 0)
- UNIQUE(sector_id, key)

## Security
- logistics_offers: owner-scoped RLS (provider can manage own offers, request owner can read).
- logistics_categories: readable by anon+authenticated.
- Storage bucket `logistics-images` stays private with owner-scoped policies (already set).
*/

-- ═══════════════════════════════════════════════════════════
-- 1. Alter logistics_requests
-- ═══════════════════════════════════════════════════════════

ALTER TABLE logistics_requests
  ADD COLUMN IF NOT EXISTS source_sector_id uuid REFERENCES sectors(id) ON DELETE CASCADE;

ALTER TABLE logistics_requests
  ADD COLUMN IF NOT EXISTS source_specialty_id uuid REFERENCES sub_sectors(id) ON DELETE SET NULL;

ALTER TABLE logistics_requests
  ADD COLUMN IF NOT EXISTS logistics_category_id uuid REFERENCES sub_sectors(id) ON DELETE SET NULL;

-- Backfill existing rows
UPDATE logistics_requests
SET source_sector_id = sector_id
WHERE source_sector_id IS NULL;

UPDATE logistics_requests
SET source_specialty_id = sub_sector_id
WHERE source_specialty_id IS NULL;

-- Expand status CHECK constraint
ALTER TABLE logistics_requests DROP CONSTRAINT IF EXISTS logistics_requests_status_check;
ALTER TABLE logistics_requests ADD CONSTRAINT logistics_requests_status_check
  CHECK (status IN (
    'draft', 'submitted', 'under_review', 'available_to_providers',
    'offers_received', 'provider_selected', 'scheduled', 'in_progress',
    'delivered', 'completed', 'cancelled', 'failed'
  ));

CREATE INDEX IF NOT EXISTS idx_logistics_requests_source_sector ON logistics_requests(source_sector_id);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_source_specialty ON logistics_requests(source_specialty_id);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_logistics_category ON logistics_requests(logistics_category_id);

-- ═══════════════════════════════════════════════════════════
-- 2. logistics_offers table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS logistics_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  logistics_request_id uuid NOT NULL REFERENCES logistics_requests(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL DEFAULT auth.uid(),
  provider_entity_id uuid REFERENCES publisher_entities(id) ON DELETE SET NULL,
  price numeric,
  currency text NOT NULL DEFAULT 'SAR',
  vehicle_type text,
  estimated_duration text,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE logistics_offers ENABLE ROW LEVEL SECURITY;

-- Provider can read own offers
DROP POLICY IF EXISTS "select_own_offers" ON logistics_offers;
CREATE POLICY "select_own_offers" ON logistics_offers FOR SELECT
  TO authenticated USING (auth.uid() = provider_user_id);

-- Request owner can read offers on their requests
DROP POLICY IF EXISTS "select_offers_on_own_requests" ON logistics_offers;
CREATE POLICY "select_offers_on_own_requests" ON logistics_offers FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM logistics_requests
      WHERE logistics_requests.id = logistics_offers.logistics_request_id
      AND logistics_requests.created_by = auth.uid()
    )
  );

-- Provider can insert own offers (only on requests that are available)
DROP POLICY IF EXISTS "insert_own_offers" ON logistics_offers;
CREATE POLICY "insert_own_offers" ON logistics_offers FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = provider_user_id
    AND EXISTS (
      SELECT 1 FROM logistics_requests
      WHERE logistics_requests.id = logistics_offers.logistics_request_id
      AND logistics_requests.created_by != auth.uid()
      AND logistics_requests.status IN ('available_to_providers', 'offers_received')
    )
  );

-- Provider can update own offers (withdraw)
DROP POLICY IF EXISTS "update_own_offers" ON logistics_offers;
CREATE POLICY "update_own_offers" ON logistics_offers FOR UPDATE
  TO authenticated USING (auth.uid() = provider_user_id)
  WITH CHECK (auth.uid() = provider_user_id);

-- Request owner can update offer status (accept/reject)
DROP POLICY IF EXISTS "update_offers_on_own_requests" ON logistics_offers;
CREATE POLICY "update_offers_on_own_requests" ON logistics_offers FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM logistics_requests
      WHERE logistics_requests.id = logistics_offers.logistics_request_id
      AND logistics_requests.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM logistics_requests
      WHERE logistics_requests.id = logistics_offers.logistics_request_id
      AND logistics_requests.created_by = auth.uid()
    )
  );

-- Provider can delete own offers
DROP POLICY IF EXISTS "delete_own_offers" ON logistics_offers;
CREATE POLICY "delete_own_offers" ON logistics_offers FOR DELETE
  TO authenticated USING (auth.uid() = provider_user_id);

CREATE INDEX IF NOT EXISTS idx_logistics_offers_request ON logistics_offers(logistics_request_id);
CREATE INDEX IF NOT EXISTS idx_logistics_offers_provider ON logistics_offers(provider_user_id);

-- ═══════════════════════════════════════════════════════════
-- 3. logistics_categories table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS logistics_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  sub_sector_id uuid NOT NULL REFERENCES sub_sectors(id) ON DELETE CASCADE,
  source_specialty_id uuid REFERENCES sub_sectors(id) ON DELETE SET NULL,
  key text NOT NULL,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sector_id, key)
);

ALTER TABLE logistics_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_logistics_categories" ON logistics_categories;
CREATE POLICY "anon_read_logistics_categories" ON logistics_categories FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_logistics_categories" ON logistics_categories;
CREATE POLICY "authenticated_insert_logistics_categories" ON logistics_categories FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_logistics_categories" ON logistics_categories;
CREATE POLICY "authenticated_update_logistics_categories" ON logistics_categories FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Insert palm logistics categories
INSERT INTO logistics_categories (sector_id, sub_sector_id, source_specialty_id, key, label, is_active, display_order)
VALUES
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6f0029b3-74e2-4287-a685-07d00293d2ec', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'palm_transplant_transport', 'نقل النقايل', true, 1),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6f0029b3-74e2-4287-a685-07d00293d2ec', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'palm_seedling_transport', 'نقل الفسائل', true, 2),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6f0029b3-74e2-4287-a685-07d00293d2ec', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'palm_fruit_transport', 'نقل الثمار', true, 3),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6f0029b3-74e2-4287-a685-07d00293d2ec', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'palm_residue_transport', 'نقل المخلفات', true, 4),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6f0029b3-74e2-4287-a685-07d00293d2ec', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'palm_project_transport', 'نقل نخيل المشاريع', true, 5)
ON CONFLICT (sector_id, key) DO NOTHING;
