/*
# Fix: Move factory investment opportunity to palm-projects

## Problem
The opportunity "فرصة استثمار في مصنع تعبئة تمور" was originally linked to the
"المصانع" (factories) sub-sector, which was repurposed to "مخلفات النخيل"
(palm-residues). Semantically, a factory investment opportunity does NOT belong
in palm residues — it belongs in "نخيل المشاريع" (palm-projects).

## Fix
Update the sub_sector_id of this single opportunity from palm-residues
(7f56b186-0755-42c0-a4a1-113e5717dde7) to palm-projects
(bccaaa64-539d-42fd-9abb-614acc24c7b8).
*/

UPDATE opportunities
SET sub_sector_id = 'bccaaa64-539d-42fd-9abb-614acc24c7b8'
WHERE id = 'e3c302c3-a797-425b-b306-40a209bbe8f7'
  AND sub_sector_id = '7f56b186-0755-42c0-a4a1-113e5717dde7';
