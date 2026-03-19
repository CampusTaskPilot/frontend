import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/AuthContext'
import { TeamCalendarTab } from '../features/teams/components/TeamCalendarTab'
import { TeamHeader } from '../features/teams/components/TeamHeader'
import { TeamMembersTab } from '../features/teams/components/TeamMembersTab'
import { TeamOverviewTab } from '../features/teams/components/TeamOverviewTab'
import { TeamPMTab } from '../features/teams/components/TeamPMTab'
import { TeamTabs, type TeamWorkspaceTabKey } from '../features/teams/components/TeamTabs'
import { TeamTasksTab } from '../features/teams/components/TeamTasksTab'
import { getMockCalendar, getMockTasks } from '../features/teams/data/mockWorkspace'
import {
  fetchTeamMembers,
  fetchTeamSkillTags,
  fetchTeamWorkspaceBase,
} from '../features/teams/lib/teams'
import type {
  TeamMemberWithProfile,
  TeamSkillTag,
  TeamWorkspaceBase,
} from '../features/teams/types/team'

export function TeamWorkspacePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<TeamWorkspaceTabKey>('overview')
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
    if (!teamId) {
      setBaseError('유효하지 않은 팀 경로입니다.')
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
      } catch (error: unknown) {
        if (!isMounted) return
      
        let detail = ''
      
        if (error instanceof Error) {
          detail = error.message
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
          detail = String((error as any).message)
        }
      
        setBaseError(
          detail
            ? `팀 정보를 불러오지 못했습니다. (${detail})`
            : '팀 정보를 불러오지 못했습니다.'
        )
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
    if (!teamId || !baseData?.team) return
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

        if (activeTab === 'members' && !membersLoaded) {
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

  const tasks = useMemo(() => (teamId ? getMockTasks(teamId) : []), [teamId])
  const schedules = useMemo(() => (teamId ? getMockCalendar(teamId) : []), [teamId])

  const isLeader = baseData?.team?.leader_id === user?.id || baseData?.current_user_role === 'leader'
  const leaderName =
    baseData?.leader?.full_name || baseData?.leader?.email || baseData?.leader?.id || '미지정'

  if (isBaseLoading) {
    return (
      <section className="space-y-6">
        <Card>
          <p className="text-sm text-campus-600">팀 워크스페이스를 준비하는 중입니다...</p>
        </Card>
      </section>
    )
  }

  if (baseError) {
    return (
      <section className="space-y-6">
        <Card className="space-y-3 border-rose-200 bg-rose-50">
          <h1 className="font-display text-2xl text-campus-900">팀 워크스페이스</h1>
          <p className="text-sm text-rose-600">{baseError}</p>
          <div>
            <Button variant="ghost" asChild>
              <Link to="/teams">팀 목록으로</Link>
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
          <p className="text-sm text-campus-600">팀 정보를 찾을 수 없습니다.</p>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <TeamHeader
        team={baseData.team}
        leaderName={leaderName}
        isLeader={isLeader}
        onOpenPM={() => setActiveTab('pm')}
      />

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
                  members={members}
                  skills={skills}
                  tasks={tasks}
                  isLoading={isTabLoading}
                  errorMessage={tabError}
                  isLeader={isLeader}
                  onOpenMembers={() => setActiveTab('members')}
                />
              )}
              {activeTab === 'members' && <TeamMembersTab members={members} isLeader={isLeader} />}
              {activeTab === 'tasks' && <TeamTasksTab tasks={tasks} />}
              {activeTab === 'calendar' && <TeamCalendarTab schedules={schedules} />}
              {activeTab === 'pm' && <TeamPMTab />}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
