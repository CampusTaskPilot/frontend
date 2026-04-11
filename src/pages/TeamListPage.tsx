import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { InputField } from '../components/ui/InputField'
import { useAuth } from '../features/auth/context/useAuth'
import { TeamCard } from '../features/teams/components/TeamCard'
import { TeamListPagination } from '../features/teams/components/TeamListPagination'
import {
  TEAM_LIST_PAGE_SIZE,
  buildTeamListSearchParams,
  normalizeTeamListParam,
  parseRecruitingFilterValue,
  parseRecruitingParam,
  parseTeamListPageParam,
  toRecruitingFilterValue,
} from '../features/teams/lib/teamListPagination'
import { fetchTeamList, joinTeam } from '../features/teams/lib/teams'
import type { TeamListItem } from '../features/teams/types/team'

function TeamListSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} className="space-y-4 animate-pulse">
          <div className="space-y-3">
            <div className="h-6 w-40 rounded-full bg-campus-100" />
            <div className="h-4 w-full rounded-full bg-campus-100" />
            <div className="h-4 w-2/3 rounded-full bg-campus-100" />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="h-4 rounded-full bg-campus-100" />
            <div className="h-4 rounded-full bg-campus-100" />
            <div className="h-4 rounded-full bg-campus-100" />
            <div className="h-4 rounded-full bg-campus-100" />
          </div>
          <div className="h-10 w-36 rounded-full bg-campus-100" />
        </Card>
      ))}
    </div>
  )
}

export function TeamListPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [teams, setTeams] = useState<TeamListItem[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [joiningTeamId, setJoiningTeamId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const topRef = useRef<HTMLDivElement | null>(null)
  const hasMountedPageRef = useRef(false)
  const previousViewStateRef = useRef<string | null>(null)

  const currentPage = parseTeamListPageParam(searchParams.get('page'))
  const searchQuery = normalizeTeamListParam(searchParams.get('search'))
  const categoryQuery = normalizeTeamListParam(searchParams.get('category'))
  const recruitingQuery = parseRecruitingParam(searchParams.get('recruiting'))
  const hasActiveFilters = Boolean(searchQuery || categoryQuery || recruitingQuery !== null)
  const visiblePage = totalPages > 0 ? Math.min(currentPage, totalPages) : 1
  const pageRangeStart = totalCount > 0 ? (visiblePage - 1) * TEAM_LIST_PAGE_SIZE + 1 : 0
  const pageRangeEnd = totalCount > 0 ? Math.min(visiblePage * TEAM_LIST_PAGE_SIZE, totalCount) : 0

  const deferredSearch = useDeferredValue(searchInput.trim())
  const deferredCategory = useDeferredValue(categoryInput.trim())

  const updateQueryParams = useCallback(
    (
      nextValues: Partial<{
        page: number
        search: string
        category: string
        recruiting: boolean | null
      }>,
      replace = false,
    ) => {
      const nextSearchParams = buildTeamListSearchParams({
        page: nextValues.page ?? currentPage,
        search: nextValues.search ?? searchQuery,
        category: nextValues.category ?? categoryQuery,
        recruiting: nextValues.recruiting === undefined ? recruitingQuery : nextValues.recruiting,
      })

      setSearchParams(nextSearchParams, { replace })
    },
    [categoryQuery, currentPage, recruitingQuery, searchQuery, setSearchParams],
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
    setSearchInput(searchQuery)
  }, [searchQuery])

  useEffect(() => {
    setCategoryInput(categoryQuery)
  }, [categoryQuery])

  useEffect(() => {
    if (deferredSearch === searchQuery && deferredCategory === categoryQuery) {
      return
    }

    updateQueryParams(
      {
        page: 1,
        search: deferredSearch,
        category: deferredCategory,
      },
      true,
    )
  }, [categoryQuery, deferredCategory, deferredSearch, searchQuery, updateQueryParams])

  useEffect(() => {
    const nextViewState = JSON.stringify({
      page: currentPage,
      search: searchQuery,
      category: categoryQuery,
      recruiting: recruitingQuery,
      reloadKey,
    })

    if (previousViewStateRef.current === null) {
      previousViewStateRef.current = nextViewState
      return
    }

    if (previousViewStateRef.current !== nextViewState) {
      previousViewStateRef.current = nextViewState

      if (feedbackMessage) {
        setFeedbackMessage('')
      }
    }
  }, [categoryQuery, currentPage, feedbackMessage, recruitingQuery, reloadKey, searchQuery])

  useEffect(() => {
    let isMounted = true

    async function loadSearchResults() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const result = await fetchTeamList({
          userId: user?.id ?? null,
          search: searchQuery,
          category: categoryQuery,
          recruiting: recruitingQuery,
          page: currentPage,
          pageSize: TEAM_LIST_PAGE_SIZE,
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
        setTotalPages(0)
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
  }, [categoryQuery, currentPage, recruitingQuery, reloadKey, searchQuery, user?.id])

  useEffect(() => {
    if (isLoading) {
      return
    }

    if (totalPages === 0 && currentPage !== 1) {
      updateQueryParams({ page: 1 }, true)
      return
    }

    if (totalPages > 0 && currentPage > totalPages) {
      updateQueryParams({ page: totalPages }, true)
    }
  }, [currentPage, isLoading, totalPages, updateQueryParams])

  useEffect(() => {
    if (!hasMountedPageRef.current) {
      hasMountedPageRef.current = true
      return
    }

    topRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }, [currentPage])

  async function handleJoin(teamId: string) {
    if (!user) {
      setErrorMessage('로그인한 사용자만 팀에 참여할 수 있습니다.')
      return
    }

    if (feedbackMessage) {
      setFeedbackMessage('')
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
      <div ref={topRef} />

      <section className="page-hero">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.18),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-6 py-7 md:px-8 md:py-9 xl:px-10">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-semibold tracking-[0.24em] text-brand-600">
                TEAM SEARCH
              </div>
              <div className="space-y-3">
                <h1 className="font-display text-3xl leading-tight text-campus-900 md:text-4xl">
                  함께 일하기 좋은 팀을
                  <br />
                  더 빠르게 발견하세요
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-campus-700 sm:text-base">
                  관심 있는 분야와 팀 분위기에 맞는 팀을 한 곳에서 찾아보세요. 이름 검색과 조건별 필터를
                  조합해 원하는 팀을 빠르게 좁혀가고, 모집 중인 팀은 바로 확인할 수 있습니다.
                </p>
              </div>
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
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-4">
        <Card className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr),minmax(0,1fr),220px] xl:items-end">
            <div className="w-full">
              <InputField
                label="팀 검색"
                placeholder="팀 이름으로 검색"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                hint="teams 테이블의 name 컬럼을 기준으로 포함 검색합니다."
                endAdornment={`${TEAM_LIST_PAGE_SIZE}개 / 페이지`}
              />
            </div>

            <div className="w-full">
              <InputField
                label="카테고리 필터"
                placeholder="예: 디자인, 개발"
                value={categoryInput}
                onChange={(event) => setCategoryInput(event.target.value)}
                hint="입력한 카테고리와 정확히 일치하는 팀만 보여줍니다."
              />
            </div>

            <label className="space-y-2.5 text-sm font-medium text-campus-700">
              <span className="text-[0.95rem]">모집 상태</span>
              <select
                className="min-h-[3.25rem] w-full rounded-[1.15rem] border border-campus-200 bg-white/92 px-4 py-3 text-[15px] text-campus-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100"
                value={toRecruitingFilterValue(recruitingQuery)}
                onChange={(event) =>
                  updateQueryParams(
                    {
                      page: 1,
                      recruiting: parseRecruitingFilterValue(event.target.value),
                    },
                    false,
                  )
                }
              >
                <option value="all">전체</option>
                <option value="true">모집 중</option>
                <option value="false">모집 마감</option>
              </select>
              <p className="text-xs text-campus-500">검색어, 카테고리와 함께 조합해서 사용할 수 있습니다.</p>
            </label>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-sm text-campus-600">
              <span className="rounded-full border border-campus-200 bg-campus-50 px-3 py-2">
                현재 페이지 {visiblePage} / {Math.max(totalPages, 1)}
              </span>
              <span className="rounded-full border border-campus-200 bg-campus-50 px-3 py-2">
                검색 결과 {totalCount}개
              </span>
              {hasActiveFilters && (
                <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-2 text-brand-700">
                  검색/필터 적용 중
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasActiveFilters}
              onClick={() => {
                setSearchInput('')
                setCategoryInput('')
                updateQueryParams(
                  {
                    page: 1,
                    search: '',
                    category: '',
                    recruiting: null,
                  },
                  false,
                )
              }}
            >
              필터 초기화
            </Button>
          </div>
        </Card>

        {isLoading && <TeamListSkeleton />}

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
              {hasActiveFilters
                ? '검색 조건에 맞는 팀이 없습니다. 다른 검색어 또는 필터로 다시 시도해 주세요.'
                : '등록된 팀이 아직 없습니다. 첫 팀을 만들어 보세요.'}
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
                {pageRangeStart}-{pageRangeEnd}번째 팀을 보고 있습니다.
              </p>
              <TeamListPagination
                currentPage={visiblePage}
                totalPages={totalPages}
                onPageChange={(page) => updateQueryParams({ page }, false)}
              />
            </Card>
          </>
        )}
      </div>
    </section>
  )
}
