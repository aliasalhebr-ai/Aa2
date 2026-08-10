/*
# Add V2 columns to opportunities

1. Purpose
   - Support Opportunity Template V2 fields on the opportunities table.
   - These columns coexist with the legacy `operation_type` column during the
     transition period. For V2 opportunities (nursery sector), `opportunity_type`
     is the primary source of truth. For legacy opportunities (palm sector),
     `operation_type` remains the source of truth.
   - `template_version` on each opportunity records which template created it,
     independent of the sector's current template version.

2. New Columns on `opportunities`
   - `opportunity_type` (text, nullable) — V2 type: 'offer', 'demand', 'partnership'.
   - `opportunity_timing` (text, nullable) — V2 timing: 'available_now', 'future_production', 'scheduled', 'flexible'.
   - `template_version` (smallint, NOT NULL, default 1) — 1 = Legacy, 2 = V2.
   - `updated_at` (timestamptz, default now()) — last modification time.

3. Constraints — CHECK on each new column.
4. Indexes — composite sector/sub_sector/status, plus individual V2 indexes.
5. Trigger — reuse storage.update_updated_at_column() for updated_at.
6. Compatibility — operation_type and type columns are NOT modified.
*/

-- Add columns
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS opportunity_type text;
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS opportunity_timing text;
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS template_version smallint NOT NULL DEFAULT 1;
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Constraints
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_opportunity_type_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_opportunity_type_check
  CHECK (opportunity_type IS NULL OR opportunity_type IN ('offer','demand','partnership'));

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_opportunity_timing_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_opportunity_timing_check
  CHECK (opportunity_timing IS NULL OR opportunity_timing IN ('available_now','future_production','scheduled','flexible'));

ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_template_version_check;
ALTER TABLE opportunities ADD CONSTRAINT opportunities_template_version_check
  CHECK (template_version IN (1, 2));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_opp_sector_subsector_status
  ON opportunities (sector_id, sub_sector_id, status);
CREATE INDEX IF NOT EXISTS idx_opp_opportunity_type
  ON opportunities (opportunity_type);
CREATE INDEX IF NOT EXISTS idx_opp_opportunity_timing
  ON opportunities (opportunity_timing);
CREATE INDEX IF NOT EXISTS idx_opp_publisher_entity
  ON opportunities (publisher_entity_id);
CREATE INDEX IF NOT EXISTS idx_opp_template_version
  ON opportunities (template_version);

-- Trigger for updated_at (function lives in storage schema)
DROP TRIGGER IF EXISTS trg_opportunities_updated_at ON opportunities;
CREATE TRIGGER trg_opportunities_updated_at
  BEFORE UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION storage.update_updated_at_column();
