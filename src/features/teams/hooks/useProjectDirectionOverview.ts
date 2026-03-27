import { useCallback, useEffect, useState } from 'react'
import {
  fetchProjectDirectionOverview,
  subscribeProjectDirectionOverviewUpdated,
} from '../lib/projectDirectionOverview'
import type { ProjectDirectionOverview } from '../types/team'

interface UseProjectDirectionOverviewResult {
  overview: ProjectDirectionOverview | null
  isLoading: boolean
  errorMessage: string
  reload: () => Promise<void>
}

export function useProjectDirectionOverview(
  teamId: string | null,
  currentUserId: string | null,
  enabled = true,
): UseProjectDirectionOverviewResult {
  const [overview, setOverview] = useState<ProjectDirectionOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    if (!teamId || !currentUserId) {
      setOverview(null)
      setErrorMessage('')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const result = await fetchProjectDirectionOverview(teamId, currentUserId)
      setOverview(result)
    } catch (error) {
      setOverview(null)
      setErrorMessage(error instanceof Error ? error.message : '방향 제안을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }, [currentUserId, enabled, teamId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!enabled) return undefined

    if (!teamId) return undefined

    return subscribeProjectDirectionOverviewUpdated((updatedTeamId) => {
      if (updatedTeamId !== teamId) return
      void load()
    })
  }, [enabled, load, teamId])

  return {
    overview,
    isLoading,
    errorMessage,
    reload: load,
  }
}
