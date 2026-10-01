-- Run in this app's Supabase SQL Editor. Removes only IDs created by demo-data.sql.
-- Tasks that reference demo catalogs are treated as demo-linked rows and removed first.
BEGIN;
CREATE TEMP TABLE demo_tasks_to_remove ON COMMIT DROP AS
SELECT id
FROM public.tasks
WHERE id IN (
  SELECT ('de300000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1, 180) n
  UNION ALL
  SELECT md5('work-management-demo-personal-' || id::text)::uuid FROM public.profiles
)
OR channel_id IN (
  SELECT ('de200000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1, 3) n
)
OR marketing_ad_id IN (
  SELECT ('de000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1, 4) n
)
OR task_type_id IN (
  SELECT ('de100000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1, 4) n
);
DELETE FROM public.task_history WHERE task_id IN (SELECT id FROM demo_tasks_to_remove);
DELETE FROM public.tasks WHERE id IN (SELECT id FROM demo_tasks_to_remove);
DELETE FROM public.marketing_ads WHERE id IN (SELECT ('de000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1, 4) n);
DELETE FROM public.channels WHERE id IN (SELECT ('de200000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1, 3) n);
DELETE FROM public.task_types WHERE id IN (SELECT ('de100000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1, 4) n);
-- Remove reporting relationships among demo staff before deleting their accounts.
UPDATE public.profiles SET manager_id = NULL WHERE id IN (SELECT ('de500000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1, 12) n);
DELETE FROM auth.users WHERE id IN (SELECT ('de500000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1, 12) n) AND email LIKE 'demo.staff.%@example.invalid';
DELETE FROM public.departments WHERE id IN (SELECT ('de400000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid FROM generate_series(1, 4) n);
COMMIT;
