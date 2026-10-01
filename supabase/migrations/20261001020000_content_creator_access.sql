-- Restrict Content Creator packages to that department and administrators.
-- Only an incharge (manager/team lead) or administrator may change approval_state.
BEGIN;

CREATE OR REPLACE FUNCTION private.guard_content_package_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor_profile record;
  is_content_creator_department boolean;
BEGIN
  SELECT p.application_role, lower(btrim(d.name)) AS department_name
    INTO actor_profile
  FROM public.profiles p
  LEFT JOIN public.departments d ON d.id = p.department_id
  WHERE p.id = auth.uid() AND p.is_active;

  is_content_creator_department := actor_profile.department_name IN ('content creator', 'content creator team');

  IF actor_profile.application_role IS NULL
    OR (actor_profile.application_role <> 'administrator' AND NOT is_content_creator_department) THEN
    RAISE EXCEPTION 'Only Content Creator team members and administrators can use Content Creator packages.'
      USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE'
    AND NEW.approval_state IS DISTINCT FROM OLD.approval_state
    AND actor_profile.application_role NOT IN ('administrator', 'manager', 'team_lead') THEN
    RAISE EXCEPTION 'Only a Content Creator incharge or administrator can change approval.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_content_package_access() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_content_package_access ON public.content_packages;
CREATE TRIGGER guard_content_package_access
  BEFORE INSERT OR UPDATE ON public.content_packages
  FOR EACH ROW EXECUTE FUNCTION private.guard_content_package_access();

DROP POLICY IF EXISTS content_read ON public.content_packages;
CREATE POLICY content_read ON public.content_packages FOR SELECT TO authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.departments d ON d.id = p.department_id
      WHERE p.id = (SELECT auth.uid())
        AND p.is_active
        AND d.is_active
        AND lower(btrim(d.name)) IN ('content creator', 'content creator team')
    )
  );

DROP POLICY IF EXISTS content_create ON public.content_packages;
CREATE POLICY content_create ON public.content_packages FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_admin())
    OR (
      creator_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        JOIN public.departments d ON d.id = p.department_id
        WHERE p.id = (SELECT auth.uid())
          AND p.is_active
          AND d.is_active
          AND lower(btrim(d.name)) IN ('content creator', 'content creator team')
      )
    )
  );

DROP POLICY IF EXISTS content_update ON public.content_packages;
CREATE POLICY content_update ON public.content_packages FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.departments d ON d.id = p.department_id
      WHERE p.id = (SELECT auth.uid())
        AND p.is_active
        AND d.is_active
        AND lower(btrim(d.name)) IN ('content creator', 'content creator team')
    )
  )
  WITH CHECK (
    (SELECT public.is_admin())
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      JOIN public.departments d ON d.id = p.department_id
      WHERE p.id = (SELECT auth.uid())
        AND p.is_active
        AND d.is_active
        AND lower(btrim(d.name)) IN ('content creator', 'content creator team')
    )
  );

NOTIFY pgrst, 'reload schema';
COMMIT;