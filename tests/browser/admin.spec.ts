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
  const tables: Record<string, Record<string, unknown>[]> = { profiles: [profile, employee], departments: [], task_types: [], channels: [], marketing_ads: [], tasks: [], rush_entries: [] }
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
      if (request.headers().accept?.includes('vnd.pgrst.object')) return respond(rows[0] ?? null)
      return respond(path === 'tasks' ? rows.filter(row => (!url.searchParams.has('assigned_to') || url.searchParams.get('assigned_to') === 'eq.' + row.assigned_to) && (!url.searchParams.has('work_date') || url.searchParams.get('work_date') === 'eq.' + row.work_date)) : rows)
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

test('marketing popup shows daily counts, stays open, and preserves a fitted task sheet', async ({ page }) => {
  await page.setViewportSize({ width: 1679, height: 920 })
  const mock = await mockApp(page)
  mock.tables.marketing_ads.push({ id: 'ad-1', advertiser: 'Example advertiser', package_type: 'News', daily_target: 3, is_active: true, valid_from: null, valid_to: null })
  mock.tables.tasks.push({ id: 'task-1', marketing_ad_id: 'ad-1', status: 'done', work_date: '2026-09-28', file_name: 'Uploaded story', assigned_to: employeeId, time_slot: '07:00', priority: 'normal' })
  await page.goto('/tasks?date=2026-09-28')
  const draft = page.locator('.sheet-row').filter({ has: page.getByRole('button', { name: 'Save', exact: true }) }).first()
  await draft.getByLabel('file name', { exact: true }).fill('Keep my draft')
  await page.getByRole('button', { name: 'Open Marketing Daily Sheet' }).click()
  const dialog = page.getByRole('dialog')
  const summary = dialog.getByRole('row').filter({ hasText: 'Example advertiser' })
  await expect(summary.getByRole('cell')).toHaveText(['News', '3', '1', '2'])
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Close', exact: true }).first().click()
  await expect(draft.getByLabel('file name', { exact: true })).toHaveValue('Keep my draft')
  await expect(draft.getByLabel('google drive link', { exact: true })).toHaveCount(0)
  await expect(draft.getByLabel('time slot', { exact: true })).toHaveCount(0)
  for (const width of [1679, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 920 })
    expect(await page.locator('.task-sheet').evaluate(el => [...el.querySelectorAll('table')].every(table => table.scrollWidth <= table.clientWidth + 1))).toBe(true)
  }
})

test('Tasks submenu and Rush rows support inline creation, editing and automatic blanks', async ({ page }) => {
  const mock = await mockApp(page)
  await page.goto('/rush')
  await expect(page.getByRole('button', { name: 'Add entry' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'My Task', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Tasks', exact: true }).click()
  await expect(page.getByRole('link', { name: 'My Task', exact: true })).toBeHidden()
  await page.getByRole('button', { name: 'Tasks', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Daily Task', exact: true })).toHaveAttribute('href', '/tasks')
  const row = page.locator('tbody tr').first()
  await row.getByLabel('Reporter', { exact: true }).fill('Test Reporter')
  await expect(page.locator('tbody tr')).toHaveCount(2)
  await row.getByRole('combobox', { name: 'Name', exact: true }).selectOption('Test Employee')
  await row.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
  await row.getByRole('combobox', { name: 'Status', exact: true }).selectOption('In Progress')
  await row.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
  await page.reload()
  await expect(row.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('In Progress')
  expect(mock.tables.rush_entries).toHaveLength(1)
  expect(mock.tables.tasks).toHaveLength(0)
})

test('Rush loading and save failures keep inline rows and unsaved values', async ({ page }) => {
  await mockApp(page)
  let failLoad = true
  let failSave = true
  await page.route('**/rest/v1/rush_entries*', route => {
    if ((route.request().method() === 'GET' && failLoad) || (route.request().method() === 'POST' && failSave)) {
      return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Unavailable' }) })
    }
    return route.fallback()
  })
  await page.goto('/rush')
  await expect(page.getByRole('alert')).toContainText('Unable to load Rush entries')
  const row = page.locator('tbody tr').first()
  await row.getByLabel('Reporter', { exact: true }).fill('Keep reporter')
  await row.getByRole('combobox', { name: 'Name', exact: true }).selectOption('Test Employee')
  await expect(row.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  failLoad = false
  await page.getByRole('button', { name: 'Refresh' }).click()
  await expect(row.getByRole('button', { name: 'Save', exact: true })).toBeEnabled()
  await row.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(row.getByRole('alert')).toContainText('Your row has been kept')
  await expect(row.getByRole('combobox', { name: 'Name', exact: true })).toHaveValue('Test Employee')
  failSave = false
  await row.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
})

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


test('hourly sheet creates and edits rows; My Tasks locks the user filter', async ({ page }) => {
  const { tables, writes } = await mockApp(page)
  tables.task_types.push({ id: 'type-1', name: 'Bulletin', code: 'BULLETIN', is_active: true, sort_order: 1 })
  await page.goto('/tasks')
  const section = page.getByRole('region', { name: '7:00 AM', exact: true }).locator('tbody tr').first()
  await section.getByRole('textbox', { name: 'file name', exact: true }).fill('Morning bulletin')
  await section.getByRole('combobox', { name: 'task type id' }).selectOption('type-1')
  await section.getByRole('combobox', { name: 'assigned to' }).selectOption(adminId)
  await section.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(section.getByRole('button', { name: 'History' })).toBeVisible()
  expect(writes.find(w => w.table === 'tasks')?.body.time_slot).toBe('07:00')
  await section.getByRole('textbox', { name: 'file name', exact: true }).fill('Updated bulletin')
  await section.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(section.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
  const ownTask = tables.tasks[0]
  tables.tasks.push({ ...ownTask, id: 'other-task', assigned_to: employeeId, file_name: 'Other employee task' })
  await page.goto('/my-tasks')
  await expect(page.getByRole('heading', { name: 'My Tasks', exact: true })).toBeVisible()
  await expect(page.locator('input').filter({ visible: true }).and(page.locator('input[value="Other employee task"]'))).toHaveCount(0)
  await expect(page.getByRole('textbox', { name: 'file name', exact: true }).first()).toHaveValue('Updated bulletin')
  await expect(page.getByRole('combobox', { name: 'assigned to' }).first()).toBeDisabled()
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await expect(page.getByText('Employee', { exact: true })).toHaveCount(0)
})

test('failed row save retains entered data and shows setup guidance', async ({ page }) => {
  const { tables } = await mockApp(page)
  tables.task_types.push({ id: 'type-1', name: 'Bulletin', is_active: true })
  await page.route('**/rest/v1/tasks*', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'time_slot column missing' }) })
    : route.fallback())
  await page.goto('/tasks')
  const section = page.getByRole('region', { name: '12:00 AM', exact: true }).locator('tbody tr').first()
  await section.getByRole('textbox', { name: 'file name', exact: true }).fill('Midnight bulletin')
  await section.getByRole('combobox', { name: 'task type id' }).selectOption('type-1')
  await section.getByRole('combobox', { name: 'assigned to' }).selectOption(adminId)
  await section.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(section.getByRole('alert')).toContainText('Apply the task_work_time SQL update')
  await expect(section.getByRole('textbox', { name: 'file name', exact: true })).toHaveValue('Midnight bulletin')
})


test('caption rich text survives saving and reopening; cancel discards dialog edits', async ({ page }) => {
  const { tables, writes } = await mockApp(page)
  tables.task_types.push({ id: 'type-1', name: 'Bulletin', is_active: true })
  await page.goto('/tasks')
  const section = page.getByRole('region', { name: '7:00 AM', exact: true }).locator('tbody tr').first()
  await section.getByRole('textbox', { name: 'file name', exact: true }).fill('Caption example')
  await section.getByRole('combobox', { name: 'task type id' }).selectOption('type-1')
  await section.getByRole('combobox', { name: 'assigned to' }).selectOption(adminId)
  await section.getByRole('button', { name: 'Edit caption' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: 'Caption text' }).fill('Breaking news caption')
  await dialog.getByRole('textbox', { name: 'Caption text' }).press('ControlOrMeta+a')
  await dialog.getByRole('button', { name: 'Bold', exact: true }).click()
  await expect(dialog.locator('.tiptap strong')).toHaveText('Breaking news caption')
  await dialog.getByRole('button', { name: 'Apply caption' }).click()
  await section.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(section.getByRole('button', { name: 'History' })).toBeVisible()
  expect(String(writes.find(w => w.table === 'tasks')?.body.caption)).toContain('<strong>Breaking news caption</strong>')
  await section.getByRole('button', { name: 'Edit caption' }).click()
  await expect(dialog.locator('.tiptap strong')).toHaveText('Breaking news caption')
  await dialog.getByRole('textbox', { name: 'Caption text' }).fill('Discard this')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(section.getByRole('button', { name: 'Edit caption' })).toContainText('Breaking news caption')
  await expect(section.getByRole('button', { name: 'Save', exact: true })).toHaveCount(0)
})


test('only the assigned user gets Mark as done', async ({ page }) => {
  const { tables, writes } = await mockApp(page)
  const date = new Date().toLocaleDateString('en-CA')
  tables.tasks.push(
    { id: 'own', remarks: 'Published', youtube_link: 'https://youtube.com/watch?v=demo', facebook_link: 'https://facebook.com/demo', file_name: 'Own task', assigned_to: adminId, work_date: date, status: 'in_progress', time_slot: '07:00' },
    { id: 'other', file_name: 'Other task', assigned_to: employeeId, work_date: date, status: 'in_progress', time_slot: '08:00' })
  await page.goto('/tasks')
  const own = page.getByRole('region', { name: '7:00 AM', exact: true })
  const other = page.getByRole('region', { name: '8:00 AM', exact: true })
  await expect(own.getByRole('button', { name: 'Mark as done' })).toBeVisible()
  await expect(other.getByRole('button', { name: 'Mark as done' })).toHaveCount(0)
  await expect(other.getByRole('combobox', { name: 'status' }).first().locator('option[value="done"]')).toBeDisabled()
  await own.getByRole('button', { name: 'Mark as done' }).click()
  await expect(own.getByRole('combobox', { name: 'status' }).first()).toHaveValue('done')
  expect(writes.find(w => w.table === 'tasks')?.body.updated_by).toBe(adminId)
})


test('selected file name expands in the full cell editor and stays synchronized', async ({ page }) => {
  await mockApp(page)
  await page.goto('/tasks')
  const section = page.getByRole('region', { name: '7:00 AM', exact: true }).locator('tbody tr').first()
  const cell = section.getByRole('textbox', { name: 'file name', exact: true })
  const name = 'DEMO_20260926_Community_health_tips_full_editorial_bulletin_final_version'
  await cell.fill(name)
  const expanded = page.getByRole('textbox', { name: 'Full file name', exact: true })
  await expect(expanded).toHaveValue(name)
  await expanded.fill(name + '_updated')
  await expect(cell).toHaveValue(name + '_updated')
  await section.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(expanded).toHaveCount(0)
})

test('expanded cell editor sits above time sections and stays stable while typing', async ({ page }) => {
  await mockApp(page)
  await page.goto('/tasks')
  const editor = page.locator('.cell-editor-panel')
  await expect(editor).toBeHidden()
  const cell = page.getByRole('textbox', { name: 'file name', exact: true }).first()
  await cell.scrollIntoViewIfNeeded()
  await cell.click()
  await expect(editor).toBeVisible()
  const editorBounds = await editor.boundingBox()
  const sectionBounds = await page.getByRole('region', { name: '7:00 AM', exact: true }).boundingBox()
  expect(editorBounds!.y + editorBounds!.height).toBeLessThanOrEqual(sectionBounds!.y)
  await expect(editor).toHaveCSS('position', 'relative')
  const before = await cell.boundingBox()
  await cell.pressSequentially('Description being typed without the sheet jumping')
  const after = await cell.boundingBox()
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2)
  expect(Math.abs(after!.x - before!.x)).toBeLessThan(2)
  await expect(cell).toHaveValue('Description being typed without the sheet jumping')
  await expect(cell).toBeFocused()
  await page.getByRole('columnheader', { name: 'File name', exact: true }).first().click()
  await expect(editor).toBeVisible()
  await page.getByRole('button', { name: 'Close expanded editor' }).click()
  await expect(editor).toBeHidden()
})

for (const missing of ['remarks', 'youtube_link', 'facebook_link']) {
  test('completion requires ' + missing, async ({ page }) => {
    const { tables } = await mockApp(page)
    tables.tasks.push({ id: 'incomplete', file_name: 'Incomplete task', assigned_to: adminId,
      work_date: new Date().toLocaleDateString('en-CA'), status: 'pending', time_slot: '07:00',
      remarks: 'Published', youtube_link: 'https://youtube.com/watch?v=demo', facebook_link: 'https://facebook.com/demo', [missing]: '  ' })
    await page.goto('/tasks')
    const row = page.locator('tr').filter({ has: page.getByRole('textbox', { name: 'file name', exact: true }).and(page.locator('[value="Incomplete task"]')) })
    await expect(row.getByRole('button', { name: 'Mark as done' })).toBeDisabled()
    await expect(row.getByRole('combobox', { name: 'status', exact: true }).locator('option[value="done"]')).toBeDisabled()
    for (const platform of ['YouTube link', 'Facebook link']) {
      await expect(page.getByRole('img', { name: platform, exact: true }).first()).toBeVisible()
    }
  })
}

test('editing the last draft adds one blank row without losing focus or other drafts', async ({ page }) => {
  await mockApp(page)
  await page.goto('/tasks')
  const section = page.getByRole('region', { name: '8:00 AM', exact: true })
  const names = section.getByRole('textbox', { name: 'file name', exact: true })
  await expect(names).toHaveCount(1)
  await names.first().click()
  await names.first().pressSequentially('First draft')
  await expect(names).toHaveCount(2)
  await expect(names.first()).toHaveValue('First draft')
  await expect(names.first()).toBeFocused()
  await expect(names.nth(1)).toHaveValue('')
  await names.nth(1).fill('Second draft')
  await expect(names).toHaveCount(3)
  await names.first().fill('First draft updated')
  await expect(names).toHaveCount(3)
  await page.getByRole('columnheader', { name: 'File name', exact: true }).first().click()
  await section.getByRole('button', { name: 'Cancel', exact: true }).first().click()
  await expect(names).toHaveCount(2)
  await expect(names.first()).toHaveValue('Second draft')
  await expect(names.nth(1)).toHaveValue('')
  await expect(section.getByRole('button', { name: 'Add row', exact: true })).toHaveCount(0)
})
