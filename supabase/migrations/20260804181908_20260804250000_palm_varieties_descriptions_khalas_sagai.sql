/*
 * Enrich palm-fruits test data with per-variety descriptions, quality grades,
 * age, irrigation source, and add Khalas + Sagai varieties alongside Sukari.
 */

-- 1) Single-variety Sukari farm → now 3 varieties: Sukari, Khalas, Sagai
UPDATE opportunities SET
  attributes = jsonb_build_object(
    'sale_model', 'full_harvest',
    'season', 'موسم 2026',
    'varieties', jsonb_build_array(
      jsonb_build_object(
        'variety_id', 'sukari',
        'variety_name', 'سكري',
        'palm_count', '500',
        'expected_production', '40',
        'production_unit', 'ton',
        'harvest_date', 'أغسطس 2026',
        'readiness_status', 'جاهز',
        'images', '[]'::jsonb,
        'description', 'تمر سكري فاخر يتميز بحلاوته العالية وقوامه الطري، لونه ذهبي فاتح وحجم حبة كبير. مناسب للتسويق المباشر والمناسبات. محصول مزرعة عضوية تُسقى من بئر ارتوازي، عمر النخيل 18 سنة.',
        'quality_grade', 'extra',
        'age_years', '18',
        'irrigation_source', 'well'
      ),
      jsonb_build_object(
        'variety_id', 'khalas',
        'variety_name', 'خلاص',
        'palm_count', '300',
        'expected_production', '22',
        'production_unit', 'ton',
        'harvest_date', 'سبتمبر 2026',
        'readiness_status', 'يحتاج_تهيئة',
        'images', '[]'::jsonb,
        'description', 'تمر خلاص من أصناف التمور المفضلة في الخليج، يتميز بقوامه شبه الجاف ولونه البني المحمر. حلاوته متوسطة ونكهته غنية. مناسب للتخزين الطويل والتصدير.',
        'quality_grade', 'grade_a',
        'age_years', '15',
        'irrigation_source', 'drip'
      ),
      jsonb_build_object(
        'variety_id', 'sagai',
        'variety_name', 'صقعي',
        'palm_count', '200',
        'expected_production', '15',
        'production_unit', 'ton',
        'harvest_date', 'أكتوبر 2026',
        'readiness_status', 'غير_جاهز',
        'images', '[]'::jsonb,
        'description', 'تمر صقعي أصيل من القصيم، يتميز بحبة طويلة ولون أصفر ذهبي عند الرطب يتحول إلى بني فاتح عند التمر. قوامه شبه جاف ويتحمل التخزين والنقل لمسافات طويلة.',
        'quality_grade', 'grade_a',
        'age_years', '20',
        'irrigation_source', 'bubbler'
      )
    )
  )
WHERE title = 'كامل محصول مزرعة سكري - موسم 2026';

-- 2) Multi-variety farm (4 varieties) → add descriptions + new fields
UPDATE opportunities SET
  attributes = jsonb_build_object(
    'sale_model', 'full_harvest',
    'season', 'موسم 2026',
    'varieties', jsonb_build_array(
      jsonb_build_object(
        'variety_id', 'sukari', 'variety_name', 'سكري', 'palm_count', '500',
        'expected_production', '40', 'production_unit', 'ton', 'harvest_date', 'أغسطس 2026',
        'readiness_status', 'جاهز', 'images', '[]'::jsonb,
        'description', 'سكري فاخر حلاوة عالية، قوام طري، لون ذهبي. محصول عضوي من بئر ارتوازي.',
        'quality_grade', 'extra', 'age_years', '18', 'irrigation_source', 'well'
      ),
      jsonb_build_object(
        'variety_id', 'khalas', 'variety_name', 'خلاص', 'palm_count', '300',
        'expected_production', '22', 'production_unit', 'ton', 'harvest_date', 'سبتمبر 2026',
        'readiness_status', 'يحتاج_تهيئة', 'images', '[]'::jsonb,
        'description', 'خلاص قوام شبه جاف، لون بني محمر، حلاوة متوسطة. مناسب للتخزين والتصدير.',
        'quality_grade', 'grade_a', 'age_years', '15', 'irrigation_source', 'drip'
      ),
      jsonb_build_object(
        'variety_id', 'barhi', 'variety_name', 'برحي', 'palm_count', '250',
        'expected_production', '18', 'production_unit', 'ton', 'harvest_date', 'أكتوبر 2026',
        'readiness_status', 'غير_جاهز', 'images', '[]'::jsonb,
        'description', 'برحي يستهلك رطباً أكثر من تمره، حبة صفراء لامعة وقوام طري. يحتاج تسويقاً سريعاً.',
        'quality_grade', 'grade_b', 'age_years', '12', 'irrigation_source', 'flood'
      ),
      jsonb_build_object(
        'variety_id', 'majdoul', 'variety_name', 'مجدول', 'palm_count', '150',
        'expected_production', '12', 'production_unit', 'ton', 'harvest_date', 'نوفمبر 2026',
        'readiness_status', 'يحتاج_تهيئة', 'images', '[]'::jsonb,
        'description', 'مجدول من أغلى أصناف التمور عالمياً، حبة كبيرة وقوام شبه جاف ولون بني داكن. تصدير ممتاز.',
        'quality_grade', 'extra', 'age_years', '10', 'irrigation_source', 'drip'
      )
    )
  )
WHERE title = 'مزرعة متعددة الأصناف - 4 أصناف للبيع كامل';

-- 3) Weight sale Sukari+Khalas → add descriptions + new fields
UPDATE opportunities SET
  attributes = jsonb_build_object(
    'sale_model', 'by_kilo',
    'price_or_quote', 'quote',
    'varieties', jsonb_build_array(
      jsonb_build_object(
        'variety_id', 'sukari', 'variety_name', 'سكري', 'palm_count', null,
        'expected_production', '12', 'production_unit', 'ton', 'harvest_date', null,
        'readiness_status', 'جاهز', 'images', '[]'::jsonb,
        'description', 'سكري فاخر للبيع بالوزن، حلاوة عالية وقوام طري. متوفر بكميات.',
        'quality_grade', 'extra', 'age_years', null, 'irrigation_source', null
      ),
      jsonb_build_object(
        'variety_id', 'khalas', 'variety_name', 'خلاص', 'palm_count', null,
        'expected_production', '8', 'production_unit', 'ton', 'harvest_date', null,
        'readiness_status', 'يحتاج_تهيئة', 'images', '[]'::jsonb,
        'description', 'خلاص درجة أولى للبيع بالوزن، قوام شبه جاف مناسب للتخزين.',
        'quality_grade', 'grade_a', 'age_years', null, 'irrigation_source', null
      )
    )
  )
WHERE title = 'تمور متنوعة بالوزن - سكري وخلاص';

-- 4) 5-variety farm → add descriptions + new fields
UPDATE opportunities SET
  attributes = jsonb_build_object(
    'sale_model', 'full_harvest',
    'season', 'موسم 2026',
    'varieties', jsonb_build_array(
      jsonb_build_object(
        'variety_id', 'sukari', 'variety_name', 'سكري', 'palm_count', '600',
        'expected_production', '45', 'production_unit', 'ton', 'harvest_date', 'أغسطس 2026',
        'readiness_status', 'جاهز', 'images', '[]'::jsonb,
        'description', 'سكري فاخر حلاوة عالية، محصول عضوي من بئر ارتوازي.',
        'quality_grade', 'extra', 'age_years', '18', 'irrigation_source', 'well'
      ),
      jsonb_build_object(
        'variety_id', 'khalas', 'variety_name', 'خلاص', 'palm_count', '400',
        'expected_production', '30', 'production_unit', 'ton', 'harvest_date', 'سبتمبر 2026',
        'readiness_status', 'يحتاج_تهيئة', 'images', '[]'::jsonb,
        'description', 'خلاص شبه جاف لون بني محمر، حلاوة متوسطة، مناسب للتصدير.',
        'quality_grade', 'grade_a', 'age_years', '15', 'irrigation_source', 'drip'
      ),
      jsonb_build_object(
        'variety_id', 'barhi', 'variety_name', 'برحي', 'palm_count', '350',
        'expected_production', '25', 'production_unit', 'ton', 'harvest_date', 'أكتوبر 2026',
        'readiness_status', 'غير_جاهز', 'images', '[]'::jsonb,
        'description', 'برحي رطب أصفر طري، يحتاج تسويقاً سريعاً.',
        'quality_grade', 'grade_b', 'age_years', '12', 'irrigation_source', 'flood'
      ),
      jsonb_build_object(
        'variety_id', 'majdoul', 'variety_name', 'مجدول', 'palm_count', '350',
        'expected_production', '20', 'production_unit', 'ton', 'harvest_date', 'نوفمبر 2026',
        'readiness_status', 'يحتاج_تهيئة', 'images', '[]'::jsonb,
        'description', 'مجدول حبة كبيرة قوام شبه جاف، تصدير ممتاز.',
        'quality_grade', 'extra', 'age_years', '10', 'irrigation_source', 'drip'
      ),
      jsonb_build_object(
        'variety_id', 'sagai', 'variety_name', 'صقعي', 'palm_count', '300',
        'expected_production', '18', 'production_unit', 'ton', 'harvest_date', 'ديسمبر 2026',
        'readiness_status', 'غير_جاهز', 'images', '[]'::jsonb,
        'description', 'صقعي أصيل من القصيم، حبة طويلة لون ذهبي يتحول لبني، يتحمل النقل والتخزين.',
        'quality_grade', 'grade_a', 'age_years', '20', 'irrigation_source', 'bubbler'
      )
    )
  )
WHERE title = 'مزرعة كبيرة - 5 أصناف للبيع كامل';

-- 5) Single variety Sukari by kilo → add description + new fields
UPDATE opportunities SET
  attributes = jsonb_build_object(
    'sale_model', 'by_kilo',
    'price_or_quote', 'price',
    'price_kilo', '25',
    'varieties', jsonb_build_array(
      jsonb_build_object(
        'variety_id', 'sukari', 'variety_name', 'سكري', 'palm_count', null,
        'expected_production', '20', 'production_unit', 'ton', 'harvest_date', null,
        'readiness_status', 'جاهز', 'images', '[]'::jsonb,
        'description', 'تمر سكري فاخر للبيع بالكيلو، حلاوة عالية وقوام طري، لون ذهبي فاتح. مناسب للتسويق المباشر.',
        'quality_grade', 'extra', 'age_years', null, 'irrigation_source', null
      )
    )
  )
WHERE title = 'تمر سكري فاخر - 20 طن';

-- 6) Single variety Barhi by kilo → add description + new fields
UPDATE opportunities SET
  attributes = jsonb_build_object(
    'sale_model', 'by_kilo',
    'price_or_quote', 'price',
    'price_kilo', '18',
    'varieties', jsonb_build_array(
      jsonb_build_object(
        'variety_id', 'barhi', 'variety_name', 'برحي', 'palm_count', null,
        'expected_production', '8', 'production_unit', 'ton', 'harvest_date', null,
        'readiness_status', 'غير_جاهز', 'images', '[]'::jsonb,
        'description', 'تمر برحي درجة أولى، حبة صفراء لامعة وقوام طري. يستهلك رطباً وتمراً.',
        'quality_grade', 'grade_a', 'age_years', null, 'irrigation_source', null
      )
    )
  )
WHERE title = 'تمر برحي فاخر - 8 طن بسعر محدد';
