import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { formatDashboardScheduleTime, isTodayDateValue } from '../lib/dashboardSelectors'
import type { DashboardScheduleItem as DashboardScheduleItemType } from '../types'

const typeLabelMap = {
  general: '일반',
  meeting: '회의',
  deadline: '마감',
  presentation: '발표',
} as const

function formatScheduleDate(value: string) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

interface ScheduleItemProps {
  item: DashboardScheduleItemType
}

export function ScheduleItem({ item }: ScheduleItemProps) {
  const isToday = isTodayDateValue(item.event_date)

  return (
    <Card
      className={cn(
        'rounded-[28px] border-campus-200 bg-white/95 p-4 shadow-sm',
        isToday && 'border-brand-200 bg-brand-50/40',
      )}
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {isToday && <Badge className="bg-brand-50 text-brand-700 ring-brand-200">오늘</Badge>}
          <span className="inline-flex items-center rounded-full bg-campus-100 px-3 py-1 text-xs font-medium text-campus-700 ring-1 ring-inset ring-campus-200">
            {formatScheduleDate(item.event_date)}
          </span>
          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-campus-600 ring-1 ring-inset ring-campus-200">
            {formatDashboardScheduleTime(item)}
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-campus-900">{item.title}</h3>
          <p className="line-clamp-2 text-sm leading-6 text-campus-600">
            {item.description?.trim() ||
              '설명이 아직 없습니다. 팀 캘린더에 간단한 맥락을 남겨두면 일정 이해가 훨씬 쉬워집니다.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full bg-campus-100 px-3 py-1 font-medium text-campus-700 ring-1 ring-inset ring-campus-200">
            {item.team?.name ?? '팀 미지정'}
          </span>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            {typeLabelMap[item.type]}
          </span>
        </div>
      </div>
    </Card>
  )
}
