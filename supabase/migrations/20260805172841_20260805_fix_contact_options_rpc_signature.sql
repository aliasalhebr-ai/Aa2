-- Drop old RPC with different return type, recreate with new signature
DROP FUNCTION IF EXISTS get_opportunity_contact_options(uuid);

CREATE FUNCTION get_opportunity_contact_options(p_opportunity_id uuid)
RETURNS TABLE(
  chat_available boolean,
  whatsapp_available boolean,
  whatsapp_number text,
  whatsapp_message text
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

  SELECT o.status, o.created_by, o.publisher_entity_id, o.title
  INTO v_opportunity
  FROM opportunities o
  WHERE o.id = p_opportunity_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF v_viewer_id = v_opportunity.created_by THEN
    RETURN QUERY SELECT false, false, NULL::text, NULL::text;
    RETURN;
  END IF;

  v_is_admin := false;
  IF v_viewer_id IS NOT NULL THEN
    v_is_admin := (
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR (auth.jwt() -> 'app_metadata' ->> 'is_admin') = 'true'
      OR (auth.jwt() -> 'app_metadata' ->> 'is_super_admin') = 'true'
    );
  END IF;

  IF v_opportunity.status <> 'active' AND NOT v_is_admin AND v_viewer_id <> v_opportunity.created_by THEN
    RETURN QUERY SELECT false, false, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT c.whatsapp_number, c.whatsapp_enabled, c.chat_enabled
  INTO v_contact
  FROM publisher_entity_contacts c
  WHERE c.publisher_entity_id = v_opportunity.publisher_entity_id;

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
    v_cleaned_number,
    CASE
      WHEN v_contact.whatsapp_enabled AND v_cleaned_number IS NOT NULL
        THEN 'استفسار حول: ' || v_opportunity.title
      ELSE NULL
    END;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION get_opportunity_contact_options(uuid) TO anon, authenticated;
