import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/useAuth'
import { TeamCard } from '../features/teams/components/TeamCard'
import { fetchTeamList, joinTeam } from '../features/teams/lib/teams'
import type { TeamListItem } from '../features/teams/types/team'

export function TeamListPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [teams, setTeams] = useState<TeamListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null)

  useEffect(() => {
    const incomingMessage =
      location.state && typeof location.state === 'object' && 'feedbackMessage' in location.state
        ? location.state.feedbackMessage
        : null

    if (typeof incomingMessage !== 'string' || !incomingMessage.trim()) {
      return
    }

    setFeedbackMessage(incomingMessage)
    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    let isMounted = true

    async function loadTeams() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await fetchTeamList(user?.id ?? null)
        if (!isMounted) return
        setTeams(data)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(error instanceof Error ? error.message : '팀 목록을 불러오지 못했습니다.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadTeams()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  async function handleJoin(teamId: string) {
    if (!user) {
      setErrorMessage('로그인 후 팀에 참여할 수 있습니다.')
      return
    }

    setJoiningTeamId(teamId)
    setErrorMessage('')

    try {
      await joinTeam(teamId, user.id)
      const refreshed = await fetchTeamList(user.id)
      setTeams(refreshed)
    } catch (error) {
      console.error('join team error:', error)
      setErrorMessage(error instanceof Error ? error.message : '팀 참여에 실패했습니다.')
    } finally {
      setJoiningTeamId(null)
    }
  }

  return (
    <section className="space-y-6">
      <Card className="space-y-4 bg-gradient-to-r from-brand-50 via-white to-accent-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">팀</p>
            <h1 className="font-display text-3xl text-campus-900">팀 참가하기</h1>
            <p className="text-sm text-campus-700">
              모집 중인 팀을 확인하고 원하는 팀 상세에서 참여할 수 있습니다.
            </p>
          </div>
          <Button asChild>
            <Link to="/teams/create">팀 생성하기</Link>
          </Button>
        </div>
      </Card>

      {isLoading && (
        <Card>
          <p className="text-sm text-campus-600">팀 목록을 불러오는 중입니다...</p>
        </Card>
      )}

      {!isLoading && errorMessage && (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-600">{errorMessage}</p>
        </Card>
      )}

      {!isLoading && !errorMessage && feedbackMessage && (
        <Card className="border-emerald-200 bg-emerald-50">
          <p className="text-sm text-emerald-700">{feedbackMessage}</p>
        </Card>
      )}

      {!isLoading && !errorMessage && teams.length === 0 && (
        <Card>
          <p className="text-sm text-campus-600">등록된 팀이 아직 없습니다. 첫 팀을 만들어 보세요.</p>
        </Card>
      )}

      {!isLoading && !errorMessage && teams.length > 0 && (
        <div className="grid gap-4">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onJoin={handleJoin}
              isJoining={joiningTeamId === team.id}
            />
          ))}
        </div>
      )}
    </section>
  )
}
