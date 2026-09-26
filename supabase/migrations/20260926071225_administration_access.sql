-- Apply once in the SQL Editor after 001_schema.sql and 002_rls.sql.
BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
-- Keep the RLS helper outside the exposed API schema to avoid recursive profile RLS.
CREATE OR REPLACE FUNCTION private.active_employee()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active
  );
$$;
REVOKE ALL ON FUNCTION private.active_employee() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.active_employee() TO authenticated;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['departments', 'task_types', 'channels', 'marketing_ads', 'tasks', 'task_history'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS active_employee_guard ON public.%I', table_name);
    EXECUTE format('CREATE POLICY active_employee_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT private.active_employee())) WITH CHECK ((SELECT private.active_employee()))', table_name);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS profiles_active_employee_guard ON public.profiles;
CREATE POLICY profiles_active_employee_guard ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT private.active_employee()))
  WITH CHECK ((SELECT private.active_employee()));

-- Restrictive policies also protect against older permissive self-update policies.
DROP POLICY IF EXISTS profiles_admin_update_guard ON public.profiles;
CREATE POLICY profiles_admin_update_guard ON public.profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- No authenticated account may remove its own administrative access.
-- Validate reporting chains even when updates originate outside the application.
CREATE OR REPLACE FUNCTION public.guard_profile_administration()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF OLD.id = auth.uid() AND OLD.application_role = 'administrator'
     AND (NEW.application_role <> 'administrator' OR NOT NEW.is_active) THEN
    RAISE EXCEPTION 'Ask another administrator to change your administrative access.';
  END IF;
  IF NEW.manager_id IS DISTINCT FROM OLD.manager_id AND NEW.manager_id IS NOT NULL THEN
    IF EXISTS (
      WITH RECURSIVE chain AS (
        SELECT id, manager_id FROM public.profiles WHERE id = NEW.manager_id
        UNION
        SELECT p.id, p.manager_id FROM public.profiles p JOIN chain c ON p.id = c.manager_id
      ) SELECT 1 FROM chain WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'This manager creates a circular reporting hierarchy.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_profile_administration() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_profile_administration ON public.profiles;
CREATE TRIGGER guard_profile_administration BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_administration();

-- Invoker security: authentication, active-admin check, and existing RLS all apply.
CREATE OR REPLACE FUNCTION public.admin_update_profile(p_id uuid, p_changes jsonb)
RETURNS public.profiles LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result public.profiles;
BEGIN
  -- Serialize role/hierarchy changes made through this endpoint.
  PERFORM pg_catalog.pg_advisory_xact_lock(48291362);
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only active administrators can manage employees.' USING ERRCODE = '42501';
  END IF;
  IF p_changes ? 'full_name' AND length(trim(p_changes->>'full_name')) = 0 THEN
    RAISE EXCEPTION 'Full name is required.';
  END IF;
  UPDATE public.profiles SET
    full_name = CASE WHEN p_changes ? 'full_name' THEN trim(p_changes->>'full_name') ELSE full_name END,
    employee_code = CASE WHEN p_changes ? 'employee_code' THEN nullif(trim(p_changes->>'employee_code'), '') ELSE employee_code END,
    designation = CASE WHEN p_changes ? 'designation' THEN nullif(trim(p_changes->>'designation'), '') ELSE designation END,
    department_id = CASE WHEN p_changes ? 'department_id' THEN (p_changes->>'department_id')::uuid ELSE department_id END,
    manager_id = CASE WHEN p_changes ? 'manager_id' THEN (p_changes->>'manager_id')::uuid ELSE manager_id END,
    application_role = CASE WHEN p_changes ? 'application_role' THEN (p_changes->>'application_role')::public.app_role ELSE application_role END,
    is_active = CASE WHEN p_changes ? 'is_active' THEN (p_changes->>'is_active')::boolean ELSE is_active END
  WHERE id = p_id RETURNING * INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Employee profile was not found.'; END IF;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_profile(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, jsonb) TO authenticated;

-- Cycles in legacy data cannot cause unbounded recursion.
CREATE OR REPLACE FUNCTION public.is_manager_of(target_employee_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH RECURSIVE management_chain AS (
    SELECT manager_id AS ancestor_id FROM public.profiles
    WHERE id = target_employee_id AND manager_id IS NOT NULL
    UNION
    SELECT p.manager_id FROM public.profiles p
    JOIN management_chain mc ON p.id = mc.ancestor_id WHERE p.manager_id IS NOT NULL
  )
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active)
    AND EXISTS (SELECT 1 FROM management_chain WHERE ancestor_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_manager_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_manager_of(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
CREATE OR REPLACE FUNCTION public.administration_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND public.is_admin();
$$;
REVOKE ALL ON FUNCTION public.administration_ready() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.administration_ready() TO authenticated;
COMMIT;
