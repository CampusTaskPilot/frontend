import { useEffect, useMemo, useState } from 'react'
import { subscribeDashboardDataUpdated } from '../lib/dashboardRecommendations'
import { fetchAssignedDashboardTasks } from '../lib/dashboard'
import {
  getDashboardWorkSummary,
  isActiveAssignedTask,
  sortDashboardAssignedTasks,
} from '../lib/dashboardSelectors'
import type { DashboardAssignedTask } from '../types'

export function useDashboardTasks(userId: string | null) {
  const [assignedTasks, setAssignedTasks] = useState<DashboardAssignedTask[]>([])
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
      setAssignedTasks([])
      setIsLoading(false)
      return
    }

    const currentUserId = userId
    let isMounted = true

    async function loadTasks() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await fetchAssignedDashboardTasks(currentUserId)
        if (!isMounted) return
        setAssignedTasks(data)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(
          error instanceof Error ? error.message : '업무 정보를 불러오지 못했습니다.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadTasks()

    return () => {
      isMounted = false
    }
  }, [refreshKey, userId])

  const activeAssignedTasks = useMemo(
    () => sortDashboardAssignedTasks(assignedTasks.filter(isActiveAssignedTask)),
    [assignedTasks],
  )

  return {
    assignedTasks,
    visibleAssignedTasks: activeAssignedTasks.slice(0, 6),
    activeTaskCount: activeAssignedTasks.length,
    summary: getDashboardWorkSummary(assignedTasks),
    isLoading,
    errorMessage,
  }
}
