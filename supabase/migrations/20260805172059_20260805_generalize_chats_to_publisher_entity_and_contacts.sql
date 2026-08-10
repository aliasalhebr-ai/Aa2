/*
# Generalize chats to publisher_entity + add publisher_entity_contacts

1. Add publisher_entity_id to chats table (nullable, backfilled from opportunities)
2. Make company_id nullable (legacy data may not have a company)
3. Add publisher_entity_contacts table for entity-level WhatsApp/chat settings
4. Update RLS policies for opportunities to allow admin access via app_metadata
5. Update chat RLS to use publisher_entity_id
6. Update is_chat_participant to use publisher_entity_id
*/

-- ── 1. Add publisher_entity_id to chats ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'publisher_entity_id'
  ) THEN
    ALTER TABLE chats ADD COLUMN publisher_entity_id uuid REFERENCES publisher_entities(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill publisher_entity_id from opportunities
UPDATE chats c
SET publisher_entity_id = (
  SELECT o.publisher_entity_id FROM opportunities o WHERE o.id = c.opportunity_id
)
WHERE c.publisher_entity_id IS NULL;

-- Make company_id nullable
ALTER TABLE chats ALTER COLUMN company_id DROP NOT NULL;

-- Add index for publisher_entity_id lookups
CREATE INDEX IF NOT EXISTS idx_chats_publisher_entity ON chats(publisher_entity_id);

-- ── 2. publisher_entity_contacts table ──
CREATE TABLE IF NOT EXISTS publisher_entity_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_entity_id uuid NOT NULL REFERENCES publisher_entities(id) ON DELETE CASCADE,
  whatsapp_number text,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  chat_enabled boolean NOT NULL DEFAULT true,
  visibility_policy text NOT NULL DEFAULT 'private',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (publisher_entity_id)
);

ALTER TABLE publisher_entity_contacts ENABLE ROW LEVEL SECURITY;

-- Anyone can read contact info (needed to show WhatsApp button on listings)
DROP POLICY IF EXISTS "read_publisher_entity_contacts" ON publisher_entity_contacts;
CREATE POLICY "read_publisher_entity_contacts"
ON publisher_entity_contacts FOR SELECT
TO anon, authenticated
USING (true);

-- Only the entity owner can insert/update their contact settings
DROP POLICY IF EXISTS "manage_own_publisher_entity_contacts" ON publisher_entity_contacts;
CREATE POLICY "manage_own_publisher_entity_contacts"
ON publisher_entity_contacts FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.id = publisher_entity_id AND pe.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.id = publisher_entity_id AND pe.owner_user_id = auth.uid()
  )
);

-- ── 3. Update opportunities RLS to allow admin access ──
DROP POLICY IF EXISTS "read_opportunities" ON opportunities;
CREATE POLICY "read_opportunities"
ON opportunities FOR SELECT
TO anon, authenticated
USING (
  status = 'active'
  OR (auth.uid() IS NOT NULL AND created_by = auth.uid())
  OR (
    auth.uid() IS NOT NULL
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
      OR (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
    )
  )
);

-- ── 4. Update is_chat_participant to use publisher_entity_id ──
CREATE OR REPLACE FUNCTION is_chat_participant(p_chat_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chats c
    WHERE c.id = p_chat_id
    AND (
      c.customer_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM publisher_entities pe
        WHERE pe.owner_user_id = auth.uid()
        AND pe.id = c.publisher_entity_id
      )
      OR (
        c.publisher_entity_id IS NULL
        AND EXISTS (
          SELECT 1 FROM opportunities o
          WHERE o.id = c.opportunity_id
          AND o.publisher_entity_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM publisher_entities pe
            WHERE pe.owner_user_id = auth.uid()
            AND pe.id = o.publisher_entity_id
          )
        )
      )
    )
  );
$$;

-- ── 5. Update chat RLS to use publisher_entity_id ──
DROP POLICY IF EXISTS "select_own_chats" ON chats;
CREATE POLICY "select_own_chats"
ON chats FOR SELECT
TO authenticated
USING (
  customer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.owner_user_id = auth.uid()
    AND pe.id = chats.publisher_entity_id
  )
  OR (
    chats.publisher_entity_id IS NULL
    AND EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = chats.opportunity_id
      AND EXISTS (
        SELECT 1 FROM publisher_entities pe
        WHERE pe.owner_user_id = auth.uid()
        AND pe.id = o.publisher_entity_id
      )
    )
  )
);

DROP POLICY IF EXISTS "insert_own_chats" ON chats;
CREATE POLICY "insert_own_chats"
ON chats FOR INSERT
TO authenticated
WITH CHECK (
  customer_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = chats.opportunity_id
    AND o.status = 'active'
  )
);

DROP POLICY IF EXISTS "update_own_chats" ON chats;
CREATE POLICY "update_own_chats"
ON chats FOR UPDATE
TO authenticated
USING (
  customer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.owner_user_id = auth.uid()
    AND pe.id = chats.publisher_entity_id
  )
)
WITH CHECK (
  customer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.owner_user_id = auth.uid()
    AND pe.id = chats.publisher_entity_id
  )
);

-- ── 6. Trigger for publisher_entity_contacts updated_at ──
CREATE OR REPLACE FUNCTION update_publisher_entity_contacts_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_publisher_entity_contacts ON publisher_entity_contacts;
CREATE TRIGGER trg_update_publisher_entity_contacts
BEFORE UPDATE ON publisher_entity_contacts
FOR EACH ROW EXECUTE FUNCTION update_publisher_entity_contacts_timestamp();
