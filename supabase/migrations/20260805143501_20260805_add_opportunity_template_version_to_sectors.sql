/*
# Add opportunity_template_version to sectors

1. Purpose
   - Each sector now declares which opportunity template engine it uses.
   - 1 = Legacy Template (current palm sector behavior).
   - 2 = Opportunity Template V2 (nursery sector and future sectors).
   - The value is stored in the database so it can be changed administratively
     without code changes or slug matching.

2. Changes
   - Add column `opportunity_template_version` (smallint, NOT NULL, default 1) to `sectors`.
   - Set palm sector = 1 (Legacy).
   - Set nursery sector = 2 (V2).
   - All other sectors remain = 1.

3. Security
   - No RLS changes (sectors already has RLS enabled).
   - No new policies needed — the column is read alongside existing sector data.
*/

ALTER TABLE sectors
  ADD COLUMN IF NOT EXISTS opportunity_template_version smallint NOT NULL DEFAULT 1;

-- Palm sector = Legacy (1) — explicit
UPDATE sectors
  SET opportunity_template_version = 1
  WHERE slug = 'palm';

-- Nursery sector = V2 (2)
UPDATE sectors
  SET opportunity_template_version = 2
  WHERE slug = 'nursery';

-- All other sectors = Legacy (1) — already the default, but make explicit
UPDATE sectors
  SET opportunity_template_version = 1
  WHERE slug NOT IN ('palm', 'nursery');
