
-- Upgrade palm-fruits opportunities from V1 to V2
-- Uses reference_source='palm_varieties' + reference_id (NOT plant_variety_id)
-- Preserves all original attributes JSONB for rollback safety.

DO $$
DECLARE
  opp RECORD;
  v_item_count integer := 0;
  v_reference_source text := 'palm_varieties';
BEGIN
  FOR opp IN
    SELECT id, title, type, attributes, price, city
    FROM opportunities
    WHERE sub_sector_id = '6e8f864f-db3a-46d5-a524-4c5bcce7136e'
      AND status = 'active'
      AND template_version = 1
  LOOP
    DECLARE
      v_op_type text;
      v_attrs jsonb;
      v_varieties jsonb;
      v_idx integer := 0;
    BEGIN
      v_attrs := COALESCE(opp.attributes, '{}'::jsonb);
      v_op_type := CASE WHEN opp.type = 'buy' THEN 'demand' ELSE 'offer' END;

      UPDATE opportunities
      SET opportunity_type = v_op_type,
          template_version = 2
      WHERE id = opp.id;

      v_varieties := v_attrs->'varieties';

      IF jsonb_typeof(v_varieties) = 'array' AND jsonb_array_length(v_varieties) > 0 THEN
        -- ── Pattern A: varieties array (multi-variety offers) ──
        FOR v_idx IN SELECT generate_series(0, jsonb_array_length(v_varieties) - 1) LOOP
          DECLARE
            v_obj jsonb := v_varieties->v_idx;
            v_variety_slug text := v_obj->>'variety_id';
            v_palm_variety_id uuid;
            v_variety_name text;
            v_qty text := v_obj->>'expected_production';
            v_unit text := COALESCE(v_obj->>'production_unit', 'ton');
          BEGIN
            SELECT id, name INTO v_palm_variety_id, v_variety_name
            FROM palm_varieties WHERE slug = v_variety_slug AND is_active = true LIMIT 1;

            IF v_palm_variety_id IS NULL THEN
              v_variety_name := v_variety_slug;
            END IF;

            INSERT INTO opportunity_items (
              opportunity_id, item_type, reference_source, reference_id,
              name_snapshot, variety_name_snapshot,
              quantity, unit, unit_price, pricing_type,
              attributes, display_order, is_active
            )
            VALUES (
              opp.id, 'plant', v_reference_source, v_palm_variety_id,
              COALESCE(v_variety_name, v_variety_slug),
              COALESCE(v_variety_name, v_variety_slug),
              CASE WHEN v_qty IS NOT NULL AND v_qty != '' THEN v_qty::numeric ELSE NULL END,
              v_unit,
              CASE WHEN v_attrs->>'price_kilo' IS NOT NULL AND v_attrs->>'price_kilo' != ''
                   THEN (v_attrs->>'price_kilo')::numeric ELSE NULL END,
              CASE WHEN v_attrs->>'price_or_quote' IS NOT NULL THEN v_attrs->>'price_or_quote' ELSE NULL END,
              jsonb_build_object(
                'palm_count', v_obj->'palm_count',
                'harvest_date', v_obj->'harvest_date',
                'readiness_status', v_obj->'readiness_status',
                'quality_grade', v_obj->'quality_grade',
                'age_years', v_obj->'age_years',
                'irrigation_source', v_obj->'irrigation_source',
                'description', v_obj->'description',
                'images', v_obj->'images',
                'sale_model', v_attrs->'sale_model',
                'season', v_attrs->'season'
              ),
              v_idx, true
            );
          END;
        END LOOP;

      ELSIF v_op_type = 'offer' AND v_attrs->>'variety_kilo' IS NOT NULL THEN
        -- ── Pattern B: flat variety_kilo + quantity_available (offer) ──
        DECLARE
          v_variety_slug text := v_attrs->>'variety_kilo';
          v_palm_variety_id uuid;
          v_variety_name text;
          v_qty text := v_attrs->>'quantity_available';
          v_unit text := COALESCE(v_attrs->>'unit_of_measure', 'ton');
          v_price_kilo text := v_attrs->>'price_kilo';
        BEGIN
          SELECT id, name INTO v_palm_variety_id, v_variety_name
          FROM palm_varieties WHERE slug = v_variety_slug AND is_active = true LIMIT 1;

          IF v_palm_variety_id IS NULL THEN v_variety_name := v_variety_slug; END IF;

          INSERT INTO opportunity_items (
            opportunity_id, item_type, reference_source, reference_id,
            name_snapshot, variety_name_snapshot,
            quantity, unit, unit_price, pricing_type,
            attributes, display_order, is_active
          )
          VALUES (
            opp.id, 'plant', v_reference_source, v_palm_variety_id,
            COALESCE(v_variety_name, v_variety_slug),
            COALESCE(v_variety_name, v_variety_slug),
            CASE WHEN v_qty IS NOT NULL AND v_qty != '' THEN v_qty::numeric ELSE NULL END,
            v_unit,
            CASE WHEN v_price_kilo IS NOT NULL AND v_price_kilo != '' THEN v_price_kilo::numeric ELSE NULL END,
            CASE WHEN v_attrs->>'price_or_quote' IS NOT NULL THEN v_attrs->>'price_or_quote' ELSE NULL END,
            jsonb_build_object(
              'fruit_condition', v_attrs->'fruit_condition',
              'sale_model', v_attrs->'sale_model'
            ),
            0, true
          );
        END;

      ELSIF v_op_type = 'demand' AND v_attrs->>'variety' IS NOT NULL THEN
        -- ── Pattern C: flat variety + quantity_needed (demand) ──
        DECLARE
          v_variety_slug text := v_attrs->>'variety';
          v_palm_variety_id uuid;
          v_variety_name text;
          v_qty text := v_attrs->>'quantity_needed';
          v_unit text := COALESCE(v_attrs->>'unit_of_measure', 'ton');
        BEGIN
          SELECT id, name INTO v_palm_variety_id, v_variety_name
          FROM palm_varieties WHERE slug = v_variety_slug AND is_active = true LIMIT 1;

          IF v_palm_variety_id IS NULL THEN v_variety_name := v_variety_slug; END IF;

          INSERT INTO opportunity_items (
            opportunity_id, item_type, reference_source, reference_id,
            name_snapshot, variety_name_snapshot,
            quantity, unit, unit_price, pricing_type,
            attributes, display_order, is_active
          )
          VALUES (
            opp.id, 'plant', v_reference_source, v_palm_variety_id,
            COALESCE(v_variety_name, v_variety_slug),
            COALESCE(v_variety_name, v_variety_slug),
            CASE WHEN v_qty IS NOT NULL AND v_qty != '' THEN v_qty::numeric ELSE NULL END,
            v_unit, NULL,
            CASE WHEN v_attrs->>'price_or_quote' IS NOT NULL THEN v_attrs->>'price_or_quote' ELSE NULL END,
            jsonb_build_object(
              'fruit_condition', v_attrs->'fruit_condition',
              'location', v_attrs->'location'
            ),
            0, true
          );
        END;
      END IF;

      v_item_count := v_item_count + 1;
    END;
  END LOOP;

  RAISE NOTICE 'Upgraded % palm-fruits opportunities to V2', v_item_count;
END $$;
