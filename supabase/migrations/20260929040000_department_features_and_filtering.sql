BEGIN;

-- Add allowed_features column to departments table
ALTER TABLE public.departments
ADD COLUMN IF NOT EXISTS allowed_features text[] NOT NULL
DEFAULT ARRAY['dashboard', 'my_tasks', 'daily_tasks', 'rush', 'content_creator', 'reports', 'marketing'];

COMMENT ON COLUMN public.departments.allowed_features IS 'List of enabled application feature IDs for this department navigation.';

NOTIFY pgrst, 'reload schema';
COMMIT;
