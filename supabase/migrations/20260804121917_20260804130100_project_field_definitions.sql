/*
# Phase 2: Project field definitions for transplanted-palms, palm-seedlings, palm-projects

## Summary
Adds dynamic field definitions for the "project" operation type on three specialties:
- نقايل النخيل (transplanted-palms)
- فسائل النخيل (palm-seedlings)
- نخيل المشاريع (palm-projects)

The project form differs from offer/demand — it includes project-specific fields like
description, quantity needed, specs, location, execution date, offer deadline, requesting
entity, and logistics option.

## Fields Added (per specialty, operation_type_id = 'project')
1. title (text, required) — عنوان المشروع
2. project_description (textarea, required) — وصف المشروع
3. quantity_needed (number, required) — الكمية المطلوبة
4. unit_of_measure (select, required) — وحدة القياس (options_source = 'units')
5. specs (textarea) — المواصفات
6. location (select) — الموقع
7. execution_date (date) — تاريخ التنفيذ
8. offer_deadline (date) — آخر موعد لاستقبال العروض
9. requesting_entity (text, required) — الجهة الطالبة
10. logistics_available (boolean) — إمكانية طلب اللوجستيات

For palm-projects only:
11. kerb_status (radio) — حالة الكرب
12. takreb_type (radio) — نوع التكريب

## Notes
- Idempotent: uses ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING.
- static_options is jsonb, so arrays are cast with to_jsonb().
*/

DO $$
DECLARE
  sp_transplanted uuid := '1dfb58d4-20e9-4f98-b291-a7bb9d5bb7f5';
  sp_seedlings   uuid := 'c98aeb45-ac09-413a-8e34-b5b3d75985fe';
  sp_projects    uuid := 'bccaaa64-539d-42fd-9abb-614acc24c7b8';
  sp_current     uuid;
  order_idx      int;
BEGIN
  FOREACH sp_current IN ARRAY ARRAY[sp_transplanted, sp_seedlings, sp_projects] LOOP
    order_idx := 1;

    INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
    VALUES (sp_current, 'project', 'title', 'text', 'عنوان المشروع', true, order_idx, false, true, null, null, null, 'مثال: مشروع غرس 100 نخلة برحي')
    ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;

    INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
    VALUES (sp_current, 'project', 'project_description', 'textarea', 'وصف المشروع', true, order_idx, false, false, null, null, null, null)
    ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;

    INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
    VALUES (sp_current, 'project', 'quantity_needed', 'number', 'الكمية المطلوبة', true, order_idx, false, true, null, null, null, null)
    ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;

    INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
    VALUES (sp_current, 'project', 'unit_of_measure', 'select', 'وحدة القياس', true, order_idx, false, true, 'units', null, null, null)
    ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;

    INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
    VALUES (sp_current, 'project', 'specs', 'textarea', 'المواصفات', false, order_idx, false, false, null, null, null, 'مثال: ارتفاع 3 متر، جذر سليم')
    ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;

    INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
    VALUES (sp_current, 'project', 'location', 'select', 'الموقع', false, order_idx, true, true, null, null, null, null)
    ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;

    INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
    VALUES (sp_current, 'project', 'execution_date', 'date', 'تاريخ التنفيذ', false, order_idx, false, true, null, null, null, null)
    ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;

    INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
    VALUES (sp_current, 'project', 'offer_deadline', 'date', 'آخر موعد لاستقبال العروض', false, order_idx, false, true, null, null, null, null)
    ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;

    INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
    VALUES (sp_current, 'project', 'requesting_entity', 'text', 'الجهة الطالبة', true, order_idx, false, true, null, null, null, null)
    ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;

    INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
    VALUES (sp_current, 'project', 'logistics_available', 'boolean', 'إمكانية طلب اللوجستيات', false, order_idx, false, true, null, null, null, null)
    ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;
  END LOOP;

  -- Palm-projects specific: kerb + takreb specs
  INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
  VALUES (sp_projects, 'project', 'kerb_status', 'radio', 'حالة الكرب', false, order_idx, false, true, 'static', to_jsonb(ARRAY['سليم','سليم مع ملاحظات','يحتاج معالجة']), null, null)
  ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING; order_idx := order_idx + 1;

  INSERT INTO specialty_field_definitions (specialty_id, operation_type_id, field_key, field_type, label, is_required, display_order, is_filterable, is_card_visible, options_source, static_options, unit, placeholder)
  VALUES (sp_projects, 'project', 'takreb_type', 'radio', 'نوع التكريب', false, order_idx, false, true, 'static', to_jsonb(ARRAY['هلالي','عادي']), null, null)
  ON CONFLICT (specialty_id, operation_type_id, field_key) DO NOTHING;
END $$;
