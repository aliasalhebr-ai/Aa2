/*
# Phase 2 Final Corrections — Round 2

## 1. Hide palm-logistics sub_sector
- Set is_active = false on palm-logistics (keep in DB for Phase 3).
- Rule: no sub_sector shows to users unless it has at least one active operation.

## 2. Publisher entity ownership verification
- Add trigger function that verifies created_by owns publisher_entity_id
  when status transitions to pending_review.
- Blocks users from publishing under another user's entity.
- Drafts without publisher remain allowed.
- Admin override via service role (bypasses RLS, but trigger still runs —
  so we check: if created_by IS NULL, allow (admin/service role path).

## 3. Document publisher_entities as interim
- Add comment documenting this is a phase-2 interim table.
- Add entity membership/ownership columns if not present (already has owner_user_id).
*/

-- ── 1. Hide palm-logistics ─────────────────────────────────────
UPDATE sub_sectors SET is_active = false WHERE slug = 'palm-logistics';

-- ── 2. Ownership verification trigger ──────────────────────────
-- Drop existing trigger/function if any
DROP TRIGGER IF EXISTS verify_publisher_ownership ON opportunities;
DROP FUNCTION IF EXISTS verify_publisher_ownership();

CREATE OR REPLACE FUNCTION verify_publisher_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entity_owner uuid;
BEGIN
  -- Only check when status is pending_review
  IF NEW.status = 'pending_review' THEN
    -- Must have a publisher entity (CHECK constraint already enforces this,
    -- but we double-check here for clarity)
    IF NEW.publisher_entity_id IS NULL THEN
      RAISE EXCEPTION 'يجب اختيار جهة ناشرة قبل الإرسال للمراجعة';
    END IF;

    -- If created_by is NULL (service role / admin path), allow
    IF NEW.created_by IS NOT NULL THEN
      -- Verify the creator owns the publisher entity
      SELECT owner_user_id INTO entity_owner
      FROM publisher_entities
      WHERE id = NEW.publisher_entity_id AND is_active = true;

      IF entity_owner IS NULL THEN
        RAISE EXCEPTION 'الجهة الناشرة غير موجودة أو غير نشطة';
      END IF;

      IF entity_owner != NEW.created_by THEN
        RAISE EXCEPTION 'لا يمكنك النشر باسم جهة لا تملكها';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER verify_publisher_ownership
  BEFORE INSERT OR UPDATE ON opportunities
  FOR EACH ROW
  EXECUTE FUNCTION verify_publisher_ownership();

-- ── 3. Document publisher_entities as interim ──────────────────
COMMENT ON TABLE publisher_entities IS
  'Phase 2 interim table. Will be consolidated with central entities table in Phase 3. Stores publisher entity ownership (owner_user_id), entity type, verification status.';

COMMENT ON COLUMN publisher_entities.owner_user_id IS
  'User who owns this entity. Used for ownership verification when publishing opportunities.';
