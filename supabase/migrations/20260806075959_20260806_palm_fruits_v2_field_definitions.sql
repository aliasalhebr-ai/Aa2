
-- Palm-fruits V2 field definitions for opportunity_item_field_definitions
-- Sector: palm (1bddad2e-b634-4eee-8d4e-aee2ef698da3)
-- Sub-sector: palm-fruits (6e8f864f-db3a-46d5-a524-4c5bcce7136e)
-- Creates field definitions for both 'offer' and 'demand' operation types, template_version=2

-- ── OFFER operation type fields ──
INSERT INTO opportunity_item_field_definitions
  (sector_id, sub_sector_id, operation_type, template_version, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, column_name, value_source, is_active)
VALUES
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'variety_id', 'select', 'الصنف', true, 0, false, true, 'palm_varieties', null, 'reference_id', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'palm_count', 'number', 'عدد النخيل', false, 1, false, false, null, null, null, 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'quantity', 'number', 'الإنتاج المتوقع', true, 2, true, true, null, null, 'quantity', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'unit', 'select', 'الوحدة', true, 3, true, true, 'static', '["ton","kilo","box","crate"]', 'unit', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'harvest_date', 'text', 'موعد الجني', false, 4, false, false, null, null, null, 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'readiness_status', 'select', 'حالة الجاهزية', false, 5, false, true, 'static', '["جاهز","يحتاج_تهيئة","غير_جاهز"]', 'readiness_status', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'quality_grade', 'select', 'درجة الجودة', false, 6, false, false, 'static', '["extra","grade_a","grade_b","standard"]', null, 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'age_years', 'number', 'عمر النخيل (سنة)', false, 7, false, false, null, null, 'age_value', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'irrigation_source', 'select', 'مصدر الري', false, 8, false, false, 'static', '["drip","bubbler","flood","well","mixed"]', null, 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'fruit_condition', 'text', 'حالة الثمار', false, 9, false, false, null, null, null, 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'unit_price', 'number', 'السعر للكيلو (ريال)', false, 10, true, true, null, null, 'unit_price', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'pricing_type', 'select', 'طريقة التسعير', false, 11, false, false, 'static', '["fixed","negotiable","auction"]', 'pricing_type', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'description', 'text', 'الوصف', false, 12, false, false, null, null, null, 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'offer', 2, 'item_images', 'image', 'صور الصنف', false, 13, false, false, null, null, 'images', 'opportunity_item', true);

-- ── DEMAND operation type fields ──
INSERT INTO opportunity_item_field_definitions
  (sector_id, sub_sector_id, operation_type, template_version, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, column_name, value_source, is_active)
VALUES
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 2, 'variety_id', 'select', 'الصنف المطلوب', true, 0, false, true, 'palm_varieties', null, 'reference_id', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 2, 'quantity', 'number', 'الكمية المطلوبة', true, 1, true, true, null, null, 'quantity', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 2, 'unit', 'select', 'الوحدة', true, 2, true, true, 'static', '["ton","kilo","box","crate"]', 'unit', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 2, 'unit_price', 'number', 'الحد الأقصى للسعر', false, 3, false, false, null, null, 'unit_price', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 2, 'pricing_type', 'select', 'طريقة التسعير', false, 4, false, false, 'static', '["fixed","negotiable"]', 'pricing_type', 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 2, 'fruit_condition', 'text', 'حالة الثمار المطلوبة', false, 5, false, false, null, null, null, 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 2, 'description', 'text', 'ملاحظات', false, 6, false, false, null, null, null, 'opportunity_item', true),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'demand', 2, 'item_images', 'image', 'صور', false, 7, false, false, null, null, 'images', 'opportunity_item', true);
