-- Run this entire file in Supabase SQL Editor, then refresh the app.
BEGIN;
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
NOTIFY pgrst, 'reload schema';
COMMIT;

-- Fill only missing times on records created by our demo seed.
-- Keep existing time assignments and all non-demo records unchanged.
BEGIN;
UPDATE public.tasks AS task
SET time_slot = CASE WHEN task.task_type_id = 'de100000-0000-4000-8000-000000000004'::uuid THEN 'card'
  ELSE lpad(((7 + (demo.n - 1) % 18) % 24)::text, 2, '0') || ':00' END
FROM generate_series(1, 180) AS demo(n)
WHERE task.id = ('de300000-0000-4000-8000-' || lpad(demo.n::text, 12, '0'))::uuid
  AND task.time_slot IS NULL;

UPDATE public.tasks AS task SET time_slot = '15:00'
FROM public.profiles AS person
WHERE task.id = md5('work-management-demo-personal-' || person.id::text)::uuid
  AND task.time_slot IS NULL;
COMMIT;
