import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('administration permissions and hierarchy on the real SQL migration', async t => {
  const db = new PGlite()
  const admin = '10000000-0000-0000-0000-000000000001'
  const employee = '10000000-0000-0000-0000-000000000002'
  const inactive = '10000000-0000-0000-0000-000000000003'
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon;
      CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
      GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;`)
    // Extensions aren't used by these tests; gen_random_uuid is built into PostgreSQL.
    await db.exec((await readFile('supabase/migrations/001_schema.sql', 'utf8')).replace(/^CREATE EXTENSION.*$/gm, ''))
    await db.exec(await readFile('supabase/migrations/002_rls.sql', 'utf8'))
    const migration = await readFile('supabase/migrations/20260926071225_administration_access.sql', 'utf8')
    await db.exec(migration)
    await db.exec(migration) // Safe to reapply after a SQL Editor retry.
    await db.exec(`INSERT INTO auth.users VALUES
      ('${admin}', 'admin@example.test', '{"full_name":"Admin"}'),
      ('${employee}', 'employee@example.test', '{"full_name":"Employee"}'),
      ('${inactive}', 'inactive@example.test', '{"full_name":"Inactive"}');
      UPDATE public.profiles SET application_role='administrator' WHERE id='${admin}';
      UPDATE public.profiles SET is_active=false WHERE id='${inactive}';
      INSERT INTO public.departments(name,code) VALUES ('News','NEWS');`)
    const asUser = async id => {
      await db.exec('RESET ROLE; SET ROLE authenticated;')
      await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id])
    }
    const edit = (id, changes) => db.query('SELECT public.admin_update_profile($1::uuid, $2::jsonb)', [id, JSON.stringify(changes)])
    await t.test('employees cannot self-promote through RPC or direct table writes', async () => {
      await asUser(employee)
      await assert.rejects(edit(employee, { application_role: 'administrator' }), /Only active administrators/)
      const result = await db.query("UPDATE public.profiles SET application_role='administrator' WHERE id=$1 RETURNING id", [employee])
      assert.equal(result.rows.length, 0)
      assert.equal((await db.query('SELECT application_role FROM public.profiles WHERE id=$1', [employee])).rows[0].application_role, 'employee')
    })
    await t.test('employees cannot change administrative catalogs', async () => {
      await assert.rejects(db.query("INSERT INTO public.departments(name,code) VALUES ('Blocked','NO')"), /row-level security/)
    })
    await t.test('an admin can promote another employee and save profile fields', async () => {
      await asUser(admin)
      assert.equal((await db.query('SELECT public.administration_ready() AS ready')).rows[0].ready, true)
      await edit(employee, { application_role: 'administrator', full_name: 'New Admin', employee_code: 'N01' })
      const row = (await db.query('SELECT * FROM public.profiles WHERE id=$1', [employee])).rows[0]
      assert.equal(row.application_role, 'administrator')
      assert.equal(row.full_name, 'New Admin')
      await edit(employee, { application_role: 'employee' })
    })
    await t.test('an administrator cannot demote or deactivate themselves', async () => {
      await assert.rejects(edit(admin, { application_role: 'employee' }), /another administrator/)
      await assert.rejects(edit(admin, { is_active: false }), /another administrator/)
    })
    await t.test('manager assignments reject self-reference and indirect cycles', async () => {
      await assert.rejects(edit(employee, { manager_id: employee }), /circular reporting/)
      await edit(employee, { manager_id: admin })
      await assert.rejects(edit(admin, { manager_id: employee }), /circular reporting/)
    })
    await t.test('inactive users cannot read work catalogs or change profiles', async () => {
      await asUser(inactive)
      assert.equal((await db.query('SELECT * FROM public.departments')).rows.length, 0)
      await assert.rejects(edit(employee, { full_name: 'Blocked' }), /Only active administrators/)
      assert.equal((await db.query('SELECT id FROM public.profiles')).rows.length, 1)
    })
    await t.test('anonymous requests cannot call employee administration', async () => {
      await db.exec('RESET ROLE; SET ROLE anon;')
      await assert.rejects(edit(employee, { application_role: 'administrator' }), /permission denied/)
    })
  } finally { await db.close() }
})
