/*
# Phase 3 — Opportunities Admin Review, Notifications, Service Offers

## 1. Opportunities: status constraint + admin review fields
- Add CHECK constraint for status values: draft, pending_review, active, closed, archived, rejected
- Add rejection_reason, reviewed_by, reviewed_at columns

## 2. Notifications table
- Real notifications linked to records and users
- RLS: owner-scoped (user sees own notifications only)

## 3. Service Offers table
- For palm service opportunities: providers submit offers on service requests
- RLS: provider owns their offers, request owner can read offers on their requests
*/

-- ═══════════════════════════════════════════════════════════
-- 1. Opportunities: status constraint + admin review fields
-- ═══════════════════════════════════════════════════════════

ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_status_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_status_check
  CHECK (status IN ('draft', 'pending_review', 'active', 'closed', 'archived', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_created_by ON opportunities(created_by);

-- ═══════════════════════════════════════════════════════════
-- 2. Notifications table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link_type text,
  link_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id) WHERE is_read = false;

-- ═══════════════════════════════════════════════════════════
-- 3. Service Offers table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS service_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  provider_user_id uuid NOT NULL DEFAULT auth.uid(),
  provider_entity_id uuid REFERENCES publisher_entities(id) ON DELETE SET NULL,
  price numeric,
  currency text NOT NULL DEFAULT 'SAR',
  duration text,
  scope text,
  equipment text,
  labor text,
  notes text,
  has_transport boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE service_offers ENABLE ROW LEVEL SECURITY;

-- Provider can read own offers
DROP POLICY IF EXISTS "select_own_service_offers" ON service_offers;
CREATE POLICY "select_own_service_offers" ON service_offers FOR SELECT
  TO authenticated USING (auth.uid() = provider_user_id);

-- Request owner can read offers on their requests
DROP POLICY IF EXISTS "select_offers_on_own_opportunities" ON service_offers;
CREATE POLICY "select_offers_on_own_opportunities" ON service_offers FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM opportunities
      WHERE opportunities.id = service_offers.opportunity_id
      AND opportunities.created_by = auth.uid()
    )
  );

-- Provider can insert offers on others' active service requests
DROP POLICY IF EXISTS "insert_own_service_offers" ON service_offers;
CREATE POLICY "insert_own_service_offers" ON service_offers FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = provider_user_id
    AND EXISTS (
      SELECT 1 FROM opportunities
      WHERE opportunities.id = service_offers.opportunity_id
      AND opportunities.created_by != auth.uid()
      AND opportunities.status = 'active'
    )
  );

-- Provider can update own offers (withdraw)
DROP POLICY IF EXISTS "update_own_service_offers" ON service_offers;
CREATE POLICY "update_own_service_offers" ON service_offers FOR UPDATE
  TO authenticated USING (auth.uid() = provider_user_id)
  WITH CHECK (auth.uid() = provider_user_id);

-- Request owner can update offer status (accept/reject)
DROP POLICY IF EXISTS "update_offers_on_own_opportunities" ON service_offers;
CREATE POLICY "update_offers_on_own_opportunities" ON service_offers FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM opportunities
      WHERE opportunities.id = service_offers.opportunity_id
      AND opportunities.created_by = auth.uid()
    )
  );

-- Provider can delete own offers
DROP POLICY IF EXISTS "delete_own_service_offers" ON service_offers;
CREATE POLICY "delete_own_service_offers" ON service_offers FOR DELETE
  TO authenticated USING (auth.uid() = provider_user_id);

CREATE INDEX IF NOT EXISTS idx_service_offers_opportunity ON service_offers(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_service_offers_provider ON service_offers(provider_user_id);

-- ═══════════════════════════════════════════════════════════
-- 4. Auction requests table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS auction_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  source_sub_sector_id uuid REFERENCES sub_sectors(id) ON DELETE SET NULL,
  source_opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  owner_entity_id uuid REFERENCES publisher_entities(id) ON DELETE SET NULL,
  asset_type text,
  asset_title text NOT NULL DEFAULT 'طلب مزاد',
  asset_description text,
  marketer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  marketer_entity_id uuid REFERENCES publisher_entities(id) ON DELETE SET NULL,
  auction_type text,
  start_time timestamptz,
  end_time timestamptz,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'under_review', 'assigned_to_marketer', 'preparing', 'ready_to_publish', 'published', 'active', 'ended', 'sold', 'unsold', 'cancelled')),
  rejection_reason text,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE auction_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_auction_requests" ON auction_requests;
CREATE POLICY "select_own_auction_requests" ON auction_requests FOR SELECT
  TO authenticated USING (auth.uid() = created_by OR auth.uid() = marketer_id);

DROP POLICY IF EXISTS "insert_own_auction_requests" ON auction_requests;
CREATE POLICY "insert_own_auction_requests" ON auction_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "update_own_auction_requests" ON auction_requests;
CREATE POLICY "update_own_auction_requests" ON auction_requests FOR UPDATE
  TO authenticated USING (auth.uid() = created_by OR auth.uid() = marketer_id)
  WITH CHECK (auth.uid() = created_by OR auth.uid() = marketer_id);

DROP POLICY IF EXISTS "delete_own_auction_requests" ON auction_requests;
CREATE POLICY "delete_own_auction_requests" ON auction_requests FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_auction_requests_status ON auction_requests(status);
CREATE INDEX IF NOT EXISTS idx_auction_requests_created_by ON auction_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_auction_requests_marketer ON auction_requests(marketer_id);
