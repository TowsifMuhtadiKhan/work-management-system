import { supabase } from '@/lib/supabase/client'
import type { Department } from '@/types/entities'
import type { DbDepartmentInsert } from '@/types/database'
import { DEFAULT_DEPARTMENT_FEATURES } from '@/types/entities'

const DEPT_FEATURES_STORAGE_KEY = 'deshtv_department_features'

export function getLocalDepartmentFeatures(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(DEPT_FEATURES_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveLocalDepartmentFeatures(deptId: string, features: string[]) {
  try {
    const all = getLocalDepartmentFeatures()
    all[deptId] = features
    localStorage.setItem(DEPT_FEATURES_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Ignore storage errors
  }
}

export async function fetchDepartments(): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .order('name')
  if (error) throw error
  const localMap = getLocalDepartmentFeatures()
  return (data ?? []).map(dept => ({
    ...dept,
    allowed_features: localMap[dept.id] ?? dept.allowed_features ?? DEFAULT_DEPARTMENT_FEATURES,
  }))
}

export async function updateDepartmentFeatures(
  deptId: string,
  features: string[]
): Promise<Department> {
  saveLocalDepartmentFeatures(deptId, features)
  try {
    const { data, error } = await supabase
      .from('departments')
      .update({ allowed_features: features } as any)
      .eq('id', deptId)
      .select()
      .single()
    if (!error && data) return data as Department
  } catch {
    // Fall back to local update
  }
  return { id: deptId, allowed_features: features } as Department
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
