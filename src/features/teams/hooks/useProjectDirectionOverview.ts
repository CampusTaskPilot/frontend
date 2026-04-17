import { useCallback, useEffect, useState } from 'react'
import {
  fetchProjectDirectionStatus,
  subscribeProjectDirectionOverviewUpdated,
} from '../lib/projectDirectionOverview'
import type { ProjectDirectionOverview, ProjectDirectionStatusInfo } from '../types/team'

interface UseProjectDirectionOverviewResult {
  overview: ProjectDirectionOverview | null
  jobStatus: ProjectDirectionStatusInfo | null
  isLoading: boolean
  errorMessage: string
  reload: () => Promise<ProjectDirectionStatusInfo | null>
}

function shouldPoll(statusInfo: ProjectDirectionStatusInfo | null) {
  if (!statusInfo) return false
  return statusInfo.status === 'pending' || statusInfo.status === 'running' || statusInfo.status === 'cooldown'
}

export function useProjectDirectionOverview(
  teamId: string | null,
  currentUserId: string | null,
  enabled = true,
): UseProjectDirectionOverviewResult {
  const [overview, setOverview] = useState<ProjectDirectionOverview | null>(null)
  const [jobStatus, setJobStatus] = useState<ProjectDirectionStatusInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const load = useCallback(
    async (silent = false) => {
      if (!enabled) {
        setIsLoading(false)
        return null
      }

      if (!teamId || !currentUserId) {
        setOverview(null)
        setJobStatus(null)
        setErrorMessage('')
        setIsLoading(false)
        return null
      }

      if (!silent) {
        setIsLoading(true)
      }
      setErrorMessage('')

      try {
        const result = await fetchProjectDirectionStatus(teamId, currentUserId)
        setJobStatus(result)
        setOverview(result.overview)
        return result
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load project direction status.')
        return null
      } finally {
        if (!silent) {
          setIsLoading(false)
        }
      }
    },
    [currentUserId, enabled, teamId],
  )

  useEffect(() => {
    void load(false)
  }, [load])

  useEffect(() => {
    if (!enabled || !teamId) return undefined

    return subscribeProjectDirectionOverviewUpdated((updatedTeamId) => {
      if (updatedTeamId !== teamId) return
      void load(true)
    })
  }, [enabled, load, teamId])

  useEffect(() => {
    if (!shouldPoll(jobStatus)) return undefined

    const timer = window.setInterval(() => {
      void load(true)
    }, 5000)

    return () => window.clearInterval(timer)
  }, [jobStatus?.status, load])

  return {
    overview,
    jobStatus,
    isLoading,
    errorMessage,
    reload: () => load(false),
  }
}
