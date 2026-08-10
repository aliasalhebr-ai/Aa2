/*
# Migrate legacy nursery opportunities to V2

1. Purpose
   - Two legacy opportunities in the nursery sector use `type = 'sell'` and `type = 'buy'`
     with `operation_type = NULL` and `opportunity_type = NULL`.
   - This migration converts them to V2 by setting:
     - sell → opportunity_type = 'offer', operation_type = 'offer', template_version = 2
     - buy  → opportunity_type = 'demand', operation_type = 'demand', template_version = 2
   - `opportunity_timing` is set to 'flexible' since the original records do not
     contain timing information. This is the safest neutral default.
   - The `type` column is NOT removed or changed — it remains for reference.

2. Records Before Migration
   - ID 53501f10: type='sell', title='للبيع شتلات زينة متنوعة'
   - ID 81d7dff4: type='buy',  title='مطلوب شتلات فاكهة متنوعة'

3. Records After Migration
   - ID 53501f10: opportunity_type='offer',   operation_type='offer',   template_version=2, opportunity_timing='flexible'
   - ID 81d7dff4: opportunity_type='demand',  operation_type='demand',  template_version=2, opportunity_timing='flexible'

4. Rollback
   - To reverse: UPDATE opportunities SET opportunity_type=NULL, operation_type=NULL,
     template_version=1, opportunity_timing=NULL WHERE id IN (these two IDs).
   - The `type` column is unchanged, so the original state is fully recoverable.
*/

-- Convert sell → offer
UPDATE opportunities
  SET opportunity_type = 'offer',
      operation_type = 'offer',
      template_version = 2,
      opportunity_timing = 'flexible'
  WHERE id = '53501f10-4daf-45b8-882a-33461d875c63'
    AND sector_id = '73e613d6-e10e-4b1d-aef1-b0f591df9d03'
    AND type = 'sell';

-- Convert buy → demand
UPDATE opportunities
  SET opportunity_type = 'demand',
      operation_type = 'demand',
      template_version = 2,
      opportunity_timing = 'flexible'
  WHERE id = '81d7dff4-9228-4586-b74a-41244d699b37'
    AND sector_id = '73e613d6-e10e-4b1d-aef1-b0f591df9d03'
    AND type = 'buy';
