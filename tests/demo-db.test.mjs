import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('demo data loads with current schema, preserves users, and supports retries', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`)
    await db.exec((await readFile('supabase/migrations/001_schema.sql', 'utf8')).replace(/^CREATE EXTENSION.*$/gm, ''))
    await db.exec(await readFile('supabase/migrations/002_rls.sql', 'utf8'))
    await db.exec(await readFile('supabase/migrations/20260926071225_administration_access.sql', 'utf8'))
    const timeMigration = await readFile('supabase/migrations/20260926135011_task_work_time.sql', 'utf8')
    await db.exec(timeMigration)
    await db.exec(timeMigration)
    const seed = await readFile('supabase/demo-data.sql', 'utf8')
    await assert.rejects(db.exec(seed), /Create an account/)
    await db.exec('ROLLBACK')
    assert.equal((await db.query('SELECT count(*)::int AS n FROM task_types')).rows[0].n, 0)
    await db.exec(`INSERT INTO auth.users VALUES
      ('10000000-0000-0000-0000-000000000001', 'demo@example.test', '{"full_name":"Presenter"}'),
      ('10000000-0000-0000-0000-000000000002', 'inactive@example.test', '{"full_name":"Inactive"}');
      UPDATE profiles SET is_active=false WHERE email='inactive@example.test';`)
    const before = (await db.query('SELECT * FROM profiles ORDER BY id')).rows
    await db.exec(seed)
    const stats = (await db.query(`SELECT count(*)::int AS total,
      count(DISTINCT status)::int AS statuses, count(DISTINCT priority)::int AS priorities,
      count(*) FILTER (WHERE work_date=(now() AT TIME ZONE 'Asia/Dhaka')::date)::int AS today
      FROM tasks`)).rows[0]
    assert.deepEqual(stats, { total: 193, statuses: 6, priorities: 4, today: 73 })
    assert.equal((await db.query('SELECT count(*)::int AS n FROM task_history')).rows[0].n, 283)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM tasks JOIN profiles ON profiles.id=tasks.assigned_to WHERE NOT profiles.is_active')).rows[0].n, 0)
    await db.exec("UPDATE tasks SET remarks='Presenter edit' WHERE id='de300000-0000-4000-8000-000000000001'")
    await db.exec(seed)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM tasks')).rows[0].n, 193)
    assert.equal((await db.query("SELECT remarks FROM tasks WHERE id='de300000-0000-4000-8000-000000000001'")).rows[0].remarks, 'Presenter edit')
    assert.deepEqual((await db.query("SELECT * FROM profiles WHERE id::text NOT LIKE 'de500000-%' ORDER BY id")).rows, before)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM departments')).rows[0].n, 4)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM marketing_ads')).rows[0].n, 4)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM profiles')).rows[0].n, 14)
    assert.equal((await db.query('SELECT count(DISTINCT work_date)::int AS n FROM tasks')).rows[0].n, 11)
    assert.equal((await db.query('SELECT count(*)::int AS n FROM tasks WHERE time_slot IS NULL')).rows[0].n, 0)
    assert.equal((await db.query("SELECT time_slot FROM tasks WHERE id='de300000-0000-4000-8000-000000000004'")).rows[0].time_slot, 'card')
    await db.exec("UPDATE tasks SET time_slot=NULL WHERE id='de300000-0000-4000-8000-000000000002'")
    await db.exec("INSERT INTO tasks (id,work_date,file_name,task_type_id,assigned_to,created_by) SELECT '90000000-0000-0000-0000-000000000001',work_date,'Real task',task_type_id,assigned_to,created_by FROM tasks LIMIT 1")
    const repair = await readFile('supabase/fix-demo-time-slots.sql', 'utf8')
    await db.exec(repair)
    assert.equal((await db.query("SELECT time_slot FROM tasks WHERE id='de300000-0000-4000-8000-000000000002'")).rows[0].time_slot, '08:00')
    assert.equal((await db.query("SELECT time_slot FROM tasks WHERE file_name='Real task'")).rows[0].time_slot, null)
    await db.exec("UPDATE tasks SET time_slot='00:00' WHERE id='de300000-0000-4000-8000-000000000001'")
    await db.exec(repair)
    assert.equal((await db.query("SELECT time_slot FROM tasks WHERE id='de300000-0000-4000-8000-000000000001'")).rows[0].time_slot, '00:00')
    assert.equal((await db.query("SELECT new_value FROM task_history WHERE field_name='time_slot' AND task_id='de300000-0000-4000-8000-000000000001'")).rows[0].new_value, '00:00')
    await assert.rejects(db.exec("UPDATE tasks SET time_slot='25:00'"), /check constraint/)
    const completion = await readFile('supabase/migrations/20260926140355_assigned_user_completion.sql', 'utf8')
    await db.exec('GRANT USAGE ON SCHEMA auth TO authenticated, anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;')
    await db.exec(completion)
    await db.exec(completion)
    await db.exec("UPDATE profiles SET application_role='administrator' WHERE id='10000000-0000-0000-0000-000000000001'")
    await db.exec("UPDATE tasks SET status='in_progress', assigned_to='de500000-0000-4000-8000-000000000007' WHERE id='de300000-0000-4000-8000-000000000001'")
    await db.exec("SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',false)")
    await assert.rejects(db.exec("UPDATE tasks SET status='done' WHERE id='de300000-0000-4000-8000-000000000001'"), /Only the assigned user/)
    await assert.rejects(db.exec("UPDATE tasks SET status='done', assigned_to='10000000-0000-0000-0000-000000000001' WHERE id='de300000-0000-4000-8000-000000000001'"), /Save the assignment/)
    await db.exec("SELECT set_config('request.jwt.claim.sub','de500000-0000-4000-8000-000000000007',false)")
    await db.exec("UPDATE tasks SET status='done', updated_by='10000000-0000-0000-0000-000000000001' WHERE id='de300000-0000-4000-8000-000000000001'")
    const completed = (await db.query("SELECT status, updated_by FROM tasks WHERE id='de300000-0000-4000-8000-000000000001'")).rows[0]
    assert.equal(completed.status, 'done')
    assert.equal(completed.updated_by, 'de500000-0000-4000-8000-000000000007')
  } finally { await db.close() }
})
