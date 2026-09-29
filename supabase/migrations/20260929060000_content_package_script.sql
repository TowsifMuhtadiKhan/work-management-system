-- Migration: Add script column to content_packages table
BEGIN;

ALTER TABLE public.content_packages
ADD COLUMN IF NOT EXISTS script text NOT NULL DEFAULT '';

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
  NEW.script := COALESCE(btrim(NEW.script), '');
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
  IF ROW(NEW.package_name, NEW.creator_id, NEW.script, NEW.approver_id, NEW.caption, NEW.thumbnail_url)
     IS DISTINCT FROM ROW(OLD.package_name, OLD.creator_id, OLD.script, OLD.approver_id, OLD.caption, OLD.thumbnail_url) THEN
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

NOTIFY pgrst, 'reload schema';

COMMIT;
