-- Fix: total_score returns bigint, need to cast to int in RETURN QUERY
CREATE OR REPLACE FUNCTION find_opportunity_matches_v2(
  p_source_opportunity_id uuid,
  p_limit int DEFAULT 10,
  p_minimum_score int DEFAULT 50
)
RETURNS TABLE(
  matched_opportunity_id uuid,
  match_type text,
  total_score int,
  score_breakdown jsonb,
  match_reasons jsonb,
  rules_version int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_sector_id uuid;
  v_source_type text;
  v_source_status text;
  v_source_city text;
  v_source_timing text;
  v_source_price numeric;
  v_source_attrs jsonb;
  v_rules_version int := 1;
BEGIN
  SELECT
    o.sector_id, o.opportunity_type, o.status, o.city, o.opportunity_timing,
    CASE WHEN o.price ~ '^[0-9]+(\.[0-9]+)?$' THEN o.price::numeric ELSE NULL END,
    o.attributes
  INTO
    v_source_sector_id, v_source_type, v_source_status, v_source_city, v_source_timing,
    v_source_price, v_source_attrs
  FROM opportunities o
  WHERE o.id = p_source_opportunity_id;

  IF v_source_sector_id IS NULL THEN RETURN; END IF;
  IF v_source_status NOT IN ('active', 'draft', 'pending_review') THEN RETURN; END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT o.id, o.opportunity_type, o.city, o.opportunity_timing,
           CASE WHEN o.price ~ '^[0-9]+(\.[0-9]+)?$' THEN o.price::numeric ELSE NULL END as price_numeric,
           o.attributes
    FROM opportunities o
    WHERE o.sector_id = v_source_sector_id
      AND o.status = 'active'
      AND o.id != p_source_opportunity_id
      AND (
        (v_source_type = 'offer' AND o.opportunity_type = 'demand') OR
        (v_source_type = 'demand' AND o.opportunity_type = 'offer') OR
        (v_source_type = 'partnership' AND o.opportunity_type IN ('offer', 'demand', 'partnership'))
      )
      AND (
        EXISTS (
          SELECT 1 FROM opportunity_items src_oi
          JOIN opportunity_items cand_oi ON cand_oi.reference_source = src_oi.reference_source
                                         AND cand_oi.reference_id = src_oi.reference_id
                                         AND cand_oi.is_active = true
          WHERE src_oi.opportunity_id = p_source_opportunity_id
            AND src_oi.is_active = true
            AND src_oi.reference_source = 'plant_catalog'
            AND cand_oi.opportunity_id = o.id
        )
        OR
        (v_source_type = 'partnership' AND EXISTS (
          SELECT 1 FROM partnership_roles pr
          WHERE pr.opportunity_id = p_source_opportunity_id AND pr.status = 'open'
        ))
        OR
        (o.opportunity_type = 'partnership' AND EXISTS (
          SELECT 1 FROM partnership_roles pr
          WHERE pr.opportunity_id = o.id AND pr.status = 'open'
        ))
      )
  ),
  scored AS (
    SELECT
      c.id,
      c.opportunity_type,
      CASE
        WHEN v_source_type = 'offer' AND c.opportunity_type = 'demand' THEN 'offer_to_demand'
        WHEN v_source_type = 'demand' AND c.opportunity_type = 'offer' THEN 'demand_to_offer'
        WHEN v_source_type = 'partnership' AND c.opportunity_type = 'offer' THEN 'partnership_to_offer'
        WHEN v_source_type = 'partnership' AND c.opportunity_type = 'demand' THEN 'partnership_to_demand'
        WHEN v_source_type = 'partnership' AND c.opportunity_type = 'partnership' THEN 'partnership_to_partnership'
        ELSE 'offer_to_demand'
      END as match_type,

      -- 1. Plant match (35 pts)
      COALESCE((
        SELECT CASE WHEN COUNT(*) = 0 THEN 0 ELSE 35 END
        FROM (
          SELECT DISTINCT src_oi.reference_id
          FROM opportunity_items src_oi
          WHERE src_oi.opportunity_id = p_source_opportunity_id
            AND src_oi.is_active = true AND src_oi.reference_source = 'plant_catalog'
          INTERSECT
          SELECT DISTINCT cand_oi.reference_id
          FROM opportunity_items cand_oi
          WHERE cand_oi.opportunity_id = c.id
            AND cand_oi.is_active = true AND cand_oi.reference_source = 'plant_catalog'
        ) AS shared_plants
      ), 0) as plant_score,

      -- 2. Variety match (10 pts)
      COALESCE((
        SELECT CASE
          WHEN COUNT(*) > 0 THEN 10
          ELSE 0
        END
        FROM opportunity_items src_oi
        JOIN opportunity_items cand_oi ON cand_oi.plant_variety_id = src_oi.plant_variety_id
                                        AND cand_oi.is_active = true
        WHERE src_oi.opportunity_id = p_source_opportunity_id
          AND src_oi.is_active = true
          AND src_oi.plant_variety_id IS NOT NULL
          AND cand_oi.opportunity_id = c.id
      ), 0) as variety_score,

      -- 3. Quantity match (15 pts)
      COALESCE((
        SELECT CASE
          WHEN src_qty = 0 OR cand_qty = 0 THEN 0
          WHEN cand_qty >= src_qty THEN 15
          WHEN cand_qty >= src_qty * 0.75 THEN 12
          WHEN cand_qty >= src_qty * 0.50 THEN 8
          WHEN cand_qty >= src_qty * 0.25 THEN 5
          ELSE 0
        END
        FROM (
          SELECT
            COALESCE(SUM(src_oi.quantity), 0) as src_qty,
            (SELECT COALESCE(SUM(cand_oi.quantity), 0) FROM opportunity_items cand_oi WHERE cand_oi.opportunity_id = c.id AND cand_oi.is_active = true) as cand_qty
          FROM opportunity_items src_oi
          WHERE src_oi.opportunity_id = p_source_opportunity_id AND src_oi.is_active = true
        ) q
      ), 0) as quantity_score,

      -- 4. Location match (10 pts)
      CASE
        WHEN c.city IS NOT NULL AND v_source_city IS NOT NULL AND c.city = v_source_city THEN 10
        WHEN c.city IS NOT NULL AND v_source_city IS NOT NULL AND c.city <> v_source_city
          AND ((v_source_attrs->>'includes_transport') = 'true' OR (c.attributes->>'includes_transport') = 'true') THEN 4
        ELSE 0
      END as location_score,

      -- 5. Timing match (10 pts)
      CASE
        WHEN v_source_timing = 'flexible' OR c.opportunity_timing = 'flexible' THEN 5
        WHEN v_source_timing = c.opportunity_timing AND v_source_timing IS NOT NULL THEN 10
        WHEN v_source_timing IS NOT NULL AND c.opportunity_timing IS NOT NULL AND v_source_timing <> c.opportunity_timing THEN 0
        ELSE 3
      END as timing_score,

      -- 6. Price match (10 pts)
      CASE
        WHEN v_source_price IS NOT NULL AND c.price_numeric IS NOT NULL AND v_source_price > 0 AND c.price_numeric > 0 THEN
          CASE
            WHEN v_source_type = 'demand' THEN
              CASE WHEN c.price_numeric <= v_source_price THEN 10 WHEN c.price_numeric <= v_source_price * 1.15 THEN 5 ELSE 0 END
            WHEN v_source_type = 'offer' THEN
              CASE WHEN c.price_numeric >= v_source_price THEN 10 WHEN c.price_numeric >= v_source_price * 0.85 THEN 5 ELSE 0 END
            ELSE 3
          END
        ELSE 3
      END as price_score,

      -- 7. Specs match (10 pts)
      COALESCE((
        SELECT LEAST(10, COUNT(*) * 3)
        FROM (
          SELECT src_oi.age_value, src_oi.height_value, src_oi.container_size, src_oi.root_status, src_oi.readiness_status
          FROM opportunity_items src_oi
          WHERE src_oi.opportunity_id = p_source_opportunity_id AND src_oi.is_active = true
          LIMIT 1
        ) src_spec
        JOIN LATERAL (
          SELECT cand_oi.age_value, cand_oi.height_value, cand_oi.container_size, cand_oi.root_status, cand_oi.readiness_status
          FROM opportunity_items cand_oi
          WHERE cand_oi.opportunity_id = c.id AND cand_oi.is_active = true
          LIMIT 1
        ) cand_spec ON true
        WHERE
          (src_spec.age_value IS NOT NULL AND cand_spec.age_value IS NOT NULL AND src_spec.age_value = cand_spec.age_value)
          OR (src_spec.height_value IS NOT NULL AND cand_spec.height_value IS NOT NULL AND src_spec.height_value = cand_spec.height_value)
          OR (src_spec.container_size IS NOT NULL AND cand_spec.container_size IS NOT NULL AND src_spec.container_size = cand_spec.container_size)
          OR (src_spec.root_status IS NOT NULL AND cand_spec.root_status IS NOT NULL AND src_spec.root_status = cand_spec.root_status)
          OR (src_spec.readiness_status IS NOT NULL AND cand_spec.readiness_status IS NOT NULL AND src_spec.readiness_status = cand_spec.readiness_status)
      ), 0) as specs_score

    FROM candidates c
  )
  SELECT
    s.id,
    s.match_type,
    (s.plant_score + s.variety_score + s.quantity_score + s.location_score + s.timing_score + s.price_score + s.specs_score)::int as total_score,
    jsonb_build_object(
      'plant', s.plant_score, 'variety', s.variety_score, 'quantity', s.quantity_score,
      'location', s.location_score, 'timing', s.timing_score, 'price', s.price_score, 'specs', s.specs_score
    ) as score_breakdown,
    (
      CASE WHEN s.plant_score >= 35 THEN '["نفس النبات"]'::jsonb ELSE '[]'::jsonb END
      || CASE WHEN s.variety_score >= 10 THEN '["نفس الصنف"]'::jsonb ELSE '[]'::jsonb END
      || CASE WHEN s.quantity_score >= 15 THEN '["الكمية المتاحة تغطي كامل الاحتياج"]'::jsonb
         WHEN s.quantity_score >= 12 THEN '["الكمية تغطي معظم الاحتياج"]'::jsonb
         WHEN s.quantity_score >= 8 THEN '["الكمية تغطي نصف الاحتياج"]'::jsonb
         ELSE '[]'::jsonb END
      || CASE WHEN s.location_score >= 10 THEN '["نفس المدينة"]'::jsonb
         WHEN s.location_score >= 4 THEN '["موقع مختلف مع إمكانية النقل"]'::jsonb
         ELSE '[]'::jsonb END
      || CASE WHEN s.timing_score >= 10 THEN '["موعد التوفر مناسب"]'::jsonb
         WHEN s.timing_score >= 5 THEN '["موعد مرن"]'::jsonb
         ELSE '[]'::jsonb END
      || CASE WHEN s.price_score >= 10 THEN '["السعر داخل النطاق المطلوب"]'::jsonb
         WHEN s.price_score >= 5 THEN '["السعر قريب من النطاق"]'::jsonb
         ELSE '[]'::jsonb END
      || CASE WHEN s.specs_score >= 6 THEN '["المواصفات متطابقة"]'::jsonb
         WHEN s.specs_score >= 3 THEN '["مواصفات مشتركة جزئيًا"]'::jsonb
         ELSE '[]'::jsonb END
    ) as match_reasons,
    v_rules_version
  FROM scored s
  WHERE (s.plant_score + s.variety_score + s.quantity_score + s.location_score + s.timing_score + s.price_score + s.specs_score) >= p_minimum_score
  ORDER BY (s.plant_score + s.variety_score + s.quantity_score + s.location_score + s.timing_score + s.price_score + s.specs_score) DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION find_opportunity_matches_v2 TO anon, authenticated;
