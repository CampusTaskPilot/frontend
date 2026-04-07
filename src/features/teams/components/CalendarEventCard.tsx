import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import type { TeamCalendarEventRecord, TeamCalendarEventType } from '../types/team'

const typeLabelMap: Record<TeamCalendarEventType, string> = {
  general: '일반',
  meeting: '회의',
  deadline: '마감',
  presentation: '발표',
}

const typeClassMap: Record<TeamCalendarEventType, string> = {
  general: 'bg-campus-100 text-campus-700 ring-campus-200',
  meeting: 'bg-sky-50 text-sky-700 ring-sky-200',
  deadline: 'bg-amber-50 text-amber-700 ring-amber-200',
  presentation: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

function formatTimeValue(value: string) {
  return value.slice(0, 5)
}

function formatTimeRange(event: TeamCalendarEventRecord) {
  if (event.is_all_day) {
    return '종일'
  }

  if (event.start_time && event.end_time) {
    return `${formatTimeValue(event.start_time)} ~ ${formatTimeValue(event.end_time)}`
  }

  return '시간 미정'
}

interface CalendarEventCardProps {
  event: TeamCalendarEventRecord
  isLeader: boolean
  onEdit: (event: TeamCalendarEventRecord) => void
  isSelectionMode?: boolean
  isSelected?: boolean
  onSelectToggle?: (eventId: string, checked: boolean) => void
  onDelete?: (event: TeamCalendarEventRecord) => void
}

export function CalendarEventCard({
  event,
  isLeader,
  onEdit,
  isSelectionMode = false,
  isSelected = false,
  onSelectToggle,
  onDelete,
}: CalendarEventCardProps) {
  return (
    <Card
      className={cn(
        'flex h-full flex-col justify-between space-y-4 border-campus-200 bg-white/90 p-5 shadow-sm',
        isSelected && 'border-rose-200 ring-1 ring-rose-100',
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isLeader && isSelectionMode && (
              <label className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(eventObject) => onSelectToggle?.(event.id, eventObject.target.checked)}
                  className="h-4 w-4 rounded border-rose-300 text-rose-500 focus:ring-rose-200"
                  aria-label={`${event.title} 삭제 선택`}
                />
                선택
              </label>
            )}
            <span
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                typeClassMap[event.type],
              )}
            >
              {typeLabelMap[event.type]}
            </span>
            <span className="inline-flex items-center rounded-full bg-campus-50 px-3 py-1 text-xs font-medium text-campus-600 ring-1 ring-inset ring-campus-200">
              {formatTimeRange(event)}
            </span>
          </div>

          <div className="space-y-1">
            <h4 className="line-clamp-2 font-display text-lg text-campus-900 sm:text-xl">{event.title}</h4>
            <p className="line-clamp-3 text-sm leading-6 text-campus-600">
              {event.description?.trim() || '설명이 아직 없습니다. 간단한 맥락을 적어두면 팀원들이 일정을 더 빨리 이해할 수 있습니다.'}
            </p>
          </div>
        </div>

        {isLeader && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(event)}>
              수정
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="border-rose-200 text-rose-600 hover:bg-rose-50"
              onClick={() => onDelete?.(event)}
              disabled={isSelectionMode}
            >
              삭제
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
