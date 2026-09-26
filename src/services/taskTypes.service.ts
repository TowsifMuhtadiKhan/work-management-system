import { supabase } from '@/lib/supabase/client'
import type { TaskType } from '@/types/entities'
import type { DbTaskTypeInsert } from '@/types/database'

export async function fetchTaskTypes(): Promise<TaskType[]> {
  const { data, error } = await supabase
    .from('task_types')
    .select('*')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function fetchAllTaskTypes(): Promise<TaskType[]> {
  const { data, error } = await supabase
    .from('task_types')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data ?? []
}

export async function createTaskType(payload: DbTaskTypeInsert): Promise<TaskType> {
  const { data, error } = await supabase
    .from('task_types')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTaskType(
  id: string,
  payload: Partial<DbTaskTypeInsert>
): Promise<TaskType> {
  const { data, error } = await supabase
    .from('task_types')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
