-- ============================================================
-- FILE: 001_schema.sql
-- PROJECT: Desh TV Digital Content Management System
-- DESCRIPTION: Full database schema — extensions, enums, tables,
--              indexes, and trigger functions.
-- RUN ORDER: 1 of 3
-- ============================================================


-- ============================================================
-- 1. EXTENSIONS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 2. ENUMS
-- ============================================================

CREATE TYPE public.app_role AS ENUM (
  'administrator',
  'manager',
  'team_lead',
  'employee'
);

CREATE TYPE public.task_status AS ENUM (
  'pending',
  'assigned',
  'in_progress',
  'done',
  'hold',
  'cancelled'
);

CREATE TYPE public.task_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);


-- ============================================================
-- 3. TABLES (in dependency order)
-- ============================================================

-- -----------------------------------------------------------
-- 3.1  departments
-- -----------------------------------------------------------
CREATE TABLE public.departments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  code       TEXT        NOT NULL UNIQUE,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.departments IS 'Organisational departments within Desh TV.';


-- -----------------------------------------------------------
-- 3.2  profiles  (extends auth.users 1 : 1)
-- -----------------------------------------------------------
CREATE TABLE public.profiles (
  id                UUID            PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         TEXT            NOT NULL,
  email             TEXT            NOT NULL,
  employee_code     TEXT            UNIQUE,
  designation       TEXT,
  department_id     UUID            REFERENCES public.departments(id),
  manager_id        UUID            REFERENCES public.profiles(id),
  application_role  public.app_role NOT NULL DEFAULT 'employee',
  is_active         BOOLEAN         NOT NULL DEFAULT TRUE,
  avatar_url        TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Extended user profiles — one row per auth.users row.';
COMMENT ON COLUMN public.profiles.manager_id IS 'Self-referencing FK supporting the management hierarchy.';


-- -----------------------------------------------------------
-- 3.3  task_types
-- -----------------------------------------------------------
CREATE TABLE public.task_types (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  code       TEXT        NOT NULL UNIQUE,
  color_hex  TEXT        NOT NULL DEFAULT '#6B7280',
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order INTEGER     NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.task_types IS 'Lookup table of content task types (Bulletin, Reels, Live, etc.).';


-- -----------------------------------------------------------
-- 3.4  channels
-- -----------------------------------------------------------
CREATE TABLE public.channels (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  platform   TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.channels IS 'Distribution channels (Facebook, YouTube, Broadcast, etc.).';


-- -----------------------------------------------------------
-- 3.5  marketing_ads
-- -----------------------------------------------------------
CREATE TABLE public.marketing_ads (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser    TEXT        NOT NULL,
  package_type  TEXT        NOT NULL,
  daily_target  INTEGER     NOT NULL DEFAULT 0,
  description   TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  valid_from    DATE,
  valid_to      DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.marketing_ads IS 'Advertiser packages that may be linked to specific tasks.';


-- -----------------------------------------------------------
-- 3.6  tasks
-- -----------------------------------------------------------
CREATE TABLE public.tasks (
  id                UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  work_date         DATE                 NOT NULL,
  file_name         TEXT                 NOT NULL,
  task_type_id      UUID                 NOT NULL REFERENCES public.task_types(id),
  assigned_to       UUID                 NOT NULL REFERENCES public.profiles(id),
  status            public.task_status   NOT NULL DEFAULT 'pending',
  channel_id        UUID                 REFERENCES public.channels(id),
  marketing_ad_id   UUID                 REFERENCES public.marketing_ads(id),
  remarks           TEXT,
  caption           TEXT,
  youtube_link      TEXT,
  facebook_link     TEXT,
  google_drive_link TEXT,
  priority          public.task_priority NOT NULL DEFAULT 'normal',
  created_by        UUID                 NOT NULL REFERENCES public.profiles(id),
  updated_by        UUID                 REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.tasks IS 'Core work items representing individual digital content production tasks.';


-- -----------------------------------------------------------
-- 3.7  task_history  (append-only audit log)
-- -----------------------------------------------------------
CREATE TABLE public.task_history (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id     UUID        NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  changed_by  UUID        NOT NULL REFERENCES public.profiles(id),
  field_name  TEXT        NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.task_history IS 'Append-only audit log tracking every field-level change on tasks.';


-- ============================================================
-- 4. INDEXES
-- ============================================================

CREATE INDEX idx_tasks_work_date         ON public.tasks(work_date);
CREATE INDEX idx_tasks_assigned_to       ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_status            ON public.tasks(status);
CREATE INDEX idx_tasks_work_date_status  ON public.tasks(work_date, status);
CREATE INDEX idx_task_history_task_id    ON public.task_history(task_id);
CREATE INDEX idx_task_history_changed_at ON public.task_history(changed_at DESC);
CREATE INDEX idx_profiles_manager_id     ON public.profiles(manager_id);
CREATE INDEX idx_profiles_department_id  ON public.profiles(department_id);


-- ============================================================
-- 5. UPDATED_AT TRIGGER FUNCTION + TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_updated_at() IS
  'Generic BEFORE UPDATE trigger function that stamps updated_at = NOW().';

-- departments
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- profiles
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- marketing_ads
CREATE TRIGGER trg_marketing_ads_updated_at
  BEFORE UPDATE ON public.marketing_ads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- tasks
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- 6. AUTO-CREATE PROFILE TRIGGER  (standard Supabase pattern)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Fires after a new auth.users row is inserted and creates the matching profiles row.';

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- 7. TASK HISTORY TRIGGERS
-- ============================================================

-- -----------------------------------------------------------
-- 7.1  Record field-level changes on UPDATE
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_changed_by UUID;
BEGIN
  -- Use updated_by from the new row as the actor; fall back to assigned_to
  v_changed_by := COALESCE(NEW.updated_by, NEW.assigned_to);

  -- file_name
  IF OLD.file_name IS DISTINCT FROM NEW.file_name THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'file_name', OLD.file_name, NEW.file_name);
  END IF;

  -- task_type_id
  IF OLD.task_type_id IS DISTINCT FROM NEW.task_type_id THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'task_type_id', OLD.task_type_id::TEXT, NEW.task_type_id::TEXT);
  END IF;

  -- assigned_to
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'assigned_to', OLD.assigned_to::TEXT, NEW.assigned_to::TEXT);
  END IF;

  -- status
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'status', OLD.status::TEXT, NEW.status::TEXT);
  END IF;

  -- channel_id
  IF OLD.channel_id IS DISTINCT FROM NEW.channel_id THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'channel_id', OLD.channel_id::TEXT, NEW.channel_id::TEXT);
  END IF;

  -- marketing_ad_id
  IF OLD.marketing_ad_id IS DISTINCT FROM NEW.marketing_ad_id THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'marketing_ad_id', OLD.marketing_ad_id::TEXT, NEW.marketing_ad_id::TEXT);
  END IF;

  -- remarks
  IF OLD.remarks IS DISTINCT FROM NEW.remarks THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'remarks', OLD.remarks, NEW.remarks);
  END IF;

  -- caption
  IF OLD.caption IS DISTINCT FROM NEW.caption THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'caption', OLD.caption, NEW.caption);
  END IF;

  -- youtube_link
  IF OLD.youtube_link IS DISTINCT FROM NEW.youtube_link THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'youtube_link', OLD.youtube_link, NEW.youtube_link);
  END IF;

  -- facebook_link
  IF OLD.facebook_link IS DISTINCT FROM NEW.facebook_link THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'facebook_link', OLD.facebook_link, NEW.facebook_link);
  END IF;

  -- google_drive_link
  IF OLD.google_drive_link IS DISTINCT FROM NEW.google_drive_link THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'google_drive_link', OLD.google_drive_link, NEW.google_drive_link);
  END IF;

  -- priority
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
    VALUES (NEW.id, v_changed_by, 'priority', OLD.priority::TEXT, NEW.priority::TEXT);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.record_task_changes() IS
  'AFTER UPDATE trigger: compares OLD vs NEW for each tracked field and inserts a task_history row per change.';

CREATE TRIGGER trg_tasks_record_changes
  AFTER UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.record_task_changes();


-- -----------------------------------------------------------
-- 7.2  Record the initial task creation as a history entry
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_task_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.task_history (task_id, changed_by, field_name, old_value, new_value)
  VALUES (NEW.id, NEW.created_by, 'created', NULL, NEW.file_name);
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.record_task_created() IS
  'AFTER INSERT trigger: records the task creation event in task_history (field_name=''created'').';

CREATE TRIGGER trg_tasks_record_created
  AFTER INSERT ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.record_task_created();
