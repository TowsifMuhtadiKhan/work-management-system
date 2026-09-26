import { supabase } from '@/lib/supabase/client'
import type { Channel } from '@/types/entities'
import type { DbChannelInsert } from '@/types/database'

export async function fetchChannels(): Promise<Channel[]> {
  const { data, error } = await supabase
    .from('channels')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data ?? []
}

export async function createChannel(payload: DbChannelInsert): Promise<Channel> {
  const { data, error } = await supabase
    .from('channels')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateChannel(
  id: string,
  payload: Partial<DbChannelInsert>
): Promise<Channel> {
  const { data, error } = await supabase
    .from('channels')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}
