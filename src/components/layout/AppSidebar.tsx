import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/useAuth'
import { fetchSidebarTeams, subscribeTeamsUpdated } from '../../features/teams/lib/teams'
import type { SidebarTeamItem } from '../../features/teams/types/team'
import { Button } from '../ui/Button'

type TeamSidebarTab = 'managed' | 'joined'

const primaryNavItems = [
  { label: '대시보드', to: '/dashboard' },
  { label: '팀', to: '/teams' },
  { label: '프로필', to: '/profile' },
]

// const secondaryNavItems = [
//   { label: '프로젝트', to: '/dashboard/projects', disabled: true },
//   { label: '워크플로우', to: '/dashboard/workflows', disabled: true },
//   { label: '리포트', to: '/dashboard/reports', disabled: true },
// ]

function TeamLinkList({
  teams,
  emptyLabel,
}: {
  teams: SidebarTeamItem[]
  emptyLabel: string
}) {
  if (teams.length === 0) {
    return (
      <div className="rounded-[1rem] border border-campus-200 bg-campus-50 px-3 py-3 text-xs text-campus-500">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {teams.map((team) => (
        <NavLink
          key={team.id}
          to={`/teams/${team.id}`}
          className={({ isActive }) =>
            [
              'block rounded-[1rem] px-3 py-2.5 transition',
              isActive ? 'bg-campus-900 text-white shadow-[0_12px_24px_rgba(26,34,51,0.12)]' : 'text-campus-700 hover:bg-white',
            ].join(' ')
          }
        >
          <p className="truncate text-sm font-medium">{team.name}</p>
          <p className="truncate text-xs text-campus-500">{team.summary || '팀 소개가 아직 없습니다.'}</p>
        </NavLink>
      ))}
    </div>
  )
}

export function AppSidebar() {
  const { user } = useAuth()
  const [managedTeams, setManagedTeams] = useState<SidebarTeamItem[]>([])
  const [joinedTeams, setJoinedTeams] = useState<SidebarTeamItem[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)
  const [activeTeamTab, setActiveTeamTab] = useState<TeamSidebarTab>('managed')

  const currentTeams = useMemo(
    () => (activeTeamTab === 'managed' ? managedTeams : joinedTeams),
    [activeTeamTab, joinedTeams, managedTeams],
  )

  useEffect(() => {
    if (!user) {
      setManagedTeams([])
      setJoinedTeams([])
      return
    }

    const currentUserId = user.id

    let isMounted = true

    async function loadSidebarTeams() {
      setIsLoadingTeams(true)

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

        console.error('Failed to load sidebar teams', error)
        setManagedTeams([])
        setJoinedTeams([])
      } finally {
        if (isMounted) {
          setIsLoadingTeams(false)
        }
      }
    }

    void loadSidebarTeams()
    const unsubscribe = subscribeTeamsUpdated(() => {
      void loadSidebarTeams()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [user])

  return (
    <aside className="border-b border-white/70 bg-white/72 px-4 py-4 backdrop-blur-xl lg:self-start lg:border-b-0 lg:border-r lg:px-5 lg:py-8">
      <div className="space-y-5 lg:sticky lg:top-[calc(var(--app-header-height)+1.5rem)]">
        <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.3em] text-campus-500">워크스페이스</p>
        <div className="rounded-[1.75rem] border border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.14),transparent_48%),linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-4 py-4 shadow-[0_14px_34px_rgba(26,34,51,0.06)]">
          <p className="text-sm font-semibold text-campus-900">지금 진행 중인 팀으로 빠르게 이동해보세요.</p>
          <p className="mt-2 text-sm leading-6 text-campus-600">
            관리 중인 팀과 참여 중인 팀을 구분해 두어 현재 필요한 워크스페이스를 바로 열 수 있습니다.
          </p>
        </div>
        </div>

        <nav className="space-y-1 text-sm font-medium">
        {primaryNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-[1rem] px-3 py-2.5 transition',
                isActive ? 'bg-campus-900 text-white shadow-[0_12px_24px_rgba(26,34,51,0.12)]' : 'text-campus-600 hover:bg-white',
              ].join(' ')
            }
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
            {item.label}
          </NavLink>
        ))}
        </nav>

        <div className="rounded-[1.75rem] border border-campus-200 bg-white/78 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-campus-500">팀</p>
            <p className="text-sm text-campus-600">리더 팀과 참여 팀을 분리해서 바로 이동합니다.</p>
          </div>
          <Button variant="subtle" size="sm" asChild>
            <NavLink to="/teams">팀 검색</NavLink>
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-2 rounded-[1rem] bg-campus-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTeamTab('managed')}
            className={[
              'rounded-[0.9rem] px-3 py-2 text-sm font-medium transition',
              activeTeamTab === 'managed'
                ? 'bg-white text-campus-900 shadow-sm'
                : 'text-campus-600 hover:text-campus-900',
            ].join(' ')}
          >
            팀관리
          </button>
          <button
            type="button"
            onClick={() => setActiveTeamTab('joined')}
            className={[
              'rounded-[0.9rem] px-3 py-2 text-sm font-medium transition',
              activeTeamTab === 'joined'
                ? 'bg-white text-campus-900 shadow-sm'
                : 'text-campus-600 hover:text-campus-900',
            ].join(' ')}
          >
            참여팀
          </button>
        </div>

        <div className="mt-4">
          {isLoadingTeams ? (
            <div className="rounded-2xl border border-campus-200 bg-white px-3 py-3 text-sm text-campus-500">
              팀 목록을 불러오는 중입니다...
            </div>
          ) : (
            <TeamLinkList
              teams={currentTeams}
              emptyLabel={
                activeTeamTab === 'managed'
                  ? '리더로 속한 팀이 없습니다.'
                  : '팀원으로 참여 중인 팀이 없습니다.'
              }
            />
          )}
        </div>
        </div>

        {/* <div className="space-y-1 text-sm font-medium">
        {secondaryNavItems.map((item) => (
          <span
            key={item.label}
            className="flex items-center gap-3 rounded-[1rem] px-3 py-2 text-campus-400"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-campus-300" />
            {item.label}
          </span>
        ))}
        </div> */}
      </div>
    </aside>
  )
}
