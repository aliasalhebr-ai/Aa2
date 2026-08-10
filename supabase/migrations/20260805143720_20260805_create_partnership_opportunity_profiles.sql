/*
# Create partnership_opportunity_profiles table

1. Purpose
   - Separate basic partnership metadata from the general opportunity attributes.
   - This avoids bloating opportunities.attributes with partnership-specific fields.
   - Today, partnership is just an operation_type='partnership' opportunity.
   - This table provides a structured place for partnership-specific data that can
     later be expanded into a full partnership engine (roles, applications, milestones).
   - Only opportunities with opportunity_type='partnership' (or operation_type='partnership'
     during transition) can have a profile.

2. New Table: partnership_opportunity_profiles
   - id (uuid PK)
   - opportunity_id (uuid FK UNIQUE → opportunities, CASCADE)
   - partnership_type (text) — 'production','supply','project_execution','distribution_expansion'
   - lead_entity_id (uuid, nullable) — the leading entity in the partnership
   - project_size (text, nullable) — size/scale description
   - project_location (text, nullable) — geographic location
   - start_date (date, nullable) — expected start
   - join_deadline (date, nullable) — deadline for partners to join
   - required_partners_count (integer, nullable) — how many partners needed
   - summary (text, nullable) — brief description of the partnership scope
   - created_at, updated_at (timestamptz)

3. RLS
   - Follows the parent opportunity's visibility:
     - Public read when parent opportunity is active.
     - Owner can read their own draft/pending profiles.
   - Only the opportunity owner can insert/update/delete.
   - Ownership verified via EXISTS subquery on opportunities.created_by = auth.uid().

4. Trigger
   - trg_partnership_profile_check: BEFORE INSERT/UPDATE — prevents creating a
     partnership profile for an opportunity that is NOT a partnership type.
   - trg_partnership_profiles_updated_at: auto-updates updated_at.

5. Not Created (future phases)
   - partnership_roles, partnership_applications, partnership_members,
     partnership_milestones, partnership completion dashboard.
*/

CREATE TABLE IF NOT EXISTS partnership_opportunity_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id uuid NOT NULL UNIQUE REFERENCES opportunities(id) ON DELETE CASCADE,
  partnership_type text,
  lead_entity_id uuid,
  project_size text,
  project_location text,
  start_date date,
  join_deadline date,
  required_partners_count integer,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Constraint on partnership_type
ALTER TABLE partnership_opportunity_profiles DROP CONSTRAINT IF EXISTS partnership_type_check;
ALTER TABLE partnership_opportunity_profiles ADD CONSTRAINT partnership_type_check
  CHECK (partnership_type IS NULL OR partnership_type IN (
    'production', 'supply', 'project_execution', 'distribution_expansion'
  ));

-- RLS
ALTER TABLE partnership_opportunity_profiles ENABLE ROW LEVEL SECURITY;

-- SELECT: public reads profiles of active opportunities; owner reads their own
DROP POLICY IF EXISTS "read_partnership_profiles" ON partnership_opportunity_profiles;
CREATE POLICY "read_partnership_profiles"
  ON partnership_opportunity_profiles FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = partnership_opportunity_profiles.opportunity_id
        AND (o.status = 'active' OR o.created_by = auth.uid())
    )
  );

-- INSERT: only opportunity owner
DROP POLICY IF EXISTS "insert_partnership_profiles" ON partnership_opportunity_profiles;
CREATE POLICY "insert_partnership_profiles"
  ON partnership_opportunity_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = partnership_opportunity_profiles.opportunity_id
        AND o.created_by = auth.uid()
    )
  );

-- UPDATE: only opportunity owner
DROP POLICY IF EXISTS "update_partnership_profiles" ON partnership_opportunity_profiles;
CREATE POLICY "update_partnership_profiles"
  ON partnership_opportunity_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = partnership_opportunity_profiles.opportunity_id
        AND o.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = partnership_opportunity_profiles.opportunity_id
        AND o.created_by = auth.uid()
    )
  );

-- DELETE: only opportunity owner
DROP POLICY IF EXISTS "delete_partnership_profiles" ON partnership_opportunity_profiles;
CREATE POLICY "delete_partnership_profiles"
  ON partnership_opportunity_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = partnership_opportunity_profiles.opportunity_id
        AND o.created_by = auth.uid()
    )
  );

-- Trigger: prevent partnership profile on non-partnership opportunities
CREATE OR REPLACE FUNCTION validate_partnership_profile() RETURNS trigger AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = NEW.opportunity_id
      AND (
        o.opportunity_type = 'partnership'
        OR o.operation_type = 'partnership'
      )
  ) THEN
    RAISE EXCEPTION 'لا يمكن إنشاء ملف شراكة لفرصة ليست من نوع شراكة';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_partnership_profile_check ON partnership_opportunity_profiles;
CREATE TRIGGER trg_partnership_profile_check
  BEFORE INSERT OR UPDATE ON partnership_opportunity_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_partnership_profile();

-- Trigger: updated_at
DROP TRIGGER IF EXISTS trg_partnership_profiles_updated_at ON partnership_opportunity_profiles;
CREATE TRIGGER trg_partnership_profiles_updated_at
  BEFORE UPDATE ON partnership_opportunity_profiles
  FOR EACH ROW
  EXECUTE FUNCTION storage.update_updated_at_column();
