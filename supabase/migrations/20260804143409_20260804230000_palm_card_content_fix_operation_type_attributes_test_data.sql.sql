/*
# Fix palm card content: operation_type, is_card_visible, test data

## Summary
1. Fix the 3 existing records: set operation_type and populate attributes from top-level fields.
2. Update is_card_visible flags on specialty_field_definitions to match the card content requirements.
3. Insert 20 test opportunities covering all required scenarios across all 7 palm specialties.

## Details

### 1. Fix existing records
- Record acfa2e33 (ثمار النخيل / demand): set operation_type='demand', attributes populated.
- Record 3c8a5471 (فسائل النخيل / offer): set operation_type='offer', attributes populated.
- Record d371d08d (خدمات النخيل / service_request): set operation_type='service_request', attributes populated.

### 2. is_card_visible updates
- Set is_card_visible=false for meta/structural fields (title, description, contact_info, images, location, etc.).
- Set is_card_visible=true for key indicator fields per specialty and operation_type.

### 3. Test data
Insert 20 opportunities with proper operation_type, type, attributes, and images covering all scenarios.
The `type` column is NOT NULL — we set it to 'opportunity' for all test records.
*/

-- ============================================================
-- 1. Fix existing records
-- ============================================================

UPDATE opportunities SET
  operation_type = 'demand',
  attributes = jsonb_build_object(
    'variety', 'sukari',
    'quantity_needed', '80',
    'unit_of_measure', 'ton',
    'location', 'القصيم'
  )
WHERE id = 'acfa2e33-c389-43dc-97ed-f5e51c8e5329';

UPDATE opportunities SET
  operation_type = 'offer',
  attributes = jsonb_build_object(
    'variety', 'barhi',
    'count', '500',
    'min_weight', '12',
    'max_weight', '18',
    'rooting_status', 'متجذر',
    'price_or_quote', 'price',
    'price', '150'
  )
WHERE id = '3c8a5471-1479-4f3b-86f8-1f0e908b134a';

UPDATE opportunities SET
  operation_type = 'service_request',
  attributes = jsonb_build_object(
    'service_branches', '["pollination"]'::jsonb,
    'location', 'القصيم'
  )
WHERE id = 'd371d08d-278c-4f3e-a470-45c8dab771a7';

-- ============================================================
-- 2. Update is_card_visible flags
-- ============================================================

-- Fields that should NEVER appear on cards (meta/structural fields)
UPDATE specialty_field_definitions SET is_card_visible = false
WHERE field_key IN (
  'title', 'description', 'contact_info', 'images', 'video',
  'images_kilo', 'description_kilo', 'logistics_available',
  'min_order', 'auction_available', 'location', 'farm_location',
  'location_kilo', 'project_specs', 'prep_duration', 'planting_capability',
  'material_condition', 'loading_readiness', 'supply_included',
  'installation_available', 'warranty', 'brand', 'supply_type',
  'seasonality', 'min_work', 'expected_duration', 'contract_invoice',
  'equipment_available', 'labor_available', 'project_capacity',
  'execution_date', 'offer_deadline', 'requesting_entity',
  'uniformity_grade', 'root_condition', 'age',
  'seedling_condition', 'palm_condition', 'uprooting_readiness',
  'full_sale', 'availability_date', 'harvest_start', 'harvest_end',
  'expected_yield', 'farm_area', 'trunk_diameter',
  'manual_quantity_desc', 'count_unit', 'weight_unit',
  'usage_range', 'farm_size_coverage', 'provider_name',
  'unit_of_measure', 'quantity_needed', 'quantity'
)
AND specialty_id IN (
  SELECT id FROM sub_sectors WHERE sector_id = (SELECT id FROM sectors WHERE slug = 'palm')
);

-- Now set is_card_visible = true for the KEY indicator fields per specialty
-- Palm Fruits (offer): sale_model, tree_count, season, variety_kilo, fruit_condition, quantity_available, price_or_quote, price_kilo
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = '6e8f864f-db3a-46d5-a524-4c5bcce7136e'
AND field_key IN ('sale_model', 'tree_count', 'season', 'variety_kilo', 'fruit_condition', 'quantity_available', 'price_or_quote', 'price_kilo', 'variety');

-- Palm Fruits (demand): variety, quantity_needed, unit_of_measure
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = '6e8f864f-db3a-46d5-a524-4c5bcce7136e'
AND operation_type_id = 'demand'
AND field_key IN ('variety', 'quantity_needed', 'unit_of_measure');

-- Transplanted Palms (offer): variety, count, trunk_height, total_height, price_or_quote, price
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5'
AND field_key IN ('variety', 'count', 'trunk_height', 'total_height', 'price_or_quote', 'price');

-- Transplanted Palms (demand): variety, count, min_trunk_height, max_trunk_height
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5'
AND operation_type_id = 'demand'
AND field_key IN ('variety', 'count', 'min_trunk_height', 'max_trunk_height');

-- Palm Seedlings (offer): variety, count, min_weight, max_weight, rooting_status, price_or_quote, price
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = 'c98aeb45-ac09-413a-8e34-b5b3d75985fe'
AND field_key IN ('variety', 'count', 'min_weight', 'max_weight', 'rooting_status', 'price_or_quote', 'price');

-- Palm Seedlings (demand): variety, count, min_weight, max_weight
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = 'c98aeb45-ac09-413a-8e34-b5b3d75985fe'
AND operation_type_id = 'demand'
AND field_key IN ('variety', 'count', 'min_weight', 'max_weight');

-- Palm Projects (offer): variety, tree_count, trunk_height, height_range, kerb_status, takreb_type, price_or_quote, price
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = 'bccaaa64-539d-42fd-9abb-614acc24c7b8'
AND field_key IN ('variety', 'tree_count', 'trunk_height', 'height_range', 'kerb_status', 'takreb_type', 'price_or_quote', 'price');

-- Palm Projects (demand): variety, tree_count, min_trunk_height, kerb_status, takreb_type
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = 'bccaaa64-539d-42fd-9abb-614acc24c7b8'
AND operation_type_id = 'demand'
AND field_key IN ('variety', 'tree_count', 'min_trunk_height', 'kerb_status', 'takreb_type');

-- Palm Residues (offer): residue_type, quantity_method, weight_value, count_value, manual_quantity_desc, price_or_quote, price
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = '7f56b186-0755-42c0-a4a1-113e5717dde7'
AND field_key IN ('residue_type', 'quantity_method', 'weight_value', 'count_value', 'price_or_quote', 'price');

-- Palm Residues (demand): residue_type, quantity_needed
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = '7f56b186-0755-42c0-a4a1-113e5717dde7'
AND operation_type_id = 'demand'
AND field_key IN ('residue_type', 'quantity_needed');

-- Palm Supplies (offer): supply_category, condition, quantity, unit_of_measure, price_or_quote, price
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = 'ed5125f3-0be3-4831-baf3-441b9c17e0a1'
AND field_key IN ('supply_category', 'condition', 'price_or_quote', 'price');

-- Palm Supplies (demand): supply_category
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = 'ed5125f3-0be3-4831-baf3-441b9c17e0a1'
AND operation_type_id = 'demand'
AND field_key IN ('supply_category');

-- Palm Services (service_offer): service_branches, service_items, provider_type, coverage_areas, transport_available
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = '4c235525-d768-425e-b623-0e90e8403c0d'
AND field_key IN ('service_branches', 'service_items', 'provider_type', 'coverage_areas', 'transport_available');

-- Palm Services (service_request): service_branches, service_items
UPDATE specialty_field_definitions SET is_card_visible = true
WHERE specialty_id = '4c235525-d768-425e-b623-0e90e8403c0d'
AND operation_type_id = 'service_request'
AND field_key IN ('service_branches', 'service_items');

-- ============================================================
-- 3. Insert test data — 20 scenarios
-- ============================================================

DO $$
DECLARE
  v_palm_sector_id uuid;
  v_fruits_id uuid;
  v_transplanted_id uuid;
  v_seedlings_id uuid;
  v_projects_id uuid;
  v_residues_id uuid;
  v_supplies_id uuid;
  v_services_id uuid;
BEGIN
  SELECT id INTO v_palm_sector_id FROM sectors WHERE slug = 'palm';
  SELECT id INTO v_fruits_id FROM sub_sectors WHERE slug = 'palm-fruits' AND sector_id = v_palm_sector_id;
  SELECT id INTO v_transplanted_id FROM sub_sectors WHERE slug = 'transplanted-palms' AND sector_id = v_palm_sector_id;
  SELECT id INTO v_seedlings_id FROM sub_sectors WHERE slug = 'palm-seedlings' AND sector_id = v_palm_sector_id;
  SELECT id INTO v_projects_id FROM sub_sectors WHERE slug = 'palm-projects' AND sector_id = v_palm_sector_id;
  SELECT id INTO v_residues_id FROM sub_sectors WHERE slug = 'palm-residues' AND sector_id = v_palm_sector_id;
  SELECT id INTO v_supplies_id FROM sub_sectors WHERE slug = 'palm-supplies' AND sector_id = v_palm_sector_id;
  SELECT id INTO v_services_id FROM sub_sectors WHERE slug = 'palm-services' AND sector_id = v_palm_sector_id;

  -- 1. كامل محصول مزرعة (fruits offer, full_harvest)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'كامل محصول مزرعة سكري - موسم 2026',
    'بيع كامل محصول مزرعة نخيل سكري، 800 نخلة منتجة، موسم 2026',
    v_palm_sector_id, v_fruits_id, 'offer', 'opportunity',
    '800 نخلة', 'بالتفاوض', 'القصيم',
    jsonb_build_object('sale_model', 'full_harvest', 'tree_count', '800', 'season', 'موسم 2026', 'varieties', '["sukari"]'::jsonb),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '1 hour'
  );

  -- 2. ثمار بالكيلو (fruits offer, by_kilo)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'تمر سكري فاخر - 20 طن',
    'تمور سكري درجة أولى، متوفرة بكميات كبيرة، طازجة',
    v_palm_sector_id, v_fruits_id, 'offer', 'opportunity',
    '20 طن', '25 ريال/كجم', 'الاحساء',
    jsonb_build_object('sale_model', 'by_kilo', 'variety_kilo', 'sukari', 'fruit_condition', 'تمر', 'quantity_available', '20', 'unit_of_measure', 'ton', 'price_or_quote', 'price', 'price_kilo', '25'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '2 hours'
  );

  -- 3. عرض نقايل (transplanted offer)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'للبيع 120 نخلة سكري - ارتفاع 3-4 م',
    'نخيل سكري جاهز للقلع، ارتفاع الجذع 3-4 متر، حالة ممتازة',
    v_palm_sector_id, v_transplanted_id, 'offer', 'opportunity',
    '120 نخلة', 'بالتفاوض', 'القصيم',
    jsonb_build_object('variety', 'sukari', 'count', '120', 'trunk_height', '4', 'total_height', '6', 'palm_condition', 'ممتازة', 'uprooting_readiness', 'جاهز', 'price_or_quote', 'quote'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/28445714/pexels-photo-28445714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '3 hours'
  );

  -- 4. طلب نقايل (transplanted demand)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'مطلوب 50 نخلة برحي - ارتفاع 2-3 م',
    'نبحث عن 50 نخلة برحي بارتفاع لا يقل عن 2 متر',
    v_palm_sector_id, v_transplanted_id, 'demand', 'opportunity',
    '50 نخلة', 'بالتفاوض', 'الرياض',
    jsonb_build_object('variety', 'barhi', 'count', '50', 'min_trunk_height', '2', 'max_trunk_height', '3'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/28445714/pexels-photo-28445714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '4 hours'
  );

  -- 5. عرض فسائل (seedlings offer)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'فسائل برحي متجذرة - 300 فسيلة',
    'فسائل نخيل برحي متجذرة، وزن 12-18 كجم، عمر 3 سنوات',
    v_palm_sector_id, v_seedlings_id, 'offer', 'opportunity',
    '300 فسيلة', '150 ريال/فسيلة', 'المدينة المنورة',
    jsonb_build_object('variety', 'barhi', 'count', '300', 'min_weight', '12', 'max_weight', '18', 'rooting_status', 'متجذر', 'age', '3', 'price_or_quote', 'price', 'price', '150'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/28445714/pexels-photo-28445714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '5 hours'
  );

  -- 6. مشروع نخيل (palm projects offer)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'توريد وغرس 1,200 نخلة سكري',
    'مشروع توريد وغرس 1,200 نخلة سكري بارتفاع 4-5 متر، كرب سليم، تكريب هلالي',
    v_palm_sector_id, v_projects_id, 'offer', 'opportunity',
    '1,200 نخلة', 'بالتفاوض', 'الرياض',
    jsonb_build_object('variety', 'sukari', 'tree_count', '1200', 'trunk_height', '4', 'height_range', '4-5 م', 'kerb_status', 'سليم', 'takreb_type', 'هلالي', 'price_or_quote', 'quote'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/28445714/pexels-photo-28445714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '6 hours'
  );

  -- 7. مخلفات بالوزن (residues offer, weight)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'سعف جاف للبيع - 5 أطنان',
    'سعف نخيل جاف للبيع بالوزن، مناسب للأعلاف والصناعات',
    v_palm_sector_id, v_residues_id, 'offer', 'opportunity',
    '5 طن', 'بالتفاوض', 'القصيم',
    jsonb_build_object('residue_type', 'fronds', 'quantity_method', 'weight', 'weight_value', '5', 'weight_unit', 'ton', 'price_or_quote', 'quote'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '7 hours'
  );

  -- 8. مخلفات بالعدد (residues offer, count)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'جريد نخيل للبيع - 500 قطعة',
    'جريد نخيل للبيع بالعدد، 500 قطعة جاهزة للتحميل',
    v_palm_sector_id, v_residues_id, 'offer', 'opportunity',
    '500 قطعة', 'بالتفاوض', 'الاحساء',
    jsonb_build_object('residue_type', 'frond_strips', 'quantity_method', 'count', 'count_value', '500', 'count_unit', 'piece', 'price_or_quote', 'quote'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '8 hours'
  );

  -- 9. مخلفات بوصف يدوي (residues offer, manual_desc)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'مخلفات مختلطة للبيع - كمية تقديرية',
    'مخلفات نخيل مختلطة (سعف + جريد + كرب)، الكمية حسب الطلب',
    v_palm_sector_id, v_residues_id, 'offer', 'opportunity',
    'حسب الطلب', 'بالتفاوض', 'نجران',
    jsonb_build_object('residue_type', 'mixed', 'quantity_method', 'manual_desc', 'manual_quantity_desc', 'كمية تقديرية حسب الطلب'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '9 hours'
  );

  -- 10. مستلزمات جديدة (supplies offer, new)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'أنظمة ري ذكية للنخيل - جديدة',
    'أنظمة ري حديثة تخدم حتى 1,000 نخلة، مع تركيب وضمان',
    v_palm_sector_id, v_supplies_id, 'offer', 'opportunity',
    '5 وحدات', '12,000 ريال', 'الرياض',
    jsonb_build_object('supply_category', 'irrigation_systems', 'condition', 'new', 'quantity', '5', 'unit_of_measure', 'unit', 'price_or_quote', 'price', 'price', '12000', 'farm_size_coverage', 'يخدم 1,000 نخلة'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '10 hours'
  );

  -- 11. مستلزمات مستعملة (supplies offer, used)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'معدات حصاد مستعملة - حالة جيدة',
    'معدات حصاد وتجفيف تمور مستعملة بحالة جيدة',
    v_palm_sector_id, v_supplies_id, 'offer', 'opportunity',
    '3 وحدات', 'بالتفاوض', 'القصيم',
    jsonb_build_object('supply_category', 'harvest_equipment', 'condition', 'used', 'quantity', '3', 'unit_of_measure', 'unit', 'price_or_quote', 'quote'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '11 hours'
  );

  -- 12. عرض خدمة واحدة (services service_offer, single branch)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'خدمة تلقيح النخيل - القصيم',
    'خدمة تلقيح احترافية للنخيل في منطقة القصيم',
    v_palm_sector_id, v_services_id, 'service_offer', 'opportunity',
    '200 شجرة', 'بالتفاوض', 'القصيم',
    jsonb_build_object('service_branches', '["pollination"]'::jsonb, 'service_items', '["pollination_service","pollination_supply"]'::jsonb, 'provider_type', 'company', 'coverage_areas', '["القصيم"]'::jsonb, 'transport_available', true),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/28445714/pexels-photo-28445714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '12 hours'
  );

  -- 13. حزمة خدمات متعددة (services service_offer, multiple branches)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'مقاول نخيل شامل - تكريب وتقليم وقلع وغرس',
    'خدمات شاملة للنخيل: تكريب، تقليم، قلع وغرس، وقاية وعلاج',
    v_palm_sector_id, v_services_id, 'service_offer', 'opportunity',
    'حسب الطلب', 'بالتفاوض', 'الرياض',
    jsonb_build_object('service_branches', '["pruning","uprooting_planting","protection","pollination"]'::jsonb, 'service_items', '["takreb","pruning","uprooting","planting","weevil_control","pollination_service"]'::jsonb, 'provider_type', 'company', 'coverage_areas', '["الرياض","القصيم"]'::jsonb, 'transport_available', true),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/28445714/pexels-photo-28445714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '13 hours'
  );

  -- 14. طلب خدمة (services service_request)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'طلب خدمة تقليم وتكريب 300 نخلة',
    'نبحث عن مقاول لتقليم وتكريب 300 نخلة في مزرعتنا',
    v_palm_sector_id, v_services_id, 'service_request', 'opportunity',
    '300 نخلة', 'بالتفاوض', 'المدينة المنورة',
    jsonb_build_object('service_branches', '["pruning"]'::jsonb, 'service_items', '["takreb","pruning","frond_removal"]'::jsonb),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/28445714/pexels-photo-28445714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '14 hours'
  );

  -- 15. سجل بسعر (fruits offer with price)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'تمر خلاص فاخر - 10 طن بسعر محدد',
    'تمور خلاص درجة أولى، 10 أطنان، سعر محدد',
    v_palm_sector_id, v_fruits_id, 'offer', 'opportunity',
    '10 طن', '50,000 ريال', 'الاحساء',
    jsonb_build_object('sale_model', 'by_kilo', 'variety_kilo', 'khalas', 'fruit_condition', 'تمر', 'quantity_available', '10', 'unit_of_measure', 'ton', 'price_or_quote', 'price', 'price_kilo', '20'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '15 hours'
  );

  -- 16. سجل بطلب عرض سعر (fruits offer, quote)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'تمر مجدول - طلب عروض الأسعار',
    'تمور مجدول فاخر، نطلب عروض أسعار من المهتمين',
    v_palm_sector_id, v_fruits_id, 'offer', 'opportunity',
    '15 طن', 'بالتفاوض', 'نجران',
    jsonb_build_object('sale_model', 'by_kilo', 'variety_kilo', 'majdoul', 'fruit_condition', 'تمر', 'quantity_available', '15', 'unit_of_measure', 'ton', 'price_or_quote', 'quote'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '16 hours'
  );

  -- 17. سجل بلا صورة (no image)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'نخيل سكري للبيع - لا توجد صور',
    'نخيل سكري للبيع، 80 نخلة بارتفاع 3 متر',
    v_palm_sector_id, v_transplanted_id, 'offer', 'opportunity',
    '80 نخلة', 'بالتفاوض', 'القصيم',
    jsonb_build_object('variety', 'sukari', 'count', '80', 'trunk_height', '3', 'palm_condition', 'جيدة', 'price_or_quote', 'quote'),
    ARRAY[]::text[],
    NULL,
    'active', now() - interval '17 hours'
  );

  -- 18. سجل بعنوان طويل (long title)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'للبيع فسائل نخيل برحي متجذرة عمر 3 سنوات وزن 12-18 كجم بأسعار تنافسية للمشاريع الزراعية الكبيرة',
    'فسائل نخيل برحي متجذرة، عمر 3 سنوات، وزن 12-18 كجم، مناسبة للمشاريع الزراعية',
    v_palm_sector_id, v_seedlings_id, 'offer', 'opportunity',
    '500 فسيلة', '120 ريال/فسيلة', 'المدينة المنورة',
    jsonb_build_object('variety', 'barhi', 'count', '500', 'min_weight', '12', 'max_weight', '18', 'rooting_status', 'متجذر', 'age', '3', 'price_or_quote', 'price', 'price', '120'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/28445714/pexels-photo-28445714.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '18 hours'
  );

  -- 19. جهة موثقة (verified company)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'تمر سكري فاخر من مزارع موثقة',
    'تمور سكري من مزارع موثقة، جودة مضمونة',
    v_palm_sector_id, v_fruits_id, 'offer', 'opportunity',
    '30 طن', 'بالتفاوض', 'القصيم',
    jsonb_build_object('sale_model', 'by_kilo', 'variety_kilo', 'sukari', 'fruit_condition', 'تمر', 'quantity_available', '30', 'unit_of_measure', 'ton', 'price_or_quote', 'quote'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '19 hours'
  );

  -- 20. جهة غير موثقة (unverified)
  INSERT INTO opportunities (title, description, sector_id, sub_sector_id, operation_type, type, quantity, price, city, attributes, images, image, status, created_at)
  VALUES (
    'مخلفات كرب للبيع - كمية صغيرة',
    'كرب نخيل للبيع، كمية صغيرة مناسبة للصناعات اليدوية',
    v_palm_sector_id, v_residues_id, 'offer', 'opportunity',
    'حسب الطلب', 'بالتفاوض', 'نجران',
    jsonb_build_object('residue_type', 'kerb', 'quantity_method', 'manual_desc', 'manual_quantity_desc', 'كمية صغيرة حسب الطلب'),
    ARRAY[]::text[],
    'https://images.pexels.com/photos/17877979/pexels-photo-17877979.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
    'active', now() - interval '20 hours'
  );
END $$;
