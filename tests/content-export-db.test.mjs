import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('export workflow validates membership, mapping, authorization and atomic task creation', async () => {
  const db = new PGlite()
  const creator = '10000000-0000-0000-0000-000000000001'
  const outsider = '10000000-0000-0000-0000-000000000002'
  const type = '20000000-0000-0000-0000-000000000001'
  const asUser = async id => { await db.exec('RESET ROLE; SET ROLE authenticated'); await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]) }
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;`)
    for (const file of ['001_schema.sql', '002_rls.sql', '20260926071225_administration_access.sql', '20260926135011_task_work_time.sql', '20260926175600_task_completion_requirements.sql', '20260927155159_content_creator_approval.sql', '20260929000000_content_creator_dropdown.sql', '20260929030000_content_creator_remarks.sql', '20260929060000_content_package_script.sql', '20260930152002_content_export_workflow.sql']) {
      await db.exec((await readFile(`supabase/migrations/${file}`, 'utf8')).replace(/^CREATE EXTENSION.*$/gm, ''))
    }
    await db.exec(`INSERT INTO auth.users VALUES ('${creator}','creator@example.test','{"full_name":"Creator"}'), ('${outsider}','other@example.test','{"full_name":"Other"}');
      INSERT INTO departments(name,code) VALUES ('Content Creator Team','CC');
      UPDATE profiles SET department_id=(SELECT id FROM departments WHERE code='CC') WHERE id='${creator}';
      INSERT INTO task_types(id,name,code) VALUES ('${type}','Video','VIDEO');`)
    await asUser(creator)
    await assert.rejects(db.query('INSERT INTO content_packages(package_name,creator_id) VALUES ($1,$2)', ['Wrong team', outsider]), /Content Creator team/)
    const entry = (await db.query(`INSERT INTO content_packages(package_name,creator_id,thumbnail_url,caption,script) VALUES ('Package',$1,'Red title on dark background','Caption','Script') RETURNING *`, [creator])).rows[0]
    const patch = (sql, args = []) => db.query(`UPDATE content_packages SET ${sql} WHERE id='${entry.id}' RETURNING *`, args)
    await patch("approval_state='done'")
    assert.equal((await db.query('SELECT * FROM tasks')).rows.length, 0)
    await assert.rejects(patch("status='export_done'"), /Choose a work date/)
    await assert.rejects(patch("status='export_done',work_date='2026-10-01',time_slot='invalid',task_type_id=$1,assigned_to=$2", [type, creator]), /check constraint/)
    assert.equal((await db.query('SELECT status FROM content_packages')).rows[0].status, 'video_panel')
    assert.equal((await db.query('SELECT * FROM tasks')).rows.length, 0)
    await asUser(outsider)
    assert.equal((await patch("status='export_done'")).rows.length, 0)
    await asUser(creator)
    await assert.rejects(db.query(`INSERT INTO tasks(work_date,file_name,task_type_id,assigned_to,created_by,source_content_id) VALUES ('2026-10-01','Forged',$1,$2,$2,$3)`, [type, creator, entry.id]), /exporting/)
    await patch("status='export_done',work_date='2026-10-01',time_slot='08:00',task_type_id=$1,assigned_to=$2", [type, creator])
    const task = (await db.query('SELECT * FROM tasks')).rows[0]
    assert.equal(task.file_name, 'Package')
    assert.equal(task.caption, 'Caption')
    assert.equal(task.remarks, 'Creator Thumb: Red title on dark background')
    assert.equal(task.source_content_id, entry.id)
    assert.equal((await db.query('SELECT task_id FROM content_packages')).rows[0].task_id, task.id)
    await assert.rejects(patch("status='export_done'"), /already been exported/)
    assert.equal((await db.query('SELECT * FROM tasks')).rows.length, 1)
    // New packages can also be exported directly; the insert and task are atomic.
    await db.query(`INSERT INTO content_packages(package_name,creator_id,status,work_date,task_type_id,assigned_to) VALUES ('Direct export',$1,'export_done','2026-10-02',$2,$1)`, [creator, type])
    assert.equal((await db.query('SELECT * FROM tasks')).rows.length, 2)
    assert.equal((await db.query('SELECT * FROM content_packages WHERE task_id IS NULL')).rows.length, 0)
    // An employee can create a package for a team member and export it immediately.
    await asUser(outsider)
    await db.query(`INSERT INTO content_packages(package_name,creator_id,status,work_date,task_type_id,assigned_to) VALUES ('On behalf',$1,'export_done','2026-10-02',$2,$1)`, [creator, type])
    assert.equal((await db.query('SELECT * FROM tasks')).rows.length, 3)
    await db.exec('RESET ROLE')
    await db.exec(await readFile('supabase/migrations/20260930153033_digital_web_sections.sql', 'utf8'))
    assert.equal((await db.query("SELECT count(*)::int AS n FROM tasks WHERE work_section='digital'")).rows[0].n, 3)
    await asUser(creator)
    await db.query(`INSERT INTO content_packages(package_name,creator_id,status,work_section,work_date,task_type_id,assigned_to) VALUES ('Web export',$1,'export_done','web','2026-10-02',$2,$1)`, [creator, type])
    assert.equal((await db.query("SELECT count(*)::int AS n FROM tasks WHERE work_section='web'")).rows[0].n, 1)
    await db.exec('RESET ROLE')
    const ad = (await db.query("INSERT INTO marketing_ads(advertiser,package_type,work_section) VALUES ('Web sponsor','News','web') RETURNING id")).rows[0]
    await assert.rejects(db.query("UPDATE tasks SET marketing_ad_id=$1 WHERE work_section='digital'", [ad.id]), /foreign key/)
    await db.query("UPDATE tasks SET marketing_ad_id=$1 WHERE work_section='web'", [ad.id])
    await assert.rejects(db.query("UPDATE tasks SET work_section='other'"), /check constraint/)
  } finally { await db.close() }
})
