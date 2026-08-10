/*
# Siwar Agricultural Network Schema

1. Purpose
   Creates the full schema for the Siwar (صِوار) agricultural network home page.
   The UI is a single dynamic SectorNetworkPage driven entirely by database data.

2. New Tables
   - sectors: top-level sectors (نخيل، مشاتل، مزادات، etc.) with display config
   - sub_sectors: sub-categories under each sector
   - companies: entities that post activities
   - opportunities: buy/sell/invest/service opportunities
   - auctions: live & upcoming auctions, linked to source sector
   - products: agricultural products
   - services: agricultural services
   - events: sector events and activities

3. Security
   - RLS enabled on every table.
   - Read access for anon + authenticated (public browsing, no sign-in required).
   - No write policies: creation flow shows a login prompt in the UI.

4. Notes
   - All activity tables share a common shape so the NetworkPulseCard can render
     them uniformly via a security_invoker view.
   - Auctions carry source_sector_id so they appear in both the auctions sector
     and their original sector without duplicating the row.
*/

-- ── Sectors ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sectors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text NOT NULL UNIQUE,
  description   text,
  icon          text,
  image         text,
  display_order int  NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  is_featured   boolean NOT NULL DEFAULT false,
  search_placeholder text,
  available_actions   jsonb NOT NULL DEFAULT '[]'::jsonb,
  filter_configuration jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Sub-sectors ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sub_sectors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id     uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  name          text NOT NULL,
  slug          text NOT NULL,
  icon          text,
  display_order int  NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Companies ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  logo          text,
  is_verified   boolean NOT NULL DEFAULT false,
  description   text,
  city          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Opportunities (buy / sell / invest / service-request) ─
CREATE TABLE IF NOT EXISTS opportunities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id     uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  sub_sector_id uuid REFERENCES sub_sectors(id) ON DELETE SET NULL,
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type          text NOT NULL,            -- buy | sell | invest | service_request
  title         text NOT NULL,
  description   text,
  image         text,
  quantity      text,
  quality       text,
  city          text,
  price         text,
  status        text NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Auctions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auctions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id           uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  source_sector_id    uuid REFERENCES sectors(id) ON DELETE SET NULL,
  source_sub_sector_id uuid REFERENCES sub_sectors(id) ON DELETE SET NULL,
  company_id          uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title               text NOT NULL,
  description         text,
  image               text,
  current_price       text,
  city                text,
  status              text NOT NULL DEFAULT 'upcoming',  -- live | upcoming
  start_time          timestamptz,
  end_time            timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Products ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id     uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  sub_sector_id uuid REFERENCES sub_sectors(id) ON DELETE SET NULL,
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  image         text,
  price         text,
  city          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Services ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id     uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  sub_sector_id uuid REFERENCES sub_sectors(id) ON DELETE SET NULL,
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  image         text,
  price         text,
  city          text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Events ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id     uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title         text NOT NULL,
  description   text,
  image         text,
  city          text,
  event_date    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sub_sectors_sector  ON sub_sectors(sector_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_sector ON opportunities(sector_id);
CREATE INDEX IF NOT EXISTS idx_auctions_sector       ON auctions(sector_id);
CREATE INDEX IF NOT EXISTS idx_auctions_source       ON auctions(source_sector_id);
CREATE INDEX IF NOT EXISTS idx_products_sector       ON products(sector_id);
CREATE INDEX IF NOT EXISTS idx_services_sector       ON services(sector_id);
CREATE INDEX IF NOT EXISTS idx_events_sector          ON events(sector_id);

-- ── RLS: enable on all tables ─────────────────────────────
ALTER TABLE sectors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_sectors  ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products     ENABLE ROW LEVEL SECURITY;
ALTER TABLE services     ENABLE ROW LEVEL SECURITY;
ALTER TABLE events       ENABLE ROW LEVEL SECURITY;

-- ── Read policies (anon + authenticated) ──────────────────
-- Sectors: only active sectors are public
DROP POLICY IF EXISTS "read_sectors" ON sectors;
CREATE POLICY "read_sectors" ON sectors FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- Sub-sectors: only active sub-sectors
DROP POLICY IF EXISTS "read_sub_sectors" ON sub_sectors;
CREATE POLICY "read_sub_sectors" ON sub_sectors FOR SELECT
  TO anon, authenticated USING (is_active = true);

-- Companies: all readable
DROP POLICY IF EXISTS "read_companies" ON companies;
CREATE POLICY "read_companies" ON companies FOR SELECT
  TO anon, authenticated USING (true);

-- Opportunities: only active
DROP POLICY IF EXISTS "read_opportunities" ON opportunities;
CREATE POLICY "read_opportunities" ON opportunities FOR SELECT
  TO anon, authenticated USING (status = 'active');

-- Auctions: all readable
DROP POLICY IF EXISTS "read_auctions" ON auctions;
CREATE POLICY "read_auctions" ON auctions FOR SELECT
  TO anon, authenticated USING (true);

-- Products: all readable
DROP POLICY IF EXISTS "read_products" ON products;
CREATE POLICY "read_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

-- Services: all readable
DROP POLICY IF EXISTS "read_services" ON services;
CREATE POLICY "read_services" ON services FOR SELECT
  TO anon, authenticated USING (true);

-- Events: all readable
DROP POLICY IF EXISTS "read_events" ON events;
CREATE POLICY "read_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

-- ── Network Pulse unified view ───────────────────────────
-- Unifies all activity types into a single feed.
-- security_invoker = true so RLS on underlying tables is enforced.
CREATE OR REPLACE VIEW network_pulse AS
  SELECT
    o.id, 'opportunity' AS activity_type, o.type AS activity_subtype,
    o.title, o.description, o.image, o.city,
    o.sector_id, o.sub_sector_id, o.company_id,
    o.quantity, o.quality, o.price,
    NULL::text AS auction_status,
    NULL::text AS time_remaining,
    o.created_at
  FROM opportunities o
UNION ALL
  SELECT
    a.id, 'auction' AS activity_type, a.status AS activity_subtype,
    a.title, a.description, a.image, a.city,
    COALESCE(a.source_sector_id, a.sector_id) AS sector_id,
    a.source_sub_sector_id AS sub_sector_id, a.company_id,
    NULL::text AS quantity, NULL::text AS quality,
    a.current_price AS price,
    a.status AS auction_status,
    NULL::text AS time_remaining,
    a.created_at
  FROM auctions a
UNION ALL
  SELECT
    p.id, 'product' AS activity_type, 'new' AS activity_subtype,
    p.name AS title, p.description, p.image, p.city,
    p.sector_id, p.sub_sector_id, p.company_id,
    NULL::text AS quantity, NULL::text AS quality, p.price,
    NULL::text AS auction_status, NULL::text AS time_remaining,
    p.created_at
  FROM products p
UNION ALL
  SELECT
    s.id, 'service' AS activity_type, 'request' AS activity_subtype,
    s.name AS title, s.description, s.image, s.city,
    s.sector_id, s.sub_sector_id, s.company_id,
    NULL::text AS quantity, NULL::text AS quality, s.price,
    NULL::text AS auction_status, NULL::text AS time_remaining,
    s.created_at
  FROM services s
UNION ALL
  SELECT
    e.id, 'event' AS activity_type, 'announcement' AS activity_subtype,
    e.title, e.description, e.image, e.city,
    e.sector_id, NULL::uuid AS sub_sector_id, e.company_id,
    NULL::text AS quantity, NULL::text AS quality, NULL::text AS price,
    NULL::text AS auction_status, NULL::text AS time_remaining,
    e.created_at
  FROM events e;

ALTER VIEW network_pulse SET (security_invoker = true);
