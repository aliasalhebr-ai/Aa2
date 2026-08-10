/*
# Update network_pulse view to include V2 columns

1. Purpose
   - Add three new columns to the network_pulse view:
     - opportunity_type (from opportunities, NULL for non-opportunity rows)
     - opportunity_timing (from opportunities, NULL for non-opportunity rows)
     - template_version (from opportunities, NULL for non-opportunity rows)
   - Use COALESCE(opportunity_type, operation_type) as activity_subtype fallback
     so legacy opportunities that only have operation_type still show correctly.
   - All existing columns are preserved — no breaking changes for palm sector.
   - Only active opportunities are shown (unchanged).
   - Auctions, products, services, events rows get NULL for the new columns.

2. Changes
   - DROP and recreate the network_pulse view.
   - The opportunity SELECT now includes:
     o.opportunity_type, o.opportunity_timing, o.template_version
   - activity_subtype uses COALESCE(o.opportunity_type, o.operation_type) for
     opportunities, and the same logic as before for other activity types.

3. Compatibility
   - All columns that existed before still exist with the same names and types.
   - Palm sector cards that read activity_subtype, attributes, images — unchanged.
   - Three new nullable columns appended at the end.
*/

DROP VIEW IF EXISTS network_pulse;

CREATE VIEW network_pulse AS
SELECT
  o.id,
  'opportunity'::text AS activity_type,
  COALESCE(o.opportunity_type, o.operation_type) AS activity_subtype,
  o.title,
  o.description,
  o.image,
  o.city,
  o.sector_id,
  o.sub_sector_id,
  o.company_id,
  o.quantity,
  o.quality,
  o.price,
  NULL::text AS auction_status,
  NULL::text AS time_remaining,
  o.attributes,
  o.images,
  o.created_at,
  o.opportunity_type,
  o.opportunity_timing,
  o.template_version
FROM opportunities o
WHERE o.status = 'active'::text

UNION ALL

SELECT
  a.id,
  'auction'::text AS activity_type,
  a.status AS activity_subtype,
  a.title,
  a.description,
  a.image,
  a.city,
  a.sector_id,
  a.source_sub_sector_id AS sub_sector_id,
  a.company_id,
  NULL::text AS quantity,
  NULL::text AS quality,
  a.current_price AS price,
  a.status AS auction_status,
  NULL::text AS time_remaining,
  NULL::jsonb AS attributes,
  NULL::text[] AS images,
  a.created_at,
  NULL::text AS opportunity_type,
  NULL::text AS opportunity_timing,
  NULL::smallint AS template_version
FROM auctions a

UNION ALL

SELECT
  a.id,
  'auction'::text AS activity_type,
  a.status AS activity_subtype,
  a.title,
  a.description,
  a.image,
  a.city,
  a.source_sector_id AS sector_id,
  a.source_sub_sector_id AS sub_sector_id,
  a.company_id,
  NULL::text AS quantity,
  NULL::text AS quality,
  a.current_price AS price,
  a.status AS auction_status,
  NULL::text AS time_remaining,
  NULL::jsonb AS attributes,
  NULL::text[] AS images,
  a.created_at,
  NULL::text AS opportunity_type,
  NULL::text AS opportunity_timing,
  NULL::smallint AS template_version
FROM auctions a
WHERE a.source_sector_id IS NOT NULL

UNION ALL

SELECT
  p.id,
  'product'::text AS activity_type,
  'new'::text AS activity_subtype,
  p.name AS title,
  p.description,
  p.image,
  p.city,
  p.sector_id,
  p.sub_sector_id,
  p.company_id,
  NULL::text AS quantity,
  NULL::text AS quality,
  p.price,
  NULL::text AS auction_status,
  NULL::text AS time_remaining,
  NULL::jsonb AS attributes,
  NULL::text[] AS images,
  p.created_at,
  NULL::text AS opportunity_type,
  NULL::text AS opportunity_timing,
  NULL::smallint AS template_version
FROM products p

UNION ALL

SELECT
  s.id,
  'service'::text AS activity_type,
  'request'::text AS activity_subtype,
  s.name AS title,
  s.description,
  s.image,
  s.city,
  s.sector_id,
  s.sub_sector_id,
  s.company_id,
  NULL::text AS quantity,
  NULL::text AS quality,
  s.price,
  NULL::text AS auction_status,
  NULL::text AS time_remaining,
  NULL::jsonb AS attributes,
  NULL::text[] AS images,
  s.created_at,
  NULL::text AS opportunity_type,
  NULL::text AS opportunity_timing,
  NULL::smallint AS template_version
FROM services s

UNION ALL

SELECT
  e.id,
  'event'::text AS activity_type,
  'announcement'::text AS activity_subtype,
  e.title,
  e.description,
  e.image,
  e.city,
  e.sector_id,
  NULL::uuid AS sub_sector_id,
  e.company_id,
  NULL::text AS quantity,
  NULL::text AS quality,
  NULL::text AS price,
  NULL::text AS auction_status,
  NULL::text AS time_remaining,
  NULL::jsonb AS attributes,
  NULL::text[] AS images,
  e.created_at,
  NULL::text AS opportunity_type,
  NULL::text AS opportunity_timing,
  NULL::smallint AS template_version
FROM events e;
