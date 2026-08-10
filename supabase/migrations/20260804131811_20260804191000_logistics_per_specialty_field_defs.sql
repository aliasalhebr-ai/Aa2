/*
# Logistics Field Definitions — Per-Specialty Dynamic Forms

## Purpose
Makes logistics form definitions dynamic by source specialty, not just sector.
Each palm specialty gets its own set of logistics fields.

## Changes to logistics_field_definitions
- Add `source_specialty_id` column
- Replace UNIQUE constraint to include source_specialty_id
- Delete old generic palm field defs and insert per-specialty definitions
*/

ALTER TABLE logistics_field_definitions
  ADD COLUMN IF NOT EXISTS source_specialty_id uuid REFERENCES sub_sectors(id) ON DELETE SET NULL;

ALTER TABLE logistics_field_definitions DROP CONSTRAINT IF EXISTS logistics_field_definitions_sector_id_field_key_key;
ALTER TABLE logistics_field_definitions DROP CONSTRAINT IF EXISTS logistics_field_definitions_sector_id_source_specialty_id_field_key_key;
ALTER TABLE logistics_field_definitions DROP CONSTRAINT IF EXISTS logistics_field_definitions_sector_specialty_key_unique;

DELETE FROM logistics_field_definitions
WHERE sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3'
  AND source_specialty_id IS NULL;

ALTER TABLE logistics_field_definitions
  ADD CONSTRAINT logistics_field_definitions_sector_specialty_key_unique
  UNIQUE (sector_id, source_specialty_id, field_key);

-- ── نقايل النخيل (transplanted-palms: 1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5) ──
INSERT INTO logistics_field_definitions (sector_id, source_specialty_id, field_key, field_type, label, is_required, display_order, is_card_visible, static_options, placeholder, unit)
VALUES
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'asset_type', 'select', 'نوع الأصل', true, 1, true, '["نخلة","شتلة نخيل"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'palm_count', 'number', 'عدد النخيل', true, 2, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'height_range', 'select', 'نطاق الارتفاع', true, 3, true, '["أقل من 2 متر","2-4 متر","4-6 متر","أكثر من 6 متر"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'trunk_diameter', 'text', 'قطر الجذع', false, 4, false, null, 'مثال: 40 سم', 'سم'),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'is_uprooted', 'boolean', 'هل النخيل مقلوع؟', false, 5, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'needs_uprooting', 'boolean', 'هل يحتاج قلعًا؟', false, 6, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'needs_crane', 'boolean', 'هل يحتاج رافعة؟', false, 7, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'vehicle_type', 'select', 'نوع المركبة أو التريلر', false, 8, true, '["شاحنة صغيرة","شاحنة متوسطة","شاحنة كبيرة","تريلر","أخرى"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'needs_planting', 'boolean', 'الحاجة إلى غرس في الوجهة', false, 9, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'pickup_location', 'text', 'موقع الاستلام', true, 10, true, null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'delivery_location', 'text', 'موقع التسليم', true, 11, true, null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'city', 'text', 'المدينة', true, 12, true, null, 'الرياض', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'transport_date', 'date', 'موعد النقل', true, 13, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'images', 'image', 'صور', false, 14, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5', 'notes', 'textarea', 'ملاحظات', false, 15, false, null, 'تفاصيل إضافية', null)
ON CONFLICT (sector_id, source_specialty_id, field_key) DO NOTHING;

-- ── فسائل النخيل (palm-seedlings: c98aeb45-ac09-413a-8e34-b5b3d75985fe) ──
INSERT INTO logistics_field_definitions (sector_id, source_specialty_id, field_key, field_type, label, is_required, display_order, is_card_visible, static_options, placeholder, unit)
VALUES
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'asset_type', 'select', 'نوع الأصل', true, 1, true, '["فسيلة","شتلة"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'seedling_count', 'number', 'العدد', true, 2, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'approximate_weight', 'text', 'الوزن التقريبي', false, 3, false, null, 'مثال: 5 كجم', 'كجم'),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'packaging_condition', 'select', 'حالة التعبئة أو التجذير', false, 4, true, '["مكتمل التجذير","جزئي","غير متجذر"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'vehicle_type', 'select', 'نوع المركبة', false, 5, true, '["شاحنة صغيرة","شاحنة متوسطة","أخرى"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'needs_loading', 'boolean', 'الحاجة إلى تحميل', false, 6, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'needs_unloading', 'boolean', 'الحاجة إلى تنزيل', false, 7, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'pickup_location', 'text', 'موقع الاستلام', true, 8, true, null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'delivery_location', 'text', 'موقع التسليم', true, 9, true, null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'city', 'text', 'المدينة', true, 10, true, null, 'الرياض', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'transport_date', 'date', 'موعد النقل', true, 11, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'images', 'image', 'صور', false, 12, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'c98aeb45-ac09-413a-8e34-b5b3d75985fe', 'notes', 'textarea', 'ملاحظات', false, 13, false, null, 'تفاصيل إضافية', null)
ON CONFLICT (sector_id, source_specialty_id, field_key) DO NOTHING;

-- ── ثمار النخيل (palm-fruits: 6e8f864f-db3a-46d5-a524-4c5bcce7136e) ──
INSERT INTO logistics_field_definitions (sector_id, source_specialty_id, field_key, field_type, label, is_required, display_order, is_card_visible, static_options, placeholder, unit)
VALUES
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'asset_type', 'select', 'نوع الثمار', true, 1, true, '["تمر","رطب","بسر"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'weight', 'text', 'الوزن', true, 2, true, null, 'مثال: 500', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'weight_unit', 'select', 'وحدة القياس', true, 3, true, '["كجم","طن"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'packaging_type', 'select', 'نوع العبوات', false, 4, true, '["صناديق","أقفاص","شوال","سيور ناقلة","بدون"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'needs_refrigerated', 'boolean', 'هل يحتاج نقلًا مبردًا؟', false, 5, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'temperature', 'text', 'درجة الحرارة المطلوبة', false, 6, false, null, 'مثال: 4°م', '°م'),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'pickup_time', 'text', 'وقت الاستلام', false, 7, false, null, 'مثال: 8 صباحاً', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'delivery_time', 'text', 'وقت التسليم', false, 8, false, null, 'مثال: 2 ظهراً', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'pickup_location', 'text', 'موقع الاستلام', true, 9, true, null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'delivery_location', 'text', 'موقع التسليم', true, 10, true, null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'city', 'text', 'المدينة', true, 11, true, null, 'الرياض', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'transport_date', 'date', 'موعد النقل', true, 12, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'images', 'image', 'صور', false, 13, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '6e8f864f-db3a-46d5-a524-4c5bcce7136e', 'notes', 'textarea', 'ملاحظات', false, 14, false, null, 'تفاصيل إضافية', null)
ON CONFLICT (sector_id, source_specialty_id, field_key) DO NOTHING;

-- ── مخلفات النخيل (palm-residues: 7f56b186-0755-42c0-a4a1-113e5717dde7) ──
INSERT INTO logistics_field_definitions (sector_id, source_specialty_id, field_key, field_type, label, is_required, display_order, is_card_visible, static_options, placeholder, unit)
VALUES
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'asset_type', 'select', 'نوع المخلفات', true, 1, true, '["سعف","كرب","جذع","خوص","أخرى"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'quantity_method', 'select', 'طريقة الكمية', true, 2, true, '["وزن","عدد","وصف يدوي"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'weight', 'text', 'الوزن', false, 3, false, null, 'مثال: 200 كجم', 'كجم'),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'count', 'number', 'العدد', false, 4, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'quantity_description', 'textarea', 'وصف الكمية', false, 5, false, null, 'وصف تفصيلي', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'loading_readiness', 'select', 'جاهزية التحميل', false, 6, true, '["جاهز","يحتاج تجهيز","غير جاهز"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'vehicle_type', 'select', 'نوع المركبة المطلوبة', false, 7, true, '["شاحنة صغيرة","شاحنة متوسطة","شاحنة كبيرة","تريلر","أخرى"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'pickup_location', 'text', 'موقع الاستلام', true, 8, true, null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'delivery_location', 'text', 'موقع التسليم', true, 9, true, null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'city', 'text', 'المدينة', true, 10, true, null, 'الرياض', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'transport_date', 'date', 'موعد النقل', true, 11, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'images', 'image', 'صور', false, 12, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', '7f56b186-0755-42c0-a4a1-113e5717dde7', 'notes', 'textarea', 'ملاحظات', false, 13, false, null, 'تفاصيل إضافية', null)
ON CONFLICT (sector_id, source_specialty_id, field_key) DO NOTHING;

-- ── نخيل المشاريع (palm-projects: bccaaa64-539d-42fd-9abb-614acc24c7b8) ──
INSERT INTO logistics_field_definitions (sector_id, source_specialty_id, field_key, field_type, label, is_required, display_order, is_card_visible, static_options, placeholder, unit)
VALUES
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'asset_type', 'select', 'نوع الأصل', true, 1, true, '["نخلة","شتلة نخيل","مجموعة"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'palm_count', 'number', 'العدد', true, 2, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'height_range', 'select', 'الارتفاع', true, 3, true, '["أقل من 2 متر","2-4 متر","4-6 متر","أكثر من 6 متر"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'pickup_location', 'text', 'مواقع الاستلام', true, 4, true, null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'delivery_location', 'text', 'مواقع التسليم', true, 5, true, null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'needs_crane', 'boolean', 'الرافعات المطلوبة', false, 6, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'execution_schedule', 'textarea', 'جدول التنفيذ', false, 7, false, null, 'مثال: أسبوع كامل', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'is_batched', 'boolean', 'هل النقل على دفعات؟', false, 8, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'city', 'text', 'المدينة', true, 9, true, null, 'الرياض', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'transport_date', 'date', 'موعد النقل', true, 10, true, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'images', 'image', 'صور', false, 11, false, null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'bccaaa64-539d-42fd-9abb-614acc24c7b8', 'notes', 'textarea', 'ملاحظات', false, 12, false, null, 'تفاصيل إضافية', null)
ON CONFLICT (sector_id, source_specialty_id, field_key) DO NOTHING;
