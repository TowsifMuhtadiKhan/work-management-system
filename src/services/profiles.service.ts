import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/types/entities'
import type { DbProfileInsert, DbProfileUpdate } from '@/types/database'

const PROFILE_SELECT = `
  *,
  department:departments(*),
  manager:profiles!profiles_manager_id_fkey(id, full_name, email, designation)
`

// ─── Fetch a single profile by user id ───────────────────────────────────────

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}

// ─── Fetch all active profiles ────────────────────────────────────────────────

export async function fetchAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('is_active', true)
    .order('full_name')

  if (error) throw error
  return (data ?? []) as Profile[]
}

// ─── Fetch all profiles (including inactive) for admin ───────────────────────

export async function fetchAllProfilesAdmin(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .order('full_name')

  if (error) throw error
  return (data ?? []) as Profile[]
}

// ─── Fetch profiles that can be assigned tasks (employees + team leads) ──────

export async function fetchAssignableProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, employee_code, designation, avatar_url, application_role, department_id')
    .eq('is_active', true)
    .order('full_name')

  if (error) throw error
  return (data ?? []) as Profile[]
}

// ─── Update own profile ───────────────────────────────────────────────────────

export async function updateProfile(
  userId: string,
  payload: DbProfileUpdate
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select(PROFILE_SELECT)
    .single()

  if (error) throw error
  return data as Profile
}

// ─── Admin: create a profile record (after auth user has been created) ────────

export async function createProfile(payload: DbProfileInsert): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert(payload)
    .select(PROFILE_SELECT)
    .single()

  if (error) throw error
  return data as Profile
}

// ─── Admin: toggle active status ─────────────────────────────────────────────

export async function setProfileActive(userId: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)

  if (error) throw error
}
