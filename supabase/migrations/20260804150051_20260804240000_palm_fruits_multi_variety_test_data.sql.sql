/*
# Add multi-variety test data for palm-fruits

## Summary
Update existing palm-fruits test records to use the new structured `varieties` array.
Each variety entry contains: variety_id, variety_name, palm_count, expected_production,
production_unit, harvest_date, readiness_status, images.

Also insert new test records covering:
1. Farm with single variety (full_harvest)
2. Farm with multiple varieties (full_harvest)
3. Different palm count per variety
4. Weight sale single variety
5. Weight sale multiple varieties
6. More than 4 varieties

## Changes
- Update record 1 (كامل محصول مزرعة سكري) to use varieties array with 1 variety
- Update record 2 (تمر سكري بالكيلو) to use varieties array with 1 variety
- Insert new records for multi-variety scenarios
*/

-- Update existing record 1: single variety full_harvest
UPDATE opportunities SET
  attributes = jsonb_build_object(
    'sale_model', 'full_harvest',
    'season', 'موسم 2026',
    'varieties', jsonb_build_array(
      jsonb_build_object(
        'variety_id', 'sukari',
        'variety_name', 'سكري',
        'palm_count', '800',
        'expected_production', '60',
        'production_unit', 'ton',
        'harvest_date', 'أغسطس 2026',
        'readiness_status', null,
        'images', '[]'::jsonb
      )
    )
  )
WHERE title = 'كامل محصول مزرعة سكري - موسم 2026';

-- Update existing record 2: single variety by_kilo
UPDATE opportunities SET
  attributes = jsonb_build_object(
    'sale_model', 'by_kilo',
    'price_or_quote', 'price',
    'price_kilo', '25',
    'varieties', jsonb_build_array(
      jsonb_build_object(
        'variety_id', 'sukari',
        'variety_name', 'سكري',
        'palm_count', null,
        'expected_production', '20',
        'production_unit', 'ton',
        'harvest_date', null,
        'readiness_status', null,
        'images', '[]'::jsonb
      )
    )
  )
WHERE title = 'تمر سكري فاخر - 20 طن';

-- Insert new test records
DO $$
DECLARE
  v_palm_sector_id uuid;
  v_fruits_id uuid;
BEGIN
  SELECT id INTO v_palm_sector_id FROM sectors WHERE slug = 'palm';
  SELECT id INTO v_fruits_id FROM sub_sectors WHERE slug = 'palm-fruits' AND sector_id = v_palm_sector_id;

  -- 2. Farm with multiple varieties (full_harvest)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'مزرعة متعددة الأصناف - 4 أصناف للبيع كامل',
    'بيع كامل محصول مزرعة تحتوي على 4 أصناف من النخيل',
    v_palm_sector_id, v_fruits_id, 'offer', 'opportunity',
    '1,200 نخلة', 'بالتفاوض', 'القصيم',
    jsonb_build_object(
      'sale_model', 'full_harvest',
      'season', 'موسم 2026',
      'varieties', jsonb_build_array(
        jsonb_build_object('variety_id', 'sukari', 'variety_name', 'سكري', 'palm_count', '500', 'expected_production', '40', 'production_unit', 'ton', 'harvest_date', 'أغسطس 2026', 'images', '[]'::jsonb),
        jsonb_build_object('variety_id', 'khalas', 'variety_name', 'خلاص', 'palm_count', '300', 'expected_production', '22', 'production_unit', 'ton', 'harvest_date', 'سبتمبر 2026', 'images', '[]'::jsonb),
        jsonb_build_object('variety_id', 'barhi', 'variety_name', 'برحي', 'palm_count', '250', 'expected_production', '18', 'production_unit', 'ton', 'harvest_date', 'أكتوبر 2026', 'images', '[]'::jsonb),
        jsonb_build_object('variety_id', 'majdoul', 'variety_name', 'مجدول', 'palm_count', '150', 'expected_production', '12', 'production_unit', 'ton', 'harvest_date', 'نوفمبر 2026', 'images', '[]'::jsonb)
      )
    ),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '21 hours'
  );

  -- 3. Weight sale multiple varieties
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'تمور متنوعة بالوزن - سكري وخلاص',
    'بيع بالوزن لصنفين من التمور الفاخرة',
    v_palm_sector_id, v_fruits_id, 'offer', 'opportunity',
    '20 طن', 'بالتفاوض', 'الاحساء',
    jsonb_build_object(
      'sale_model', 'by_kilo',
      'price_or_quote', 'quote',
      'varieties', jsonb_build_array(
        jsonb_build_object('variety_id', 'sukari', 'variety_name', 'سكري', 'palm_count', null, 'expected_production', '12', 'production_unit', 'ton', 'harvest_date', null, 'images', '[]'::jsonb),
        jsonb_build_object('variety_id', 'khalas', 'variety_name', 'خلاص', 'palm_count', null, 'expected_production', '8', 'production_unit', 'ton', 'harvest_date', null, 'images', '[]'::jsonb)
      )
    ),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '22 hours'
  );

  -- 4. More than 4 varieties (5 varieties)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'مزرعة كبيرة - 5 أصناف للبيع كامل',
    'بيع كامل محصول مزرعة كبيرة تحتوي على 5 أصناف',
    v_palm_sector_id, v_fruits_id, 'offer', 'opportunity',
    '2,000 نخلة', 'بالتفاوض', 'الرياض',
    jsonb_build_object(
      'sale_model', 'full_harvest',
      'season', 'موسم 2026',
      'varieties', jsonb_build_array(
        jsonb_build_object('variety_id', 'sukari', 'variety_name', 'سكري', 'palm_count', '600', 'expected_production', '45', 'production_unit', 'ton', 'harvest_date', 'أغسطس 2026', 'images', '[]'::jsonb),
        jsonb_build_object('variety_id', 'khalas', 'variety_name', 'خلاص', 'palm_count', '400', 'expected_production', '30', 'production_unit', 'ton', 'harvest_date', 'سبتمبر 2026', 'images', '[]'::jsonb),
        jsonb_build_object('variety_id', 'barhi', 'variety_name', 'برحي', 'palm_count', '350', 'expected_production', '25', 'production_unit', 'ton', 'harvest_date', 'أكتوبر 2026', 'images', '[]'::jsonb),
        jsonb_build_object('variety_id', 'majdoul', 'variety_name', 'مجدول', 'palm_count', '350', 'expected_production', '20', 'production_unit', 'ton', 'harvest_date', 'نوفمبر 2026', 'images', '[]'::jsonb),
        jsonb_build_object('variety_id', 'khidri', 'variety_name', 'خضري', 'palm_count', '300', 'expected_production', '18', 'production_unit', 'ton', 'harvest_date', 'ديسمبر 2026', 'images', '[]'::jsonb)
      )
    ),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '23 hours'
  );

  -- 5. Weight sale single variety with price
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'تمر برحي فاخر - 8 طن بسعر محدد',
    'تمور برحي درجة أولى، 8 أطنان، سعر محدد',
    v_palm_sector_id, v_fruits_id, 'offer', 'opportunity',
    '8 طن', '45,000 ريال', 'المدينة المنورة',
    jsonb_build_object(
      'sale_model', 'by_kilo',
      'price_or_quote', 'price',
      'price_kilo', '18',
      'varieties', jsonb_build_array(
        jsonb_build_object('variety_id', 'barhi', 'variety_name', 'برحي', 'palm_count', null, 'expected_production', '8', 'production_unit', 'ton', 'harvest_date', null, 'images', '[]'::jsonb)
      )
    ),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '24 hours'
  );
END $$;
