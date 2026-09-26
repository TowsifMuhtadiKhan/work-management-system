-- Run in your project's Supabase SQL Editor after the schema and RLS migrations.
-- Adds fictional staff without passwords; existing accounts and roles are preserved.
-- Requires the task_work_time migration before running.
-- Fixed demo IDs make retries safe; existing rows (including edited demos) are preserved.
BEGIN;

DO $$
DECLARE
  people uuid[];
  creator uuid;
  demo_day date := (now() AT TIME ZONE 'Asia/Dhaka')::date;
  type_ids uuid[];
  channel_ids uuid[];
  campaign uuid := 'de000000-0000-4000-8000-000000000001';
  item_id uuid;
  item_day date;
  item_status public.task_status;
  person_id uuid;
  inserted_person uuid;
  names text[] := ARRAY['Nasreen Sultana', 'Karim Uddin', 'Razia Begum', 'Tanvir Ahmed',
    'Shirin Akter', 'Mamun Rashid', 'Rahim Hossain', 'Ayesha Khatun',
    'Sabrina Islam', 'Mizan Rahman', 'Nadia Akter', 'Imran Hossain'];
  topics text[] := ARRAY['Morning news bulletin', 'Dhaka traffic update',
    'Weekend entertainment roundup', 'Community health tips', 'Sports highlights',
    'Small business spotlight', 'Weather forecast', 'Culture and arts interview',
    'Evening news recap', 'Behind the scenes'];
BEGIN
  SELECT array_agg(id ORDER BY full_name, id) INTO people
  FROM public.profiles WHERE is_active;
  IF coalesce(cardinality(people), 0) = 0 THEN
    RAISE EXCEPTION 'Create an account in the app before loading demo data.';
  END IF;
  SELECT id INTO creator FROM public.profiles
  WHERE is_active AND application_role = 'administrator' ORDER BY id LIMIT 1;
  creator := coalesce(creator, people[1]);

  INSERT INTO public.departments(id, name, code) VALUES
    ('de400000-0000-4000-8000-000000000001', 'Demo Newsroom', 'DEMO_NEWS'),
    ('de400000-0000-4000-8000-000000000002', 'Demo Digital Production', 'DEMO_DIG'),
    ('de400000-0000-4000-8000-000000000003', 'Demo Social Media', 'DEMO_SOC'),
    ('de400000-0000-4000-8000-000000000004', 'Demo Marketing', 'DEMO_MKT')
  ON CONFLICT (id) DO NOTHING;

  FOR i IN 1..12 LOOP
    person_id := ('de500000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    -- No password or identity is installed: these are display-only demo staff.
    INSERT INTO auth.users(id, email, raw_user_meta_data)
    VALUES (person_id, 'demo.staff.' || i || '@example.invalid',
      jsonb_build_object('full_name', names[i] || ' (Demo)'))
    ON CONFLICT (id) DO NOTHING RETURNING id INTO inserted_person;
    IF inserted_person IS NOT NULL THEN
      UPDATE public.profiles SET
        employee_code = 'DEMO' || lpad(i::text, 3, '0'),
        designation = CASE WHEN i <= 3 THEN 'Content Manager' WHEN i <= 6 THEN 'Team Lead' ELSE 'Content Producer' END,
        application_role = (CASE WHEN i <= 3 THEN 'manager' WHEN i <= 6 THEN 'team_lead' ELSE 'employee' END)::public.app_role,
        department_id = ('de400000-0000-4000-8000-' || lpad((1 + (i - 1) % 4)::text, 12, '0'))::uuid,
        manager_id = CASE WHEN i <= 3 THEN creator ELSE
          ('de500000-0000-4000-8000-' || lpad((CASE WHEN i <= 6 THEN i - 3 ELSE 4 + (i - 7) % 3 END)::text, 12, '0'))::uuid END
      WHERE id = inserted_person;
    END IF;
  END LOOP;
  SELECT array_agg(id ORDER BY full_name, id) INTO people FROM public.profiles WHERE is_active;

  INSERT INTO public.task_types(id, name, code, color_hex, sort_order) VALUES
    ('de100000-0000-4000-8000-000000000001', 'Demo Bulletin', 'DEMO_BULLETIN', '#EF4444', 101),
    ('de100000-0000-4000-8000-000000000002', 'Demo Reels', 'DEMO_REELS', '#8B5CF6', 102),
    ('de100000-0000-4000-8000-000000000003', 'Demo Live', 'DEMO_LIVE', '#059669', 103),
    ('de100000-0000-4000-8000-000000000004', 'Demo Card', 'DEMO_CARD', '#F59E0B', 104)
  ON CONFLICT (id) DO NOTHING;
  SELECT array_agg(id ORDER BY id) INTO type_ids FROM public.task_types
  WHERE id IN ('de100000-0000-4000-8000-000000000001', 'de100000-0000-4000-8000-000000000002',
    'de100000-0000-4000-8000-000000000003', 'de100000-0000-4000-8000-000000000004');

  INSERT INTO public.channels(id, name, platform) VALUES
    ('de200000-0000-4000-8000-000000000001', 'Demo Facebook', 'facebook'),
    ('de200000-0000-4000-8000-000000000002', 'Demo YouTube', 'youtube'),
    ('de200000-0000-4000-8000-000000000003', 'Demo Website', 'web')
  ON CONFLICT (id) DO NOTHING;
  SELECT array_agg(id ORDER BY id) INTO channel_ids FROM public.channels
  WHERE id IN ('de200000-0000-4000-8000-000000000001', 'de200000-0000-4000-8000-000000000002',
    'de200000-0000-4000-8000-000000000003');

  INSERT INTO public.marketing_ads(id, advertiser, package_type, daily_target, description, valid_from, valid_to)
  VALUES (campaign, 'Demo Horizon Electronics', 'Social video package', 5,
    'Fictional campaign for product demonstrations.', demo_day - 30, demo_day + 30)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.marketing_ads(id, advertiser, package_type, daily_target, description, valid_from, valid_to)
  SELECT ('de000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
    (ARRAY['Demo River Bank', 'Demo Green Tea', 'Demo City Telecom'])[n - 1],
    (ARRAY['News sponsorship', 'Lifestyle series', 'Reels campaign'])[n - 1],
    n + 2, 'Fictional advertiser for demonstration.', demo_day - 30, demo_day + 30
  FROM generate_series(2, 4) AS n ON CONFLICT (id) DO NOTHING;

  FOR i IN 1..180 LOOP
    item_id := ('de300000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    item_day := demo_day - CASE WHEN i <= 60 THEN 0 ELSE 1 + (i - 61) / 12 END;
    item_status := (ARRAY['done', 'in_progress', 'assigned', 'pending', 'hold', 'cancelled']::public.task_status[])[1 + (i - 1) % 6];
    INSERT INTO public.tasks(id, work_date, file_name, task_type_id, assigned_to,
      status, channel_id, marketing_ad_id, remarks, caption, priority, created_by, time_slot)
    VALUES (item_id, item_day,
      'DEMO_' || to_char(item_day, 'YYYYMMDD') || '_' || lpad(i::text, 2, '0') || '_' || replace(topics[1 + (i - 1) % 10], ' ', '_'),
      type_ids[1 + (i - 1) % 4], people[1 + (i - 1) % cardinality(people)],
      item_status, channel_ids[1 + (i - 1) % 3],
      ('de000000-0000-4000-8000-' || lpad((1 + ((i - 1) / 6) % 4)::text, 12, '0'))::uuid,
      'Sample assignment for demonstration. ' || CASE item_status
        WHEN 'done' THEN 'Reviewed and ready for publication.'
        WHEN 'hold' THEN 'Waiting for editorial approval.'
        WHEN 'cancelled' THEN 'Coverage replaced by another story.'
        ELSE 'Prepare the content and send it for review.' END,
      topics[1 + (i - 1) % 10] || ' | Demo content',
      (ARRAY['normal', 'high', 'urgent', 'low']::public.task_priority[])[1 + (i - 1) % 4], creator, CASE WHEN (i - 1) % 4 = 3 THEN 'card' ELSE lpad(((7 + (i - 1) % 18) % 24)::text, 2, '0') || ':00' END)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  -- Guarantee My Tasks has a sample for every active real or demo account.
  FOREACH person_id IN ARRAY people LOOP
    INSERT INTO public.tasks(id, work_date, file_name, task_type_id, assigned_to, status, priority, created_by, remarks, time_slot)
    VALUES (md5('work-management-demo-personal-' || person_id::text)::uuid, demo_day,
      'DEMO_Personal_editorial_review', type_ids[1], person_id, 'in_progress', 'high', creator,
      'Demo: review the afternoon bulletin and send feedback to your team.', '15:00')
    ON CONFLICT (id) DO NOTHING;
  END LOOP;

  INSERT INTO public.task_history(id, task_id, changed_by, field_name, old_value, new_value, changed_at)
  SELECT md5('work-management-demo-history-' || id::text)::uuid, id, created_by,
    'status', 'assigned', status::text, now()
  FROM public.tasks WHERE id::text LIKE 'de300000-0000-4000-8000-%' AND status IN ('in_progress', 'done', 'hold')
  ON CONFLICT (id) DO NOTHING;
END;
$$;

COMMIT;

SELECT work_date, status, count(*) AS demo_tasks FROM public.tasks
WHERE id::text LIKE 'de300000-0000-4000-8000-%'
GROUP BY work_date, status ORDER BY work_date DESC, status;

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
