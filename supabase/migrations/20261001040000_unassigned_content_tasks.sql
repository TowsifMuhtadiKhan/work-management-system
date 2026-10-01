-- Content Creator exports may enter Daily Tasks without an assignee.
BEGIN;

ALTER TABLE public.tasks ALTER COLUMN assigned_to DROP NOT NULL;

CREATE OR REPLACE FUNCTION private.guard_content_package()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  is_incharge boolean := false;
BEGIN
  IF actor IS NULL OR NOT private.active_employee() THEN
    RAISE EXCEPTION 'An active employee account is required.' USING ERRCODE = '42501';
  END IF;
  SELECT lower(btrim(d.name)) = 'incharge' INTO is_incharge
  FROM public.profiles p JOIN public.departments d ON d.id = p.department_id
  WHERE p.id = actor AND p.is_active AND d.is_active;

  IF TG_OP = 'UPDATE' AND pg_trigger_depth() = 2 AND OLD.task_id IS NULL
    AND NEW.task_id IS NOT NULL AND OLD.status = 'export_done'
    AND (to_jsonb(NEW) - 'task_id') = (to_jsonb(OLD) - 'task_id')
    AND EXISTS (SELECT 1 FROM public.tasks WHERE id = NEW.task_id AND source_content_id = OLD.id AND created_by = actor) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.id IS DISTINCT FROM OLD.id OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.task_id IS DISTINCT FROM OLD.task_id OR NEW.approver_id IS DISTINCT FROM OLD.approver_id
      OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
      OR NEW.feedback IS DISTINCT FROM OLD.feedback THEN
      RAISE EXCEPTION 'Package identity and review metadata cannot be changed.';
    END IF;
    IF OLD.status = 'export_done' THEN RAISE EXCEPTION 'This package has already been exported.'; END IF;
    IF is_incharge AND NEW.approval_state IS DISTINCT FROM OLD.approval_state THEN
      IF (to_jsonb(NEW) - 'approval_state' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'approval_state' - 'updated_at') THEN
        RAISE EXCEPTION 'Incharge can change only approval.' USING ERRCODE = '42501';
      END IF;
      RETURN NEW;
    END IF;
    IF NOT (actor = OLD.creator_id OR public.is_admin() OR public.can_create_task()) THEN
      RAISE EXCEPTION 'Only the creator or a team manager can edit this package.' USING ERRCODE = '42501';
    END IF;
  ELSE
    NEW.task_id := NULL; NEW.approver_id := NULL; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.feedback := ''; NEW.created_at := now();
  END IF;

  NEW.package_name := btrim(NEW.package_name);
  NEW.script := COALESCE(btrim(NEW.script), '');
  NEW.thumbnail_url := btrim(NEW.thumbnail_url);
  NEW.updated_at := clock_timestamp();
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = NEW.creator_id AND p.is_active AND d.is_active
      AND lower(btrim(d.name)) IN ('content creator', 'content creator team')
  ) THEN RAISE EXCEPTION 'Select an active Content Creator team member.'; END IF;
  IF NEW.status = 'export_done' THEN
    IF NEW.work_date IS NULL OR NEW.task_type_id IS NULL THEN
      RAISE EXCEPTION 'Choose a work date and task type.';
    END IF;
    IF NEW.assigned_to IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = NEW.assigned_to AND is_active
    ) THEN
      RAISE EXCEPTION 'Choose an active assigned person.';
    END IF;
  ELSE
    NEW.work_date := NULL; NEW.time_slot := NULL; NEW.task_type_id := NULL; NEW.assigned_to := NULL;
  END IF;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;