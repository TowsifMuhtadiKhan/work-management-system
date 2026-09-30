BEGIN;

ALTER TABLE public.content_packages DISABLE TRIGGER guard_content_package;
ALTER TABLE public.content_packages DISABLE TRIGGER record_content_review;
ALTER TABLE public.content_packages DROP CONSTRAINT content_packages_status_check;
ALTER TABLE public.content_packages DROP CONSTRAINT content_packages_thumbnail_url_check;
ALTER TABLE public.content_packages ALTER COLUMN approver_id DROP NOT NULL;
ALTER TABLE public.content_packages ADD COLUMN approval_state text NOT NULL DEFAULT 'ongoing' CHECK (approval_state IN ('ongoing', 'done'));
UPDATE public.content_packages SET approval_state = CASE WHEN status = 'approved' THEN 'done' ELSE 'ongoing' END,
  status = CASE WHEN status = 'approved' THEN 'export_done' ELSE 'video_panel' END;
ALTER TABLE public.content_packages ALTER COLUMN status SET DEFAULT 'video_panel';
ALTER TABLE public.content_packages ADD CONSTRAINT content_packages_status_check CHECK (status IN ('video_panel', 'export_done'));
ALTER TABLE public.content_packages ENABLE TRIGGER guard_content_package;
ALTER TABLE public.content_packages ENABLE TRIGGER record_content_review;

CREATE OR REPLACE FUNCTION private.guard_content_package() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT private.active_employee() THEN
    RAISE EXCEPTION 'An active employee account is required.' USING ERRCODE = '42501';
  END IF;
  -- Only the export trigger may attach its newly created task. No other field
  -- can be changed through this internal update.
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
    IF NOT (actor = OLD.creator_id OR public.is_admin() OR public.can_create_task()) THEN
      RAISE EXCEPTION 'Only the creator or a team manager can edit this package.' USING ERRCODE = '42501';
    END IF;
  ELSE
    NEW.task_id := NULL; NEW.approver_id := NULL; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.feedback := '';
    NEW.created_at := now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles p JOIN public.departments d ON d.id = p.department_id
    WHERE p.id = NEW.creator_id AND p.is_active AND d.is_active
      AND lower(btrim(d.name)) IN ('content creator', 'content creator team')) THEN
    RAISE EXCEPTION 'Select an active Content Creator team member.';
  END IF;
  NEW.package_name := btrim(NEW.package_name);
  NEW.thumbnail_url := btrim(NEW.thumbnail_url);
  NEW.updated_at := clock_timestamp();
  IF NEW.status = 'export_done' THEN
    IF NEW.work_date IS NULL OR NEW.task_type_id IS NULL OR NEW.assigned_to IS NULL THEN
      RAISE EXCEPTION 'Choose a work date, task type, and assigned person.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.task_types WHERE id = NEW.task_type_id AND is_active)
      OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.assigned_to AND is_active) THEN
      RAISE EXCEPTION 'Choose an active task type and assigned person.';
    END IF;
  ELSE
    NEW.work_date := NULL; NEW.time_slot := NULL; NEW.task_type_id := NULL; NEW.assigned_to := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Keep historical reviews, but the former review workflow no longer runs.
DROP TRIGGER record_content_review ON public.content_packages;
CREATE FUNCTION private.export_content_package() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_task_id uuid; v_creator_name text;
BEGIN
  IF NEW.status <> 'export_done' OR NEW.task_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT full_name INTO v_creator_name FROM public.profiles WHERE id = NEW.creator_id;
  INSERT INTO public.tasks(work_date, time_slot, file_name, task_type_id, assigned_to, status, caption, remarks, priority, created_by, source_content_id)
  VALUES (NEW.work_date, NEW.time_slot, NEW.package_name, NEW.task_type_id, NEW.assigned_to, 'pending', NEW.caption,
    v_creator_name || CASE WHEN NEW.thumbnail_url <> '' THEN ' Thumb: ' || NEW.thumbnail_url ELSE '' END,
    'normal', auth.uid(), NEW.id) RETURNING id INTO v_task_id;
  UPDATE public.content_packages SET task_id = v_task_id WHERE id = NEW.id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.export_content_package() FROM PUBLIC;
CREATE TRIGGER export_content_package AFTER INSERT OR UPDATE ON public.content_packages
  FOR EACH ROW EXECUTE FUNCTION private.export_content_package();

DROP POLICY content_update ON public.content_packages;
CREATE POLICY content_update ON public.content_packages FOR UPDATE TO authenticated
  USING (creator_id = (SELECT auth.uid()) OR (SELECT public.is_admin()) OR (SELECT public.can_create_task())
    OR (pg_trigger_depth() > 0 AND status = 'export_done' AND task_id IS NULL))
  WITH CHECK (creator_id = (SELECT auth.uid()) OR (SELECT public.is_admin()) OR (SELECT public.can_create_task())
    OR (pg_trigger_depth() > 0 AND status = 'export_done'));
DROP POLICY tasks_insert_content_approval ON public.tasks;
CREATE POLICY tasks_insert_content_approval ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (pg_trigger_depth() > 0 AND created_by = (SELECT auth.uid()) AND (SELECT private.active_employee())
    AND EXISTS (SELECT 1 FROM public.content_packages p WHERE p.id = source_content_id AND p.status = 'export_done' AND p.task_id IS NULL));

CREATE OR REPLACE FUNCTION private.guard_content_task_source() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.source_content_id IS DISTINCT FROM OLD.source_content_id THEN RAISE EXCEPTION 'The content source cannot be changed.'; END IF;
  ELSIF NEW.source_content_id IS NOT NULL AND pg_trigger_depth() < 2 THEN
    RAISE EXCEPTION 'Content tasks must be created by exporting a package.';
  END IF;
  RETURN NEW;
END;
$$;
NOTIFY pgrst, 'reload schema';
COMMIT;
