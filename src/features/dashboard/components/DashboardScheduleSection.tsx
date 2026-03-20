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
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
          Upcoming Schedule
        </p>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-campus-900">가까운 일정</h2>
            <p className="mt-1 text-sm leading-6 text-campus-500 text-[12.5px]">
              업무 다음으로 바로 확인해야 할 오늘 일정과 다가오는 팀 일정을 모았습니다.
            </p>
          </div>
          <span className="inline-flex rounded-full bg-campus-100 px-3 py-1 text-xs font-medium text-campus-700 ring-1 ring-inset ring-campus-200 ml-auto">
            {isLoading ? '...' : `${items.length}개`}
          </span>
        </div>
      </div>

      {isLoading ? (
        <ScheduleSkeleton />
      ) : errorMessage ? (
        <Card className="rounded-[28px] border-rose-200 bg-rose-50 py-5">
          <p className="text-sm text-rose-600">{errorMessage}</p>
        </Card>
      ) : items.length === 0 ? (
        <Card className="rounded-[28px] border-campus-200 bg-white/95 py-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-campus-900">가까운 일정이 없습니다</h3>
            <p className="text-sm leading-6 text-campus-500">
              오늘 이후로 등록된 팀 일정이 아직 없습니다. 팀 워크스페이스의 캘린더 탭에서
              새 일정을 추가하면 여기에 가장 먼저 표시됩니다.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ScheduleItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
