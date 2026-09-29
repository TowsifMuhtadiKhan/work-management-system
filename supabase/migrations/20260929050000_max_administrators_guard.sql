-- Migration: Enforce maximum of 3 administrators (1 main admin + at most 2 additional admins)
BEGIN;

CREATE OR REPLACE FUNCTION public.guard_profile_administration()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  current_admin_count integer;
BEGIN
  -- Prevent admin from demoting or deactivating their own account
  IF OLD.id = auth.uid() AND OLD.application_role = 'administrator'
     AND (NEW.application_role <> 'administrator' OR NOT NEW.is_active) THEN
    RAISE EXCEPTION 'Ask another administrator to change your administrative access.';
  END IF;

  -- Enforce maximum of 3 administrators total (1 main admin + at most 2 additional admins)
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

  -- Prevent circular reporting hierarchy
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

NOTIFY pgrst, 'reload schema';

COMMIT;
