import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { loadEnv } from 'vite'

const env = loadEnv('development', process.cwd(), '')
const hostname = new URL(env.VITE_SUPABASE_URL).hostname
const adminId = '10000000-0000-0000-0000-000000000001'
const employeeId = '10000000-0000-0000-0000-000000000002'

async function mockApp(page: Page, { role = 'administrator', ready = true } = {}) {
  const user = { id: adminId, email: 'admin@example.test', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} }
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: adminId, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated' })).toString('base64url')}.test`
  await page.addInitScript(({ storageKey, session }) => localStorage.setItem(storageKey, JSON.stringify(session)), {
    storageKey: `sb-${hostname.split('.')[0]}-auth-token`,
    session: { access_token: token, refresh_token: 'test-refresh', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user },
  })
  const profile = { id: adminId, email: user.email, full_name: 'Test Administrator', application_role: role, is_active: true, manager_id: null, department_id: null, employee_code: null, designation: null }
  const employee = { ...profile, id: employeeId, email: 'employee@example.test', full_name: 'Test Employee', application_role: 'employee' }
  const tables: Record<string, Record<string, unknown>[]> = { profiles: [profile, employee], departments: [], task_types: [], channels: [], marketing_ads: [] }
  const writes: { table: string; body: Record<string, unknown> }[] = []
  await page.route(`https://${hostname}/**`, async route => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.split('/').at(-1)!
    const respond = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === 'administration_ready') return ready ? respond(true) : respond({ code: 'PGRST202', message: 'Function missing' }, 404)
    if (path === 'is_admin') return respond(role === 'administrator')
    if (path === 'admin_update_profile') {
      const body = request.postDataJSON()
      writes.push({ table: path, body })
      const person = tables.profiles.find(p => p.id === body.p_id)!
      Object.assign(person, body.p_changes)
      return respond(person)
    }
    if (path === 'signup') {
      writes.push({ table: path, body: request.postDataJSON() })
      return respond({ id: '10000000-0000-0000-0000-000000000003', email: 'new@example.test', identities: [] })
    }
    if (request.method() === 'GET') {
      const rows = (tables[path] ?? []).filter(row => !url.searchParams.has('id') || url.searchParams.get('id')?.startsWith('in.') || `eq.${row.id}` === url.searchParams.get('id'))
      return respond(rows)
    }
    const body = request.postDataJSON()
    writes.push({ table: path, body })
    let result: Record<string, unknown>
    if (request.method() === 'POST') {
      result = { ...body, id: `record-${tables[path].length + 1}` }
      tables[path].push(result)
    } else {
      result = tables[path].find(row => `eq.${row.id}` === url.searchParams.get('id'))!
      Object.assign(result, body)
    }
    return respond(request.headers().accept?.includes('vnd.pgrst.object') ? result : [result])
  })
  return { writes, tables }
}

for (const entry of [
  { path: 'departments', title: 'Department', fields: { Name: 'Newsroom', Code: 'NEWS' } },
  { path: 'task-types', title: 'Task Type', fields: { Name: 'Interview', Code: 'INT', 'Display order': '2' } },
  { path: 'channels', title: 'Channel', fields: { Name: 'Main channel', Platform: 'YouTube' } },
  { path: 'marketing-ads', title: 'Marketing Ad', fields: { Advertiser: 'Example advertiser', 'Package type': 'Daily', 'Daily target': '3' } },
]) {
  test(`create, edit and deactivate ${entry.path}`, async ({ page }) => {
    await mockApp(page)
    await page.goto(`/admin/${entry.path}`)
    await page.getByRole('button', { name: `Add ${entry.title}`, exact: true }).click()
    for (const [name, value] of Object.entries(entry.fields)) await page.getByLabel(name, { exact: false }).fill(value)
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await page.getByRole('button', { name: 'Edit', exact: true }).click()
    await page.getByLabel('Active', { exact: true }).uncheck()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('cell', { name: 'Inactive', exact: true })).toBeVisible()
  })
}

test('administrator promotion requires confirmation and saves through authorized RPC', async ({ page }) => {
  const mock = await mockApp(page)
  await page.goto('/admin/employees')
  await page.getByRole('row').filter({ hasText: 'employee@example.test' }).getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Role', { exact: true }).selectOption('administrator')
  await page.getByRole('button', { name: 'Save changes' }).click()
  expect(mock.writes).toHaveLength(0)
  await page.getByLabel('I confirm this person').check()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  expect(mock.writes[0]).toMatchObject({ table: 'admin_update_profile', body: { p_id: employeeId, p_changes: { application_role: 'administrator' } } })
  await expect(page.getByRole('row').filter({ hasText: 'employee@example.test' })).toContainText('Administrator')
})

test('registering a staff member preserves the administrator session', async ({ page }) => {
  const mock = await mockApp(page)
  await page.goto('/admin/employees')
  await page.getByRole('button', { name: 'Add Employee', exact: true }).click()
  await page.getByLabel('Full name', { exact: true }).fill('New Employee')
  await page.getByLabel('Email address', { exact: true }).fill('new@example.test')
  await page.getByLabel('Initial password').fill('Example-test-password-123')
  await page.getByRole('button', { name: 'Create employee account' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Registration submitted' })).toBeVisible()
  const session = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), `sb-${hostname.split('.')[0]}-auth-token`)
  expect(session.user.id).toBe(adminId)
  expect(mock.writes[0]).toMatchObject({ table: 'signup', body: { data: { full_name: 'New Employee' } } })
  expect(mock.writes[0].body.data).not.toHaveProperty('application_role')
})

test('missing database update prevents employee mutations and provides setup guidance', async ({ page }) => {
  await mockApp(page, { ready: false })
  await page.goto('/admin/employees')
  await expect(page.getByRole('button', { name: 'Add Employee', exact: true })).toBeDisabled()
  await page.getByRole('link', { name: 'Open Settings for setup details' }).click()
  await expect(page.getByRole('alert')).toContainText('administration_access.sql')
})

test('employees cannot open administration routes', async ({ page }) => {
  await mockApp(page, { role: 'employee' })
  await page.goto('/admin/employees')
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('link', { name: 'Employees', exact: true })).toBeHidden()
})

test('marketing date validation prevents invalid campaign saves', async ({ page }) => {
  const mock = await mockApp(page)
  await page.goto('/admin/marketing-ads')
  await page.getByRole('button', { name: 'Add Marketing Ad', exact: true }).click()
  await page.getByLabel('Advertiser').fill('Invalid dates')
  await page.getByLabel('Package type').fill('Daily')
  await page.getByLabel('Valid from').fill('2026-10-10')
  await page.getByLabel('Valid to').fill('2026-10-01')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('alert')).toContainText('end date')
  expect(mock.writes).toHaveLength(0)
})
