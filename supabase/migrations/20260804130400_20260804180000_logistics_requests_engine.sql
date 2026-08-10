/*
# Logistics Requests — Full Implementation for Palm Sector

## Purpose
Creates a generalizable logistics engine. The first consumer is the Palm sector's
"اللوجستيات" sub_sector, but the schema is sector-agnostic: the same tables will
serve date factories, poultry, nurseries, equipment, and all future sectors.
Only the asset type and per-sector field definitions change.

## New Tables

### 1. logistics_requests
The core table for every logistics order created from any sector.
- `id` (uuid PK)
- `sector_id` (uuid FK → sectors) — which sector this request originated from
- `sub_sector_id` (uuid FK → sub_sectors) — which specialty/sub_sector it came from
- `source_opportunity_id` (uuid FK → opportunities, nullable) — if this request was
  spawned from a service opportunity (e.g. "قلع وغرس" with "أوفر النقل"), this links
  back to the parent opportunity. NULL for standalone logistics requests.
- `title` (text) — auto-generated or user-provided summary
- `description` / `notes` (text, nullable)
- `asset_type` (text) — what is being transported (e.g. "نخلة", "تمر", "دجاج")
- `pickup_location` (text) — pickup address/landmark
- `delivery_location` (text) — delivery address/landmark
- `city` (text) — primary city for the request
- `quantity` (text, nullable) — amount of goods
- `weight` (text, nullable) — weight if applicable
- `count` (integer, nullable) — count of items if applicable
- `height` (text, nullable) — height if applicable
- `vehicle_type` (text, nullable) — required vehicle type
- `needs_crane` (boolean, default false) — does the transport need a crane?
- `needs_loading` (boolean, default false) — does it need loading service?
- `needs_unloading` (boolean, default false) — does it need unloading service?
- `transport_date` (date, nullable) — when transport is needed
- `images` (text[], default '{}') — image file paths in storage
- `status` (text, default 'draft') — lifecycle status
- `attributes` (jsonb, default '{}') — extra dynamic fields per sector
- `publisher_entity_id` (uuid FK → publisher_entities, nullable) — publishing entity
- `created_by` (uuid, default auth.uid()) — owner
- `created_at` (timestamptz, default now())

### 2. logistics_field_definitions
Generalizable per-sector form definitions. Same structure as
specialty_field_definitions but scoped to logistics forms.
- `id` (uuid PK)
- `sector_id` (uuid FK → sectors)
- `field_key` (text)
- `field_type` (text) — text/number/select/textarea/date/boolean/image/radio
- `label` (text) — Arabic display label
- `is_required` (boolean, default false)
- `display_order` (integer, default 0)
- `is_card_visible` (boolean, default true)
- `options_source` (text, nullable)
- `static_options` (jsonb, nullable)
- `validation_rules` (jsonb, nullable)
- `conditional_field_key` (text, nullable)
- `conditional_values` (jsonb, nullable)
- `unit` (text, nullable)
- `placeholder` (text, nullable)
- `created_at` (timestamptz, default now())

## Lifecycle Statuses
1. draft — user is still editing
2. submitted — user sent the request
3. under_review — admin/logistics center reviewing
4. available_to_providers — visible to service providers
5. offers_received — one or more providers submitted offers
6. provider_selected — user chose a provider
7. in_progress — transport underway
8. completed — delivery confirmed
9. cancelled — user or admin cancelled

## Security (RLS)
logistics_requests: owner-scoped (TO authenticated, auth.uid() = created_by).
logistics_field_definitions: readable by anon+authenticated, writable by authenticated.

## Palm Sector Field Definitions
15 field definitions inserted for the palm sector logistics form.
*/

-- ═══════════════════════════════════════════════════════════
-- 1. logistics_requests table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS logistics_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  sub_sector_id uuid NOT NULL REFERENCES sub_sectors(id) ON DELETE CASCADE,
  source_opportunity_id uuid REFERENCES opportunities(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'طلب لوجستي',
  description text,
  asset_type text NOT NULL DEFAULT 'نخلة',
  pickup_location text,
  delivery_location text,
  city text,
  quantity text,
  weight text,
  count integer,
  height text,
  vehicle_type text,
  needs_crane boolean NOT NULL DEFAULT false,
  needs_loading boolean NOT NULL DEFAULT false,
  needs_unloading boolean NOT NULL DEFAULT false,
  transport_date date,
  images text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft', 'submitted', 'under_review', 'available_to_providers',
      'offers_received', 'provider_selected', 'in_progress',
      'completed', 'cancelled'
    )),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  publisher_entity_id uuid REFERENCES publisher_entities(id) ON DELETE SET NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE logistics_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_logistics" ON logistics_requests;
CREATE POLICY "select_own_logistics" ON logistics_requests FOR SELECT
  TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "insert_own_logistics" ON logistics_requests;
CREATE POLICY "insert_own_logistics" ON logistics_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "update_own_logistics" ON logistics_requests;
CREATE POLICY "update_own_logistics" ON logistics_requests FOR UPDATE
  TO authenticated USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "delete_own_logistics" ON logistics_requests;
CREATE POLICY "delete_own_logistics" ON logistics_requests FOR DELETE
  TO authenticated USING (auth.uid() = created_by);

CREATE INDEX IF NOT EXISTS idx_logistics_requests_sector ON logistics_requests(sector_id);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_sub_sector ON logistics_requests(sub_sector_id);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_status ON logistics_requests(status);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_created_by ON logistics_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_logistics_requests_source_opportunity ON logistics_requests(source_opportunity_id);

-- ═══════════════════════════════════════════════════════════
-- 2. logistics_field_definitions table
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS logistics_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id uuid NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_type text NOT NULL DEFAULT 'text'
    CHECK (field_type IN ('text','number','select','multiselect','textarea','date','boolean','image','radio')),
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_card_visible boolean NOT NULL DEFAULT true,
  options_source text,
  static_options jsonb,
  validation_rules jsonb,
  conditional_field_key text,
  conditional_values jsonb,
  unit text,
  placeholder text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(sector_id, field_key)
);

ALTER TABLE logistics_field_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_logistics_field_defs" ON logistics_field_definitions;
CREATE POLICY "anon_read_logistics_field_defs" ON logistics_field_definitions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_logistics_field_defs" ON logistics_field_definitions;
CREATE POLICY "authenticated_insert_logistics_field_defs" ON logistics_field_definitions FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_logistics_field_defs" ON logistics_field_definitions;
CREATE POLICY "authenticated_update_logistics_field_defs" ON logistics_field_definitions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- 3. Insert palm sector logistics field definitions
-- ═══════════════════════════════════════════════════════════

INSERT INTO logistics_field_definitions (sector_id, field_key, field_type, label, is_required, display_order, is_card_visible, static_options, placeholder, unit)
VALUES
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'asset_type', 'select', 'نوع الأصل', true, 1, true,
    '["نخلة","شتلة نخيل","تمر","سعف","كرب","جذع","أخرى"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'pickup_location', 'text', 'موقع الاستلام', true, 2, true,
    null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'delivery_location', 'text', 'موقع التسليم', true, 3, true,
    null, 'العنوان أو المعلم', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'city', 'text', 'المدينة', true, 4, true,
    null, 'الرياض', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'quantity', 'text', 'الكمية', true, 5, true,
    null, 'مثال: 50', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'weight', 'text', 'الوزن', false, 6, false,
    null, 'مثال: 100 كجم', 'كجم'),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'count', 'number', 'العدد', false, 7, false,
    null, 'مثال: 10', null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'height', 'text', 'الارتفاع', false, 8, false,
    null, 'مثال: 3 متر', 'متر'),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'vehicle_type', 'select', 'نوع المركبة المطلوبة', false, 9, true,
    '["شاحنة صغيرة","شاحنة متوسطة","شاحنة كبيرة","تريلر","مركبة مبردة","أخرى"]'::jsonb, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'needs_crane', 'boolean', 'هل يحتاج رافعة؟', false, 10, false,
    null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'needs_loading', 'boolean', 'هل يحتاج تحميل؟', false, 11, false,
    null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'needs_unloading', 'boolean', 'هل يحتاج تنزيل؟', false, 12, false,
    null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'transport_date', 'date', 'موعد النقل', true, 13, true,
    null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'images', 'image', 'صور', false, 14, false,
    null, null, null),
  ('1bddad2e-b634-4eee-8d4e-aee2ef698da3', 'notes', 'textarea', 'ملاحظات', false, 15, false,
    null, 'تفاصيل إضافية', null)
ON CONFLICT (sector_id, field_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- 4. Storage bucket for logistics images
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('logistics-images', 'logistics-images', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "select_own_logistics_images" ON storage.objects;
CREATE POLICY "select_own_logistics_images" ON storage.objects FOR SELECT
  TO authenticated USING (
    bucket_id = 'logistics-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "insert_own_logistics_images" ON storage.objects;
CREATE POLICY "insert_own_logistics_images" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (
    bucket_id = 'logistics-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "update_own_logistics_images" ON storage.objects;
CREATE POLICY "update_own_logistics_images" ON storage.objects FOR UPDATE
  TO authenticated USING (
    bucket_id = 'logistics-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  ) WITH CHECK (
    bucket_id = 'logistics-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "delete_own_logistics_images" ON storage.objects;
CREATE POLICY "delete_own_logistics_images" ON storage.objects FOR DELETE
  TO authenticated USING (
    bucket_id = 'logistics-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
