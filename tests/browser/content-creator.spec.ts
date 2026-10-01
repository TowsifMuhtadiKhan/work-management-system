import { test, expect, type Page } from '@playwright/test'
import { loadEnv } from 'vite'

const hostname = new URL(loadEnv('development', process.cwd(), '').VITE_SUPABASE_URL).hostname
const creatorId = '10000000-0000-0000-0000-000000000001'
const approverId = '10000000-0000-0000-0000-000000000002'
const outsiderId = '10000000-0000-0000-0000-000000000003'
type Row = Record<string, unknown>

function backend() {
  const profiles = [
    { id: creatorId, full_name: 'Content Creator', department: {name: 'Content Creator Team', is_active: true} },
    { id: approverId, full_name: 'Second Creator', department: {name: 'Content Creator Team', is_active: true} },
    { id: outsiderId, full_name: 'Other Employee', department: {name: 'Marketing', is_active: true} },
  ].map(person => ({ ...person, email: `${person.id}@example.test`, application_role: 'employee', is_active: true, manager_id: null }))
  const tables: Record<string, Row[]> = { profiles, content_packages: [], content_reviews: [], tasks: [], task_types: [{ id: 'type-1', name: 'Video', code: 'VIDEO', is_active: true }], channels: [], marketing_ads: [] }
  let failWrite = false
  let version = 0
  const enrich = (table: string, row: Row) => table === 'content_packages'
    ? { ...row, creator: profiles.find(p => p.id === row.creator_id), approver: profiles.find(p => p.id === row.approver_id) }
    : table === 'content_reviews' ? { ...row, reviewer: profiles.find(p => p.id === row.reviewer_id) }
      : table === 'tasks' ? { ...row, assigned_profile: profiles.find(p => p.id === row.assigned_to), task_type: tables.task_types[0] } : row
  async function connect(page: Page, userId: string) {
    const user = { id: userId, email: `${userId}@example.test`, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }
    const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url')}.test`
    await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
      key: `sb-${hostname.split('.')[0]}-auth-token`,
      session: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user },
    })
    await page.route(`https://${hostname}/**`, async route => {
      const request = route.request()
      const url = new URL(request.url())
      const table = url.pathname.split('/').at(-1)!
      const respond = (data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) })
      if (table === 'user') return respond(user)
      if (request.method() === 'GET') {
        let rows = (tables[table] ?? []).filter(row => [...url.searchParams].every(([key, value]) => key.includes('.') || !value.startsWith('eq.') || String(row[key]) === value.slice(3)))
        if (table === 'content_reviews') rows = rows.filter(row => row.package_id === url.searchParams.get('package_id')?.slice(3))
        return respond(request.headers().accept?.includes('vnd.pgrst.object') ? enrich(table, rows[0] ?? {}) : rows.map(row => enrich(table, row)))
      }
      if (failWrite) { failWrite = false; return respond({ message: 'Save failed' }, 500) }
      const body = request.postDataJSON()
      let result: Row
      if (request.method() === 'POST') {
        result = { id: `package-${tables[table].length + 1}`, feedback: '', task_id: null, created_at: new Date().toISOString(), ...body }
        tables[table].push(result)
      } else {
        result = tables[table].find(row => `eq.${row.id}` === url.searchParams.get('id'))!
        if (table === 'content_packages' && result.updated_at !== url.searchParams.get('updated_at')?.slice(3)) return respond({ message: 'Stale package' }, 409)
        Object.assign(result, body)
      }
      result.updated_at = new Date(Date.now() + ++version).toISOString()
      if (table === 'content_packages' && result.status !== 'draft') {
        tables.content_reviews.push({ id: `review-${version}`, package_id: result.id, reviewer_id: userId, action: result.status === 'submitted' && body.feedback ? 'feedback' : result.status, feedback: body.feedback ?? '', created_at: new Date().toISOString() })
      }
      if (table === 'content_packages' && result.status === 'export_done') {
        result.task_id = 'task-content-1'
        const creator = profiles.find(p => p.id === result.creator_id)
        const creatorName = creator?.full_name ?? 'Creator'
        const remarkText = result.thumbnail_url ? `${creatorName} Thumb: ${result.thumbnail_url}` : creatorName
        tables.tasks.push({
          id: result.task_id,
          source_content_id: result.id,
          file_name: result.package_name,
          caption: result.caption,
          remarks: remarkText,
          assigned_to: result.assigned_to,
          task_type_id: result.task_type_id,
          work_date: result.work_date,
          time_slot: result.time_slot,
          status: 'pending',
          priority: 'normal',
          created_at: new Date().toISOString()
        })
      }
      return respond(enrich(table, result))
    })
  }
  return { tables, connect, failNextWrite: () => { failWrite = true } }
}

test('creator edits rich script, marks approved, then exports a mapped Daily Task', async ({ page }) => {
  const mock = backend()
  await mock.connect(page, creatorId)
  await page.goto('/content-creator')
  const row = page.locator('tbody tr').first()
  await row.getByLabel('PKG name').fill('Evening news package')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(row.getByLabel('Creator name').locator('option')).toHaveText(['Select creator', 'Content Creator', 'Second Creator'])
  await row.getByRole('button', { name: 'Edit Script', exact: true }).click()
  let dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Bold', exact: true }).click()
  await dialog.getByRole('textbox', { name: 'Script text' }).fill('Opening script')
  await dialog.getByRole('button', { name: 'Apply Script' }).click()
  await row.getByLabel('Caption', { exact: true }).fill('Short caption')
  await row.getByLabel('Thumbnail', { exact: true }).fill('Red title on dark background')
  await row.getByLabel('Approved', { exact: true }).click()
  await page.getByRole('menuitem', { name: 'Done', exact: true }).click()
  await row.getByRole('button', { name: 'Save package' }).click()
  await expect(row.getByRole('button', { name: 'Save package' })).toBeDisabled()
  expect(mock.tables.tasks).toHaveLength(0)
  expect(mock.tables.content_packages[0].script).toContain('Opening script')
  await row.getByRole('button', { name: 'Edit Script', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('textbox', { name: 'Script text' })).toContainText('Opening script')
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  await row.getByLabel('Status', { exact: true }).click()
  await page.getByRole('menuitem', { name: 'Export done', exact: true }).click()
  await row.getByRole('button', { name: 'Save package' }).click()
  dialog = page.getByRole('dialog')
  await dialog.getByLabel('Work date').fill('2026-10-01')
  await dialog.getByLabel('Task type').selectOption('type-1')
  await dialog.getByRole('button', { name: 'Export & add to Daily Tasks' }).click()
  await expect(dialog).toBeHidden()
  await expect(row.getByLabel('Status', { exact: true })).toBeDisabled()
  expect(mock.tables.tasks).toHaveLength(1)
  expect(mock.tables.tasks[0].caption).toBe('Short caption')
  expect(mock.tables.tasks[0].remarks).toBe('Content Creator Thumb: Red title on dark background')
  await expect(row.getByRole('link', { name: 'View Daily Task' })).toHaveAttribute('href', '/tasks/digital?date=2026-10-01')
})

test('failed save retains edits, and creator/date filters work together', async ({ page }) => {
  const mock = backend()
  await mock.connect(page, creatorId)
  await page.goto('/content-creator')
  const row = page.locator('tbody tr').first()
  await row.getByLabel('PKG name').fill('Keep this package')
  mock.failNextWrite()
  await row.getByRole('button', { name: 'Save package' }).click()
  await expect(row.getByRole('alert')).toBeVisible()
  await expect(row.getByLabel('PKG name')).toHaveValue('Keep this package')
  await row.getByRole('button', { name: 'Save package' }).click()
  await expect(row.getByRole('button', { name: 'Save package' })).toBeDisabled()
  await page.getByRole('button', { name: 'Filters' }).click()
  await page.getByLabel('Filter by creator').selectOption(approverId)
  await expect(page.getByText('No packages match these filters.')).toBeVisible()
  await page.getByLabel('Filter by creator').selectOption(creatorId)
  await expect(row.getByLabel('PKG name')).toHaveValue('Keep this package')
  await page.getByLabel('To date', { exact: true }).fill('2000-01-01')
  await expect(page.getByText('No packages match these filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear all' }).click()
  await expect(row.getByLabel('PKG name')).toHaveValue('Keep this package')
})
