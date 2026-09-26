import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('database requires remarks and both publishing links for completion', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '10000000-0000-0000-0000-000000000001'::uuid $$;
      CREATE TABLE public.profiles(id uuid, is_active boolean);
      INSERT INTO public.profiles VALUES ('10000000-0000-0000-0000-000000000001', true);
      CREATE TABLE public.tasks(id int PRIMARY KEY, status text, assigned_to uuid, updated_by uuid, remarks text, youtube_link text, facebook_link text);
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT SELECT ON public.profiles TO authenticated;
      GRANT ALL ON public.tasks TO authenticated;`)
    await db.exec(await readFile('supabase/migrations/20260926175600_task_completion_requirements.sql', 'utf8'))
    await db.exec(`SET ROLE authenticated;
      INSERT INTO public.tasks(id,status,assigned_to) VALUES (1,'pending','10000000-0000-0000-0000-000000000001');`)
    await assert.rejects(db.exec("UPDATE public.tasks SET status='done' WHERE id=1"), /Add remarks/)
    await db.exec("UPDATE public.tasks SET remarks='Published' WHERE id=1")
    await assert.rejects(db.exec("UPDATE public.tasks SET status='done' WHERE id=1"), /YouTube/)
    await db.exec("UPDATE public.tasks SET youtube_link='https://youtube.com/watch?v=demo' WHERE id=1")
    await assert.rejects(db.exec("UPDATE public.tasks SET status='done' WHERE id=1"), /Facebook/)
    await db.exec("UPDATE public.tasks SET facebook_link='https://facebook.com/demo', status='done' WHERE id=1")
    for (const field of ['remarks', 'youtube_link', 'facebook_link']) {
      await assert.rejects(db.exec(`UPDATE public.tasks SET ${field}=E' \\t\\n' WHERE id=1`), /before marking/)
    }
    await assert.rejects(db.exec("INSERT INTO public.tasks(id,status,assigned_to) VALUES (2,'done','10000000-0000-0000-0000-000000000001')"), /Add remarks/)
    assert.equal((await db.query('SELECT status FROM public.tasks WHERE id=1')).rows[0].status, 'done')
  } finally { await db.close() }
})
