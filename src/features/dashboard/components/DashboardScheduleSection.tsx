import { Card } from '../../../components/ui/Card'
import { ScheduleItem } from './ScheduleItem'
import type { DashboardScheduleItem } from '../types'

interface DashboardScheduleSectionProps {
  items: DashboardScheduleItem[]
  isLoading: boolean
  errorMessage: string
}

function ScheduleSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="animate-pulse rounded-[28px] p-4">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded-full bg-campus-100" />
              <div className="h-6 w-24 rounded-full bg-campus-100" />
            </div>
            <div className="h-5 w-2/3 rounded-full bg-campus-100" />
            <div className="h-4 w-full rounded-full bg-campus-100" />
            <div className="h-4 w-5/6 rounded-full bg-campus-100" />
          </div>
        </Card>
      ))}
    </div>
  )
}

export function DashboardScheduleSection({
  items,
  isLoading,
  errorMessage,
}: DashboardScheduleSectionProps) {
  return (
    <Card className="space-y-4 bg-white/95">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
          Upcoming Schedule
        </p>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl text-campus-900">가까운 일정</h2>
            <p className="mt-1 text-sm leading-6 text-campus-500">
              오늘 이후의 주요 일정을 한 곳에서 빠르게 확인할 수 있습니다.
            </p>
          </div>
          <span className="inline-flex shrink-0 rounded-full bg-campus-100 px-3 py-1 text-xs font-medium text-campus-700 ring-1 ring-inset ring-campus-200">
            {isLoading ? '...' : `${items.length}개`}
          </span>
        </div>
      </div>

      {isLoading ? (
        <ScheduleSkeleton />
      ) : errorMessage ? (
        <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-4 py-5">
          <p className="text-sm text-rose-600">{errorMessage}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[28px] border border-campus-200 bg-campus-50 px-5 py-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-campus-900">가까운 일정이 없습니다</h3>
            <p className="text-sm leading-6 text-campus-500">
              오늘 이후로 등록된 일정이 아직 없습니다. 팀 캘린더에 일정을 추가하면 여기에서 먼저 보여드립니다.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ScheduleItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </Card>
  )
}
