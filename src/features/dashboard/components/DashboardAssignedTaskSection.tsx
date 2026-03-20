import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { AssignedTaskCard } from './AssignedTaskCard'
import type { DashboardAssignedTask } from '../types'

interface DashboardAssignedTaskSectionProps {
  tasks: DashboardAssignedTask[]
  totalCount: number
  isLoading: boolean
  errorMessage: string
}

function DashboardTaskSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse space-y-4 rounded-[30px] p-5">
          <div className="h-3 w-24 rounded-full bg-campus-100" />
          <div className="h-6 w-2/3 rounded-full bg-campus-100" />
          <div className="h-5 w-1/2 rounded-full bg-campus-100" />
          <div className="h-4 w-full rounded-full bg-campus-100" />
          <div className="h-4 w-5/6 rounded-full bg-campus-100" />
          <div className="rounded-[26px] border border-campus-100 bg-campus-50 px-4 py-4">
            <div className="h-3 w-24 rounded-full bg-campus-100" />
            <div className="mt-3 h-3 w-full rounded-full bg-campus-100" />
            <div className="mt-2 h-3 w-4/5 rounded-full bg-campus-100" />
          </div>
        </Card>
      ))}
    </div>
  )
}

function EmptyAssignedTasks() {
  return (
    <Card className="overflow-hidden rounded-[32px] bg-gradient-to-br from-campus-50 via-white to-accent-100">
      <div className="grid gap-5 lg:grid-cols-[1.3fr,0.9fr]">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
            No Assigned Work
          </p>
          <h3 className="font-display text-3xl text-campus-900">
            지금 바로 처리해야 할 내 업무가 없습니다.
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-campus-600">
            아직 직접 맡은 업무가 없거나, 현재 배정된 일을 모두 정리한 상태입니다. 새 업무가
            배정되면 이 영역에서 우선순위가 높은 순서대로 바로 확인할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/teams">팀 둘러보기</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/teams/create">팀 만들기</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-[26px] border border-campus-200 bg-white/90 px-4 py-4">
            <p className="text-xs text-campus-500">표시 기준</p>
            <p className="mt-2 text-sm font-medium text-campus-900">
              로그인한 사용자가 실제로 맡고 있는 미완료 Task만 보여줍니다.
            </p>
          </div>
          <div className="rounded-[26px] border border-campus-200 bg-white/90 px-4 py-4">
            <p className="text-xs text-campus-500">우선순위 정리</p>
            <p className="mt-2 text-sm font-medium text-campus-900">
              마감이 빠른 업무를 먼저, 같은 마감이면 우선순위가 높은 업무를 앞에 둡니다.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function DashboardAssignedTaskSection({
  tasks,
  totalCount,
  isLoading,
  errorMessage,
}: DashboardAssignedTaskSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
            Assigned Work
          </p>
          <h2 className="mt-2 font-display text-3xl text-campus-900">내가 지금 해야 할 일</h2>
          <p className="mt-1 text-sm leading-6 text-campus-500">
            가장 먼저 확인해야 할 업무 6개만 추려서 보여줍니다.
          </p>
        </div>
        {!isLoading && totalCount > 0 && (
          <span className="inline-flex rounded-full bg-campus-100 px-3 py-1 text-xs font-medium text-campus-700 ring-1 ring-inset ring-campus-200">
            {totalCount}개
          </span>
        )}
      </div>

      {isLoading ? (
        <DashboardTaskSkeleton />
      ) : errorMessage ? (
        <Card className="rounded-[28px] border-rose-200 bg-rose-50 py-5">
          <p className="text-sm text-rose-600">{errorMessage}</p>
        </Card>
      ) : tasks.length === 0 ? (
        <EmptyAssignedTasks />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {tasks.map((task) => (
            <AssignedTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </section>
  )
}
