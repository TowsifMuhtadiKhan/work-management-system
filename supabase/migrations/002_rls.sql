-- ============================================================
-- FILE: 002_rls.sql
-- PROJECT: Desh TV Digital Content Management System
-- DESCRIPTION: Row Level Security — enable RLS, helper functions,
--              GRANT statements, and all table policies.
-- RUN ORDER: 2 of 3  (run after 001_schema.sql)
-- ============================================================


-- ============================================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================

ALTER TABLE public.departments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_types    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. HELPER FUNCTIONS  (SECURITY DEFINER, SET search_path = public)
-- ============================================================

-- -----------------------------------------------------------
-- 2.1  is_admin() — true when the calling user is an active administrator
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND application_role = 'administrator'
      AND is_active = TRUE
  );
$$;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns TRUE when the calling authenticated user has the administrator role and is active.';


-- -----------------------------------------------------------
-- 2.2  get_my_role() — returns the app_role of the calling user
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT application_role
  FROM public.profiles
  WHERE id = auth.uid()
    AND is_active = TRUE;
$$;

COMMENT ON FUNCTION public.get_my_role() IS
  'Returns the app_role enum value for the calling authenticated user.';


-- -----------------------------------------------------------
-- 2.3  is_manager_of(target_employee_id UUID)
--      Walks the manager_id chain upward via a recursive CTE.
--      Returns TRUE if auth.uid() appears anywhere in the management
--      ancestry of target_employee_id.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_manager_of(target_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE management_chain AS (
    -- Seed: start from the target employee's direct manager
    SELECT manager_id AS ancestor_id
    FROM public.profiles
    WHERE id = target_employee_id
      AND manager_id IS NOT NULL

    UNION ALL

    -- Recurse: walk up each ancestor's manager
    SELECT p.manager_id
    FROM public.profiles p
    INNER JOIN management_chain mc ON p.id = mc.ancestor_id
    WHERE p.manager_id IS NOT NULL
  )
  SELECT EXISTS (
    SELECT 1 FROM management_chain
    WHERE ancestor_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.is_manager_of(UUID) IS
  'Returns TRUE when auth.uid() is a direct or indirect manager of target_employee_id.';


-- -----------------------------------------------------------
-- 2.4  can_edit_task(task_assigned_to UUID)
--      Master permission check for task mutation.
--      Allows: the assigned employee themselves, any admin,
--              or any manager in their ancestry chain.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_edit_task(task_assigned_to UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    auth.uid() = task_assigned_to
    OR public.is_admin()
    OR public.is_manager_of(task_assigned_to)
  );
$$;

COMMENT ON FUNCTION public.can_edit_task(UUID) IS
  'Returns TRUE when the calling user is allowed to modify a task assigned to task_assigned_to.';


-- -----------------------------------------------------------
-- 2.5  can_create_task()
--      Returns TRUE for team_lead, manager, or administrator.
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_create_task()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = TRUE
      AND application_role IN ('administrator', 'manager', 'team_lead')
  );
$$;

COMMENT ON FUNCTION public.can_create_task() IS
  'Returns TRUE when the calling user has at least team_lead privileges.';


-- ============================================================
-- 3. GRANT STATEMENTS
--    Allow the PostgREST / authenticated role to access tables
--    and execute the helper functions.
-- ============================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role()             TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_of(UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_task(UUID)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_create_task()         TO authenticated;


-- ============================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ============================================================

-- -----------------------------------------------------------
-- 4.1  departments
-- -----------------------------------------------------------

-- Any authenticated user may read all departments
CREATE POLICY "departments_select_authenticated" ON public.departments
  FOR SELECT TO authenticated
  USING (TRUE);

-- Only administrators may insert new departments
CREATE POLICY "departments_insert_admin" ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- Only administrators may update departments
CREATE POLICY "departments_update_admin" ON public.departments
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Only administrators may delete departments
CREATE POLICY "departments_delete_admin" ON public.departments
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- -----------------------------------------------------------
-- 4.2  profiles
-- -----------------------------------------------------------

-- Any authenticated user may read all profiles
CREATE POLICY "profiles_select_authenticated" ON public.profiles
  FOR SELECT TO authenticated
  USING (TRUE);

-- Only administrators may insert profiles directly
-- (the handle_new_user trigger runs as SECURITY DEFINER and bypasses RLS)
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- A user may update their own profile; admins may update any profile
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- Only administrators may delete profiles
CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- -----------------------------------------------------------
-- 4.3  task_types
-- -----------------------------------------------------------

CREATE POLICY "task_types_select_authenticated" ON public.task_types
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "task_types_insert_admin" ON public.task_types
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "task_types_update_admin" ON public.task_types
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "task_types_delete_admin" ON public.task_types
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- -----------------------------------------------------------
-- 4.4  channels
-- -----------------------------------------------------------

CREATE POLICY "channels_select_authenticated" ON public.channels
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "channels_insert_admin" ON public.channels
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "channels_update_admin" ON public.channels
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "channels_delete_admin" ON public.channels
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- -----------------------------------------------------------
-- 4.5  marketing_ads
-- -----------------------------------------------------------

CREATE POLICY "marketing_ads_select_authenticated" ON public.marketing_ads
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY "marketing_ads_insert_admin" ON public.marketing_ads
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "marketing_ads_update_admin" ON public.marketing_ads
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "marketing_ads_delete_admin" ON public.marketing_ads
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- -----------------------------------------------------------
-- 4.6  tasks
-- -----------------------------------------------------------

-- Every authenticated user can view all tasks (e.g. for shared dashboards)
CREATE POLICY "tasks_select_authenticated" ON public.tasks
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Only team_lead and above can create tasks
CREATE POLICY "tasks_insert_team_lead_above" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (public.can_create_task());

-- Assigned employee, their direct/indirect managers, or admins can update
CREATE POLICY "tasks_update_hierarchy" ON public.tasks
  FOR UPDATE TO authenticated
  USING (public.can_edit_task(assigned_to))
  WITH CHECK (public.can_edit_task(assigned_to));

-- Only admins can delete tasks
CREATE POLICY "tasks_delete_admin" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.is_admin());


-- -----------------------------------------------------------
-- 4.7  task_history  (append-only audit log)
-- -----------------------------------------------------------

-- All authenticated users can read the full audit trail
CREATE POLICY "task_history_select_authenticated" ON public.task_history
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Any authenticated user (and the SECURITY DEFINER triggers) can insert
CREATE POLICY "task_history_insert_authenticated" ON public.task_history
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- No UPDATE or DELETE policies — the log is intentionally append-only
