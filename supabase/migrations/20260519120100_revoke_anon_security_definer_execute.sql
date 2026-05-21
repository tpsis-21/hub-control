-- Revoga execução pública de RPCs SECURITY DEFINER (advisors 0028/0029)

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
      AND p.proname <> 'hub_control_is_admin'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn);
  END LOOP;
END
$$;
