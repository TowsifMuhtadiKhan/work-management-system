import { supabase } from '@/lib/supabase/client'
import type { TaskHistoryEntry } from '@/types/entities'

// ─── Fetch full history for a task ───────────────────────────────────────────

export async function fetchTaskHistory(taskId: string): Promise<TaskHistoryEntry[]> {
  const { data, error } = await supabase
    .from('task_history')
    .select(`
      *,
      changed_by_profile:profiles!task_history_changed_by_fkey(
        id, full_name, avatar_url
      )
    `)
    .eq('task_id', taskId)
    .order('changed_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as TaskHistoryEntry[]
}
