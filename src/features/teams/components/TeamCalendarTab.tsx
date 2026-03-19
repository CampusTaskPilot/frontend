import { Card } from '../../../components/ui/Card'
import type { TeamCalendarItem } from '../types/team'

interface TeamCalendarTabProps {
  schedules: TeamCalendarItem[]
}

export function TeamCalendarTab({ schedules }: TeamCalendarTabProps) {
  return (
    <Card className="space-y-4">
      <h2 className="font-display text-2xl text-campus-900">캘린더</h2>
      {schedules.length === 0 ? (
        <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-500">
          예정된 일정이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3"
            >
              <p className="text-xs text-campus-500">{new Date(schedule.date).toLocaleDateString('ko-KR')}</p>
              <p className="mt-1 font-medium text-campus-900">{schedule.title}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
