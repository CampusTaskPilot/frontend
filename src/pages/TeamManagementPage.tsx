import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/useAuth'
import { TeamTable } from '../features/teams/components/TeamTable'
import { fetchManagedTeamSummaries, subscribeTeamsUpdated } from '../features/teams/lib/teams'
import type { TeamSummary } from '../features/teams/types/team'

const filters = [
  { label: '전체', value: 'All' },
  { label: '운영 중', value: 'Active' },
  { label: '일시중지', value: 'Paused' },
] as const

export function TeamManagementPage() {
  const { user } = useAuth()
  const [selectedFilter, setSelectedFilter] = useState<(typeof filters)[number]['value']>('All')
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!user) {
      setTeams([])
      setIsLoading(false)
      return
    }

    const currentUserId = user.id
    let isMounted = true

    async function loadManagedTeams() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const result = await fetchManagedTeamSummaries(currentUserId)
        if (!isMounted) return
        setTeams(result)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(error instanceof Error ? error.message : '관리 중인 팀을 불러오지 못했습니다.')
        setTeams([])
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadManagedTeams()
    const unsubscribe = subscribeTeamsUpdated(() => {
      void loadManagedTeams()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [user])

  const filteredTeams = useMemo(() => {
    if (selectedFilter === 'All') return teams
    return teams.filter((team) => team.status === selectedFilter)
  }, [selectedFilter, teams])

  const totalMembers = filteredTeams.reduce((acc, team) => acc + team.members.length, 0)
  const focusedMembers = filteredTeams.reduce(
    (acc, team) => acc + team.members.filter((member) => member.availability === 'Focus').length,
    0,
  )

  return (
    <section className="space-y-6">
      <Card className="space-y-5 bg-gradient-to-r from-white via-brand-50 to-accent-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.3em] text-brand-600">팀 스튜디오</p>
            <h1 className="font-display text-3xl text-campus-900">팀 운영 관리</h1>
            <p className="max-w-2xl text-sm text-campus-700">
              내가 리더인 팀들의 상태를 한 번에 확인하고 바로 워크스페이스로 이동할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" asChild>
              <Link to="/teams">팀 둘러보기</Link>
            </Button>
            <Button asChild>
              <Link to="/teams/create">새 팀 만들기</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="bg-white p-4">
            <p className="text-xs text-campus-500">현재 팀 수</p>
            <p className="mt-1 text-2xl font-semibold text-campus-900">{filteredTeams.length}팀</p>
          </Card>
          <Card className="bg-white p-4">
            <p className="text-xs text-campus-500">참여 인원</p>
            <p className="mt-1 text-2xl font-semibold text-campus-900">{totalMembers}명</p>
          </Card>
          <Card className="bg-white p-4">
            <p className="text-xs text-campus-500">집중 상태</p>
            <p className="mt-1 text-2xl font-semibold text-campus-900">{focusedMembers}명</p>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                selectedFilter === filter.value
                  ? 'border-brand-200 bg-brand-100 text-brand-700'
                  : 'border-campus-200 bg-white text-campus-600 hover:bg-campus-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </Card>

      {errorMessage && (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-600">{errorMessage}</p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
        <Card className="p-0">
          {isLoading ? (
            <div className="px-5 py-8 text-sm text-campus-500">관리 중인 팀을 불러오는 중입니다...</div>
          ) : filteredTeams.length === 0 ? (
            <div className="px-5 py-8 text-sm text-campus-500">표시할 팀이 없습니다.</div>
          ) : (
            <TeamTable teams={filteredTeams} />
          )}
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-xl text-campus-900">운영 상태</h2>
          <div className="rounded-2xl border border-campus-200 bg-campus-50 p-4">
            <p className="text-sm font-medium text-campus-800">운영 중인 팀</p>
            <p className="text-sm text-campus-600">
              {teams.filter((team) => team.status === 'Active').length}개 팀이 현재 모집 또는 운영 중입니다.
            </p>
            <Badge className="mt-2" variant="success">
              실시간 반영
            </Badge>
          </div>
          <div className="rounded-2xl border border-campus-200 bg-campus-50 p-4">
            <p className="text-sm font-medium text-campus-800">팀 생성 반영</p>
            <p className="text-sm text-campus-600">
              새 팀이 생성되면 이 페이지와 사이드바 목록이 즉시 다시 갱신됩니다.
            </p>
            <Badge className="mt-2" variant="neutral">
              자동 새로고침
            </Badge>
          </div>
        </Card>
      </div>
    </section>
  )
}
