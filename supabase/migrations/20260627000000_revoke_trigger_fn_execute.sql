-- Trigger functions are not meant to be called via RPC.
-- Revoke EXECUTE from public roles to suppress Supabase security warnings.
REVOKE EXECUTE ON FUNCTION public.enforce_task_insert_done_by() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_task_update_columns() FROM anon, authenticated;
