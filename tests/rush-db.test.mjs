import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('Rush records validate fields and enforce active employee and ownership access', async () => {
  const db = new PGlite()
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon;
      CREATE SCHEMA auth; CREATE SCHEMA private;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT current_setting('test.uid')::uuid $$;
      CREATE FUNCTION private.active_employee() RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.active')::boolean $$;
      CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.admin')::boolean $$;
      CREATE TABLE profiles (id uuid PRIMARY KEY);
      INSERT INTO profiles VALUES ('10000000-0000-0000-0000-000000000001'), ('10000000-0000-0000-0000-000000000002');
      GRANT USAGE ON SCHEMA auth, private TO authenticated;
      SET test.uid = '10000000-0000-0000-0000-000000000001'; SET test.active = 'true'; SET test.admin = 'false';`)
    await db.exec(await readFile('supabase/migrations/20260927154900_rush_entries.sql', 'utf8'))
    await db.exec('SET ROLE authenticated')
    await db.exec("INSERT INTO rush_entries(reporter,name,created_by) VALUES ('Reporter','Rush item',auth.uid())")
    await db.exec("UPDATE rush_entries SET status='Received'")
    assert.equal((await db.query('SELECT status FROM rush_entries')).rows[0].status, 'Received')
    await assert.rejects(db.exec("UPDATE rush_entries SET name='   '"), /check constraint/)
    await assert.rejects(db.exec("UPDATE rush_entries SET created_by='10000000-0000-0000-0000-000000000002'"), /permission denied/)
    await db.exec("SET test.uid = '10000000-0000-0000-0000-000000000002'")
    assert.equal((await db.query('SELECT * FROM rush_entries')).rows.length, 1)
    assert.equal((await db.query("UPDATE rush_entries SET status='Changed' RETURNING id")).rows.length, 0)
    await assert.rejects(db.exec("INSERT INTO rush_entries(reporter,name,created_by) VALUES ('R','N','10000000-0000-0000-0000-000000000001')"), /row-level security/)
    await db.exec("SET test.admin = 'true'; UPDATE rush_entries SET status='Done'")
    assert.equal((await db.query('SELECT status FROM rush_entries')).rows[0].status, 'Done')
    await db.exec("SET test.active = 'false'")
    assert.equal((await db.query('SELECT * FROM rush_entries')).rows.length, 0)
    await assert.rejects(db.exec("INSERT INTO rush_entries(reporter,name,created_by) VALUES ('R','N',auth.uid())"), /row-level security/)
    await db.exec('RESET ROLE; SET ROLE anon')
    await assert.rejects(db.exec('SELECT * FROM rush_entries'), /permission denied/)
  } finally { await db.close() }
})
