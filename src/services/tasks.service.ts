import { supabase } from '@/lib/supabase/client'
import { taskCompletionError } from '@/utils/taskCompletion'
import type { Task, TaskFilters } from '@/types/entities'
import type { DbTaskInsert, DbTaskUpdate } from '@/types/database'

const TASK_SELECT = `
  *,
  task_type:task_types(*),
  channel:channels(*),
  marketing_ad:marketing_ads(*),
  assigned_profile:profiles!tasks_assigned_to_fkey(
    id, full_name, email, employee_code, designation, avatar_url, manager_id, application_role
  ),
  created_by_profile:profiles!tasks_created_by_fkey(id, full_name),
  updated_by_profile:profiles!tasks_updated_by_fkey(id, full_name)
`

// ─── Fetch tasks for a given work_date with optional filters ─────────────────

export async function fetchTasks(filters: TaskFilters): Promise<Task[]> {
  let query = supabase.from('tasks').select(TASK_SELECT)

  if (filters.workDate) {
    query = query.eq('work_date', filters.workDate)
  }
  if (filters.assignedTo) {
    query = query.eq('assigned_to', filters.assignedTo)
  }
  if (filters.status) {
    query = query.eq('status', filters.status)
  }
  if (filters.taskTypeId) {
    query = query.eq('task_type_id', filters.taskTypeId)
  }
  if (filters.channelId) {
    query = query.eq('channel_id', filters.channelId)
  }
  if (filters.marketingAdId) {
    query = query.eq('marketing_ad_id', filters.marketingAdId)
  }
  if (filters.priority) {
    query = query.eq('priority', filters.priority)
  }
  if (filters.search) {
    query = query.ilike('file_name', `%${filters.search}%`)
  }
  if (filters.departmentId) {
    // Filter through assigned_profile → department_id
    query = query.eq('assigned_profile.department_id', filters.departmentId)
  }

  query = query.order('created_at', { ascending: true })

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as Task[]
}

// ─── Fetch a single task by ID ────────────────────────────────────────────────

export async function fetchTaskById(id: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  return data as Task | null
}

// ─── Create a new task ────────────────────────────────────────────────────────

export async function createTask(payload: DbTaskInsert): Promise<Task> {
  const completionError = payload.status === 'done' ? taskCompletionError(payload) : null
  if (completionError) throw new Error(completionError)
  const { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select(TASK_SELECT)
    .single()

  if (error) throw error
  return data as Task
}

// ─── Update an existing task ──────────────────────────────────────────────────

export async function updateTask(id: string, payload: DbTaskUpdate): Promise<Task> {
  if (payload.status === 'done') {
    const current = await fetchTaskById(id)
    if (!current) throw new Error('Task not found')
    const completionError = taskCompletionError({ ...current, ...payload })
    if (completionError) throw new Error(completionError)
  }
  const { data, error } = await supabase
    .from('tasks')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(TASK_SELECT)
    .single()

  if (error) throw error
  return data as Task
}

export async function markTaskDone(id: string, assignedUserId: string): Promise<void> {
  const current = await fetchTaskById(id)
  if (!current) throw new Error('Task not found')
  const completionError = taskCompletionError(current)
  if (completionError) throw new Error(completionError)
  const { error } = await supabase.from('tasks')
    .update({ status: 'done', updated_by: assignedUserId })
    .eq('id', id).eq('assigned_to', assignedUserId).neq('status', 'done')
    .select('id').single()
  if (error) throw error
}

// ─── Update task status only (quick inline toggle) ───────────────────────────

export async function updateTaskStatus(
  id: string,
  status: string,
  updatedBy: string
): Promise<void> {
  if (status === 'done') {
    await updateTask(id, { status, updated_by: updatedBy })
    return
  }
  const { error } = await supabase
    .from('tasks')
    .update({ status, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

// ─── Delete a task (admin only — enforced by RLS) ─────────────────────────────

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// ─── Daily stats aggregation ─────────────────────────────────────────────────

export async function fetchDailyStats(workDate: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('status')
    .eq('work_date', workDate)

  if (error) throw error

  const statuses = (data ?? []).map((r) => r.status)
  const total = statuses.length
  const done = statuses.filter((s) => s === 'done').length
  const in_progress = statuses.filter((s) => s === 'in_progress').length
  const pending = statuses.filter((s) => s === 'pending').length
  const assigned = statuses.filter((s) => s === 'assigned').length
  const hold = statuses.filter((s) => s === 'hold').length
  const cancelled = statuses.filter((s) => s === 'cancelled').length
  const completion_rate = total > 0 ? Math.round((done / total) * 1000) / 10 : 0

  return { total, done, in_progress, pending, assigned, hold, cancelled, completion_rate }
}

// ─── Tasks by employee for a given date ──────────────────────────────────────

export async function fetchTasksByEmployee(workDate: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      assigned_to,
      status,
      assigned_profile:profiles!tasks_assigned_to_fkey(id, full_name, employee_code, avatar_url)
    `)
    .eq('work_date', workDate)

  if (error) throw error
  return data ?? []
}
