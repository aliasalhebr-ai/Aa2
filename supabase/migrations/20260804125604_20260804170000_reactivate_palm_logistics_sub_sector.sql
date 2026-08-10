-- Reactivate the palm-logistics sub_sector and its logistics_request operation.
-- The sub_sector was hidden in a prior migration because the operation was inactive;
-- now we restore both so the Logistics gateway is visible again in the Palm sector.

UPDATE sub_sectors
SET is_active = true,
    allowed_operations = (
      SELECT jsonb_agg(
        CASE WHEN elem->>'id' = 'logistics_request'
             THEN jsonb_set(elem, '{is_active}', 'true'::jsonb)
             ELSE elem
        END
      )
      FROM jsonb_array_elements(allowed_operations) AS elem
    )
WHERE slug = 'palm-logistics';
