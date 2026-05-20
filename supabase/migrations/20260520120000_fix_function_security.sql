-- Fix mutable search_path on all public functions
ALTER FUNCTION public.get_user_restaurant() SET search_path = '';
ALTER FUNCTION public.get_user_role() SET search_path = '';
ALTER FUNCTION public.is_admin() SET search_path = '';
ALTER FUNCTION public.update_last_seen() SET search_path = '';
ALTER FUNCTION public.set_updated_at() SET search_path = '';

-- Revoke execute from anon/public on all SECURITY DEFINER functions
-- (handle_new_user is a trigger — anon/authenticated should not call it directly)
REVOKE EXECUTE ON FUNCTION public.get_user_restaurant() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_last_seen() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;

-- Grant execute only to authenticated where needed
GRANT EXECUTE ON FUNCTION public.get_user_restaurant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_last_seen() TO authenticated;

-- handle_new_user is a trigger — only postgres/service_role should call it
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
