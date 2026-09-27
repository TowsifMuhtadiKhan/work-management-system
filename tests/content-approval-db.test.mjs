import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

test('content approval enforces selected reviewers and atomically creates one Daily Task', async t => {
  const db = new PGlite()
  const creator = '10000000-0000-0000-0000-000000000001'
  const approver = '10000000-0000-0000-0000-000000000002'
  const outsider = '10000000-0000-0000-0000-000000000003'
  const typeId = '20000000-0000-0000-0000-000000000001'
  const asUser = async id => {
    await db.exec('RESET ROLE; SET ROLE authenticated')
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [id])
  }
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
      CREATE TABLE auth.users(id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;`)
    for (const file of ['001_schema.sql', '002_rls.sql', '20260926071225_administration_access.sql', '20260926135011_task_work_time.sql', '20260926175600_task_completion_requirements.sql', '20260927155159_content_creator_approval.sql']) {
      await db.exec((await readFile(`supabase/migrations/${file}`, 'utf8')).replace(/^CREATE EXTENSION.*$/gm, ''))
    }
    await db.exec(`INSERT INTO auth.users VALUES
      ('${creator}', 'creator@example.test', '{"full_name":"Creator"}'),
      ('${approver}', 'approver@example.test', '{"full_name":"Approver"}'),
      ('${outsider}', 'outsider@example.test', '{"full_name":"Other"}');
      INSERT INTO task_types(id,name,code) VALUES ('${typeId}','Content','CONTENT');`)
    await asUser(creator)
    const entry = (await db.query(`INSERT INTO content_packages(package_name,creator_id,approver_id,caption,thumbnail_url)
      VALUES ('Package', $1, $2, 'Original caption', 'https://example.test/thumb.jpg') RETURNING *`, [creator, approver])).rows[0]
    const patch = (sql, values = []) => db.query(`UPDATE content_packages SET ${sql} WHERE id='${entry.id}' RETURNING *`, values)

    await t.test('creators submit their own content but cannot self-approve or forge task sources', async () => {
      await assert.rejects(patch("status='approved'"), /cannot approve/)
      await assert.rejects(patch('approver_id=creator_id'), /check constraint/)
      await assert.rejects(patch("thumbnail_url='javascript:alert(1)'"), /check constraint/)
      await patch("status='submitted'")
      assert.equal((await db.query('SELECT * FROM tasks')).rows.length, 0)
      await assert.rejects(patch("caption='Changed after submission'"), /selected approver/)
      await assert.rejects(db.query(`INSERT INTO tasks(work_date,file_name,task_type_id,assigned_to,created_by,source_content_id)
        VALUES ('2026-10-01','Forged',$1,$2,$2,$3)`, [typeId, creator, entry.id]), /must be created by approving/)
    })
    await t.test('unselected users cannot read pending packages or approve them', async () => {
      await asUser(outsider)
      assert.equal((await db.query('SELECT * FROM content_packages')).rows.length, 0)
      assert.equal((await patch("status='approved'")).rows.length, 0)
      assert.equal((await db.query('SELECT * FROM content_reviews')).rows.length, 0)
    })
    await t.test('reviewer feedback persists and creator can revise and resubmit', async () => {
      await asUser(approver)
      await assert.rejects(patch("status='changes_requested',feedback='   '"), /Enter feedback/)
      await patch("status='submitted',feedback='Please check the intro'")
      await patch("status='changes_requested',feedback='Shorten the caption'")
      await assert.rejects(db.query(`INSERT INTO content_reviews(package_id,reviewer_id,action) VALUES ($1,$2,'approved')`, [entry.id, approver]), /row-level security/)
      await asUser(creator)
      await assert.rejects(patch("feedback='Erase feedback'"), /cannot approve/)
      await patch("caption='Updated caption',status='submitted'")
      const history = (await db.query('SELECT action,feedback FROM content_reviews ORDER BY created_at')).rows
      assert.deepEqual(history.map(row => row.action), ['submitted', 'feedback', 'changes_requested', 'submitted'])
      assert.equal(history[2].feedback, 'Shorten the caption')
    })
    await t.test('failed approval leaves package pending and creates no task', async () => {
      await asUser(approver)
      await assert.rejects(patch("status='approved'"), /Choose a work date/)
      await assert.rejects(patch("status='approved',work_date='2026-10-01',time_slot='invalid',task_type_id=$1,assigned_to=$2", [typeId, creator]), /check constraint/)
      assert.equal((await db.query('SELECT * FROM tasks')).rows.length, 0)
      assert.equal((await db.query('SELECT status FROM content_packages')).rows[0].status, 'submitted')
    })
    await t.test('selected employee approver creates one linked scheduled task with the approved caption', async () => {
      const result = await patch("status='approved',feedback='Ready to publish',work_date='2026-10-01',time_slot='08:00',task_type_id=$1,assigned_to=$2", [typeId, creator])
      const task = (await db.query('SELECT * FROM tasks')).rows[0]
      assert.equal(task.id, result.rows[0].task_id)
      assert.equal(task.source_content_id, entry.id)
      assert.equal(task.file_name, 'Package')
      assert.equal(task.caption, 'Updated caption')
      assert.equal(task.work_date.toISOString().slice(0, 10), '2026-10-01')
      assert.equal(task.time_slot, '08:00')
      assert.equal(task.assigned_to, creator)
      assert.equal(task.status, 'pending')
      await assert.rejects(patch("status='approved'"), /already been approved/)
      assert.equal((await db.query('SELECT * FROM tasks')).rows.length, 1)
      await asUser(creator)
      await assert.rejects(db.exec('UPDATE tasks SET source_content_id=NULL'), /source cannot be changed/)
      await asUser(outsider)
      assert.equal((await db.query('SELECT * FROM content_packages')).rows.length, 1)
    })
    await t.test('inactive and anonymous users cannot access content', async () => {
      await db.exec(`RESET ROLE; UPDATE profiles SET is_active=false WHERE id='${creator}'`)
      await asUser(creator)
      assert.equal((await db.query('SELECT * FROM content_packages')).rows.length, 0)
      await assert.rejects(db.query(`INSERT INTO content_packages(package_name,creator_id,approver_id) VALUES ('Inactive',$1,$2)`, [creator, approver]), /active employee/)
      await db.exec('RESET ROLE; SET ROLE anon')
      await assert.rejects(db.exec('SELECT * FROM content_packages'), /permission denied/)
    })
  } finally { await db.close() }
})
