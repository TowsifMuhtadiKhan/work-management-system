import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export function useAdministrationReady() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['administration-ready', user?.id],
    enabled: !!user,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('administration_ready')
      if (error) throw error
      return data === true
    },
  })
}
