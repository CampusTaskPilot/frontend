import { useEffect, useMemo, useState } from 'react'
import { fetchDashboardSchedule } from '../lib/dashboard'
import { subscribeDashboardDataUpdated } from '../lib/dashboardRecommendations'
import { getUpcomingDashboardSchedule } from '../lib/dashboardSelectors'
import type { DashboardScheduleItem } from '../types'

export function useDashboardSchedule(userId: string | null) {
  const [scheduleItems, setScheduleItems] = useState<DashboardScheduleItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    return subscribeDashboardDataUpdated(() => {
      setRefreshKey((current) => current + 1)
    })
  }, [])

  useEffect(() => {
    if (!userId) {
      setScheduleItems([])
      setIsLoading(false)
      return
    }

    const currentUserId = userId
    let isMounted = true

    async function loadSchedule() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await fetchDashboardSchedule(currentUserId)
        if (!isMounted) return
        setScheduleItems(data)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(
          error instanceof Error ? error.message : '가까운 일정을 불러오지 못했습니다.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSchedule()

    return () => {
      isMounted = false
    }
  }, [refreshKey, userId])

  const upcomingSchedule = useMemo(
    () => getUpcomingDashboardSchedule(scheduleItems, 5),
    [scheduleItems],
  )

  return {
    scheduleItems,
    upcomingSchedule,
    isLoading,
    errorMessage,
  }
}
