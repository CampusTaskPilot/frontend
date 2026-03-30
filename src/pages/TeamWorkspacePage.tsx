import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/useAuth'
import { ProjectDirectionOverviewPanel } from '../features/teams/components/ProjectDirectionOverviewPanel'
import { TeamCalendarTab } from '../features/teams/components/TeamCalendarTab'
import { TeamMembersTab } from '../features/teams/components/TeamMembersTab'
import { TeamOverviewTab } from '../features/teams/components/TeamOverviewTab'
import { TeamPMTab, type PMAssistantTabKey } from '../features/teams/components/TeamPMTab'
import { TeamTabs, type TeamWorkspaceTabKey } from '../features/teams/components/TeamTabs'
import { TeamTasksTab } from '../features/teams/components/TeamTasksTab'
import { fetchTeamMembers, fetchTeamSkillTags, fetchTeamWorkspaceBase } from '../features/teams/lib/teams'
import type {
  TeamMemberRole,
  TeamMemberWithProfile,
  TeamSkillTag,
  TeamTaskItem,
  TeamWorkspaceBase,
} from '../features/teams/types/team'

function TeamHeaderFallback({
  teamName,
  leaderName,
  isLeader,
  onOpenPM,
}: {
  teamName: string
  leaderName: string
  isLeader: boolean
  onOpenPM: () => void
}) {
  return (
    <Card className="space-y-4 bg-gradient-to-r from-brand-50 via-white to-accent-100">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Workspace</p>
          <h1 className="font-display text-3xl text-campus-900">{teamName}</h1>
          <p className="text-sm text-campus-600">
            리더 <span className="font-medium text-campus-900">{leaderName}</span>
            {isLeader ? ' · 현재 이 워크스페이스를 관리 중입니다.' : ' · 팀 진행 현황을 확인할 수 있습니다.'}
          </p>
        </div>

        <Button type="button" onClick={onOpenPM}>
          PM Assistant 열기
        </Button>
      </div>
    </Card>
  )
}

export function TeamWorkspacePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const requestedTab = searchParams.get('tab')
  const initialTab: TeamWorkspaceTabKey =
    requestedTab === 'members' ||
    requestedTab === 'tasks' ||
    requestedTab === 'calendar' ||
    requestedTab === 'pm'
      ? requestedTab
      : 'overview'

  const requestedAssistant = searchParams.get('assistant')
  const initialAssistantTab: PMAssistantTabKey =
    requestedAssistant === 'meeting-actionizer' ||
    requestedAssistant === 'report-writer' ||
    requestedAssistant === 'direction'
      ? requestedAssistant
      : 'direction'

  const [activeTab, setActiveTab] = useState<TeamWorkspaceTabKey>(initialTab)
  const [baseData, setBaseData] = useState<TeamWorkspaceBase | null>(null)
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([])
  const [skills, setSkills] = useState<TeamSkillTag[]>([])
  const [isBaseLoading, setIsBaseLoading] = useState(true)
  const [isTabLoading, setIsTabLoading] = useState(false)
  const [baseError, setBaseError] = useState('')
  const [tabError, setTabError] = useState('')
  const [membersLoaded, setMembersLoaded] = useState(false)
  const [skillsLoaded, setSkillsLoaded] = useState(false)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (!teamId) {
      setBaseError('팀 정보를 불러올 수 없습니다.')
      setIsBaseLoading(false)
      return
    }

    const currentTeamId = teamId
    let isMounted = true

    async function loadBaseData() {
      setIsBaseLoading(true)
      setBaseError('')
      setMembers([])
      setSkills([])
      setMembersLoaded(false)
      setSkillsLoaded(false)

      try {
        const result = await fetchTeamWorkspaceBase(currentTeamId, user?.id ?? null)
        if (!isMounted) return
        setBaseData(result)
        setSkills(result.skills)
        setSkillsLoaded(true)
      } catch (error: unknown) {
        if (!isMounted) return

        const detail =
          error instanceof Error
            ? error.message
            : typeof error === 'object' && error !== null && 'message' in error
              ? String((error as { message?: unknown }).message ?? '')
              : ''

        setBaseError(detail ? `팀 정보를 불러오지 못했습니다. (${detail})` : '팀 정보를 불러오지 못했습니다.')
      } finally {
        if (isMounted) {
          setIsBaseLoading(false)
        }
      }
    }

    void loadBaseData()

    return () => {
      isMounted = false
    }
  }, [teamId, user?.id])

  useEffect(() => {
    if (!teamId || !baseData?.team) {
      return
    }

    const currentTeamId = teamId
    let isMounted = true

    async function loadTabData() {
      setTabError('')

      try {
        if (activeTab === 'overview') {
          const jobs: Array<Promise<void>> = []

          if (!membersLoaded) {
            jobs.push(
              fetchTeamMembers(currentTeamId).then((data) => {
                if (!isMounted) return
                setMembers(data)
                setMembersLoaded(true)
              }),
            )
          }

          if (!skillsLoaded) {
            jobs.push(
              fetchTeamSkillTags(currentTeamId).then((data) => {
                if (!isMounted) return
                setSkills(data)
                setSkillsLoaded(true)
              }),
            )
          }

          if (jobs.length > 0) {
            setIsTabLoading(true)
            await Promise.all(jobs)
          }

          return
        }

        if ((activeTab === 'members' || activeTab === 'tasks' || activeTab === 'pm') && !membersLoaded) {
          setIsTabLoading(true)
          const data = await fetchTeamMembers(currentTeamId)
          if (!isMounted) return
          setMembers(data)
          setMembersLoaded(true)
        }
      } catch (error) {
        if (!isMounted) return
        setTabError(error instanceof Error ? error.message : '탭 데이터를 불러오지 못했습니다.')
      } finally {
        if (isMounted) {
          setIsTabLoading(false)
        }
      }
    }

    void loadTabData()

    return () => {
      isMounted = false
    }
  }, [activeTab, baseData?.team, membersLoaded, skillsLoaded, teamId])

  const tasks = useMemo<TeamTaskItem[]>(() => [], [])
  const isLeader = baseData?.team?.leader_id === user?.id || baseData?.current_user_role === 'leader'
  const leaderName = baseData?.leader?.full_name || baseData?.leader?.email || baseData?.leader?.id || '팀 리더'

  function openPMAssistantTab(tab: PMAssistantTabKey) {
    if (!teamId) return
    setActiveTab('pm')
    navigate(`/teams/${teamId}?tab=pm&assistant=${tab}`)
  }

  function openWorkspaceTab(tab: TeamWorkspaceTabKey) {
    setActiveTab(tab)
  }

  if (isBaseLoading) {
    return (
      <section className="space-y-6">
        <Card>
          <p className="text-sm text-campus-600">워크스페이스 정보를 불러오는 중입니다...</p>
        </Card>
      </section>
    )
  }

  if (baseError) {
    return (
      <section className="space-y-6">
        <Card className="space-y-3 border-rose-200 bg-rose-50">
          <h1 className="font-display text-2xl text-campus-900">워크스페이스</h1>
          <p className="text-sm text-rose-600">{baseError}</p>
          <div>
            <Button variant="ghost" asChild>
              <Link to="/teams">팀 목록으로 돌아가기</Link>
            </Button>
          </div>
        </Card>
      </section>
    )
  }

  if (!baseData?.team) {
    return (
      <section className="space-y-6">
        <Card>
          <p className="text-sm text-campus-600">존재하지 않는 팀이거나 접근 권한이 없습니다.</p>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      {activeTab !== 'overview' && (
        <TeamHeaderFallback
          teamName={baseData.team.name}
          leaderName={leaderName}
          isLeader={Boolean(isLeader)}
          onOpenPM={() => openPMAssistantTab('direction')}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[220px,1fr]">
        <Card className="h-fit">
          <TeamTabs activeTab={activeTab} onChange={setActiveTab} />
        </Card>

        <div className="space-y-4">
          {tabError && activeTab !== 'overview' && (
            <Card className="border-rose-200 bg-rose-50">
              <p className="text-sm text-rose-600">{tabError}</p>
            </Card>
          )}

          {activeTab !== 'overview' && !tabError && isTabLoading ? (
            <Card>
              <p className="text-sm text-campus-600">탭 데이터를 불러오는 중입니다...</p>
            </Card>
          ) : (
            <>
              {activeTab === 'overview' && (
                <TeamOverviewTab
                  team={baseData.team}
                  leader={baseData.leader}
                  members={members}
                  skills={skills}
                  tasks={tasks}
                  isLoading={isTabLoading}
                  errorMessage={tabError}
                  isLeader={Boolean(isLeader)}
                  currentUserId={user?.id ?? null}
                  onOpenMembers={() => openWorkspaceTab('members')}
                  onTeamUpdated={({ team, skills: nextSkills }) => {
                    setBaseData((prev) => (prev ? { ...prev, team, skills: nextSkills } : prev))
                    setSkills(nextSkills)
                    setSkillsLoaded(true)
                  }}
                />
              )}

              {activeTab === 'members' && <TeamMembersTab members={members} isLeader={Boolean(isLeader)} />}

              {activeTab === 'tasks' && teamId && (
                <div className="space-y-4">
                  <ProjectDirectionOverviewPanel
                    teamId={teamId}
                    currentUserId={user?.id ?? null}
                    title="AI 방향 제안"
                    subtitle="현재 팀 상태를 바탕으로 다음 액션을 제안합니다. 필요하면 바로 PM Assistant 탭으로 이동할 수 있습니다."
                    emptyActionLabel="방향 제안 열기"
                    collapsible
                    defaultCollapsed
                    onOpenAssistant={() => openPMAssistantTab('direction')}
                    onOpenTasks={() => openWorkspaceTab('tasks')}
                    onOpenCalendar={() => openWorkspaceTab('calendar')}
                  />
                  <TeamTasksTab
                    teamId={teamId}
                    currentUserId={user?.id ?? null}
                    currentUserRole={(baseData.current_user_role ?? null) as TeamMemberRole | null}
                    members={members}
                  />
                </div>
              )}

              {activeTab === 'calendar' && teamId && (
                <TeamCalendarTab
                  teamId={teamId}
                  currentUserId={user?.id ?? null}
                  isLeader={Boolean(isLeader)}
                />
              )}

              {activeTab === 'pm' && teamId && (
                <TeamPMTab
                  teamId={teamId}
                  currentUserId={user?.id ?? null}
                  isLeader={Boolean(isLeader)}
                  members={members}
                  onOpenTasks={() => openWorkspaceTab('tasks')}
                  onOpenCalendar={() => openWorkspaceTab('calendar')}
                  initialTab={initialAssistantTab}
                />
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
