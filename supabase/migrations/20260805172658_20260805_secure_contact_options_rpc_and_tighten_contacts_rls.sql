/*
# Secure contact options RPC + tighten publisher_entity_contacts RLS

1. Create get_opportunity_contact_options(opportunity_id) RPC
   - Returns chat_available, whatsapp_available, whatsapp_url
   - Only returns whatsapp_url if whatsapp_enabled=true AND viewer is not the owner
   - Verifies opportunity is active OR viewer is authorized (owner/admin)
   - Verifies viewer is not the opportunity owner
   - Cleans the phone number before building wa.me link

2. Tighten publisher_entity_contacts RLS:
   - Remove blanket public SELECT
   - Only entity owner can SELECT their own contacts
   - Only entity owner can INSERT/UPDATE/DELETE
   - The RPC (SECURITY DEFINER) bypasses RLS to serve contact options safely
*/

-- ── 1. Create the RPC ──
CREATE OR REPLACE FUNCTION get_opportunity_contact_options(p_opportunity_id uuid)
RETURNS TABLE(
  chat_available boolean,
  whatsapp_available boolean,
  whatsapp_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_opportunity RECORD;
  v_contact RECORD;
  v_viewer_id uuid;
  v_is_admin boolean;
  v_cleaned_number text;
BEGIN
  v_viewer_id := auth.uid();

  -- Get the opportunity
  SELECT o.status, o.created_by, o.publisher_entity_id, o.title
  INTO v_opportunity
  FROM opportunities o
  WHERE o.id = p_opportunity_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, NULL::text;
    RETURN;
  END IF;

  -- Check if viewer is the owner of this opportunity
  IF v_viewer_id = v_opportunity.created_by THEN
    -- Owner should not see contact options for their own listing
    RETURN QUERY SELECT false, false, NULL::text;
    RETURN;
  END IF;

  -- Check authorization: opportunity must be active, OR viewer is admin
  v_is_admin := false;
  IF v_viewer_id IS NOT NULL THEN
    v_is_admin := (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
      OR (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
    );
  END IF;

  IF v_opportunity.status <> 'active' AND NOT v_is_admin AND v_viewer_id <> v_opportunity.created_by THEN
    RETURN QUERY SELECT false, false, NULL::text;
    RETURN;
  END IF;

  -- Get the contact settings for the publisher entity
  SELECT c.whatsapp_number, c.whatsapp_enabled, c.chat_enabled
  INTO v_contact
  FROM publisher_entity_contacts c
  WHERE c.publisher_entity_id = v_opportunity.publisher_entity_id;

  -- Build whatsapp_url only if enabled and number is valid
  v_cleaned_number := NULL;
  IF v_contact.whatsapp_enabled AND v_contact.whatsapp_number IS NOT NULL THEN
    v_cleaned_number := regexp_replace(v_contact.whatsapp_number, '[^\d]', '', 'g');
    IF length(v_cleaned_number) < 8 THEN
      v_cleaned_number := NULL;
    END IF;
  END IF;

  RETURN QUERY SELECT
    COALESCE(v_contact.chat_enabled, true),
    (v_contact.whatsapp_enabled AND v_cleaned_number IS NOT NULL),
    CASE
      WHEN v_contact.whatsapp_enabled AND v_cleaned_number IS NOT NULL
        THEN 'https://wa.me/' || v_cleaned_number || '?text=' || urlencode('استفسار حول: ' || v_opportunity.title)
      ELSE NULL
    END;

  RETURN;
END;
$$;

-- Grant execute to authenticated and anon (the function itself enforces visibility)
GRANT EXECUTE ON FUNCTION get_opportunity_contact_options(uuid) TO anon, authenticated;

-- ── 2. Tighten publisher_entity_contacts RLS ──

-- Remove the blanket public SELECT policy
DROP POLICY IF EXISTS "read_publisher_entity_contacts" ON publisher_entity_contacts;

-- Only the entity owner can SELECT their own contacts
DROP POLICY IF EXISTS "select_own_publisher_entity_contacts" ON publisher_entity_contacts;
CREATE POLICY "select_own_publisher_entity_contacts"
ON publisher_entity_contacts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.id = publisher_entity_id AND pe.owner_user_id = auth.uid()
  )
);

-- Only the entity owner can INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "manage_own_publisher_entity_contacts" ON publisher_entity_contacts;
CREATE POLICY "insert_own_publisher_entity_contacts"
ON publisher_entity_contacts FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.id = publisher_entity_id AND pe.owner_user_id = auth.uid()
  )
);

CREATE POLICY "update_own_publisher_entity_contacts"
ON publisher_entity_contacts FOR UPDATE
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

CREATE POLICY "delete_own_publisher_entity_contacts"
ON publisher_entity_contacts FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM publisher_entities pe
    WHERE pe.id = publisher_entity_id AND pe.owner_user_id = auth.uid()
  )
);
