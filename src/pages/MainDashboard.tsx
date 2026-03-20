import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/AuthContext'
import { DashboardAssignedTaskSection } from '../features/dashboard/components/DashboardAssignedTaskSection'
import { DashboardScheduleSection } from '../features/dashboard/components/DashboardScheduleSection'
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
    <section className="space-y-6">
      <Card className="overflow-hidden rounded-[34px] border-campus-200 bg-gradient-to-r from-brand-50 via-white to-accent-100 px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600 ring-1 ring-inset ring-brand-100">
              Work Home
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-3xl leading-[1.15] text-campus-900 md:text-4xl">
                {displayName}님이 지금 해야 할 일을
                
                한눈에 확인해 보세요
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-campus-700 sm:text-[15px]">
                {workspaceName} 기준으로 현재 할당된 업무와 가까운 일정만 자연스럽게 모아
                두었습니다.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-[24px] border border-white/80 bg-white/75 p-2 shadow-sm backdrop-blur-sm">
            <Button asChild>
              <Link to="/teams">팀 보기</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/teams/create">팀 만들기</Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.5fr,0.9fr]">
        <div className="space-y-5">
          <DashboardAssignedTaskSection
            tasks={visibleAssignedTasks}
            totalCount={activeTaskCount}
            isLoading={isTasksLoading}
            errorMessage={tasksErrorMessage}
          />
        </div>

        <div className="space-y-5">
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
