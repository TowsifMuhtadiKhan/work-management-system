import { supabase } from '@/lib/supabase/client'

export interface RushEntry {
  id: string
  reporter: string
  name: string
  status: string
  created_by: string
  created_at: string
}

export type RushValues = Pick<RushEntry, 'reporter' | 'name' | 'status'>

export async function fetchRushEntries(): Promise<RushEntry[]> {
  const { data, error } = await supabase.from('rush_entries').select('*').order('created_at')
  if (error) throw error
  return data ?? []
}

export async function saveRushEntry(values: RushValues, userId: string, id?: string) {
  const query = id
    ? supabase.from('rush_entries').update(values).eq('id', id)
    : supabase.from('rush_entries').insert({ ...values, created_by: userId })
  const { data, error } = await query.select('*').single()
  if (error) throw error
  return data as RushEntry
}
