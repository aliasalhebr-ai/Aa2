
-- Fix matching engine to support palm_varieties as reference source
-- Previously hardcoded to 'plant_catalog' only, which excluded all palm-fruits items from matching.
-- Now accepts both 'plant_catalog' and 'palm_varieties' (and any future reference source).

CREATE OR REPLACE FUNCTION public.find_opportunity_matches_v2(
  p_source_opportunity_id uuid,
  p_limit integer DEFAULT 10,
  p_minimum_score integer DEFAULT 50
)
RETURNS TABLE(
  matched_opportunity_id uuid,
  match_type text,
  total_score integer,
  score_breakdown jsonb,
  match_reasons jsonb,
  rules_version integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_source_sector_id uuid;
  v_source_type text;
  v_source_status text;
  v_source_city text;
  v_source_timing text;
  v_source_price numeric;
  v_source_attrs jsonb;
  v_source_has_items boolean;
  v_rules_version int := 1;
BEGIN
  -- ── Load source opportunity ──
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

  -- ── Check if source has items ──
  SELECT EXISTS(
    SELECT 1 FROM opportunity_items
    WHERE opportunity_id = p_source_opportunity_id AND is_active = true
  ) INTO v_source_has_items;

  IF NOT v_source_has_items THEN RETURN; END IF;

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
    AND EXISTS (
      SELECT 1 FROM opportunity_items src_oi
      JOIN opportunity_items cand_oi
      ON cand_oi.reference_source = src_oi.reference_source
      AND cand_oi.reference_id = src_oi.reference_id
      AND cand_oi.is_active = true
      WHERE src_oi.opportunity_id = p_source_opportunity_id
      AND src_oi.is_active = true
      AND src_oi.reference_source IN ('plant_catalog', 'palm_varieties')
      AND cand_oi.opportunity_id = o.id
    )
  ),
  item_pairs AS (
    SELECT
    c.id as candidate_id,
    src_oi.id as src_item_id,
    cand_oi.id as cand_item_id,
    src_oi.reference_id as plant_id,
    src_oi.plant_variety_id as src_variety_id,
    cand_oi.plant_variety_id as cand_variety_id,
    src_oi.reference_id as src_ref_id,
    cand_oi.reference_id as cand_ref_id,
    src_oi.reference_source as src_ref_source,
    cand_oi.reference_source as cand_ref_source,
    src_oi.quantity as src_qty,
    cand_oi.quantity as cand_qty,
    src_oi.unit as src_unit,
    cand_oi.unit as cand_unit,
    src_oi.age_value as src_age,
    cand_oi.age_value as cand_age,
    src_oi.height_value as src_height,
    cand_oi.height_value as cand_height,
    src_oi.container_size as src_container,
    cand_oi.container_size as cand_container,
    src_oi.root_status as src_root,
    cand_oi.root_status as cand_root,
    src_oi.readiness_status as src_readiness,
    cand_oi.readiness_status as cand_readiness
    FROM candidates c
    JOIN opportunity_items src_oi ON src_oi.opportunity_id = p_source_opportunity_id AND src_oi.is_active = true
    JOIN opportunity_items cand_oi ON cand_oi.opportunity_id = c.id AND cand_oi.is_active = true
    AND cand_oi.reference_source = src_oi.reference_source
    AND cand_oi.reference_id = src_oi.reference_id
    WHERE src_oi.reference_source IN ('plant_catalog', 'palm_varieties')
  ),
  best_pairs AS (
    SELECT DISTINCT ON (ip.candidate_id, ip.src_item_id)
    ip.candidate_id,
    ip.src_item_id,
    ip.cand_item_id,
    ip.plant_id,
    ip.src_variety_id,
    ip.cand_variety_id,
    ip.src_ref_id,
    ip.cand_ref_id,
    ip.src_ref_source,
    ip.cand_ref_source,
    ip.src_qty,
    ip.cand_qty,
    ip.src_unit,
    ip.cand_unit,
    ip.src_age, ip.cand_age,
    ip.src_height, ip.cand_height,
    ip.src_container, ip.cand_container,
    ip.src_root, ip.cand_root,
    ip.src_readiness, ip.cand_readiness,
    CASE
      WHEN ip.src_qty IS NULL OR ip.cand_qty IS NULL OR ip.src_qty = 0 THEN 0
      WHEN ip.src_unit IS NOT NULL AND ip.cand_unit IS NOT NULL AND ip.src_unit <> ip.cand_unit THEN 0
      WHEN ip.cand_qty >= ip.src_qty THEN 15
      WHEN ip.cand_qty >= ip.src_qty * 0.75 THEN 12
      WHEN ip.cand_qty >= ip.src_qty * 0.50 THEN 8
      WHEN ip.cand_qty >= ip.src_qty * 0.25 THEN 5
      ELSE 0
    END as pair_qty_score,
    (
      (CASE WHEN ip.src_age IS NOT NULL AND ip.cand_age IS NOT NULL AND ip.src_age = ip.cand_age THEN 3 ELSE 0 END) +
      (CASE WHEN ip.src_height IS NOT NULL AND ip.cand_height IS NOT NULL AND ip.src_height = ip.cand_height THEN 3 ELSE 0 END) +
      (CASE WHEN ip.src_container IS NOT NULL AND ip.cand_container IS NOT NULL AND ip.src_container = ip.cand_container THEN 2 ELSE 0 END) +
      (CASE WHEN ip.src_root IS NOT NULL AND ip.cand_root IS NOT NULL AND ip.src_root = ip.cand_root THEN 1 ELSE 0 END) +
      (CASE WHEN ip.src_readiness IS NOT NULL AND ip.cand_readiness IS NOT NULL AND ip.src_readiness = ip.cand_readiness THEN 1 ELSE 0 END)
    ) as pair_specs_score,
    CASE
      WHEN ip.src_variety_id IS NOT NULL AND ip.cand_variety_id IS NOT NULL AND ip.src_variety_id = ip.cand_variety_id THEN 10
      WHEN ip.src_variety_id IS NULL OR ip.cand_variety_id IS NULL THEN 7
      WHEN ip.src_variety_id IS NOT NULL AND ip.cand_variety_id IS NOT NULL AND ip.src_variety_id <> ip.cand_variety_id THEN 2
      ELSE 0
    END as pair_variety_score
    FROM item_pairs ip
    ORDER BY ip.candidate_id, ip.src_item_id, pair_qty_score DESC, pair_specs_score DESC
  ),
  candidate_scores AS (
    SELECT
    bp.candidate_id,
    35 as plant_score,
    MAX(bp.pair_variety_score) as variety_score,
    CASE WHEN COUNT(bp.src_item_id) > 0 THEN
      LEAST(15, SUM(bp.pair_qty_score)::int)
    ELSE 0 END as quantity_score,
    CASE WHEN COUNT(bp.src_item_id) > 0 THEN
      LEAST(10, (SUM(bp.pair_specs_score) / COUNT(bp.src_item_id))::int)
    ELSE 0 END as specs_score,
    COUNT(bp.src_item_id) as matched_items,
    (SELECT COUNT(*) FROM opportunity_items
     WHERE opportunity_id = p_source_opportunity_id AND is_active = true
     AND reference_source IN ('plant_catalog', 'palm_varieties')) as total_source_items
    FROM best_pairs bp
    GROUP BY bp.candidate_id
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
    cs.plant_score,
    cs.variety_score,
    cs.quantity_score,
    CASE
      WHEN c.city IS NOT NULL AND v_source_city IS NOT NULL AND c.city = v_source_city THEN 10
      WHEN c.city IS NOT NULL AND v_source_city IS NOT NULL AND c.city <> v_source_city
      AND ((v_source_attrs->>'includes_transport') = 'true' OR (c.attributes->>'includes_transport') = 'true') THEN 4
      ELSE 0
    END as location_score,
    CASE
      WHEN v_source_timing = 'flexible' OR c.opportunity_timing = 'flexible' THEN 5
      WHEN v_source_timing = c.opportunity_timing AND v_source_timing IS NOT NULL THEN 10
      WHEN v_source_timing IS NOT NULL AND c.opportunity_timing IS NOT NULL AND v_source_timing <> c.opportunity_timing THEN 0
      ELSE 3
    END as timing_score,
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
    cs.specs_score,
    cs.matched_items,
    cs.total_source_items
    FROM candidates c
    JOIN candidate_scores cs ON cs.candidate_id = c.id
  ),
  final_scored AS (
    SELECT
    s.id,
    s.match_type,
    s.plant_score, s.variety_score, s.quantity_score, s.location_score, s.timing_score, s.price_score, s.specs_score,
    CASE
      WHEN s.plant_score = 0 AND s.quantity_score = 0 AND s.specs_score = 0 THEN 0
      ELSE s.plant_score + s.variety_score + s.quantity_score + s.location_score + s.timing_score + s.price_score + s.specs_score
    END as total_score,
    s.matched_items, s.total_source_items
    FROM scored s
  )
  SELECT
  fs.id,
  fs.match_type,
  fs.total_score::int,
  jsonb_build_object(
    'plant', fs.plant_score, 'variety', fs.variety_score, 'quantity', fs.quantity_score,
    'location', fs.location_score, 'timing', fs.timing_score, 'price', fs.price_score, 'specs', fs.specs_score,
    'matched_items', fs.matched_items, 'total_source_items', fs.total_source_items
  ) as score_breakdown,
  (
    CASE WHEN fs.plant_score >= 35 THEN '["نفس النبات"]'::jsonb ELSE '[]'::jsonb END
    || CASE WHEN fs.matched_items > 0 AND fs.matched_items < fs.total_source_items
    THEN jsonb_build_array('يتطابق في ' || fs.matched_items || ' من ' || fs.total_source_items || ' نباتات')
    ELSE '[]'::jsonb END
    || CASE WHEN fs.variety_score >= 10 THEN '["نفس الصنف"]'::jsonb
    WHEN fs.variety_score >= 7 THEN '["يقبل جميع الأصناف"]'::jsonb
    ELSE '[]'::jsonb END
    || CASE WHEN fs.quantity_score >= 15 THEN '["الكمية المتاحة تغطي كامل الاحتياج"]'::jsonb
    WHEN fs.quantity_score >= 12 THEN '["الكمية تغطي معظم الاحتياج"]'::jsonb
    WHEN fs.quantity_score >= 8 THEN '["الكمية تغطي نصف الاحتياج"]'::jsonb
    ELSE '[]'::jsonb END
    || CASE WHEN fs.location_score >= 10 THEN '["نفس المدينة"]'::jsonb
    WHEN fs.location_score >= 4 THEN '["موقع مختلف مع إمكانية النقل"]'::jsonb
    ELSE '[]'::jsonb END
    || CASE WHEN fs.timing_score >= 10 THEN '["موعد التوفر مناسب"]'::jsonb
    WHEN fs.timing_score >= 5 THEN '["موعد مرن"]'::jsonb
    ELSE '[]'::jsonb END
    || CASE WHEN fs.price_score >= 10 THEN '["السعر داخل النطاق المطلوب"]'::jsonb
    WHEN fs.price_score >= 5 THEN '["السعر قريب من النطاق"]'::jsonb
    ELSE '[]'::jsonb END
    || CASE WHEN fs.specs_score >= 6 THEN '["المواصفات متطابقة"]'::jsonb
    WHEN fs.specs_score >= 3 THEN '["مواصفات مشتركة جزئيًا"]'::jsonb
    ELSE '[]'::jsonb END
  ) as match_reasons,
  v_rules_version
  FROM final_scored fs
  WHERE fs.total_score >= p_minimum_score
  ORDER BY fs.total_score DESC
  LIMIT p_limit;
END;
$function$;
