-- ============================================================
-- FILE: 003_seed.sql
-- PROJECT: Desh TV Digital Content Management System
-- DESCRIPTION: Realistic demo data for development & testing.
-- RUN ORDER: 3 of 3  (run AFTER 001_schema.sql AND 002_rls.sql)
--
-- Demo credentials: All users have password: DeshTV@2024
-- ============================================================


-- ============================================================
-- 1. AUTH USERS
--    Insert directly into auth.users.
--    The handle_new_user() trigger will auto-create a profiles
--    row for each insert (which we then upsert in section 3).
-- ============================================================

INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  is_super_admin,
  raw_app_meta_data
) VALUES

-- ADMINISTRATOR
(
  'a0000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'arif.hossain@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Arif Hossain"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- HEAD OF DIGITAL  (manager, no parent manager)
(
  'a0000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'nasreen.sultana@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Nasreen Sultana"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- MANAGER 1  (reports to Nasreen)
(
  'a0000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'karim.uddin@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Karim Uddin"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- MANAGER 2  (reports to Nasreen)
(
  'a0000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'razia.begum@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Razia Begum"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- TEAM LEAD 1  (reports to Karim)
(
  'a0000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'tanvir.ahmed@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Tanvir Ahmed"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- TEAM LEAD 2  (reports to Karim)
(
  'a0000000-0000-0000-0000-000000000006',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'shirin.akter@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Shirin Akter"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- TEAM LEAD 3  (reports to Razia)
(
  'a0000000-0000-0000-0000-000000000007',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'mamun.rashid@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Mamun Rashid"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- EMPLOYEE 1  (reports to Tanvir)
(
  'a0000000-0000-0000-0000-000000000008',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'rahim.hossain@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Rahim Hossain"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- EMPLOYEE 2  (reports to Tanvir)
(
  'a0000000-0000-0000-0000-000000000009',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'ayesha.khatun@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Ayesha Khatun"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- EMPLOYEE 3  (reports to Tanvir)
(
  'a0000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'jahangir.alam@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Jahangir Alam"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- EMPLOYEE 4  (reports to Tanvir)
(
  'a0000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'sabrina.islam@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Sabrina Islam"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- EMPLOYEE 5  (reports to Shirin)
(
  'a0000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'mizan.rahman@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Mizan Rahman"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- EMPLOYEE 6  (reports to Shirin)
(
  'a0000000-0000-0000-0000-000000000013',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'taslima.begum@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Taslima Begum"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- EMPLOYEE 7  (reports to Shirin)
(
  'a0000000-0000-0000-0000-000000000014',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'rafiqul.islam@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Rafiqul Islam"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- EMPLOYEE 8  (reports to Mamun)
(
  'a0000000-0000-0000-0000-000000000015',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'nadia.akter@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Nadia Akter"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- EMPLOYEE 9  (reports to Mamun)
(
  'a0000000-0000-0000-0000-000000000016',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'imran.hossain@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Imran Hossain"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
),

-- EMPLOYEE 10  (reports to Mamun)
(
  'a0000000-0000-0000-0000-000000000017',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'sultana.parvin@deshtv.com',
  crypt('DeshTV@2024', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"full_name": "Sultana Parvin"}'::jsonb,
  FALSE,
  '{"provider": "email", "providers": ["email"]}'::jsonb
);


-- ============================================================
-- 2. DEPARTMENTS
-- ============================================================

INSERT INTO public.departments (id, name, code) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'Digital Production', 'DIG'),
  ('d0000000-0000-0000-0000-000000000002', 'News Editing',       'NEWS'),
  ('d0000000-0000-0000-0000-000000000003', 'Social Media',       'SOC'),
  ('d0000000-0000-0000-0000-000000000004', 'Marketing',          'MKT');


-- ============================================================
-- 3. PROFILES  (upsert — trigger already created bare rows)
-- ============================================================

INSERT INTO public.profiles (
  id, full_name, email, employee_code, designation,
  department_id, manager_id, application_role, is_active
) VALUES

-- ADMINISTRATOR
(
  'a0000000-0000-0000-0000-000000000001',
  'Arif Hossain', 'arif.hossain@deshtv.com', 'DTV001',
  'System Administrator',
  'd0000000-0000-0000-0000-000000000001',
  NULL,
  'administrator', TRUE
),

-- HEAD OF DIGITAL
(
  'a0000000-0000-0000-0000-000000000002',
  'Nasreen Sultana', 'nasreen.sultana@deshtv.com', 'DTV002',
  'Head of Digital',
  'd0000000-0000-0000-0000-000000000001',
  NULL,
  'manager', TRUE
),

-- MANAGER 1  (Karim → Nasreen)
(
  'a0000000-0000-0000-0000-000000000003',
  'Karim Uddin', 'karim.uddin@deshtv.com', 'DTV003',
  'Senior Manager – Digital Production',
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'manager', TRUE
),

-- MANAGER 2  (Razia → Nasreen)
(
  'a0000000-0000-0000-0000-000000000004',
  'Razia Begum', 'razia.begum@deshtv.com', 'DTV004',
  'Content Manager – Marketing & Social',
  'd0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000002',
  'manager', TRUE
),

-- TEAM LEAD 1  (Tanvir → Karim)
(
  'a0000000-0000-0000-0000-000000000005',
  'Tanvir Ahmed', 'tanvir.ahmed@deshtv.com', 'DTV005',
  'Team Leader – News & Bulletins',
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000003',
  'team_lead', TRUE
),

-- TEAM LEAD 2  (Shirin → Karim)
(
  'a0000000-0000-0000-0000-000000000006',
  'Shirin Akter', 'shirin.akter@deshtv.com', 'DTV006',
  'Team Leader – Digital Production',
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000003',
  'team_lead', TRUE
),

-- TEAM LEAD 3  (Mamun → Razia)
(
  'a0000000-0000-0000-0000-000000000007',
  'Mamun Rashid', 'mamun.rashid@deshtv.com', 'DTV007',
  'Team Leader – Social Media',
  'd0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000004',
  'team_lead', TRUE
),

-- EMPLOYEES under Tanvir
(
  'a0000000-0000-0000-0000-000000000008',
  'Rahim Hossain', 'rahim.hossain@deshtv.com', 'DTV008',
  'Senior Content Producer',
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000005',
  'employee', TRUE
),
(
  'a0000000-0000-0000-0000-000000000009',
  'Ayesha Khatun', 'ayesha.khatun@deshtv.com', 'DTV009',
  'Content Producer',
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000005',
  'employee', TRUE
),
(
  'a0000000-0000-0000-0000-000000000010',
  'Jahangir Alam', 'jahangir.alam@deshtv.com', 'DTV010',
  'Content Producer',
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000005',
  'employee', TRUE
),
(
  'a0000000-0000-0000-0000-000000000011',
  'Sabrina Islam', 'sabrina.islam@deshtv.com', 'DTV011',
  'Junior Content Producer',
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000005',
  'employee', TRUE
),

-- EMPLOYEES under Shirin
(
  'a0000000-0000-0000-0000-000000000012',
  'Mizan Rahman', 'mizan.rahman@deshtv.com', 'DTV012',
  'Senior Content Producer',
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000006',
  'employee', TRUE
),
(
  'a0000000-0000-0000-0000-000000000013',
  'Taslima Begum', 'taslima.begum@deshtv.com', 'DTV013',
  'Content Producer',
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000006',
  'employee', TRUE
),
(
  'a0000000-0000-0000-0000-000000000014',
  'Rafiqul Islam', 'rafiqul.islam@deshtv.com', 'DTV014',
  'Junior Content Producer',
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000006',
  'employee', TRUE
),

-- EMPLOYEES under Mamun
(
  'a0000000-0000-0000-0000-000000000015',
  'Nadia Akter', 'nadia.akter@deshtv.com', 'DTV015',
  'Senior Content Producer',
  'd0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000007',
  'employee', TRUE
),
(
  'a0000000-0000-0000-0000-000000000016',
  'Imran Hossain', 'imran.hossain@deshtv.com', 'DTV016',
  'Content Producer',
  'd0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000007',
  'employee', TRUE
),
(
  'a0000000-0000-0000-0000-000000000017',
  'Sultana Parvin', 'sultana.parvin@deshtv.com', 'DTV017',
  'Junior Content Producer',
  'd0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000007',
  'employee', TRUE
)

ON CONFLICT (id) DO UPDATE SET
  full_name        = EXCLUDED.full_name,
  email            = EXCLUDED.email,
  employee_code    = EXCLUDED.employee_code,
  designation      = EXCLUDED.designation,
  department_id    = EXCLUDED.department_id,
  manager_id       = EXCLUDED.manager_id,
  application_role = EXCLUDED.application_role,
  is_active        = EXCLUDED.is_active,
  updated_at       = NOW();


-- ============================================================
-- 4. TASK TYPES  (with brand colours)
-- ============================================================

INSERT INTO public.task_types (id, name, code, color_hex, sort_order) VALUES
  ('t0000000-0000-0000-0000-000000000001', 'Bulletin',  'BULLETIN',  '#EF4444', 1),
  ('t0000000-0000-0000-0000-000000000002', 'Card',      'CARD',      '#F59E0B', 2),
  ('t0000000-0000-0000-0000-000000000003', 'Rush',      'RUSH',      '#DC2626', 3),
  ('t0000000-0000-0000-0000-000000000004', 'Reels',     'REELS',     '#8B5CF6', 4),
  ('t0000000-0000-0000-0000-000000000005', 'Live',      'LIVE',      '#059669', 5),
  ('t0000000-0000-0000-0000-000000000006', 'FB Live',   'FB_LIVE',   '#1D4ED8', 6),
  ('t0000000-0000-0000-0000-000000000007', 'OOV',       'OOV',       '#0891B2', 7),
  ('t0000000-0000-0000-0000-000000000008', 'OOV+SOT',   'OOV_SOT',   '#0E7490', 8),
  ('t0000000-0000-0000-0000-000000000009', 'Talkshow',  'TALKSHOW',  '#D97706', 9),
  ('t0000000-0000-0000-0000-000000000010', 'HD PKG',    'HD_PKG',    '#7C3AED', 10);


-- ============================================================
-- 5. CHANNELS
-- ============================================================

INSERT INTO public.channels (id, name, platform) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'Desh TV Facebook', 'facebook'),
  ('c0000000-0000-0000-0000-000000000002', 'Desh TV YouTube',  'youtube'),
  ('c0000000-0000-0000-0000-000000000003', 'Desh TV Website',  'web'),
  ('c0000000-0000-0000-0000-000000000004', 'TV Feed',          'broadcast');


-- ============================================================
-- 6. MARKETING ADS
-- ============================================================

INSERT INTO public.marketing_ads (id, advertiser, package_type, daily_target, valid_from, valid_to) VALUES
  ('m0000000-0000-0000-0000-000000000001', 'Grameenphone', 'Digital Package A',   5, '2026-01-01', '2026-12-31'),
  ('m0000000-0000-0000-0000-000000000002', 'Robi Axiata',  'Social Media Bundle', 3, '2026-01-01', '2026-12-31'),
  ('m0000000-0000-0000-0000-000000000003', 'BRAC Bank',    'Premium Digital',     4, '2026-01-01', '2026-12-31'),
  ('m0000000-0000-0000-0000-000000000004', 'Walton Group', 'Reels Package',       6, '2026-01-01', '2026-12-31'),
  ('m0000000-0000-0000-0000-000000000005', 'Square Group', 'Content Marketing',   2, '2026-01-01', '2026-12-31');


-- ============================================================
-- 7. TASKS
--    40 tasks across three work dates.
--    Columns: id, work_date, file_name, task_type_id,
--             assigned_to, status, channel_id, marketing_ad_id,
--             remarks, caption, youtube_link, facebook_link,
--             google_drive_link, priority, created_by
-- ============================================================

INSERT INTO public.tasks (
  id, work_date, file_name, task_type_id, assigned_to, status,
  channel_id, marketing_ad_id, remarks, caption,
  youtube_link, facebook_link, google_drive_link,
  priority, created_by
) VALUES

-- ================================================================
-- work_date = 2026-09-26  (20 tasks)
-- ================================================================

-- Task 01: Bulletin → Rahim (Tanvir created)
(
  'f0000000-0000-0000-0000-000000000001',
  '2026-09-26',
  '20260926_BULLETIN_Govt_Policy_Update',
  't0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000008',
  'done',
  'c0000000-0000-0000-0000-000000000004',
  NULL,
  'Aired at 09:00 bulletin slot',
  'সরকারের নতুন নীতিমালা: বিস্তারিত জানুন',
  'https://www.youtube.com/watch?v=demoYT001',
  'https://www.facebook.com/deshtv/videos/demo001',
  'https://drive.google.com/file/d/demo001',
  'high',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 02: Reels → Ayesha (Tanvir created)
(
  'f0000000-0000-0000-0000-000000000002',
  '2026-09-26',
  '20260926_REELS_Entertainment_Morning',
  't0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000009',
  'in_progress',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000004',
  'Walton Reels — morning edition',
  'সকালের বিনোদন #DeshTV #Reels',
  NULL,
  NULL,
  'https://drive.google.com/file/d/demo002',
  'normal',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 03: Live → Jahangir (Tanvir created)
(
  'f0000000-0000-0000-0000-000000000003',
  '2026-09-26',
  '20260926_LIVE_Breaking_News_Cabinet',
  't0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000010',
  'assigned',
  'c0000000-0000-0000-0000-000000000002',
  NULL,
  'Cabinet reshuffle live coverage',
  'LIVE: মন্ত্রিসভায় রদবদল — সরাসরি সম্প্রচার',
  'https://www.youtube.com/watch?v=demoYT003',
  'https://www.facebook.com/deshtv/videos/demo003',
  NULL,
  'urgent',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 04: Card → Sabrina (Tanvir created)
(
  'f0000000-0000-0000-0000-000000000004',
  '2026-09-26',
  '20260926_CARD_Health_Tips_Dengue',
  't0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000011',
  'pending',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000003',
  'BRAC Bank sponsored health series',
  'ডেঙ্গু থেকে বাঁচুন — স্বাস্থ্য টিপস',
  NULL,
  NULL,
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 05: Bulletin → Mizan (Shirin created)
(
  'f0000000-0000-0000-0000-000000000005',
  '2026-09-26',
  '20260926_BULLETIN_Economy_Review',
  't0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000012',
  'done',
  'c0000000-0000-0000-0000-000000000004',
  NULL,
  '12:00 bulletin — economy segment',
  'অর্থনীতির হালচাল: বিশেষ প্রতিবেদন',
  NULL,
  NULL,
  'https://drive.google.com/file/d/demo005',
  'high',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 06: HD PKG → Taslima (Shirin created)
(
  'f0000000-0000-0000-0000-000000000006',
  '2026-09-26',
  '20260926_HD_PKG_Climate_Crisis_Dhaka',
  't0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000013',
  'in_progress',
  'c0000000-0000-0000-0000-000000000002',
  NULL,
  'Long-form HD feature on Dhaka flooding',
  'ঢাকায় জলাবদ্ধতা: কারণ ও সমাধান',
  'https://www.youtube.com/watch?v=demoYT006',
  NULL,
  'https://drive.google.com/file/d/demo006',
  'high',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 07: OOV → Rafiqul (Shirin created)
(
  'f0000000-0000-0000-0000-000000000007',
  '2026-09-26',
  '20260926_OOV_Sports_Cricket_Update',
  't0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000014',
  'assigned',
  'c0000000-0000-0000-0000-000000000003',
  NULL,
  'Bangladesh vs Pakistan series update',
  'ক্রিকেট আপডেট: বাংলাদেশ বনাম পাকিস্তান',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo007',
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 08: FB Live → Nadia (Mamun created)
(
  'f0000000-0000-0000-0000-000000000008',
  '2026-09-26',
  '20260926_FB_LIVE_PM_Press_Conference',
  't0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000015',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  NULL,
  'Live stream of PM press conference',
  'সরাসরি: প্রধানমন্ত্রীর সংবাদ সম্মেলন',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo008',
  NULL,
  'urgent',
  'a0000000-0000-0000-0000-000000000007'
),

-- Task 09: Reels → Imran (Mamun created) — with marketing ad
(
  'f0000000-0000-0000-0000-000000000009',
  '2026-09-26',
  '20260926_REELS_GP_Promo_TechTalks',
  't0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000016',
  'in_progress',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000001',
  'Grameenphone Digital Package A',
  'গ্রামীণফোনের টেক টকস — এপিসোড ৫',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo009',
  'https://drive.google.com/file/d/demo009',
  'normal',
  'a0000000-0000-0000-0000-000000000007'
),

-- Task 10: Talkshow → Sultana (Mamun created)
(
  'f0000000-0000-0000-0000-000000000010',
  '2026-09-26',
  '20260926_TALKSHOW_Women_Empowerment',
  't0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000017',
  'pending',
  'c0000000-0000-0000-0000-000000000002',
  NULL,
  'Panel discussion — Women in Media',
  'নারী ক্ষমতায়ন: মিডিয়ার ভূমিকা',
  'https://www.youtube.com/watch?v=demoYT010',
  NULL,
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000007'
),

-- Task 11: Rush → Rahim (Tanvir created)
(
  'f0000000-0000-0000-0000-000000000011',
  '2026-09-26',
  '20260926_RUSH_Traffic_Jam_Dhaka',
  't0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000008',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  NULL,
  'Breaking: Massive traffic gridlock in Mirpur',
  'ব্রেকিং: মিরপুরে তীব্র যানজট',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo011',
  NULL,
  'urgent',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 12: OOV+SOT → Ayesha (Tanvir created)
(
  'f0000000-0000-0000-0000-000000000012',
  '2026-09-26',
  '20260926_OOV_SOT_Education_Reform',
  't0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000009',
  'assigned',
  'c0000000-0000-0000-0000-000000000004',
  NULL,
  'Education ministry reform package',
  'শিক্ষা সংস্কার: মন্ত্রণালয়ের নতুন পদক্ষেপ',
  NULL,
  NULL,
  'https://drive.google.com/file/d/demo012',
  'high',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 13: Card → Jahangir (Tanvir) — Robi ad
(
  'f0000000-0000-0000-0000-000000000013',
  '2026-09-26',
  '20260926_CARD_Robi_5G_Launch',
  't0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000010',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000002',
  'Robi 5G launch promo card',
  'রবির ৫জি লঞ্চ — এখনই উপভোগ করুন!',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo013',
  NULL,
  'high',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 14: Bulletin → Sabrina (Tanvir) — hold
(
  'f0000000-0000-0000-0000-000000000014',
  '2026-09-26',
  '20260926_BULLETIN_International_Affairs',
  't0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000011',
  'hold',
  'c0000000-0000-0000-0000-000000000004',
  NULL,
  'Awaiting foreign ministry confirmation',
  'আন্তর্জাতিক বিষয়: বিশেষ প্রতিবেদন',
  NULL,
  NULL,
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 15: Reels → Mizan (Shirin) — Walton ad
(
  'f0000000-0000-0000-0000-000000000015',
  '2026-09-26',
  '20260926_REELS_Walton_Product_Showcase',
  't0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000012',
  'in_progress',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000004',
  'Walton Reels Package — product reel #3',
  'ওয়ালটনের সেরা পণ্য — এখন ঘরে বসেই কিনুন',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo015',
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 16: HD PKG → Taslima (Shirin) — cancelled
(
  'f0000000-0000-0000-0000-000000000016',
  '2026-09-26',
  '20260926_HD_PKG_Rural_Development',
  't0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000013',
  'cancelled',
  NULL,
  NULL,
  'Story shelved — source withdrew',
  'গ্রামীণ উন্নয়ন: একটি বিশেষ অনুসন্ধান',
  NULL,
  NULL,
  NULL,
  'low',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 17: OOV → Rafiqul (Shirin)
(
  'f0000000-0000-0000-0000-000000000017',
  '2026-09-26',
  '20260926_OOV_Agriculture_Flood_Loss',
  't0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000014',
  'pending',
  'c0000000-0000-0000-0000-000000000003',
  NULL,
  'Flood-related crop damage report',
  'বন্যায় ফসলহানি: কৃষকের কষ্ট',
  NULL,
  NULL,
  'https://drive.google.com/file/d/demo017',
  'normal',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 18: FB Live → Nadia (Mamun) — Square ad
(
  'f0000000-0000-0000-0000-000000000018',
  '2026-09-26',
  '20260926_FB_LIVE_Square_Pharma_CSR',
  't0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000015',
  'assigned',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000005',
  'Square Group CSR event live stream',
  'LIVE: স্কয়ার গ্রুপের সিএসআর কার্যক্রম',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo018',
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000007'
),

-- Task 19: Talkshow → Imran (Mamun)
(
  'f0000000-0000-0000-0000-000000000019',
  '2026-09-26',
  '20260926_TALKSHOW_Climate_Action_BD',
  't0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000016',
  'done',
  'c0000000-0000-0000-0000-000000000002',
  NULL,
  'Climate change panel — aired successfully',
  'জলবায়ু পরিবর্তন: বাংলাদেশের করণীয়',
  'https://www.youtube.com/watch?v=demoYT019',
  'https://www.facebook.com/deshtv/videos/demo019',
  'https://drive.google.com/file/d/demo019',
  'high',
  'a0000000-0000-0000-0000-000000000007'
),

-- Task 20: Card → Sultana (Mamun) — BRAC ad
(
  'f0000000-0000-0000-0000-000000000020',
  '2026-09-26',
  '20260926_CARD_BRAC_Bank_Loan_Offer',
  't0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000017',
  'in_progress',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000003',
  'BRAC Bank Premium Digital — promo card',
  'ব্র্যাক ব্যাংক লোন অফার: সহজ শর্তে ঋণ নিন',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo020',
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000007'
),

-- ================================================================
-- work_date = 2026-09-25  (10 tasks)
-- ================================================================

-- Task 21
(
  'f0000000-0000-0000-0000-000000000021',
  '2026-09-25',
  '20260925_BULLETIN_Budget_Session_Live',
  't0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000008',
  'done',
  'c0000000-0000-0000-0000-000000000004',
  NULL,
  'Budget session special bulletin',
  'বাজেট অধিবেশন: সরাসরি সংসদ থেকে',
  'https://www.youtube.com/watch?v=demoYT021',
  NULL,
  'https://drive.google.com/file/d/demo021',
  'urgent',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 22
(
  'f0000000-0000-0000-0000-000000000022',
  '2026-09-25',
  '20260925_REELS_Street_Food_Dhaka',
  't0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000009',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  NULL,
  'Lifestyle reel — Dhaka street food tour',
  'ঢাকার পথ-খাবার: একটি মজাদার ভ্রমণ',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo022',
  NULL,
  'low',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 23
(
  'f0000000-0000-0000-0000-000000000023',
  '2026-09-25',
  '20260925_HD_PKG_Liberation_War_Doc',
  't0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000012',
  'done',
  'c0000000-0000-0000-0000-000000000002',
  NULL,
  'Historical documentary segment — aired on prime time',
  'মুক্তিযুদ্ধের স্মৃতি: একটি বিশেষ প্রামাণ্যচিত্র',
  'https://www.youtube.com/watch?v=demoYT023',
  NULL,
  'https://drive.google.com/file/d/demo023',
  'high',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 24
(
  'f0000000-0000-0000-0000-000000000024',
  '2026-09-25',
  '20260925_CARD_Walton_TV_Offer',
  't0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000015',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000004',
  'Walton TV promotional card',
  'ওয়ালটন টিভি: ২৫% ছাড়ে পান এখনই',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo024',
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000007'
),

-- Task 25
(
  'f0000000-0000-0000-0000-000000000025',
  '2026-09-25',
  '20260925_OOV_International_Trade_Deal',
  't0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000010',
  'done',
  'c0000000-0000-0000-0000-000000000003',
  NULL,
  'Bangladesh-India trade agreement coverage',
  'বাংলাদেশ-ভারত বাণিজ্য চুক্তি: প্রতিবেদন',
  NULL,
  NULL,
  'https://drive.google.com/file/d/demo025',
  'normal',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 26
(
  'f0000000-0000-0000-0000-000000000026',
  '2026-09-25',
  '20260925_RUSH_Cyclone_Warning_Coast',
  't0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000011',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  NULL,
  'Cyclone warning — coastal areas alert',
  'জরুরি সতর্কতা: উপকূলে ঘূর্ণিঝড়ের আশঙ্কা',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo026',
  NULL,
  'urgent',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 27
(
  'f0000000-0000-0000-0000-000000000027',
  '2026-09-25',
  '20260925_FB_LIVE_Music_Festival_Dhaka',
  't0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000016',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  NULL,
  'Live stream — Dhaka International Music Festival',
  'LIVE: ঢাকা আন্তর্জাতিক সংগীত উৎসব',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo027',
  NULL,
  'high',
  'a0000000-0000-0000-0000-000000000007'
),

-- Task 28
(
  'f0000000-0000-0000-0000-000000000028',
  '2026-09-25',
  '20260925_TALKSHOW_Healthcare_Bangla',
  't0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000013',
  'done',
  'c0000000-0000-0000-0000-000000000002',
  'm0000000-0000-0000-0000-000000000003',
  'BRAC Bank healthcare panel aired',
  'স্বাস্থ্যসেবা: বিশেষজ্ঞদের মতামত',
  'https://www.youtube.com/watch?v=demoYT028',
  NULL,
  'https://drive.google.com/file/d/demo028',
  'normal',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 29
(
  'f0000000-0000-0000-0000-000000000029',
  '2026-09-25',
  '20260925_OOV_SOT_Youth_Startup_Expo',
  't0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000014',
  'done',
  'c0000000-0000-0000-0000-000000000003',
  'm0000000-0000-0000-0000-000000000001',
  'GP-sponsored startup expo coverage',
  'তরুণ উদ্যোক্তা এক্সপো: সাফল্যের গল্প',
  NULL,
  NULL,
  'https://drive.google.com/file/d/demo029',
  'normal',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 30
(
  'f0000000-0000-0000-0000-000000000030',
  '2026-09-25',
  '20260925_BULLETIN_Late_Night_Summary',
  't0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000017',
  'done',
  'c0000000-0000-0000-0000-000000000004',
  NULL,
  'Late night news summary bulletin',
  'রাতের সংবাদ সারসংক্ষেপ — দেশ টিভি',
  NULL,
  NULL,
  'https://drive.google.com/file/d/demo030',
  'normal',
  'a0000000-0000-0000-0000-000000000007'
),

-- ================================================================
-- work_date = 2026-09-24  (10 tasks)
-- ================================================================

-- Task 31
(
  'f0000000-0000-0000-0000-000000000031',
  '2026-09-24',
  '20260924_BULLETIN_Morning_Headlines',
  't0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000008',
  'done',
  'c0000000-0000-0000-0000-000000000004',
  NULL,
  'Morning headlines bulletin — 08:00 slot',
  'সকালের শিরোনাম | দেশ টিভি',
  NULL,
  NULL,
  'https://drive.google.com/file/d/demo031',
  'high',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 32
(
  'f0000000-0000-0000-0000-000000000032',
  '2026-09-24',
  '20260924_REELS_Tech_Review_Gadgets',
  't0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000012',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000001',
  'GP-sponsored tech gadget review reel',
  'সেরা গ্যাজেট রিভিউ ২০২৬ — গ্রামীণফোন',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo032',
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 33
(
  'f0000000-0000-0000-0000-000000000033',
  '2026-09-24',
  '20260924_LIVE_University_Admission',
  't0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000009',
  'done',
  'c0000000-0000-0000-0000-000000000002',
  NULL,
  'University admission result announcement live',
  'LIVE: বিশ্ববিদ্যালয় ভর্তি ফলাফল',
  'https://www.youtube.com/watch?v=demoYT033',
  'https://www.facebook.com/deshtv/videos/demo033',
  NULL,
  'high',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 34
(
  'f0000000-0000-0000-0000-000000000034',
  '2026-09-24',
  '20260924_CARD_Robi_Internet_Package',
  't0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000015',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000002',
  'Robi social media bundle promo card',
  'রবির ইন্টারনেট প্যাকেজ: সবচেয়ে সাশ্রয়ী',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo034',
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000007'
),

-- Task 35
(
  'f0000000-0000-0000-0000-000000000035',
  '2026-09-24',
  '20260924_OOV_SOT_Corruption_Probe',
  't0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000010',
  'done',
  'c0000000-0000-0000-0000-000000000004',
  NULL,
  'Investigative OOV+SOT on corruption case',
  'দুর্নীতির তদন্ত: বিশেষ প্রতিবেদন',
  NULL,
  NULL,
  'https://drive.google.com/file/d/demo035',
  'high',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 36
(
  'f0000000-0000-0000-0000-000000000036',
  '2026-09-24',
  '20260924_RUSH_Fire_Incident_Narayanganj',
  't0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000016',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  NULL,
  'Breaking — factory fire in Narayanganj',
  'ব্রেকিং: নারায়ণগঞ্জে কারখানায় আগুন',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo036',
  NULL,
  'urgent',
  'a0000000-0000-0000-0000-000000000007'
),

-- Task 37
(
  'f0000000-0000-0000-0000-000000000037',
  '2026-09-24',
  '20260924_TALKSHOW_Economy_Panel',
  't0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000013',
  'done',
  'c0000000-0000-0000-0000-000000000002',
  NULL,
  'Economics panel discussion — prime time',
  'অর্থনীতি বিশ্লেষণ: বিশেষজ্ঞ প্যানেল',
  'https://www.youtube.com/watch?v=demoYT037',
  NULL,
  'https://drive.google.com/file/d/demo037',
  'normal',
  'a0000000-0000-0000-0000-000000000006'
),

-- Task 38
(
  'f0000000-0000-0000-0000-000000000038',
  '2026-09-24',
  '20260924_HD_PKG_Sundarbans_Wildlife',
  't0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000011',
  'done',
  'c0000000-0000-0000-0000-000000000002',
  NULL,
  'Nature documentary segment — Sundarbans wildlife',
  'সুন্দরবনের বাঘ: একটি বিরল দর্শন',
  'https://www.youtube.com/watch?v=demoYT038',
  NULL,
  'https://drive.google.com/file/d/demo038',
  'normal',
  'a0000000-0000-0000-0000-000000000005'
),

-- Task 39
(
  'f0000000-0000-0000-0000-000000000039',
  '2026-09-24',
  '20260924_REELS_Square_Pharma_Health',
  't0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000017',
  'done',
  'c0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000005',
  'Square Group content marketing reel',
  'স্কয়ার ফার্মার স্বাস্থ্য সচেতনতা ক্যাম্পেইন',
  NULL,
  'https://www.facebook.com/deshtv/videos/demo039',
  NULL,
  'normal',
  'a0000000-0000-0000-0000-000000000007'
),

-- Task 40
(
  'f0000000-0000-0000-0000-000000000040',
  '2026-09-24',
  '20260924_OOV_Remittance_Record_High',
  't0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000014',
  'done',
  'c0000000-0000-0000-0000-000000000003',
  NULL,
  'Remittance hits record — economy story',
  'রেমিট্যান্সে রেকর্ড: অর্থনীতিতে সুখবর',
  NULL,
  NULL,
  'https://drive.google.com/file/d/demo040',
  'normal',
  'a0000000-0000-0000-0000-000000000006'
);
