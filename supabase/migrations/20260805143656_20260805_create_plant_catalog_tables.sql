/*
# Create plant catalog reference tables

1. Purpose
   - Create a reference catalog for plants in the nursery sector.
   - Three tables: plant_categories → plant_catalog → plant_varieties.
   - These are reference/dictionary tables, not transactional.
   - Public read for active records; write restricted to authenticated (admin) users.

2. New Tables
   a) plant_categories
      - id, name_ar, name_en, slug (unique), description, icon, display_order, is_active, created_at, updated_at
   b) plant_catalog
      - id, category_id (FK), arabic_name, english_name, scientific_name, slug (unique),
        reference_image, description, default_attributes (jsonb), display_order, is_active, created_at, updated_at
   c) plant_varieties
      - id, plant_id (FK CASCADE), name_ar, name_en, slug (unique per plant),
        reference_image, description, default_attributes (jsonb), display_order, is_active, created_at, updated_at

3. Seed Data
   - 6 plant categories: أشجار، شجيرات، أغطية نباتية، نباتات موسمية، نباتات داخلية، نباتات برية وصحراوية
   - 5 plants: سدر، غاف، زيتون، أكاسيا، جاكرندا
   - No varieties seeded (left empty for now).

4. RLS
   - Public read (anon + authenticated) for active records.
   - Write (insert/update/delete) restricted to authenticated users only.
   - This prevents anon users from modifying the catalog.

5. Indexes
   - plant_catalog: category_id, is_active, arabic_name (trigram if available), scientific_name
   - plant_varieties: plant_id, is_active
   - plant_categories: is_active, display_order
*/

-- ============================================
-- plant_categories
-- ============================================
CREATE TABLE IF NOT EXISTS plant_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar text NOT NULL,
  name_en text,
  slug text NOT NULL UNIQUE,
  description text,
  icon text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plant_categories ENABLE ROW LEVEL SECURITY;

-- Public read for active categories
DROP POLICY IF EXISTS "read_plant_categories" ON plant_categories;
CREATE POLICY "read_plant_categories"
  ON plant_categories FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Only authenticated can write
DROP POLICY IF EXISTS "insert_plant_categories" ON plant_categories;
CREATE POLICY "insert_plant_categories"
  ON plant_categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_plant_categories" ON plant_categories;
CREATE POLICY "update_plant_categories"
  ON plant_categories FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_plant_categories" ON plant_categories;
CREATE POLICY "delete_plant_categories"
  ON plant_categories FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_plant_categories_is_active
  ON plant_categories (is_active);
CREATE INDEX IF NOT EXISTS idx_plant_categories_display_order
  ON plant_categories (display_order);

-- Trigger
DROP TRIGGER IF EXISTS trg_plant_categories_updated_at ON plant_categories;
CREATE TRIGGER trg_plant_categories_updated_at
  BEFORE UPDATE ON plant_categories
  FOR EACH ROW
  EXECUTE FUNCTION storage.update_updated_at_column();

-- ============================================
-- plant_catalog
-- ============================================
CREATE TABLE IF NOT EXISTS plant_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES plant_categories(id) ON DELETE RESTRICT,
  arabic_name text NOT NULL,
  english_name text,
  scientific_name text,
  slug text NOT NULL UNIQUE,
  reference_image text,
  description text,
  default_attributes jsonb NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plant_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_plant_catalog" ON plant_catalog;
CREATE POLICY "read_plant_catalog"
  ON plant_catalog FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "insert_plant_catalog" ON plant_catalog;
CREATE POLICY "insert_plant_catalog"
  ON plant_catalog FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_plant_catalog" ON plant_catalog;
CREATE POLICY "update_plant_catalog"
  ON plant_catalog FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_plant_catalog" ON plant_catalog;
CREATE POLICY "delete_plant_catalog"
  ON plant_catalog FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_plant_catalog_category_id
  ON plant_catalog (category_id);
CREATE INDEX IF NOT EXISTS idx_plant_catalog_is_active
  ON plant_catalog (is_active);
CREATE INDEX IF NOT EXISTS idx_plant_catalog_arabic_name
  ON plant_catalog (arabic_name);
CREATE INDEX IF NOT EXISTS idx_plant_catalog_scientific_name
  ON plant_catalog (scientific_name);

DROP TRIGGER IF EXISTS trg_plant_catalog_updated_at ON plant_catalog;
CREATE TRIGGER trg_plant_catalog_updated_at
  BEFORE UPDATE ON plant_catalog
  FOR EACH ROW
  EXECUTE FUNCTION storage.update_updated_at_column();

-- ============================================
-- plant_varieties
-- ============================================
CREATE TABLE IF NOT EXISTS plant_varieties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id uuid NOT NULL REFERENCES plant_catalog(id) ON DELETE CASCADE,
  name_ar text NOT NULL,
  name_en text,
  slug text NOT NULL,
  reference_image text,
  description text,
  default_attributes jsonb NOT NULL DEFAULT '{}',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plant_id, slug)
);

ALTER TABLE plant_varieties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_plant_varieties" ON plant_varieties;
CREATE POLICY "read_plant_varieties"
  ON plant_varieties FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "insert_plant_varieties" ON plant_varieties;
CREATE POLICY "insert_plant_varieties"
  ON plant_varieties FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_plant_varieties" ON plant_varieties;
CREATE POLICY "update_plant_varieties"
  ON plant_varieties FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_plant_varieties" ON plant_varieties;
CREATE POLICY "delete_plant_varieties"
  ON plant_varieties FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_plant_varieties_plant_id
  ON plant_varieties (plant_id);
CREATE INDEX IF NOT EXISTS idx_plant_varieties_is_active
  ON plant_varieties (is_active);

DROP TRIGGER IF EXISTS trg_plant_varieties_updated_at ON plant_varieties;
CREATE TRIGGER trg_plant_varieties_updated_at
  BEFORE UPDATE ON plant_varieties
  FOR EACH ROW
  EXECUTE FUNCTION storage.update_updated_at_column();

-- ============================================
-- Seed: plant_categories (6)
-- ============================================
INSERT INTO plant_categories (name_ar, name_en, slug, description, display_order, is_active)
VALUES
  ('أشجار', 'Trees', 'trees', 'أشجار كبيرة وظلية', 1, true),
  ('شجيرات', 'Shrubs', 'shrubs', 'شجيرات متوسطة الحجم', 2, true),
  ('أغطية نباتية', 'Ground Covers', 'ground-covers', 'نباتات تغطية أرضية', 3, true),
  ('نباتات موسمية', 'Seasonal Plants', 'seasonal-plants', 'نباتات موسمية وزهور', 4, true),
  ('نباتات داخلية', 'Indoor Plants', 'indoor-plants', 'نباتات الزينة الداخلية', 5, true),
  ('نباتات برية وصحراوية', 'Wild & Desert Plants', 'wild-desert-plants', 'نباتات برية وصحراوية متحملة للجفاف', 6, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================
-- Seed: plant_catalog (5 plants)
-- ============================================
-- سدر → أشجار
INSERT INTO plant_catalog (category_id, arabic_name, english_name, scientific_name, slug, description, display_order, is_active)
SELECT c.id, 'سدر', 'Sidr', 'Ziziphus spina-christi', 'sidr',
  'شجر بري صحراوي مثمر، يتحمل الجفاف ويعطي ثماراً صالحة للأكل', 1, true
FROM plant_categories c WHERE c.slug = 'trees'
ON CONFLICT (slug) DO NOTHING;

-- غاف → أشجار
INSERT INTO plant_catalog (category_id, arabic_name, english_name, scientific_name, slug, description, display_order, is_active)
SELECT c.id, 'غاف', 'Ghaf', 'Prosopis cineraria', 'ghaf',
  'شجر صحراوي يتحمل الجفاف، يوفر ظلاً وغذاءً للحيوانات', 2, true
FROM plant_categories c WHERE c.slug = 'trees'
ON CONFLICT (slug) DO NOTHING;

-- زيتون → أشجار
INSERT INTO plant_catalog (category_id, arabic_name, english_name, scientific_name, slug, description, display_order, is_active)
SELECT c.id, 'زيتون', 'Olive', 'Olea europaea', 'olive',
  'شجر مثمر ينتج الزيتون، يناسب المناطق المعتدلة', 3, true
FROM plant_categories c WHERE c.slug = 'trees'
ON CONFLICT (slug) DO NOTHING;

-- أكاسيا → أشجار
INSERT INTO plant_catalog (category_id, arabic_name, english_name, scientific_name, slug, description, display_order, is_active)
SELECT c.id, 'أكاسيا', 'Acacia', 'Acacia spp.', 'acacia',
  'شجر صحراوي سريع النمو، يتحمل الجفاف ويصلح للتشجير', 4, true
FROM plant_categories c WHERE c.slug = 'trees'
ON CONFLICT (slug) DO NOTHING;

-- جاكرندا → أشجار
INSERT INTO plant_catalog (category_id, arabic_name, english_name, scientific_name, slug, description, display_order, is_active)
SELECT c.id, 'جاكرندا', 'Jacaranda', 'Jacaranda mimosifolia', 'jacaranda',
  'شجر زينة بأزهار بنفسجية جميلة، يناسب الحدائق والشوارع', 5, true
FROM plant_categories c WHERE c.slug = 'trees'
ON CONFLICT (slug) DO NOTHING;
