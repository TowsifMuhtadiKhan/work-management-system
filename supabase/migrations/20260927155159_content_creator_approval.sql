BEGIN;

CREATE TABLE public.content_packages (
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
CREATE INDEX content_packages_creator_idx ON public.content_packages(creator_id);
CREATE INDEX content_packages_approver_status_idx ON public.content_packages(approver_id, status);
CREATE INDEX content_packages_type_idx ON public.content_packages(task_type_id);
CREATE INDEX content_packages_assignee_idx ON public.content_packages(assigned_to);
CREATE INDEX content_packages_reviewer_idx ON public.content_packages(reviewed_by);
ALTER TABLE public.tasks ADD COLUMN source_content_id uuid UNIQUE REFERENCES public.content_packages(id) ON DELETE RESTRICT;

CREATE TABLE public.content_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.content_packages(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL CHECK (action IN ('submitted', 'feedback', 'changes_requested', 'approved')),
  feedback text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_reviews_package_idx ON public.content_reviews(package_id, created_at);
CREATE INDEX content_reviews_reviewer_idx ON public.content_reviews(reviewer_id);

ALTER TABLE public.content_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_packages, public.content_reviews FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.content_packages TO authenticated;
GRANT SELECT, INSERT ON public.content_reviews TO authenticated;

CREATE POLICY content_active ON public.content_packages AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT private.active_employee())) WITH CHECK ((SELECT private.active_employee()));
CREATE POLICY content_read ON public.content_packages FOR SELECT TO authenticated
  USING (creator_id = (SELECT auth.uid()) OR approver_id = (SELECT auth.uid()) OR status = 'approved' OR (SELECT public.is_admin()));
CREATE POLICY content_create ON public.content_packages FOR INSERT TO authenticated
  WITH CHECK (creator_id = (SELECT auth.uid()));
CREATE POLICY content_update ON public.content_packages FOR UPDATE TO authenticated
  USING (creator_id = (SELECT auth.uid()) OR approver_id = (SELECT auth.uid()))
  WITH CHECK (creator_id = (SELECT auth.uid()) OR approver_id = (SELECT auth.uid()));
CREATE POLICY content_reviews_read ON public.content_reviews FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.content_packages p WHERE p.id = package_id));
CREATE POLICY content_reviews_insert ON public.content_reviews FOR INSERT TO authenticated
  WITH CHECK (pg_trigger_depth() > 0 AND reviewer_id = (SELECT auth.uid()) AND (SELECT private.active_employee())
    AND EXISTS (SELECT 1 FROM public.content_packages p WHERE p.id = package_id));

-- A selected approver may create the resulting task even if they are an employee.
-- The provenance trigger below prevents using this policy for a direct API insert.
CREATE POLICY tasks_insert_content_approval ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.content_packages p
    WHERE p.id = source_content_id AND p.approver_id = (SELECT auth.uid()) AND p.status = 'submitted'
  ));

CREATE FUNCTION private.guard_content_task_source() RETURNS trigger
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
CREATE TRIGGER guard_content_task_source BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION private.guard_content_task_source();

CREATE FUNCTION private.guard_content_package() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid();
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
  IF TG_OP = 'INSERT' THEN
    IF NEW.creator_id <> actor OR NEW.status NOT IN ('draft', 'submitted') THEN
      RAISE EXCEPTION 'Create your own draft or submit it for approval.' USING ERRCODE = '42501';
    END IF;
    NEW.feedback := ''; NEW.task_id := NULL; NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
    NEW.work_date := NULL; NEW.time_slot := NULL; NEW.task_type_id := NULL; NEW.assigned_to := NULL;
    NEW.created_at := now();
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.task_id IS DISTINCT FROM OLD.task_id
    OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'Package identity and review metadata cannot be changed.';
  END IF;
  IF OLD.status = 'approved' THEN
    RAISE EXCEPTION 'This package has already been approved.';
  END IF;
  IF actor = OLD.creator_id AND OLD.status IN ('draft', 'changes_requested') THEN
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
  IF ROW(NEW.package_name, NEW.approver_id, NEW.caption, NEW.thumbnail_url)
     IS DISTINCT FROM ROW(OLD.package_name, OLD.approver_id, OLD.caption, OLD.thumbnail_url) THEN
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
    INSERT INTO public.tasks(work_date, time_slot, file_name, task_type_id, assigned_to, status, caption, priority, created_by, source_content_id)
    VALUES (NEW.work_date, NEW.time_slot, NEW.package_name, NEW.task_type_id, NEW.assigned_to, 'pending', NEW.caption, 'normal', actor, NEW.id)
    RETURNING id INTO NEW.task_id;
  ELSE
    NEW.work_date := OLD.work_date; NEW.time_slot := OLD.time_slot;
    NEW.task_type_id := OLD.task_type_id; NEW.assigned_to := OLD.assigned_to;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_content_package() FROM PUBLIC;
CREATE TRIGGER guard_content_package BEFORE INSERT OR UPDATE ON public.content_packages
  FOR EACH ROW EXECUTE FUNCTION private.guard_content_package();

CREATE FUNCTION private.record_content_review() RETURNS trigger
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
CREATE TRIGGER record_content_review AFTER INSERT OR UPDATE ON public.content_packages
  FOR EACH ROW EXECUTE FUNCTION private.record_content_review();

NOTIFY pgrst, 'reload schema';
COMMIT;
