import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { InputField } from '../components/ui/InputField'
import { useAuth } from '../features/auth/context/useAuth'
import { TeamCard } from '../features/teams/components/TeamCard'
import { fetchSidebarTeams, fetchTeamList, joinTeam } from '../features/teams/lib/teams'
import type { SidebarTeamItem, TeamListItem } from '../features/teams/types/team'

type TeamTab = 'managed' | 'joined'

const PAGE_SIZE = 10

function MyTeamList({
  teams,
  emptyMessage,
}: {
  teams: SidebarTeamItem[]
  emptyMessage: string
}) {
  if (teams.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-campus-200 bg-campus-50 px-4 py-6 text-sm text-campus-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {teams.map((team) => (
        <Link
          key={team.id}
          to={`/teams/${team.id}`}
          className="block rounded-2xl border border-campus-200 bg-white px-4 py-3 transition hover:border-brand-200 hover:bg-brand-50/40"
        >
          <p className="font-medium text-campus-900">{team.name}</p>
          <p className="mt-1 truncate text-sm text-campus-500">{team.summary || '팀 소개가 아직 없습니다.'}</p>
        </Link>
      ))}
    </div>
  )
}

export function TeamListPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchInput, setSearchInput] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [activeTeamTab, setActiveTeamTab] = useState<TeamTab>('managed')
  const [teams, setTeams] = useState<TeamListItem[]>([])
  const [managedTeams, setManagedTeams] = useState<SidebarTeamItem[]>([])
  const [joinedTeams, setJoinedTeams] = useState<SidebarTeamItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMyTeams, setIsLoadingMyTeams] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const deferredSearch = useDeferredValue(searchInput.trim())

  const activeTeams = useMemo(
    () => (activeTeamTab === 'managed' ? managedTeams : joinedTeams),
    [activeTeamTab, joinedTeams, managedTeams],
  )

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
    setCurrentPage(1)
  }, [searchInput])

  useEffect(() => {
    let isMounted = true

    async function loadSearchResults() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const result = await fetchTeamList({
          userId: user?.id ?? null,
          search: deferredSearch,
          page: currentPage,
          pageSize: PAGE_SIZE,
        })

        if (!isMounted) {
          return
        }

        setTeams(result.items)
        setTotalCount(result.totalCount)
        setTotalPages(result.totalPages)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(error instanceof Error ? error.message : '팀 검색 결과를 불러오지 못했습니다.')
        setTeams([])
        setTotalCount(0)
        setTotalPages(1)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadSearchResults()

    return () => {
      isMounted = false
    }
  }, [currentPage, deferredSearch, reloadKey, user?.id])

  useEffect(() => {
    if (!user) {
      setManagedTeams([])
      setJoinedTeams([])
      setIsLoadingMyTeams(false)
      return
    }

    const currentUserId = user.id

    let isMounted = true

    async function loadMyTeams() {
      setIsLoadingMyTeams(true)

      try {
        const result = await fetchSidebarTeams(currentUserId)
        if (!isMounted) {
          return
        }

        setManagedTeams(result.managedTeams)
        setJoinedTeams(result.joinedTeams)
      } catch (error) {
        if (!isMounted) {
          return
        }

        console.error('Failed to load my teams', error)
        setManagedTeams([])
        setJoinedTeams([])
      } finally {
        if (isMounted) {
          setIsLoadingMyTeams(false)
        }
      }
    }

    void loadMyTeams()

    return () => {
      isMounted = false
    }
  }, [reloadKey, user])

  async function handleJoin(teamId: string) {
    if (!user) {
      setErrorMessage('로그인한 사용자만 팀에 참여할 수 있습니다.')
      return
    }

    setJoiningTeamId(teamId)
    setErrorMessage('')

    try {
      await joinTeam(teamId, user.id)
      setReloadKey((value) => value + 1)
    } catch (error) {
      console.error('join team error:', error)
      setErrorMessage(error instanceof Error ? error.message : '팀 참여에 실패했습니다.')
    } finally {
      setJoiningTeamId(null)
    }
  }

  return (
    <section className="page-shell">
      <section className="page-hero">
        <div className="grid gap-0 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="space-y-5 bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.18),transparent_40%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-6 py-7 md:px-8 md:py-9 xl:px-10">
            <div className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-brand-600">
              TEAM SEARCH
            </div>
            <div className="space-y-3">
              <h1 className="font-display text-3xl leading-tight text-campus-900 md:text-4xl">
                실제 팀 데이터를
                <br />
                빠르게 찾고 바로 합류합니다.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-campus-700">
                현재 DB에 저장된 팀만 조회합니다. 이름으로 검색하고, 페이지 단위로 탐색하고, 참여 가능한 팀은
                즉시 합류할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link to="/teams/create">새 팀 만들기</Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/dashboard">대시보드로 이동</Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-px bg-campus-200">
            <div className="bg-white px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-campus-500">검색 현황</p>
              <p className="mt-3 font-display text-4xl text-campus-900">{totalCount}</p>
              <p className="mt-1 text-sm text-campus-600">조건에 맞는 팀 수</p>
            </div>
            <div className="bg-white px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-campus-500">내 팀 현황</p>
              <p className="mt-3 font-display text-4xl text-campus-900">{managedTeams.length + joinedTeams.length}</p>
              <p className="mt-1 text-sm text-campus-600">관리 중 + 참여 중인 팀</p>
            </div>
            <div className="bg-white px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-campus-500">페이지 단위</p>
              <p className="mt-3 font-display text-4xl text-campus-900">{PAGE_SIZE}</p>
              <p className="mt-1 text-sm text-campus-600">한 번에 조회하는 팀 수</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[340px,minmax(0,1fr)]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-campus-500">내 팀</p>
            <h2 className="font-display text-2xl text-campus-900">팀관리 / 참여팀</h2>
            <p className="text-sm text-campus-600">현재 로그인한 사용자 기준으로 역할에 맞는 팀만 구분해서 보여줍니다.</p>
          </div>

          <div className="grid grid-cols-2 rounded-2xl bg-campus-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTeamTab('managed')}
              className={[
                'rounded-2xl px-4 py-2 text-sm font-medium transition',
                activeTeamTab === 'managed'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-campus-600 hover:text-campus-900',
              ].join(' ')}
            >
              팀관리
            </button>
            <button
              type="button"
              onClick={() => setActiveTeamTab('joined')}
              className={[
                'rounded-2xl px-4 py-2 text-sm font-medium transition',
                activeTeamTab === 'joined'
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-campus-600 hover:text-campus-900',
              ].join(' ')}
            >
              참여팀
            </button>
          </div>

          {isLoadingMyTeams ? (
            <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-6 text-sm text-campus-500">
              내 팀 목록을 불러오는 중입니다...
            </div>
          ) : (
            <MyTeamList
              teams={activeTeams}
              emptyMessage={
                activeTeamTab === 'managed'
                  ? '리더 권한으로 관리 중인 팀이 없습니다.'
                  : '팀원으로 참여 중인 팀이 없습니다.'
              }
            />
          )}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="w-full max-w-xl">
                <InputField
                  label="팀 검색"
                  placeholder="팀 이름으로 검색"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  hint="실제 teams 테이블 기준으로 검색합니다."
                  endAdornment={`${PAGE_SIZE}개 / 페이지`}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-campus-600">
                <span className="rounded-full border border-campus-200 bg-campus-50 px-3 py-2">
                  현재 페이지 {Math.min(currentPage, totalPages)} / {totalPages}
                </span>
                <span className="rounded-full border border-campus-200 bg-campus-50 px-3 py-2">
                  검색 결과 {totalCount}개
                </span>
              </div>
            </div>
          </Card>

          {isLoading && (
            <Card>
              <p className="text-sm text-campus-600">팀 검색 결과를 불러오는 중입니다...</p>
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
              <p className="text-sm text-campus-600">
                {deferredSearch
                  ? '검색어와 일치하는 팀이 없습니다. 다른 이름으로 다시 찾아보세요.'
                  : '등록된 팀이 아직 없습니다. 첫 팀을 만들어보세요.'}
              </p>
            </Card>
          )}

          {!isLoading && !errorMessage && teams.length > 0 && (
            <>
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

              <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-campus-600">
                  {(Math.min(currentPage, totalPages) - 1) * PAGE_SIZE + 1}-
                  {Math.min(Math.min(currentPage, totalPages) * PAGE_SIZE, totalCount)}번째 팀을 보고 있습니다.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    이전
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    다음
                  </Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
