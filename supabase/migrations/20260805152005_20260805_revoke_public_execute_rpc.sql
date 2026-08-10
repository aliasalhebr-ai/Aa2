/*
# Revoke EXECUTE on create_v2_opportunity from PUBLIC and anon

The prior migration revoked from anon, but PostgreSQL grants EXECUTE to PUBLIC
by default. The Supabase advisor flagged that anon can still call the function
via the REST API. This migration explicitly revokes from PUBLIC and re-grants
only to authenticated.
*/

REVOKE EXECUTE ON FUNCTION public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid
) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid
) FROM anon;

GRANT EXECUTE ON FUNCTION public.create_v2_opportunity(
  uuid, uuid, text, integer, text, text, text, text[], jsonb, text, uuid
) TO authenticated;
