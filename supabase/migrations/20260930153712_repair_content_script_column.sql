-- Repair deployments that installed the export workflow without the earlier script migration.
BEGIN;
ALTER TABLE public.content_packages ADD COLUMN IF NOT EXISTS script text NOT NULL DEFAULT '';
NOTIFY pgrst, 'reload schema';
COMMIT;
