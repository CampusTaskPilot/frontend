import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/useAuth'
import { TeamApplicationCallout } from '../features/teams/components/TeamApplicationCallout'
import { TeamApplicationsTab } from '../features/teams/components/TeamApplicationsTab'
import { ProjectDirectionOverviewPanel } from '../features/teams/components/ProjectDirectionOverviewPanel'
import { TeamCalendarTab } from '../features/teams/components/TeamCalendarTab'
import { TeamMembersTab } from '../features/teams/components/TeamMembersTab'
import { TeamOverviewTab } from '../features/teams/components/TeamOverviewTab'
import { TeamPMTab, type PMAssistantTabKey } from '../features/teams/components/TeamPMTab'
import {
  TeamTabs,
  getAccessibleTeamWorkspaceTab,
  getVisibleTeamWorkspaceTabs,
  parseTeamWorkspaceTab,
  type TeamWorkspaceTabKey,
} from '../features/teams/components/TeamTabs'
import { TeamTasksTab } from '../features/teams/components/TeamTasksTab'
import {
  acceptTeamApplication,
  TeamApplicationApiError,
  fetchTeamApplicationAnalysis,
  fetchMyTeamApplication,
  fetchTeamApplications,
  rejectTeamApplication,
  requestTeamApplicationAnalysis,
  submitTeamApplication,
} from '../features/teams/lib/teamApplications'
import { TeamMemberManagementApiError, removeTeamMember } from '../features/teams/lib/teamMemberManagement'
import {
  deleteTeam,
  fetchTeamMembers,
  fetchTeamSkillTags,
  fetchTeamWorkspaceBase,
  notifyTeamsUpdated,
} from '../features/teams/lib/teams'
import { supabase } from '../lib/supabase'
import type {
  TeamApplicationMutationResult,
  TeamApplicationAnalysisLookupRecord,
  TeamApplicationSummaryRecord,
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
            {isLeader ? '가 이 워크스페이스를 관리 중입니다.' : '의 현재 팀 작업 공간입니다.'}
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
  const { session, user } = useAuth()

  const requestedTab = parseTeamWorkspaceTab(searchParams.get('tab'))
  const requestedAssistant = searchParams.get('assistant')
  const initialAssistantTab: PMAssistantTabKey =
    requestedAssistant === 'meeting-actionizer' || requestedAssistant === 'report-writer' || requestedAssistant === 'direction'
      ? requestedAssistant
      : 'direction'

  const [activeTab, setActiveTab] = useState<TeamWorkspaceTabKey>(requestedTab)
  const [baseData, setBaseData] = useState<TeamWorkspaceBase | null>(null)
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([])
  const [skills, setSkills] = useState<TeamSkillTag[]>([])
  const [applications, setApplications] = useState<TeamApplicationSummaryRecord[]>([])
  const [applicationAnalysisById, setApplicationAnalysisById] = useState<Record<string, TeamApplicationAnalysisLookupRecord>>({})
  const [myApplication, setMyApplication] = useState<TeamApplicationSummaryRecord | null>(null)
  const [isBaseLoading, setIsBaseLoading] = useState(true)
  const [isTabLoading, setIsTabLoading] = useState(false)
  const [isApplicationLoading, setIsApplicationLoading] = useState(false)
  const [baseError, setBaseError] = useState('')
  const [tabError, setTabError] = useState('')
  const [applicationFeedback, setApplicationFeedback] = useState('')
  const [applicationError, setApplicationError] = useState('')
  const [membersLoaded, setMembersLoaded] = useState(false)
  const [skillsLoaded, setSkillsLoaded] = useState(false)
  const [applicationsLoaded, setApplicationsLoaded] = useState(false)
  const [memberActionSuccess, setMemberActionSuccess] = useState('')
  const [memberActionError, setMemberActionError] = useState('')
  const [pendingMemberId, setPendingMemberId] = useState<string | null>(null)
  const [pendingApplicationId, setPendingApplicationId] = useState<string | null>(null)
  const [isDeletingTeam, setIsDeletingTeam] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('')
  const applicationAnalysisRequestsRef = useRef<Map<string, Promise<TeamApplicationAnalysisLookupRecord | null>>>(new Map())

  useEffect(() => {
    setActiveTab(requestedTab)
  }, [requestedTab])

  useEffect(() => {
    if (!teamId) {
      setBaseError('팀 정보를 불러올 수 없습니다.')
      setIsBaseLoading(false)
      return
    }

    let isMounted = true
    const currentTeamId = teamId

    async function loadBaseData() {
      setIsBaseLoading(true)
      setBaseError('')
      setApplicationFeedback('')
      setApplicationError('')
      setMemberActionSuccess('')
      setMemberActionError('')
      setDeleteErrorMessage('')
      applicationAnalysisRequestsRef.current.clear()
      setMembers([])
      setSkills([])
      setApplications([])
      setApplicationAnalysisById({})
      setMyApplication(null)
      setMembersLoaded(false)
      setSkillsLoaded(false)
      setApplicationsLoaded(false)

      try {
        const [result, myApplicationResult] = await Promise.all([
          fetchTeamWorkspaceBase(currentTeamId, user?.id ?? null),
          user
            ? fetchMyTeamApplication({
                teamId: currentTeamId,
                userId: user.id,
              }).catch((error) => {
                console.error('Failed to load my application', error)
                return null
              })
            : Promise.resolve(null),
        ])
        if (!isMounted) return
        setBaseData(result)
        setSkills(result.skills)
        setSkillsLoaded(true)
        setMyApplication(result.is_current_user_member ? null : myApplicationResult)
      } catch (error) {
        if (!isMounted) return
        setBaseError(error instanceof Error ? error.message : '팀 정보를 불러오지 못했습니다.')
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

  const isTeamMember = baseData?.is_current_user_member ?? false
  const canManageApplications = baseData?.can_manage_applications ?? false
  const resolvedActiveTab = getAccessibleTeamWorkspaceTab(activeTab, isTeamMember, canManageApplications)
  const visibleTabs = getVisibleTeamWorkspaceTabs(isTeamMember, canManageApplications)

  useEffect(() => {
    if (!teamId || !baseData?.team) {
      return
    }

    const correctedRequestedTab = getAccessibleTeamWorkspaceTab(requestedTab, isTeamMember, canManageApplications)
    const shouldStripAssistant = correctedRequestedTab !== 'pm' && searchParams.has('assistant')
    const shouldReplaceUrl = correctedRequestedTab !== requestedTab || shouldStripAssistant

    if (activeTab !== correctedRequestedTab) {
      setActiveTab(correctedRequestedTab)
    }

    if (!shouldReplaceUrl) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('tab', correctedRequestedTab)
    if (correctedRequestedTab !== 'pm') {
      nextSearchParams.delete('assistant')
    }

    navigate(
      {
        pathname: `/teams/${teamId}`,
        search: `?${nextSearchParams.toString()}`,
      },
      { replace: true },
    )
  }, [activeTab, baseData?.team, canManageApplications, isTeamMember, navigate, requestedTab, searchParams, teamId])

  useEffect(() => {
    if (!teamId || !baseData?.team) {
      return
    }

    let isMounted = true
    const currentTeamId = teamId

    async function loadTabData() {
      setTabError('')

      try {
        if (resolvedActiveTab === 'overview') {
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

        if ((resolvedActiveTab === 'members' || resolvedActiveTab === 'tasks' || resolvedActiveTab === 'pm') && !membersLoaded) {
          setIsTabLoading(true)
          const data = await fetchTeamMembers(currentTeamId)
          if (!isMounted) return
          setMembers(data)
          setMembersLoaded(true)
        }

        if (resolvedActiveTab === 'applications' && canManageApplications && !applicationsLoaded) {
          setIsApplicationLoading(true)
          const data = await fetchTeamApplications({
            teamId: currentTeamId,
          })
          if (!isMounted) return
          setApplications(data)
          setApplicationsLoaded(true)
        }
      } catch (error) {
        if (!isMounted) return
        setTabError(error instanceof Error ? error.message : '데이터를 불러오지 못했습니다.')
      } finally {
        if (isMounted) {
          setIsTabLoading(false)
          setIsApplicationLoading(false)
        }
      }
    }

    void loadTabData()
    return () => {
      isMounted = false
    }
  }, [
    applicationsLoaded,
    baseData?.team,
    canManageApplications,
    membersLoaded,
    resolvedActiveTab,
    skillsLoaded,
    teamId,
  ])

  useEffect(() => {
    if (!teamId || !user?.id || !baseData?.team) {
      return
    }

    const channel = supabase
      .channel(`team-applications:${teamId}:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_applications',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          if (!isTeamMember) {
            void fetchMyTeamApplication({ teamId, userId: user.id })
              .then((data) => {
                setMyApplication(data)
              })
              .catch((error) => {
                console.error('Failed to sync my application', error)
              })
          }

          if (canManageApplications && applicationsLoaded) {
            void fetchTeamApplications({ teamId })
              .then((data) => {
                setApplications(data)
              })
              .catch((error) => {
                console.error('Failed to sync team applications', error)
              })
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [applicationsLoaded, baseData?.team, canManageApplications, isTeamMember, teamId, user?.id])

  useEffect(() => {
    if (!teamId || !baseData?.team) {
      return
    }

    const trackedApplicationIds = new Set<string>([
      ...applications.map((application) => application.id),
      ...(myApplication ? [myApplication.id] : []),
    ])

    if (trackedApplicationIds.size === 0) {
      return
    }

    const channel = supabase
      .channel(`team-application-analyses:${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_application_ai_analyses',
        },
        (payload) => {
          const nextApplicationId = String(
            (payload.new as { application_id?: string } | null)?.application_id ??
              (payload.old as { application_id?: string } | null)?.application_id ??
              '',
          )

          if (!trackedApplicationIds.has(nextApplicationId)) {
            return
          }

          setApplicationAnalysisById((current) => {
            if (!current[nextApplicationId]) {
              return current
            }

            const next = { ...current }
            delete next[nextApplicationId]
            return next
          })

          if (canManageApplications && applicationsLoaded) {
            void fetchTeamApplications({ teamId })
              .then((data) => {
                setApplications(data)
              })
              .catch((error) => {
                console.error('Failed to sync application analysis summary', error)
              })
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [applications, applicationsLoaded, baseData?.team, canManageApplications, myApplication, teamId])

  const tasks = useMemo<TeamTaskItem[]>(() => [], [])
  const isLeader = baseData?.team?.leader_id === user?.id || baseData?.current_user_role === 'leader'
  const leaderName = baseData?.leader?.full_name || baseData?.leader?.email || baseData?.leader?.id || '팀 리더'

  async function reloadMembers(currentTeamId: string) {
    const data = await fetchTeamMembers(currentTeamId)
    setMembers(data)
    setMembersLoaded(true)
  }

  function applyApplicationMutationResult(result: TeamApplicationMutationResult) {
    setApplications((current) =>
      current.map((item) =>
        item.id === result.application_id
          ? {
              ...item,
              status: result.status,
              reviewed_at: result.reviewed_at,
              reviewed_by_user_id: result.reviewed_by_user_id,
              review_note: result.review_note,
            }
          : item,
      ),
    )
    setMyApplication((current) =>
      current?.id === result.application_id
        ? {
            ...current,
            status: result.status,
            reviewed_at: result.reviewed_at,
            reviewed_by_user_id: result.reviewed_by_user_id,
            review_note: result.review_note,
          }
        : current,
    )
  }

  function applyApplicationSummaryUpdate(updated: TeamApplicationSummaryRecord) {
    setApplications((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    setMyApplication((current) => (current?.id === updated.id ? updated : current))
    setApplicationAnalysisById((current) => {
      if (!current[updated.id]) {
        return current
      }

      return {
        ...current,
        [updated.id]: updated.analysis
          ? {
              ...current[updated.id],
              ...updated.analysis,
              details_available:
                current[updated.id]?.details_available &&
                ['completed', 'failed', 'insufficient_data'].includes(updated.analysis.status),
            }
          : current[updated.id],
      }
    })
  }

  function applyApplicationAnalysisUpdate(applicationId: string, analysis: TeamApplicationAnalysisLookupRecord) {
    setApplicationAnalysisById((current) => ({
      ...current,
      [applicationId]: analysis,
    }))
    setApplications((current) =>
      current.map((item) =>
        item.id === applicationId
          ? {
              ...item,
              analysis: {
                id: analysis.id,
                application_id: analysis.application_id,
                status: analysis.status,
                trigger_source: analysis.trigger_source,
                suitability_level: analysis.suitability_level,
                one_line_summary: analysis.one_line_summary,
                confidence: analysis.confidence,
                attempt_count: analysis.attempt_count,
                queued_at: analysis.queued_at,
                started_at: analysis.started_at,
                completed_at: analysis.completed_at,
                failed_at: analysis.failed_at,
                last_error: analysis.last_error,
                updated_at: analysis.updated_at,
              },
            }
          : item,
      ),
    )
  }

  async function refreshApplicationAnalysis(applicationId: string) {
    const inFlight = applicationAnalysisRequestsRef.current.get(applicationId)
    if (inFlight) {
      return inFlight
    }

    const request = (async () => {
      const analysis = await fetchTeamApplicationAnalysis({
        applicationId,
      })
      applyApplicationAnalysisUpdate(applicationId, analysis)
      return analysis
    })()

    applicationAnalysisRequestsRef.current.set(applicationId, request)

    try {
      return await request
    } finally {
      applicationAnalysisRequestsRef.current.delete(applicationId)
    }
  }

  async function handleSubmitApplication(message: string) {
    if (!teamId || !user?.id) {
      return
    }

    setApplicationError('')
    setApplicationFeedback('')

    try {
      const application = await submitTeamApplication({
        teamId,
        applicantUserId: user.id,
        applicantMessage: message,
      })
      setMyApplication(application)
      setApplicationFeedback('신청이 바로 저장되었습니다.')

      if (session?.access_token) {
        void requestTeamApplicationAnalysis({
          applicationId: application.id,
          accessToken: session.access_token,
          triggerSource: 'on_apply',
        }).catch((error) => {
          console.error('Failed to trigger team application analysis', error)
        })
      }
    } catch (error) {
      if (error instanceof TeamApplicationApiError) {
        setApplicationError(error.message)
        return
      }
      setApplicationError(error instanceof Error ? error.message : 'Failed to submit the team application.')
    }
  }

  async function handleUpdateApplicationStatus(application: TeamApplicationSummaryRecord, statusValue: 'accepted' | 'rejected') {
    if (!teamId) {
      return
    }

    setPendingApplicationId(application.id)
    setApplicationError('')
    setApplicationFeedback('')

    try {
      const updated =
        statusValue === 'accepted'
          ? await acceptTeamApplication({
              applicationId: application.id,
            })
          : await rejectTeamApplication({
              applicationId: application.id,
            })
      applyApplicationMutationResult(updated)
      const reloadJobs: Array<Promise<unknown>> = [
        fetchTeamApplications({ teamId }).then((data) => {
          setApplications(data)
          setApplicationsLoaded(true)
        }),
      ]

      if (statusValue === 'accepted') {
        reloadJobs.push(
          reloadMembers(teamId).then(() => {
            notifyTeamsUpdated()
          }),
        )
      }

      try {
        await Promise.all(reloadJobs)
      } catch (refreshError) {
        console.error('Failed to refresh application management state', refreshError)
      }
      setApplicationFeedback(updated.message)
    } catch (error) {
      setApplicationError(error instanceof Error ? error.message : 'Failed to update the application status.')
    } finally {
      setPendingApplicationId(null)
    }
  }

  async function handleEnsureAnalysis(
    application: TeamApplicationSummaryRecord,
    triggerSource: 'on_first_view' | 'manual_retry' = 'on_first_view',
  ) {
    if (!session?.access_token) {
      return
    }

    setPendingApplicationId(application.id)
    setApplicationError('')

    try {
      const response = await requestTeamApplicationAnalysis({
        applicationId: application.id,
        accessToken: session.access_token,
        triggerSource,
      })
      applyApplicationSummaryUpdate(response.application)
      setApplicationAnalysisById((current) => {
        if (!current[application.id]) {
          return current
        }
        const next = { ...current }
        delete next[application.id]
        return next
      })
    } catch (error) {
      setApplicationError(error instanceof Error ? error.message : 'AI 분석을 다시 요청하지 못했습니다.')
    } finally {
      setPendingApplicationId(null)
    }
  }

  async function handleMemberAction(member: TeamMemberWithProfile, action: 'remove' | 'leave') {
    if (!teamId || !session?.access_token) {
      setMemberActionError('로그인이 필요합니다.')
      return
    }

    setPendingMemberId(member.id)
    setMemberActionSuccess('')
    setMemberActionError('')

    try {
      const result = await removeTeamMember({
        teamId,
        memberId: member.id,
        accessToken: session.access_token,
      })

      if (action === 'leave' || result.action === 'left') {
        navigate('/teams', {
          replace: true,
          state: {
            feedbackMessage: result.message,
          },
        })
        return
      }

      await reloadMembers(teamId)
      setMemberActionSuccess(result.message)
    } catch (error) {
      if (error instanceof TeamMemberManagementApiError) {
        setMemberActionError(error.message)
      } else {
        setMemberActionError(error instanceof Error ? error.message : '멤버 작업을 완료하지 못했습니다.')
      }
    } finally {
      setPendingMemberId(null)
    }
  }

  async function handleDeleteTeam() {
    if (!teamId || !isLeader || isDeletingTeam) {
      return
    }

    setIsDeletingTeam(true)
    setDeleteErrorMessage('')

    try {
      const deleted = await deleteTeam(teamId)
      navigate('/teams', {
        replace: true,
        state: { feedbackMessage: `${deleted.name} 팀을 삭제했습니다.` },
      })
    } catch (error) {
      setDeleteErrorMessage(error instanceof Error ? error.message : '팀 삭제에 실패했습니다.')
    } finally {
      setIsDeletingTeam(false)
    }
  }

  function openPMAssistantTab(tab: PMAssistantTabKey) {
    if (!teamId) return
    if (!isTeamMember) {
      openWorkspaceTab('overview')
      return
    }
    setActiveTab('pm')
    navigate(`/teams/${teamId}?tab=pm&assistant=${tab}`)
  }

  function openWorkspaceTab(tab: TeamWorkspaceTabKey) {
    if (!teamId) return

    const nextTab = getAccessibleTeamWorkspaceTab(tab, isTeamMember, canManageApplications)
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('tab', nextTab)
    if (nextTab !== 'pm') {
      nextSearchParams.delete('assistant')
    }

    setActiveTab(nextTab)
    navigate({
      pathname: `/teams/${teamId}`,
      search: `?${nextSearchParams.toString()}`,
    })
  }

  if (isBaseLoading) {
    return (
      <section className="page-shell">
        <Card>
          <p className="text-sm text-campus-600">워크스페이스 정보를 불러오는 중…</p>
        </Card>
      </section>
    )
  }

  if (baseError) {
    return (
      <section className="page-shell">
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
      <section className="page-shell">
        <Card>
          <p className="text-sm text-campus-600">존재하지 않는 팀이거나 접근 권한이 없습니다.</p>
        </Card>
      </section>
    )
  }

  return (
    <section className="page-shell">
      {resolvedActiveTab !== 'overview' && (
        <TeamHeaderFallback
          teamName={baseData.team.name}
          leaderName={leaderName}
          isLeader={Boolean(isLeader)}
          onOpenPM={() => openPMAssistantTab('direction')}
        />
      )}

      <div className="grid items-start gap-5 2xl:grid-cols-[260px,minmax(0,1fr)]">
        <Card className="h-fit 2xl:sticky 2xl:top-[calc(var(--app-header-height)+1.5rem)] 2xl:self-start">
          <TeamTabs activeTab={resolvedActiveTab} onChange={openWorkspaceTab} tabs={visibleTabs} />
        </Card>

        <div className="space-y-4">
          {tabError && resolvedActiveTab !== 'overview' ? (
            <Card className="border-rose-200 bg-rose-50">
              <p className="text-sm text-rose-600">{tabError}</p>
            </Card>
          ) : null}

          {resolvedActiveTab === 'overview' ? (
            <>
              {!isTeamMember ? (
                <TeamApplicationCallout
                  canApply={Boolean(user && !myApplication && baseData.team.is_recruiting)}
                  isSubmitting={pendingApplicationId === 'submit'}
                  application={myApplication}
                  errorMessage={applicationError}
                  successMessage={applicationFeedback}
                  onSubmit={async (message) => {
                    setPendingApplicationId('submit')
                    try {
                      await handleSubmitApplication(message)
                    } finally {
                      setPendingApplicationId(null)
                    }
                  }}
                />
              ) : null}

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
                isDeletingTeam={isDeletingTeam}
                deleteErrorMessage={deleteErrorMessage}
                onDeleteTeam={handleDeleteTeam}
                onTeamUpdated={({ team, skills: nextSkills }) => {
                  setBaseData((prev) => (prev ? { ...prev, team, skills: nextSkills } : prev))
                  setSkills(nextSkills)
                  setSkillsLoaded(true)
                }}
              />
            </>
          ) : null}

          {resolvedActiveTab === 'applications' ? (
            <TeamApplicationsTab
              applications={applications}
              applicationAnalysisById={applicationAnalysisById}
              isLoading={isApplicationLoading}
              errorMessage={applicationError}
              actionMessage={applicationFeedback}
              pendingApplicationId={pendingApplicationId}
              onRefreshAnalysis={refreshApplicationAnalysis}
              onUpdateStatus={handleUpdateApplicationStatus}
              onEnsureAnalysis={handleEnsureAnalysis}
            />
          ) : null}

          {resolvedActiveTab === 'members' ? (
            <TeamMembersTab
              members={members}
              isLeader={Boolean(isLeader)}
              currentUserId={user?.id ?? null}
              pendingMemberId={pendingMemberId}
              successMessage={memberActionSuccess}
              errorMessage={memberActionError}
              onClearMessage={() => {
                setMemberActionSuccess('')
                setMemberActionError('')
              }}
              onConfirmMemberAction={handleMemberAction}
            />
          ) : null}

          {resolvedActiveTab === 'tasks' && teamId ? (
            <div className="space-y-4">
              <ProjectDirectionOverviewPanel
                teamId={teamId}
                currentUserId={user?.id ?? null}
                title="AI 방향 제안"
                subtitle="현재 팀 상태를 기준으로 다음 액션을 제안합니다. 필요하면 바로 PM Assistant로 이동할 수 있습니다."
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
          ) : null}

          {resolvedActiveTab === 'calendar' && teamId ? (
            <TeamCalendarTab teamId={teamId} currentUserId={user?.id ?? null} isLeader={Boolean(isLeader)} />
          ) : null}

          {resolvedActiveTab === 'pm' && teamId ? (
            <TeamPMTab
              teamId={teamId}
              currentUserId={user?.id ?? null}
              isLeader={Boolean(isLeader)}
              members={members}
              onOpenTasks={() => openWorkspaceTab('tasks')}
              onOpenCalendar={() => openWorkspaceTab('calendar')}
              initialTab={initialAssistantTab}
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
