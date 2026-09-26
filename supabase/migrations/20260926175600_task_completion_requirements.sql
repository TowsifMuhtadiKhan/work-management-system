BEGIN;
CREATE OR REPLACE FUNCTION public.guard_task_completion()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  -- SQL Editor/service-role maintenance remains possible for trusted seed scripts.
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
  -- Validate completed records on every write, including direct API requests.
  IF NEW.status = 'done' THEN
    IF coalesce(NEW.remarks, '') !~ '[^[:space:]]' THEN
      RAISE EXCEPTION 'Add remarks before marking this task as done.' USING ERRCODE = '23514';
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
NOTIFY pgrst, 'reload schema';
COMMIT;
