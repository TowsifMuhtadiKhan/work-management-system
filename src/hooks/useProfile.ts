import { useQuery } from '@tanstack/react-query'
import { fetchProfile } from '@/services/profiles.service'
import type { Profile } from '@/types/entities'

export function useProfile(userId: string | undefined) {
  return useQuery<Profile | null>({
    queryKey: ['profile', userId],
    queryFn: () => (userId ? fetchProfile(userId) : null),
    enabled: !!userId,
    retry: false,
    retryOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
