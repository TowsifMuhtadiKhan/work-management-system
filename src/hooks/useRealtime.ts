import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

/**
 * Subscribes to Supabase Realtime updates for today's tasks.
 * When any INSERT, UPDATE, or DELETE occurs on the tasks table for
 * the given workDate, it invalidates the relevant TanStack Query
 * cache so the UI re-fetches automatically.
 *
 * Only activate after standard CRUD and RLS are confirmed working.
 */
export function useTasksRealtime(workDate: string) {
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!workDate) return

    // Remove previous subscription if workDate changed
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`tasks:${workDate}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `work_date=eq.${workDate}`,
        },
        (_payload) => {
          // Invalidate the tasks query for this date so it re-fetches
          queryClient.invalidateQueries({ queryKey: ['tasks', workDate] })
          // Also invalidate daily stats
          queryClient.invalidateQueries({ queryKey: ['daily-stats', workDate] })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workDate, queryClient])
}
