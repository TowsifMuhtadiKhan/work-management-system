import { supabase } from '@/lib/supabase/client'
import type { Department } from '@/types/entities'
import type { DbDepartmentInsert } from '@/types/database'

export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createDepartment(payload: DbDepartmentInsert): Promise<Department> {
  const { data, error } = await supabase
    .from('departments')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateDepartment(
  id: string,
  payload: Partial<DbDepartmentInsert>
): Promise<Department> {
  const { data, error } = await supabase
    .from('departments')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
