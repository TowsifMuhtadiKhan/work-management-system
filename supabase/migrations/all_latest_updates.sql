-- ============================================================
-- CONSOLIDATED LATEST UPDATES (IDEMPOTENT & SAFE TO RE-RUN)
-- ============================================================

BEGIN;

-- 1. Private schema for security functions
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.active_employee()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active
  );
$$;
REVOKE ALL ON FUNCTION private.active_employee() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.active_employee() TO authenticated;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['departments', 'task_types', 'channels', 'marketing_ads', 'tasks', 'task_history'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS active_employee_guard ON public.%I', tbl);
    EXECUTE format('CREATE POLICY active_employee_guard ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT private.active_employee())) WITH CHECK ((SELECT private.active_employee()))', tbl);
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS profiles_active_employee_guard ON public.profiles;
CREATE POLICY profiles_active_employee_guard ON public.profiles
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (id = (SELECT auth.uid()) OR (SELECT private.active_employee()))
  WITH CHECK ((SELECT private.active_employee()));

DROP POLICY IF EXISTS profiles_admin_update_guard ON public.profiles;
CREATE POLICY profiles_admin_update_guard ON public.profiles
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.guard_profile_administration()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF OLD.application_role = 'administrator' AND NEW.application_role <> 'administrator' AND OLD.id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot remove their own administrator access.' USING ERRCODE = '42501';
  END IF;
  IF OLD.is_active AND NOT NEW.is_active AND OLD.id = auth.uid() THEN
    RAISE EXCEPTION 'Administrators cannot deactivate their own account.' USING ERRCODE = '42501';
  END IF;
  IF (OLD.application_role IS DISTINCT FROM NEW.application_role
      OR OLD.manager_id IS DISTINCT FROM NEW.manager_id
      OR OLD.is_active IS DISTINCT FROM NEW.is_active)
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an administrator can change roles, managers, or active status.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_profile_administration() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_profile_administration ON public.profiles;
CREATE TRIGGER guard_profile_administration BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_administration();

CREATE OR REPLACE FUNCTION public.admin_update_profile(p_id uuid, p_changes jsonb)
RETURNS public.profiles LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE result public.profiles;
BEGIN
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

-- 2. Time Slot column on tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS time_slot text
  CHECK (time_slot IS NULL OR time_slot IN (
    '07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00',
    '15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00','00:00','card'));
COMMENT ON COLUMN public.tasks.time_slot IS 'Editorial work-date section; midnight belongs to the selected work date. NULL means unscheduled.';

CREATE OR REPLACE FUNCTION public.record_task_time_slot_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.time_slot IS DISTINCT FROM NEW.time_slot THEN
    INSERT INTO public.task_history(task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, coalesce(NEW.updated_by, NEW.assigned_to), 'time_slot', OLD.time_slot, NEW.time_slot);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_task_time_slot_change() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_task_time_slot_change ON public.tasks;
CREATE TRIGGER trg_task_time_slot_change AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.record_task_time_slot_change();

-- 3. Task completion guard
CREATE OR REPLACE FUNCTION public.guard_task_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF NEW.status = 'done' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
      IF auth.uid() IS NULL OR NEW.assigned_to IS DISTINCT FROM auth.uid()
         OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active) THEN
        RAISE EXCEPTION 'Only the assigned user can mark this task as done.' USING ERRCODE = '42501';
      END IF;
      IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Save the assignment before marking the task as done.' USING ERRCODE = '42501';
      END IF;
      NEW.updated_by := auth.uid();
    END IF;
  END IF;
  IF NEW.status = 'done' THEN
    IF coalesce(regexp_replace(regexp_replace(NEW.caption, '^<!--caption-rich-v1-->', ''), '<[^>]+>', '', 'g'), '') !~ '[^[:space:]]' THEN
      RAISE EXCEPTION 'Add a caption before marking this task as done.' USING ERRCODE = '23514';
    END IF;
    IF coalesce(NEW.youtube_link, '') !~ '[^[:space:]]' THEN
      RAISE EXCEPTION 'Add a YouTube link before marking this task as done.' USING ERRCODE = '23514';
    END IF;
    IF coalesce(NEW.facebook_link, '') !~ '[^[:space:]]' THEN
      RAISE EXCEPTION 'Add a Facebook link before marking this task as done.' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_task_completion() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_task_completion ON public.tasks;
CREATE TRIGGER guard_task_completion BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.guard_task_completion();

-- 4. Rush Entries table
CREATE TABLE IF NOT EXISTS public.rush_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter text NOT NULL CHECK (char_length(btrim(reporter)) BETWEEN 1 AND 300),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 300),
  status text NOT NULL DEFAULT 'Pending' CHECK (char_length(btrim(status)) BETWEEN 1 AND 100),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rush_entries_created_by_idx ON public.rush_entries(created_by);
ALTER TABLE public.rush_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rush_entries FROM anon, authenticated;
GRANT SELECT, INSERT ON public.rush_entries TO authenticated;
GRANT UPDATE (reporter, name, status) ON public.rush_entries TO authenticated;

DROP POLICY IF EXISTS rush_active_employee ON public.rush_entries;
CREATE POLICY rush_active_employee ON public.rush_entries AS RESTRICTIVE
  FOR ALL TO authenticated
  USING ((SELECT private.active_employee()))
  WITH CHECK ((SELECT private.active_employee()));

DROP POLICY IF EXISTS rush_read ON public.rush_entries;
CREATE POLICY rush_read ON public.rush_entries FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS rush_insert ON public.rush_entries;
CREATE POLICY rush_insert ON public.rush_entries FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS rush_update ON public.rush_entries;
CREATE POLICY rush_update ON public.rush_entries FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  WITH CHECK (created_by = (SELECT auth.uid()) OR (SELECT public.is_admin()));

-- 5. Content Creator & Approval Workflow
CREATE TABLE IF NOT EXISTS public.content_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_name text NOT NULL CHECK (char_length(btrim(package_name)) BETWEEN 1 AND 300),
  creator_id uuid NOT NULL REFERENCES public.profiles(id),
  approver_id uuid NOT NULL REFERENCES public.profiles(id),
  caption text NOT NULL DEFAULT '',
  thumbnail_url text NOT NULL DEFAULT '' CHECK (thumbnail_url = '' OR thumbnail_url ~ '^https?://[^[:space:]]+$'),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'changes_requested', 'approved')),
  feedback text NOT NULL DEFAULT '',
  work_date date,
  time_slot text,
  task_type_id uuid REFERENCES public.task_types(id),
  assigned_to uuid REFERENCES public.profiles(id),
  task_id uuid UNIQUE REFERENCES public.tasks(id) ON DELETE RESTRICT,
  reviewed_by uuid REFERENCES public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (creator_id <> approver_id)
);
CREATE INDEX IF NOT EXISTS content_packages_creator_idx ON public.content_packages(creator_id);
CREATE INDEX IF NOT EXISTS content_packages_approver_status_idx ON public.content_packages(approver_id, status);
CREATE INDEX IF NOT EXISTS content_packages_type_idx ON public.content_packages(task_type_id);
CREATE INDEX IF NOT EXISTS content_packages_assignee_idx ON public.content_packages(assigned_to);
CREATE INDEX IF NOT EXISTS content_packages_reviewer_idx ON public.content_packages(reviewed_by);

ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS source_content_id uuid UNIQUE REFERENCES public.content_packages(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.content_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.content_packages(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL CHECK (action IN ('submitted', 'feedback', 'changes_requested', 'approved')),
  feedback text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_reviews_package_idx ON public.content_reviews(package_id, created_at);
CREATE INDEX IF NOT EXISTS content_reviews_reviewer_idx ON public.content_reviews(reviewer_id);

ALTER TABLE public.content_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_packages, public.content_reviews FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.content_packages TO authenticated;
GRANT SELECT, INSERT ON public.content_reviews TO authenticated;

DROP POLICY IF EXISTS content_active ON public.content_packages;
CREATE POLICY content_active ON public.content_packages AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT private.active_employee())) WITH CHECK ((SELECT private.active_employee()));

DROP POLICY IF EXISTS content_read ON public.content_packages;
CREATE POLICY content_read ON public.content_packages FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS content_create ON public.content_packages;
CREATE POLICY content_create ON public.content_packages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = creator_id AND is_active)
  );

DROP POLICY IF EXISTS content_update ON public.content_packages;
CREATE POLICY content_update ON public.content_packages FOR UPDATE TO authenticated
  USING (creator_id = (SELECT auth.uid()) OR approver_id = (SELECT auth.uid()) OR (SELECT public.is_admin()) OR (SELECT public.can_create_task()))
  WITH CHECK (creator_id = (SELECT auth.uid()) OR approver_id = (SELECT auth.uid()) OR (SELECT public.is_admin()) OR (SELECT public.can_create_task()));

DROP POLICY IF EXISTS content_reviews_read ON public.content_reviews;
CREATE POLICY content_reviews_read ON public.content_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.content_packages p WHERE p.id = package_id));

DROP POLICY IF EXISTS content_reviews_insert ON public.content_reviews;
CREATE POLICY content_reviews_insert ON public.content_reviews FOR INSERT TO authenticated
  WITH CHECK (pg_trigger_depth() > 0 AND reviewer_id = (SELECT auth.uid()) AND (SELECT private.active_employee())
    AND EXISTS (SELECT 1 FROM public.content_packages p WHERE p.id = package_id));

DROP POLICY IF EXISTS tasks_insert_content_approval ON public.tasks;
CREATE POLICY tasks_insert_content_approval ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.content_packages p
    WHERE p.id = source_content_id AND p.approver_id = (SELECT auth.uid()) AND p.status = 'submitted'
  ));

CREATE OR REPLACE FUNCTION private.guard_content_task_source() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.source_content_id IS DISTINCT FROM OLD.source_content_id THEN
      RAISE EXCEPTION 'The content source cannot be changed.';
    END IF;
  ELSIF NEW.source_content_id IS NOT NULL AND pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'Content tasks must be created by approving a package.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_content_task_source() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_content_task_source ON public.tasks;
CREATE TRIGGER guard_content_task_source BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION private.guard_content_task_source();

CREATE OR REPLACE FUNCTION private.guard_content_package() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  v_creator_name text;
  v_remark text;
BEGIN
  IF actor IS NULL OR NOT private.active_employee() THEN
    RAISE EXCEPTION 'An active employee account is required.' USING ERRCODE = '42501';
  END IF;
  NEW.package_name := btrim(NEW.package_name);
  NEW.thumbnail_url := btrim(NEW.thumbnail_url);
  NEW.updated_at := now();
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.approver_id AND is_active) THEN
    RAISE EXCEPTION 'Select an active approver.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.creator_id AND is_active) THEN
    RAISE EXCEPTION 'Select an active creator.';
  END IF;
  IF NEW.creator_id = NEW.approver_id THEN
    RAISE EXCEPTION 'Creator and approver must be different people.';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'submitted') THEN
      RAISE EXCEPTION 'Create a draft or submit it for approval.' USING ERRCODE = '42501';
    END IF;
    NEW.feedback := ''; NEW.task_id := NULL; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
    NEW.work_date := NULL; NEW.time_slot := NULL; NEW.task_type_id := NULL; NEW.assigned_to := NULL;
    NEW.created_at := now();
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.task_id IS DISTINCT FROM OLD.task_id
    OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'Package identity and review metadata cannot be changed.';
  END IF;
  IF OLD.status = 'approved' THEN
    RAISE EXCEPTION 'This package has already been approved.';
  END IF;
  IF (actor = OLD.creator_id OR public.is_admin() OR public.can_create_task()) AND OLD.status IN ('draft', 'changes_requested') THEN
    IF NEW.status NOT IN ('draft', 'submitted', 'changes_requested') OR (OLD.status = 'draft' AND NEW.status = 'changes_requested')
      OR NEW.feedback IS DISTINCT FROM OLD.feedback
      OR ROW(NEW.work_date, NEW.time_slot, NEW.task_type_id, NEW.assigned_to) IS DISTINCT FROM ROW(OLD.work_date, OLD.time_slot, OLD.task_type_id, OLD.assigned_to) THEN
      RAISE EXCEPTION 'Creators can edit and submit packages, but cannot approve them.' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;
  IF actor <> OLD.approver_id OR OLD.status <> 'submitted' THEN
    RAISE EXCEPTION 'Only the selected approver can review a submitted package.' USING ERRCODE = '42501';
  END IF;
  IF ROW(NEW.package_name, NEW.creator_id, NEW.approver_id, NEW.caption, NEW.thumbnail_url)
     IS DISTINCT FROM ROW(OLD.package_name, OLD.creator_id, OLD.approver_id, OLD.caption, OLD.thumbnail_url) THEN
    RAISE EXCEPTION 'Request changes to let the creator revise package content.';
  END IF;
  IF NEW.status NOT IN ('submitted', 'changes_requested', 'approved') THEN
    RAISE EXCEPTION 'Choose feedback, request changes, or approval.';
  END IF;
  NEW.feedback := btrim(NEW.feedback);
  IF NEW.status <> 'approved' AND NEW.feedback !~ '[^[:space:]]' THEN
    RAISE EXCEPTION 'Enter feedback before sending your review.';
  END IF;
  NEW.reviewed_by := actor; NEW.reviewed_at := now();
  IF NEW.status = 'approved' THEN
    IF NEW.work_date IS NULL OR NEW.task_type_id IS NULL OR NEW.assigned_to IS NULL THEN
      RAISE EXCEPTION 'Choose a work date, task type, and assigned person.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.task_types WHERE id = NEW.task_type_id AND is_active)
      OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.assigned_to AND is_active) THEN
      RAISE EXCEPTION 'Choose an active task type and assigned person.';
    END IF;

    SELECT full_name INTO v_creator_name FROM public.profiles WHERE id = NEW.creator_id;
    IF v_creator_name IS NULL OR v_creator_name !~ '[^[:space:]]' THEN
      v_creator_name := 'Creator';
    END IF;

    IF NEW.thumbnail_url IS NOT NULL AND btrim(NEW.thumbnail_url) <> '' THEN
      v_remark := v_creator_name || ' Thumb: ' || btrim(NEW.thumbnail_url);
    ELSE
      v_remark := v_creator_name;
    END IF;

    INSERT INTO public.tasks(
      work_date, time_slot, file_name, task_type_id, assigned_to,
      status, caption, remarks, priority, created_by, source_content_id
    )
    VALUES (
      NEW.work_date, NEW.time_slot, NEW.package_name, NEW.task_type_id, NEW.assigned_to,
      'pending', NEW.caption, v_remark, 'normal', actor, NEW.id
    )
    RETURNING id INTO NEW.task_id;
  ELSE
    NEW.work_date := OLD.work_date; NEW.time_slot := OLD.time_slot;
    NEW.task_type_id := OLD.task_type_id; NEW.assigned_to := OLD.assigned_to;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_content_package() FROM PUBLIC;
DROP TRIGGER IF EXISTS guard_content_package ON public.content_packages;
CREATE TRIGGER guard_content_package BEFORE INSERT OR UPDATE ON public.content_packages
  FOR EACH ROW EXECUTE FUNCTION private.guard_content_package();

CREATE OR REPLACE FUNCTION private.record_content_review() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'submitted' THEN
      INSERT INTO public.content_reviews(package_id, reviewer_id, action) VALUES (NEW.id, auth.uid(), 'submitted');
    END IF;
  ELSIF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('submitted', 'changes_requested', 'approved') THEN
    INSERT INTO public.content_reviews(package_id, reviewer_id, action, feedback)
    VALUES (NEW.id, auth.uid(), NEW.status, CASE WHEN NEW.status = 'submitted' THEN '' ELSE NEW.feedback END);
  ELSIF NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    INSERT INTO public.content_reviews(package_id, reviewer_id, action, feedback) VALUES (NEW.id, auth.uid(), 'feedback', NEW.feedback);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.record_content_review() FROM PUBLIC;
DROP TRIGGER IF EXISTS record_content_review ON public.content_packages;
CREATE TRIGGER record_content_review AFTER INSERT OR UPDATE ON public.content_packages
  FOR EACH ROW EXECUTE FUNCTION private.record_content_review();

-- Add color_hex to public.channels
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS color_hex TEXT DEFAULT '#3B82F6';

UPDATE public.channels
SET color_hex = CASE
  WHEN LOWER(name) LIKE '%facebook%' OR LOWER(platform) = 'facebook' THEN '#1877F2'
  WHEN LOWER(name) LIKE '%youtube%' OR LOWER(platform) = 'youtube' THEN '#FF0000'
  WHEN LOWER(name) LIKE '%web%' OR LOWER(platform) = 'web' THEN '#059669'
  WHEN LOWER(name) LIKE '%tv%' OR LOWER(platform) = 'broadcast' THEN '#7C3AED'
  ELSE '#3B82F6'
END
WHERE color_hex IS NULL OR color_hex = '#3B82F6';

-- Add allowed_features to public.departments
ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS allowed_features text[] NOT NULL
DEFAULT ARRAY['dashboard', 'my_tasks', 'daily_tasks', 'rush', 'content_creator', 'reports', 'marketing'];

-- Enforce maximum of 3 administrators (1 main admin + at most 2 additional admins)
CREATE OR REPLACE FUNCTION public.guard_profile_administration()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  current_admin_count integer;
BEGIN
  IF OLD.id = auth.uid() AND OLD.application_role = 'administrator'
     AND (NEW.application_role <> 'administrator' OR NOT NEW.is_active) THEN
    RAISE EXCEPTION 'Ask another administrator to change your administrative access.';
  END IF;

  IF (NEW.application_role = 'administrator' AND NEW.is_active = TRUE) 
     AND (OLD.application_role <> 'administrator' OR OLD.is_active = FALSE) THEN
    SELECT count(*) INTO current_admin_count
    FROM public.profiles
    WHERE application_role = 'administrator' AND is_active = TRUE AND id <> NEW.id;

    IF current_admin_count >= 3 THEN
      RAISE EXCEPTION 'Maximum administrator limit reached (maximum 3 administrators allowed: 1 main admin + up to 2 additional admins). Demote an existing administrator first.'
      USING ERRCODE = '23514';
    END IF;
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

-- Add script column to public.content_packages
ALTER TABLE public.content_packages
ADD COLUMN IF NOT EXISTS script text NOT NULL DEFAULT '';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;

