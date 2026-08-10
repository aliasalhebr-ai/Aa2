/*
# Upgrade filter_configuration structure for palm specialties

## Purpose
The previous filter_configuration used a simple structure with `id` as the
key and no `displayOrder`, `isActive`, `optionsSource`, or `unit` fields.
This migration upgrades all 7 palm specialty filter configurations to the
richer structure requested in the verification:

Each filter now has:
  - `key`        : stable technical key for programmatic linking (not Arabic)
  - `label`      : Arabic display label
  - `type`       : 'select' | 'range' | 'date'
  - `displayOrder`: integer ordering
  - `isActive`   : boolean toggle
  - `optionsSource`: for select filters — 'variety' (dynamic from palm_varieties
                    table) or 'static' (inline options array)
  - `options`    : static options array (when optionsSource = 'static')
  - `unit`       : measurement unit for range filters (e.g. 'kg', 'ريال')

## Changes
Updates `filter_configuration` jsonb on all 7 palm sub_sectors rows.
No schema changes — only data updates to the existing jsonb column.
*/

-- 1. ثمار النخيل (palm-fruits)
UPDATE sub_sectors SET filter_configuration = '[
  {"key":"variety","label":"صنف التمور","type":"select","displayOrder":1,"isActive":true,"optionsSource":"variety"},
  {"key":"quantity","label":"الكمية","type":"range","displayOrder":2,"isActive":true,"unit":"kg"},
  {"key":"price","label":"السعر","type":"range","displayOrder":3,"isActive":true,"unit":"SAR"},
  {"key":"location","label":"الموقع","type":"select","displayOrder":4,"isActive":true,"optionsSource":"static","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
]'::jsonb
WHERE slug = 'palm-fruits' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- 2. نقايل النخيل (palm-prunings)
UPDATE sub_sectors SET filter_configuration = '[
  {"key":"variety","label":"صنف النقايل","type":"select","displayOrder":1,"isActive":true,"optionsSource":"variety"},
  {"key":"quantity","label":"الكمية","type":"range","displayOrder":2,"isActive":true,"unit":"kg"},
  {"key":"price","label":"السعر","type":"range","displayOrder":3,"isActive":true,"unit":"SAR"},
  {"key":"location","label":"الموقع","type":"select","displayOrder":4,"isActive":true,"optionsSource":"static","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
]'::jsonb
WHERE slug = 'palm-prunings' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- 3. فسائل النخيل (palm-seedlings)
UPDATE sub_sectors SET filter_configuration = '[
  {"key":"variety","label":"صنف الفسيلة","type":"select","displayOrder":1,"isActive":true,"optionsSource":"variety"},
  {"key":"age","label":"العمر","type":"range","displayOrder":2,"isActive":true,"unit":"year"},
  {"key":"quantity","label":"الكمية","type":"range","displayOrder":3,"isActive":true,"unit":"unit"},
  {"key":"price","label":"السعر","type":"range","displayOrder":4,"isActive":true,"unit":"SAR"},
  {"key":"location","label":"الموقع","type":"select","displayOrder":5,"isActive":true,"optionsSource":"static","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
]'::jsonb
WHERE slug = 'palm-seedlings' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- 4. نخيل المشاريع (palm-projects)
UPDATE sub_sectors SET filter_configuration = '[
  {"key":"project_type","label":"نوع المشروع","type":"select","displayOrder":1,"isActive":true,"optionsSource":"static","options":["استثمار","شراكة","تطوير","إدارة"]},
  {"key":"tree_count","label":"عدد الأشجار","type":"range","displayOrder":2,"isActive":true,"unit":"tree"},
  {"key":"price","label":"السعر","type":"range","displayOrder":3,"isActive":true,"unit":"SAR"},
  {"key":"location","label":"الموقع","type":"select","displayOrder":4,"isActive":true,"optionsSource":"static","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
]'::jsonb
WHERE slug = 'palm-projects' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- 5. مخلفات النخيل (palm-residues)
UPDATE sub_sectors SET filter_configuration = '[
  {"key":"residue_type","label":"نوع المخلفات","type":"select","displayOrder":1,"isActive":true,"optionsSource":"static","options":["سعف","ليف","جذوع","كرب","نوى","عذق"]},
  {"key":"quantity","label":"الكمية","type":"range","displayOrder":2,"isActive":true,"unit":"kg"},
  {"key":"price","label":"السعر","type":"range","displayOrder":3,"isActive":true,"unit":"SAR"},
  {"key":"location","label":"الموقع","type":"select","displayOrder":4,"isActive":true,"optionsSource":"static","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
]'::jsonb
WHERE slug = 'palm-residues' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- 6. مستلزمات وتقنيات النخيل (palm-supplies)
UPDATE sub_sectors SET filter_configuration = '[
  {"key":"supply_type","label":"نوع المستلزم","type":"select","displayOrder":1,"isActive":true,"optionsSource":"static","options":["شبوك","سلالم","حافظات","أسمدة","مبيدات","أنظمة ري","حصاد","أخرى"]},
  {"key":"price","label":"السعر","type":"range","displayOrder":2,"isActive":true,"unit":"SAR"},
  {"key":"location","label":"الموقع","type":"select","displayOrder":3,"isActive":true,"optionsSource":"static","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
]'::jsonb
WHERE slug = 'palm-supplies' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';

-- 7. خدمات النخيل (palm-services)
UPDATE sub_sectors SET filter_configuration = '[
  {"key":"service_type","label":"نوع الخدمة","type":"select","displayOrder":1,"isActive":true,"optionsSource":"static","options":["تقليم","تلقيح","حصاد","ري","تسميد","وقاية","نقل","أخرى"]},
  {"key":"price","label":"السعر","type":"range","displayOrder":2,"isActive":true,"unit":"SAR"},
  {"key":"location","label":"الموقع","type":"select","displayOrder":3,"isActive":true,"optionsSource":"static","options":["الرياض","القصيم","المدينة المنورة","الاحساء","نجران"]}
]'::jsonb
WHERE slug = 'palm-services' AND sector_id = '1bddad2e-b634-4eee-8d4e-aee2ef698da3';
