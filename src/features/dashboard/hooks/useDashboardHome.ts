import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchDashboardHome } from '../lib/dashboardHome'
import { subscribeDashboardDataUpdated } from '../lib/dashboardRecommendations'

export function dashboardHomeQueryKey(userId: string | null) {
  return ['dashboard-home', userId] as const
}

export function useDashboardHome(userId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) {
      return undefined
    }

    return subscribeDashboardDataUpdated(() => {
      void queryClient.invalidateQueries({ queryKey: dashboardHomeQueryKey(userId) })
    })
  }, [queryClient, userId])

  return useQuery({
    queryKey: dashboardHomeQueryKey(userId),
    queryFn: fetchDashboardHome,
    enabled: Boolean(userId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })
}
