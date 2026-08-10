-- Add value_source, value_key, aggregation_type, and is_active to opportunity_item_field_definitions
-- This allows card indicators to come from sources beyond opportunity_items

ALTER TABLE opportunity_item_field_definitions
  ADD COLUMN IF NOT EXISTS value_source text DEFAULT 'opportunity_item' NOT NULL,
  ADD COLUMN IF NOT EXISTS value_key text,
  ADD COLUMN IF NOT EXISTS aggregation_type text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Add a check constraint for valid value_source values
ALTER TABLE opportunity_item_field_definitions
  DROP CONSTRAINT IF EXISTS value_source_valid;
ALTER TABLE opportunity_item_field_definitions
  ADD CONSTRAINT value_source_valid CHECK (
    value_source IN ('opportunity', 'opportunity_item', 'partnership_profile', 'partnership_roles', 'computed')
  );

-- Add a check constraint for valid aggregation_type values (nullable for non-aggregated fields)
ALTER TABLE opportunity_item_field_definitions
  DROP CONSTRAINT IF EXISTS aggregation_type_valid;
ALTER TABLE opportunity_item_field_definitions
  ADD CONSTRAINT aggregation_type_valid CHECK (
    aggregation_type IS NULL OR aggregation_type IN ('first', 'count', 'sum', 'min', 'max', 'list_count')
  );

-- Add partnership-specific card-visible field definitions for the nursery sector
-- These fields source from partnership_profile and partnership_roles, not opportunity_items

INSERT INTO opportunity_item_field_definitions (
  sector_id, sub_sector_id, operation_type, template_version,
  field_key, field_type, label, is_required, display_order,
  is_filterable, is_card_visible, is_active,
  column_name, value_source, value_key, aggregation_type
) VALUES
  (
    '73e613d6-e10e-4b1d-aef1-b0f591df9d03'::uuid, NULL, 'partnership', 2,
    'partnership_type', 'text', 'نوع الشراكة', false, 0,
    false, true, true,
    NULL, 'partnership_profile', 'partnership_type', 'first'
  ),
  (
    '73e613d6-e10e-4b1d-aef1-b0f591df9d03'::uuid, NULL, 'partnership', 2,
    'required_roles_count', 'number', 'الأدوار المطلوبة', false, 1,
    false, true, true,
    NULL, 'partnership_roles', 'role_key', 'count'
  ),
  (
    '73e613d6-e10e-4b1d-aef1-b0f591df9d03'::uuid, NULL, 'partnership', 2,
    'required_partners_count', 'number', 'عدد الشركاء', false, 2,
    false, true, true,
    NULL, 'partnership_profile', 'required_partners_count', 'first'
  ),
  (
    '73e613d6-e10e-4b1d-aef1-b0f591df9d03'::uuid, NULL, 'partnership', 2,
    'join_deadline', 'date', 'آخر موعد للانضمام', false, 3,
    false, true, true,
    NULL, 'partnership_profile', 'join_deadline', 'first'
  ),
  (
    '73e613d6-e10e-4b1d-aef1-b0f591df9d03'::uuid, NULL, 'partnership', 2,
    'coverage_mode', 'text', 'نمط التغطية', false, 4,
    false, true, true,
    NULL, 'partnership_profile', 'coverage_mode', 'first'
  ),
  (
    '73e613d6-e10e-4b1d-aef1-b0f591df9d03'::uuid, NULL, 'partnership', 2,
    'project_size', 'text', 'حجم المشروع', false, 5,
    false, true, true,
    NULL, 'partnership_profile', 'project_size', 'first'
  )
ON CONFLICT DO NOTHING;
