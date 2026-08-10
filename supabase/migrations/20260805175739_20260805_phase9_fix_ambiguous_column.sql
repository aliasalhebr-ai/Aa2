-- Fix: ambiguous column reference "id" — qualify with table alias
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
  p_supply_date_before date DEFAULT NULL,
  p_includes_planting boolean DEFAULT NULL,
  p_includes_transport boolean DEFAULT NULL,
  p_partnership_type text DEFAULT NULL,
  p_partnership_role_key text DEFAULT NULL,
  p_join_deadline_before date DEFAULT NULL,
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
  v_normalized_search := NULL;
  IF p_search_query IS NOT NULL AND btrim(p_search_query) <> '' THEN
    v_normalized_search := normalize_arabic_text(p_search_query);
  END IF;

  v_offset := (COALESCE(p_page, 1) - 1) * COALESCE(p_page_size, 10);

  IF p_sort NOT IN ('latest', 'price_low', 'price_high', 'quantity_high', 'quantity_low', 'closing_soon') THEN
    p_sort := 'latest';
  END IF;

  IF p_opportunity_type IS NOT NULL AND p_opportunity_type NOT IN ('offer', 'demand', 'partnership') THEN
    p_opportunity_type := NULL;
  END IF;

  IF p_opportunity_timing IS NOT NULL AND p_opportunity_timing NOT IN ('available_now', 'future_production', 'scheduled', 'flexible') THEN
    p_opportunity_timing := NULL;
  END IF;

  CREATE TEMP TABLE _search_results AS
  SELECT DISTINCT o.id as opp_id
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
    AND (
      v_normalized_search IS NULL OR
      o.title ILIKE '%' || v_normalized_search || '%'
      OR o.description ILIKE '%' || v_normalized_search || '%'
      OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
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
            OR COALESCE(pc.english_name, '') ILIKE '%' || v_normalized_search || '%'
            OR COALESCE(pc.scientific_name, '') ILIKE '%' || v_normalized_search || '%'
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
    AND (
      p_plant_id IS NULL OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND oi.reference_source = 'plant_catalog'
          AND oi.reference_id = p_plant_id
      )
    )
    AND (
      p_variety_id IS NULL OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND oi.plant_variety_id = p_variety_id
      )
    )
    AND (
      (p_quantity_min IS NULL AND p_quantity_max IS NULL) OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND oi.quantity IS NOT NULL
          AND (p_quantity_min IS NULL OR oi.quantity >= p_quantity_min)
          AND (p_quantity_max IS NULL OR oi.quantity <= p_quantity_max)
      )
    )
    AND (
      (p_price_min IS NULL AND p_price_max IS NULL) OR (
        o.price IS NOT NULL AND o.price ~ '^[0-9]+(\.[0-9]+)?$'
        AND (p_price_min IS NULL OR o.price::numeric >= p_price_min)
        AND (p_price_max IS NULL OR o.price::numeric <= p_price_max)
      ) OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND oi.unit_price IS NOT NULL
          AND (p_price_min IS NULL OR oi.unit_price >= p_price_min)
          AND (p_price_max IS NULL OR oi.unit_price <= p_price_max)
      )
    )
    AND (
      p_supply_date_before IS NULL OR EXISTS (
        SELECT 1 FROM opportunity_items oi
        WHERE oi.opportunity_id = o.id AND oi.is_active = true
          AND oi.available_from IS NOT NULL
          AND oi.available_from <= p_supply_date_before
      )
    )
    AND (
      p_includes_planting IS NULL OR (
        o.attributes->>'includes_planting' = (p_includes_planting::text)
      )
    )
    AND (
      p_includes_transport IS NULL OR (
        o.attributes->>'includes_transport' = (p_includes_transport::text)
      )
    )
    AND (
      p_partnership_type IS NULL OR EXISTS (
        SELECT 1 FROM partnership_opportunity_profiles pop
        WHERE pop.opportunity_id = o.id
          AND pop.partnership_type = p_partnership_type
      )
    )
    AND (
      p_partnership_role_key IS NULL OR EXISTS (
        SELECT 1 FROM partnership_roles pr
        WHERE pr.opportunity_id = o.id
          AND pr.role_key = p_partnership_role_key
      )
    )
    AND (
      p_join_deadline_before IS NULL OR EXISTS (
        SELECT 1 FROM partnership_opportunity_profiles pop
        WHERE pop.opportunity_id = o.id
          AND pop.join_deadline IS NOT NULL
          AND pop.join_deadline <= p_join_deadline_before
      )
    );

  v_total := (SELECT COUNT(*) FROM _search_results);

  v_opportunity_ids := ARRAY(
    SELECT sr.opp_id FROM _search_results sr
    ORDER BY sr.opp_id
    LIMIT COALESCE(p_page_size, 10)
    OFFSET v_offset
  );

  IF array_length(v_opportunity_ids, 1) IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, v_total;
  ELSE
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
      ORDER BY CASE WHEN o.price ~ '^[0-9]+(\.[0-9]+)?$' THEN o.price::numeric ELSE NULL END ASC NULLS LAST;
    ELSIF p_sort = 'price_high' THEN
      RETURN QUERY
      SELECT o.id, v_total
      FROM opportunities o
      WHERE o.id = ANY(v_opportunity_ids)
      ORDER BY CASE WHEN o.price ~ '^[0-9]+(\.[0-9]+)?$' THEN o.price::numeric ELSE NULL END DESC NULLS LAST;
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
