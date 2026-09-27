import { test, expect, type Page } from '@playwright/test'
import { loadEnv } from 'vite'

const hostname = new URL(loadEnv('development', process.cwd(), '').VITE_SUPABASE_URL).hostname
const creatorId = '10000000-0000-0000-0000-000000000001'
const approverId = '10000000-0000-0000-0000-000000000002'
const outsiderId = '10000000-0000-0000-0000-000000000003'
type Row = Record<string, unknown>

function backend() {
  const profiles = [
    { id: creatorId, full_name: 'Content Creator' },
    { id: approverId, full_name: 'Selected Approver' },
    { id: outsiderId, full_name: 'Other Employee' },
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
        let rows = (tables[table] ?? []).filter(row => [...url.searchParams].every(([key, value]) => !value.startsWith('eq.') || String(row[key]) === value.slice(3)))
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
      if (table === 'content_packages' && result.status === 'approved') {
        result.task_id = 'task-content-1'
        tables.tasks.push({ id: result.task_id, source_content_id: result.id, file_name: result.package_name, caption: result.caption, assigned_to: result.assigned_to, task_type_id: result.task_type_id, work_date: result.work_date, time_slot: result.time_slot, status: 'pending', priority: 'normal', created_at: new Date().toISOString() })
      }
      return respond(enrich(table, result))
    })
  }
  return { tables, connect, failNextWrite: () => { failWrite = true } }
}

test('creator submits, receives feedback, revises, and selected approver creates a marked Daily Task', async ({ page, browser, baseURL }) => {
  const mock = backend()
  await mock.connect(page, creatorId)
  await page.goto('/content-creator')
  await expect(page.getByRole('button', { name: 'Add package' })).toHaveCount(0)
  await page.getByLabel('PKG name').first().fill('Evening news package')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await expect(page.getByLabel('PKG name').first()).toBeFocused()
  await page.getByLabel('Approver', { exact: true }).first().selectOption(approverId)
  await page.getByLabel('Caption', { exact: true }).first().fill('Original caption')
  await page.getByRole('combobox', { name: 'Status', exact: true }).first().selectOption('submitted')
  await page.getByRole('button', { name: 'Save and submit' }).first().click()
  await expect(page.getByRole('combobox', { name: 'Status', exact: true }).first()).toBeDisabled()
  expect(mock.tables.tasks).toHaveLength(0)

  const context = await browser.newContext({ baseURL })
  try {
    const reviewer = await context.newPage()
    await mock.connect(reviewer, approverId)
    await reviewer.goto('/content-creator')
    await reviewer.getByRole('button', { name: 'Awaiting my review' }).click()
    await reviewer.getByRole('combobox', { name: 'Status', exact: true }).first().selectOption('approved')
    await reviewer.getByLabel('Feedback', { exact: true }).fill('Please shorten the caption')
    await reviewer.getByRole('button', { name: 'Request changes', exact: true }).click()
    await expect(reviewer.getByRole('dialog')).toBeHidden()

    await page.reload()
    await expect(page.getByText('Feedback: Please shorten the caption', { exact: true })).toBeVisible()
    await page.getByLabel('Caption', { exact: true }).first().fill('Short caption')
    await page.getByRole('button', { name: 'Send for approval' }).first().click()
    await expect(page.getByRole('combobox', { name: 'Status', exact: true }).first()).toBeDisabled()

    await reviewer.reload()
    await reviewer.getByRole('button', { name: 'Review', exact: true }).click()
    await reviewer.getByLabel('Work date').fill('2026-10-01')
    await reviewer.getByLabel('Time section', { exact: true }).selectOption('08:00')
    await reviewer.getByLabel('Task type').selectOption('type-1')
    await reviewer.getByRole('button', { name: 'Approve & add to Daily Tasks' }).click()
    await expect(reviewer.getByRole('dialog')).toBeHidden()
    expect(mock.tables.tasks).toHaveLength(1)
    expect(mock.tables.tasks[0].caption).toBe('Short caption')
    await reviewer.getByRole('button', { name: 'View details' }).click()
    await reviewer.getByRole('link', { name: /View Daily Task/ }).click()
    await expect(reviewer).toHaveURL(/tasks\?date=2026-10-01/)
    const section = reviewer.getByRole('region', { name: '8:00 AM', exact: true })
    await expect(section.getByLabel('file name', { exact: true })).toHaveValue('Evening news package')
    await expect(section.locator('tbody tr').first().locator('td').first().getByRole('link', { name: 'From Content Creator' })).toBeVisible()
    await section.getByRole('link', { name: 'From Content Creator' }).click()
    await expect(reviewer.getByRole('dialog')).toBeVisible()
    await expect(reviewer.getByRole('button', { name: 'Approve & add to Daily Tasks' })).toHaveCount(0)
  } finally { await context.close() }
})

test('failed content submission preserves the form and does not add a task', async ({ page }) => {
  const mock = backend()
  await mock.connect(page, creatorId)
  await page.goto('/content-creator')
  await expect(page.getByRole('button', { name: 'Add package' })).toHaveCount(0)
  await page.getByLabel('PKG name').first().fill('Keep this draft')
  await page.getByLabel('Approver', { exact: true }).first().selectOption(approverId)
  mock.failNextWrite()
  await page.getByRole('button', { name: 'Send for approval' }).first().click()
  await expect(page.locator('tbody tr').first().getByRole('alert')).toBeVisible()
  await expect(page.getByLabel('PKG name').first()).toHaveValue('Keep this draft')
  expect(mock.tables.tasks).toHaveLength(0)
  await page.getByRole('button', { name: 'Save draft' }).first().click()
  await expect(page.locator('tbody tr').first().getByRole('button', { name: 'Save draft' })).toHaveCount(0)
  expect(mock.tables.content_packages[0].status).toBe('draft')
})
