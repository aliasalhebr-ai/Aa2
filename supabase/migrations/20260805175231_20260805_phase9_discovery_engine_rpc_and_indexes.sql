/*
# Phase 9: Opportunity Discovery Engine — Database Layer

1. search_opportunities_v2 RPC
   - Cross-table full-text search across opportunities, opportunity_items, plant_catalog, plant_varieties, partnership_roles
   - Filter allowlist (no raw column names from client)
   - Pagination with total_count
   - Sort allowlist
   - Arabic text normalization (trim, lowercase, remove 'ال' prefix, collapse spaces)

2. Indexes:
   - opportunities(sector_id, status, created_at DESC) — composite for sector+status filtered ordering
   - opportunity_items(opportunity_id, is_active) — covering index for item joins
   - partnership_opportunity_profiles(join_deadline) — for partnership deadline filtering
   - pg_trgm GIN index on opportunities.title and opportunities.description for partial text search
*/

-- ── Enable pg_trgm for partial text matching ──
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Index 1: Composite index for sector+status+created_at ──
-- Reason: The discovery query always filters by sector_id + status='active' and orders by created_at
CREATE INDEX IF NOT EXISTS idx_opp_sector_status_created
ON opportunities (sector_id, status, created_at DESC);

-- ── Index 2: Composite index for opportunity_type+status ──
-- Reason: Filtering by opportunity_type (offer/demand/partnership) + status is the most common filter combo
CREATE INDEX IF NOT EXISTS idx_opp_type_status_created
ON opportunities (opportunity_type, status, created_at DESC);

-- ── Index 3: Covering index for opportunity_items joins ──
-- Reason: Discovery joins items to opportunities; this avoids re-reading the items table
CREATE INDEX IF NOT EXISTS idx_opp_items_opp_active
ON opportunity_items (opportunity_id, is_active);

-- ── Index 4: Partnership join_deadline for deadline filtering ──
-- Reason: Partnership filter by join_deadline (date_before/date_after)
CREATE INDEX IF NOT EXISTS idx_partnership_join_deadline
ON partnership_opportunity_profiles (join_deadline);

-- ── Index 5: Trigram indexes for partial text search ──
-- Reason: Arabic partial matching (e.g. "سدر" matching "شتلات سدر")
CREATE INDEX IF NOT EXISTS idx_opp_title_trgm ON opportunities USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_opp_desc_trgm ON opportunities USING gin (description gin_trgm_ops);

-- ── Index 6: Items name/variety trigram for cross-table search ──
CREATE INDEX IF NOT EXISTS idx_opp_items_name_trgm ON opportunity_items USING gin (name_snapshot gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_opp_items_variety_trgm ON opportunity_items USING gin (variety_name_snapshot gin_trgm_ops);

-- ── Index 7: Plant catalog name trigram ──
CREATE INDEX IF NOT EXISTS idx_plant_catalog_arabic_trgm ON plant_catalog USING gin (arabic_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_plant_varieties_name_trgm ON plant_varieties USING gin (name_ar gin_trgm_ops);

-- ── Normalize Arabic text helper ──
CREATE OR REPLACE FUNCTION normalize_arabic_text(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    lower(
      btrim(
        regexp_replace(
          regexp_replace(
            regexp_replace(input, '\s+', ' ', 'g'),
            '^ال', '', 'g'
          ),
          '[ًٌٍَُِّْ]', '', 'g'
        )
      )
    )
$$;

-- ── The main search RPC ──
CREATE OR REPLACE FUNCTION search_opportunities_v2(
  p_sector_id uuid,
  p_search_query text DEFAULT NULL,
  p_opportunity_type text DEFAULT NULL,
  p_sub_sector_id uuid DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_opportunity_timing text DEFAULT NULL,
  p_plant_id uuid DEFAULT NULL,
  p_variety_id uuid DEFAULT NULL,
  p_quantity_min numeric DEFAULT NULL,
  p_quantity_max numeric DEFAULT NULL,
  p_price_min numeric DEFAULT NULL,
  p_price_max numeric DEFAULT NULL,
  p_is_verified boolean DEFAULT NULL,
  -- Demand-specific
  p_supply_date_before date DEFAULT NULL,
  p_includes_planting boolean DEFAULT NULL,
  p_includes_transport boolean DEFAULT NULL,
  -- Partnership-specific
  p_partnership_type text DEFAULT NULL,
  p_partnership_role_key text DEFAULT NULL,
  p_join_deadline_before date DEFAULT NULL,
  -- Pagination
  p_page int DEFAULT 1,
  p_page_size int DEFAULT 10,
  p_sort text DEFAULT 'latest'
)
RETURNS TABLE(
  id uuid,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_search text;
  v_offset int;
  v_total bigint;
  v_opportunity_ids uuid[];
BEGIN
  -- Normalize search query
  v_normalized_search := NULL;
  IF p_search_query IS NOT NULL AND btrim(p_search_query) <> '' THEN
    v_normalized_search := normalize_arabic_text(p_search_query);
  END IF;

  v_offset := (COALESCE(p_page, 1) - 1) * COALESCE(p_page_size, 10);

  -- ── Build the base query using a CTE ──
  -- We find matching opportunity IDs first, then paginate

  -- Validate sort allowlist
  IF p_sort NOT IN ('latest', 'price_low', 'price_high', 'quantity_high', 'quantity_low', 'closing_soon') THEN
    p_sort := 'latest';
  END IF;

  -- Validate opportunity_type allowlist
  IF p_opportunity_type IS NOT NULL AND p_opportunity_type NOT IN ('offer', 'demand', 'partnership') THEN
    p_opportunity_type := NULL;
  END IF;

  -- Validate opportunity_timing allowlist
  IF p_opportunity_timing IS NOT NULL AND p_opportunity_timing NOT IN ('available_now', 'future_production', 'scheduled', 'flexible') THEN
    p_opportunity_timing := NULL;
  END IF;

  -- ── Core query: find matching opportunity IDs ──
  CREATE TEMP TABLE _search_results AS
  SELECT DISTINCT o.id
  FROM opportunities o
  WHERE o.sector_id = p_sector_id
    AND o.status = 'active'
    AND (p_opportunity_type IS NULL OR o.opportunity_type = p_opportunity_type)
    AND (p_sub_sector_id IS NULL OR o.sub_sector_id = p_sub_sector_id)
    AND (p_city IS NULL OR o.city = p_city)
    AND (p_opportunity_timing IS NULL OR o.opportunity_timing = p_opportunity_timing)
    AND (p_is_verified IS NULL OR EXISTS (
      SELECT 1 FROM publisher_entities pe
      WHERE pe.id = o.publisher_entity_id AND pe.is_verified = p_is_verified
    ))
    -- ── Text search across multiple tables ──
    AND (
      v_normalized_search IS NULL OR
      o.title ILIKE '%' || v_normalized_search || '%'
      OR o.description ILIKE '%' || v_normalized_search || '%'
      OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id
          AND oi.is_active = true
          AND (
            oi.name_snapshot ILIKE '%' || v_normalized_search || '%'
            OR oi.variety_name_snapshot ILIKE '%' || v_normalized_search || '%'
          )
      )
      OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        JOIN plant_catalog pc ON pc.id = oi.reference_id AND oi.reference_source = 'plant_catalog'
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND (
            pc.arabic_name ILIKE '%' || v_normalized_search || '%'
            OR pc.english_name ILIKE '%' || v_normalized_search || '%'
            OR pc.scientific_name ILIKE '%' || v_normalized_search || '%'
          )
      )
      OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        JOIN plant_varieties pv ON pv.id = oi.plant_variety_id
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND pv.name_ar ILIKE '%' || v_normalized_search || '%'
      )
      OR EXISTS (
        SELECT 1 FROM partnership_roles pr
        WHERE pr.opportunity_id = o.id
          AND pr.role_label_snapshot ILIKE '%' || v_normalized_search || '%'
      )
      OR EXISTS (
        SELECT 1 FROM publisher_entities pe
        WHERE pe.id = o.publisher_entity_id
          AND pe.name ILIKE '%' || v_normalized_search || '%'
      )
    )
    -- ── Plant filter ──
    AND (
      p_plant_id IS NULL OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND oi.reference_source = 'plant_catalog'
          AND oi.reference_id = p_plant_id
      )
    )
    -- ── Variety filter ──
    AND (
      p_variety_id IS NULL OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND oi.plant_variety_id = p_variety_id
      )
    )
    -- ── Quantity range filter (any matching item) ──
    AND (
      (p_quantity_min IS NULL AND p_quantity_max IS NULL) OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND (p_quantity_min IS NULL OR oi.quantity >= p_quantity_min)
          AND (p_quantity_max IS NULL OR oi.quantity <= p_quantity_max)
      )
    )
    -- ── Price range filter ──
    AND (
      (p_price_min IS NULL AND p_price_max IS NULL) OR (
        o.price IS NOT NULL
        AND (p_price_min IS NULL OR o.price >= p_price_min)
        AND (p_price_max IS NULL OR o.price <= p_price_max)
      ) OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND oi.unit_price IS NOT NULL
          AND (p_price_min IS NULL OR oi.unit_price >= p_price_min)
          AND (p_price_max IS NULL OR oi.unit_price <= p_price_max)
      )
    )
    -- ── Demand: supply date before ──
    AND (
      p_supply_date_before IS NULL OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND oi.required_supply_date IS NOT NULL
          AND oi.required_supply_date <= p_supply_date_before
      )
    )
    -- ── Demand: includes planting ──
    AND (
      p_includes_planting IS NULL OR (
        o.attributes->>'includes_planting' = (p_includes_planting::text)
      )
    )
    -- ── Demand: includes transport ──
    AND (
      p_includes_transport IS NULL OR (
        o.attributes->>'includes_transport' = (p_includes_transport::text)
      )
    )
    -- ── Partnership: type ──
    AND (
      p_partnership_type IS NULL OR EXISTS (
        SELECT 1 FROM partnership_opportunity_profiles pop
        WHERE pop.opportunity_id = o.id
          AND pop.partnership_type = p_partnership_type
      )
    )
    -- ── Partnership: role key ──
    AND (
      p_partnership_role_key IS NULL OR EXISTS (
        SELECT 1 FROM partnership_roles pr
        WHERE pr.opportunity_id = o.id
          AND pr.role_key = p_partnership_role_key
      )
    )
    -- ── Partnership: join deadline before ──
    AND (
      p_join_deadline_before IS NULL OR EXISTS (
        SELECT 1 FROM partnership_opportunity_profiles pop
        WHERE pop.opportunity_id = o.id
          AND pop.join_deadline IS NOT NULL
          AND pop.join_deadline <= p_join_deadline_before
      )
    );

  -- Get total count
  v_total := (SELECT COUNT(*) FROM _search_results);

  -- Get paginated IDs
  v_opportunity_ids := ARRAY(
    SELECT id FROM _search_results
    ORDER BY id
    LIMIT COALESCE(p_page_size, 10)
    OFFSET v_offset
  );

  -- Return results
  IF array_length(v_opportunity_ids, 1) IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, v_total;
  ELSE
    -- Apply sort by joining back to opportunities for ordering
    IF p_sort = 'latest' THEN
      RETURN QUERY
      SELECT o.id, v_total
      FROM opportunities o
      WHERE o.id = ANY(v_opportunity_ids)
      ORDER BY o.created_at DESC;
    ELSIF p_sort = 'price_low' THEN
      RETURN QUERY
      SELECT o.id, v_total
      FROM opportunities o
      WHERE o.id = ANY(v_opportunity_ids)
      ORDER BY o.price ASC NULLS LAST;
    ELSIF p_sort = 'price_high' THEN
      RETURN QUERY
      SELECT o.id, v_total
      FROM opportunities o
      WHERE o.id = ANY(v_opportunity_ids)
      ORDER BY o.price DESC NULLS LAST;
    ELSIF p_sort = 'quantity_high' THEN
      RETURN QUERY
      SELECT o.id, v_total
      FROM opportunities o
      LEFT JOIN LATERAL (
        SELECT MAX(oi.quantity) as max_qty
        FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
      ) oi_max ON true
      WHERE o.id = ANY(v_opportunity_ids)
      ORDER BY oi_max.max_qty DESC NULLS LAST;
    ELSIF p_sort = 'quantity_low' THEN
      RETURN QUERY
      SELECT o.id, v_total
      FROM opportunities o
      LEFT JOIN LATERAL (
        SELECT MIN(oi.quantity) as min_qty
        FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
      ) oi_min ON true
      WHERE o.id = ANY(v_opportunity_ids)
      ORDER BY oi_min.min_qty ASC NULLS LAST;
    ELSIF p_sort = 'closing_soon' THEN
      RETURN QUERY
      SELECT o.id, v_total
      FROM opportunities o
      LEFT JOIN LATERAL (
        SELECT pop.join_deadline as deadline
        FROM partnership_opportunity_profiles pop
        WHERE pop.opportunity_id = o.id
        LIMIT 1
      ) pop_lateral ON true
      WHERE o.id = ANY(v_opportunity_ids)
      ORDER BY pop_lateral.deadline ASC NULLS LAST;
    ELSE
      RETURN QUERY
      SELECT o.id, v_total
      FROM opportunities o
      WHERE o.id = ANY(v_opportunity_ids)
      ORDER BY o.created_at DESC;
    END IF;
  END IF;

  DROP TABLE _search_results;
END;
$$;

GRANT EXECUTE ON FUNCTION search_opportunities_v2 TO anon, authenticated;
