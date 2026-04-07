import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/useAuth'
import { DashboardAssignedTaskSection } from '../features/dashboard/components/DashboardAssignedTaskSection'
import { DashboardScheduleSection } from '../features/dashboard/components/DashboardScheduleSection'
import { TodayRecommendationCard } from '../features/dashboard/components/TodayRecommendationCard'
import { WorkSummaryCard } from '../features/dashboard/components/WorkSummaryCard'
import { useDashboardSchedule } from '../features/dashboard/hooks/useDashboardSchedule'
import { useDashboardTasks } from '../features/dashboard/hooks/useDashboardTasks'

export function MainDashboard() {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const metadata = user?.user_metadata as { full_name?: string; workspace_name?: string } | undefined
  const displayName = metadata?.full_name ?? user?.email?.split('@')[0] ?? '사용자'
  const workspaceName = metadata?.workspace_name ?? '기본 워크스페이스'

  const {
    visibleAssignedTasks,
    activeTaskCount,
    summary,
    isLoading: isTasksLoading,
    errorMessage: tasksErrorMessage,
  } = useDashboardTasks(userId)

  const {
    upcomingSchedule,
    isLoading: isScheduleLoading,
    errorMessage: scheduleErrorMessage,
  } = useDashboardSchedule(userId)

  return (
    <section className="page-shell">
      <Card className="page-hero overflow-hidden border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,248,255,0.94))] px-0 py-0">
        <div className="page-hero-inner xl:grid-cols-[minmax(0,1fr),auto] xl:items-end">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600 ring-1 ring-inset ring-brand-100">
              Work Home
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-2xl leading-[1.15] text-campus-900 sm:text-3xl lg:text-4xl">
                {displayName}님이 지금 해야 할 일을
                
                한눈에 확인해 보세요
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-campus-700 sm:text-base">
                {workspaceName} 기준으로 현재 할당된 업무와 가까운 일정만 자연스럽게 모아
                두었습니다.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-[1.5rem] border border-white/80 bg-white/88 p-2 shadow-sm backdrop-blur-sm">
            <Button asChild>
              <Link to="/teams">팀 보기</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/teams/create">팀 만들기</Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1.5fr),minmax(340px,0.92fr)]">
        <div className="space-y-5">
          <DashboardAssignedTaskSection
            tasks={visibleAssignedTasks}
            totalCount={activeTaskCount}
            isLoading={isTasksLoading}
            errorMessage={tasksErrorMessage}
          />
        </div>

        <div className="space-y-5">
          <TodayRecommendationCard userId={userId} />
          <DashboardScheduleSection
            items={upcomingSchedule}
            isLoading={isScheduleLoading}
            errorMessage={scheduleErrorMessage}
          />
          <WorkSummaryCard summary={summary} isLoading={isTasksLoading} />
        </div>
      </div>
    </section>
  )
}
