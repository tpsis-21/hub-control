-- Complemento 0028: revoke também de PUBLIC (anon herdava EXECUTE via PUBLIC)

DO $$
DECLARE
  fn regprocedure;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
  END LOOP;
END $$;

REVOKE EXECUTE ON FUNCTION public.hub_control_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hub_control_is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
