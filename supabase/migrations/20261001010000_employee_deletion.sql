-- Allow administrators to permanently remove an employee account only when it has no
-- task ownership or audit dependencies. Use deactivation for historical employees.
BEGIN;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_id uuid)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only active administrators can delete employees.' USING ERRCODE = '42501';
  END IF;
  IF p_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot delete your own account. Ask another administrator.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_id) THEN
    RAISE EXCEPTION 'Employee profile was not found.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE assigned_to = p_id OR created_by = p_id OR updated_by = p_id
  ) OR EXISTS (
    SELECT 1 FROM public.task_history WHERE changed_by = p_id
  ) THEN
    RAISE EXCEPTION 'This employee has task history or ownership and can only be deactivated.';
  END IF;

  UPDATE public.profiles SET manager_id = NULL WHERE manager_id = p_id;
  DELETE FROM auth.users WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
