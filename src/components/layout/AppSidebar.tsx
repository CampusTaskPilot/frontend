import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/AuthContext'
import { fetchSidebarTeams } from '../../features/teams/lib/teams'
import type { SidebarTeamItem } from '../../features/teams/types/team'
import { Button } from '../ui/Button'

const navItems = [
  { label: '대시보드', to: '/dashboard' },
  { label: '팀 관리', to: '/teams' },
  { label: '프로필', to: '/profile' },
  { label: '프로젝트', to: '/dashboard/projects', disabled: true },
  { label: '워크플로우', to: '/dashboard/workflows', disabled: true },
  { label: '리포트', to: '/dashboard/reports', disabled: true },
]

function TeamNavList({
  title,
  teams,
  emptyLabel,
}: {
  title: string
  teams: SidebarTeamItem[]
  emptyLabel: string
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">{title}</p>
      {teams.length === 0 ? (
        <div className="rounded-2xl border border-campus-200 bg-campus-50 px-3 py-2 text-xs text-campus-500">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-1">
          {teams.map((team) => (
            <NavLink
              key={`${title}-${team.id}`}
              to={`/teams/${team.id}`}
              className={({ isActive }) =>
                [
                  'block rounded-xl px-3 py-2 text-sm transition',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-campus-600 hover:bg-campus-100',
                ].join(' ')
              }
            >
              <p className="truncate font-medium">{team.name}</p>
              {team.summary && <p className="truncate text-xs text-campus-500">{team.summary}</p>}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function AppSidebar() {
  const { user } = useAuth()
  const [managedTeams, setManagedTeams] = useState<SidebarTeamItem[]>([])
  const [joinedTeams, setJoinedTeams] = useState<SidebarTeamItem[]>([])
  const [isLoadingTeams, setIsLoadingTeams] = useState(false)

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
        if (!isMounted) return
        setManagedTeams(result.managedTeams)
        setJoinedTeams(result.joinedTeams)
      } catch (error) {
        if (!isMounted) return
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

    return () => {
      isMounted = false
    }
  }, [user])

  return (
    <aside className="border-b border-campus-200 bg-white px-5 py-5 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
      <div className="space-y-3 lg:space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-campus-500">워크스페이스</p>
        <div className="rounded-2xl border border-campus-200 bg-brand-50 px-4 py-3 text-sm font-medium text-campus-800">
          인증이 필요한 페이지에서 팀과 프로필 정보를 안전하게 관리합니다.
        </div>
      </div>

      <nav className="mt-5 grid grid-cols-2 gap-2 text-sm font-medium lg:mt-8 lg:grid-cols-1 lg:space-y-1">
        {navItems.map((item) =>
          item.disabled ? (
            <span
              key={item.label}
              className="flex items-center gap-3 rounded-2xl px-3 py-2 text-campus-400"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-campus-300" />
              {item.label}
            </span>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-2xl px-3 py-2 transition',
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-campus-600 hover:bg-campus-100',
                ].join(' ')
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-400" />
              {item.label}
            </NavLink>
          ),
        )}
      </nav>

      <div className="mt-6 space-y-4">
        {isLoadingTeams ? (
          <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3 text-sm text-campus-600">
            팀 목록을 불러오는 중입니다...
          </div>
        ) : (
          <>
            <TeamNavList
              title="팀 관리"
              teams={managedTeams}
              emptyLabel="현재 관리 중인 팀이 없습니다."
            />
            <TeamNavList
              title="참여 팀"
              teams={joinedTeams}
              emptyLabel="현재 참여 중인 팀이 없습니다."
            />
          </>
        )}
      </div>

      <div className="mt-5 space-y-4 rounded-3xl border border-campus-200 bg-campus-50 p-5 lg:mt-8">
        <div className="flex items-center justify-between text-xs text-campus-500">
          <span>사용 현황</span>
          <span>7 / 16 좌석</span>
        </div>
        <div className="h-2 rounded-full bg-campus-200">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-500 to-accent-400" />
        </div>
        <Button variant="subtle" size="sm">
          요금제 보기
        </Button>
      </div>
    </aside>
  )
}
