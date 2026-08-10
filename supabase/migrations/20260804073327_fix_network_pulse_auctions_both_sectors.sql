/*
# Fix network_pulse view: auctions appear in both sectors

1. Problem
   The previous view used COALESCE(source_sector_id, sector_id) which meant
   auctions with a source_sector_id only appeared in the source sector, not
   in the auctions sector itself.

2. Fix
   Add a second SELECT for auctions that keeps the original sector_id,
   so each auction appears in BOTH its auctions sector AND its source sector.
*/

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
    a.sector_id,
    a.source_sub_sector_id AS sub_sector_id, a.company_id,
    NULL::text AS quantity, NULL::text AS quality,
    a.current_price AS price,
    a.status AS auction_status,
    NULL::text AS time_remaining,
    a.created_at
  FROM auctions a
UNION ALL
  SELECT
    a.id, 'auction' AS activity_type, a.status AS activity_subtype,
    a.title, a.description, a.image, a.city,
    a.source_sector_id AS sector_id,
    a.source_sub_sector_id AS sub_sector_id, a.company_id,
    NULL::text AS quantity, NULL::text AS quality,
    a.current_price AS price,
    a.status AS auction_status,
    NULL::text AS time_remaining,
    a.created_at
  FROM auctions a
  WHERE a.source_sector_id IS NOT NULL
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
