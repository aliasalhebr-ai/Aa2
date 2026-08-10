-- Test data for multi-item opportunity detail page testing
DO $$
DECLARE
  v_palm_sector_id UUID := '1bddad2e-b634-4eee-8d4e-aee2ef698da3';
  v_palm_fruits_sub UUID := '6e8f864f-db3a-46d5-a524-4c5bcce7136e';
  v_palm_services_sub UUID := '4c235525-d768-425e-b623-0e90e8403c0d';
  v_company_id UUID := '5381dbe4-ab67-465b-8f26-01b2ce7628e7';
  v_opp_fruits UUID;
  v_opp_services UUID;
  v_opp_single UUID;
BEGIN
  v_opp_fruits := gen_random_uuid();
  INSERT INTO opportunities (id, sector_id, sub_sector_id, company_id, type, title, description, city, status, opportunity_type, opportunity_timing, template_version, attributes, created_at)
  VALUES (
    v_opp_fruits, v_palm_sector_id, v_palm_fruits_sub, v_company_id,
    'opportunity',
    'بيع محصول ثمار النخيل - مزرعة القصيم',
    'فرصة لبيع محصول ثمار النخيل من مزرعة موثقة في القصيم. عدة أصناف متاحة بكميات وأسعار مختلفة.',
    'القصيم', 'active', 'offer', 'available_now', 2,
    jsonb_build_object('sale_model', 'by_variety', 'is_negotiable', true),
    NOW()
  );

  INSERT INTO opportunity_items (id, opportunity_id, item_type, reference_source, reference_id, name_snapshot, variety_name_snapshot, quantity, unit, unit_price, pricing_type, display_order, is_active, attributes)
  VALUES
    (gen_random_uuid(), v_opp_fruits, 'plant', 'palm_varieties', '32d57a93-c27a-44af-9ede-fdba3657ffe9', 'سكري', 'سكري', 50, 'ton', 25, 'fixed', 0, true, jsonb_build_object('quality', 'ممتاز', 'harvest_date', 'سبتمبر 2026', 'season', 'موسم 2026')),
    (gen_random_uuid(), v_opp_fruits, 'plant', 'palm_varieties', 'c83b8471-2052-47ef-815f-9a1331baea14', 'خلاص', 'خلاص', 30, 'ton', 28, 'fixed', 1, true, jsonb_build_object('quality', 'جيد جدا', 'harvest_date', 'أغسطس 2026', 'season', 'موسم 2026')),
    (gen_random_uuid(), v_opp_fruits, 'plant', 'palm_varieties', '5ca35e04-0be5-4187-bbc9-3c718bb2c5f5', 'برحي', 'برحي', 20, 'ton', 22, 'negotiable', 2, true, jsonb_build_object('quality', 'ممتاز', 'harvest_date', 'يوليو 2026', 'season', 'موسم 2026')),
    (gen_random_uuid(), v_opp_fruits, 'plant', 'palm_varieties', 'a1c1e2a4-aff3-4011-ae34-f9df4f4d96dc', 'مجدول', 'مجدول', 15, 'ton', 35, 'fixed', 3, true, jsonb_build_object('quality', 'فاخر', 'harvest_date', 'أكتوبر 2026', 'season', 'موسم 2026'));

  v_opp_services := gen_random_uuid();
  INSERT INTO opportunities (id, sector_id, sub_sector_id, company_id, type, title, description, city, status, opportunity_type, opportunity_timing, template_version, attributes, created_at)
  VALUES (
    v_opp_services, v_palm_sector_id, v_palm_services_sub, v_company_id,
    'opportunity',
    'خدمات النخيل المتكاملة - فريق متخصص',
    'فريق متخصص في خدمات النخيل يقدم مجموعة خدمات احترافية لتلبية جميع احتياجات النخيل.',
    'القصيم', 'active', 'offer', 'available_now', 2,
    jsonb_build_object('is_negotiable', true),
    NOW()
  );

  INSERT INTO opportunity_items (id, opportunity_id, item_type, reference_source, reference_id, name_snapshot, quantity, unit, unit_price, pricing_type, display_order, is_active, attributes)
  VALUES
    (gen_random_uuid(), v_opp_services, 'service', 'service_catalog', NULL, 'تلقيح النخيل', 500, 'tree', 15, 'fixed', 0, true, jsonb_build_object('service_type', 'تلقيح', 'coverage_area', 'القصيم والرياض', 'duration', 'حسب عدد النخيل', 'equipment', 'معدات متوفرة')),
    (gen_random_uuid(), v_opp_services, 'service', 'service_catalog', NULL, 'تكريب النخيل', 300, 'tree', 20, 'fixed', 1, true, jsonb_build_object('service_type', 'هلالي', 'coverage_area', 'القصيم', 'duration', 'حسب عدد النخيل', 'equipment', 'معدات متوفرة', 'daily_capacity', '150 نخلة')),
    (gen_random_uuid(), v_opp_services, 'service', 'service_catalog', NULL, 'قص الجريد', 200, 'tree', 18, 'negotiable', 2, true, jsonb_build_object('service_type', 'قص الجريد', 'coverage_area', 'القصيم والرياض', 'duration', 'حسب عدد النخيل')),
    (gen_random_uuid(), v_opp_services, 'service', 'service_catalog', NULL, 'تكميم الثمار', 400, 'tree', 12, 'fixed', 3, true, jsonb_build_object('service_type', 'تكميم', 'coverage_area', 'القصيم', 'duration', 'حسب عدد النخيل'));

  v_opp_single := gen_random_uuid();
  INSERT INTO opportunities (id, sector_id, sub_sector_id, company_id, type, title, description, city, status, opportunity_type, opportunity_timing, template_version, attributes, created_at)
  VALUES (
    v_opp_single, v_palm_sector_id, v_palm_fruits_sub, v_company_id,
    'opportunity',
    'تمر سكري فاخر - كمية محدودة',
    'بيع تمر سكري فاخر من مزرعة موثقة، كمية محدودة جاهزة للتسليم.',
    'القصيم', 'active', 'offer', 'available_now', 2,
    jsonb_build_object('sale_model', 'by_kilo', 'is_negotiable', false),
    NOW()
  );

  INSERT INTO opportunity_items (id, opportunity_id, item_type, reference_source, reference_id, name_snapshot, variety_name_snapshot, quantity, unit, unit_price, pricing_type, display_order, is_active, attributes)
  VALUES
    (gen_random_uuid(), v_opp_single, 'plant', 'palm_varieties', '32d57a93-c27a-44af-9ede-fdba3657ffe9', 'سكري', 'سكري', 10, 'ton', 30, 'fixed', 0, true, jsonb_build_object('quality', 'فاخر', 'harvest_date', 'سبتمبر 2026'));
END $$;
