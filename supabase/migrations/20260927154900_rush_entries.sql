BEGIN;

CREATE TABLE public.rush_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter text NOT NULL CHECK (char_length(btrim(reporter)) BETWEEN 1 AND 300),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 300),
  status text NOT NULL DEFAULT 'Pending' CHECK (char_length(btrim(status)) BETWEEN 1 AND 100),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rush_entries_created_by_idx ON public.rush_entries(created_by);
ALTER TABLE public.rush_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rush_entries FROM anon, authenticated;
GRANT SELECT, INSERT ON public.rush_entries TO authenticated;
GRANT UPDATE (reporter, name, status) ON public.rush_entries TO authenticated;

CREATE POLICY rush_active_employee ON public.rush_entries AS RESTRICTIVE
  FOR ALL TO authenticated
  USING ((SELECT private.active_employee()))
  WITH CHECK ((SELECT private.active_employee()));
CREATE POLICY rush_read ON public.rush_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY rush_insert ON public.rush_entries FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));
CREATE POLICY rush_update ON public.rush_entries FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR (SELECT public.is_admin()))
  WITH CHECK (created_by = (SELECT auth.uid()) OR (SELECT public.is_admin()));

COMMIT;
