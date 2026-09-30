BEGIN;
ALTER TABLE public.tasks ADD COLUMN work_section text NOT NULL DEFAULT 'digital' CHECK (work_section IN ('digital', 'web'));
ALTER TABLE public.marketing_ads ADD COLUMN work_section text NOT NULL DEFAULT 'digital' CHECK (work_section IN ('digital', 'web'));
CREATE INDEX tasks_section_date_idx ON public.tasks(work_section, work_date);
CREATE INDEX marketing_ads_section_idx ON public.marketing_ads(work_section);

-- A task may only count toward a campaign in the same section.
ALTER TABLE public.marketing_ads ADD CONSTRAINT marketing_ads_id_section_key UNIQUE (id, work_section);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_marketing_section_fkey
  FOREIGN KEY (marketing_ad_id, work_section) REFERENCES public.marketing_ads(id, work_section);
ALTER TABLE public.content_packages ADD COLUMN work_section text NOT NULL DEFAULT 'digital' CHECK (work_section IN ('digital', 'web'));
CREATE OR REPLACE FUNCTION private.export_content_package() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE v_task_id uuid; v_creator_name text;
BEGIN
  IF NEW.status <> 'export_done' OR NEW.task_id IS NOT NULL THEN RETURN NEW; END IF;
  SELECT full_name INTO v_creator_name FROM public.profiles WHERE id = NEW.creator_id;
  INSERT INTO public.tasks(work_section, work_date, time_slot, file_name, task_type_id, assigned_to, status, caption, remarks, priority, created_by, source_content_id)
  VALUES (NEW.work_section, NEW.work_date, NEW.time_slot, NEW.package_name, NEW.task_type_id, NEW.assigned_to, 'pending', NEW.caption,
    v_creator_name || CASE WHEN NEW.thumbnail_url <> '' THEN ' Thumb: ' || NEW.thumbnail_url ELSE '' END,
    'normal', auth.uid(), NEW.id) RETURNING id INTO v_task_id;
  UPDATE public.content_packages SET task_id = v_task_id WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
