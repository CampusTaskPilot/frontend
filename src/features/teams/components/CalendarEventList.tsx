import { CalendarEventCard } from './CalendarEventCard'
import type { TeamCalendarEventGroup, TeamCalendarEventRecord } from '../types/team'

function formatDateHeading(value: string) {
  const [year, month, day] = value.split('-').map((part) => Number(part))

  if (!year || !month || !day) {
    return value
  }

  return `${year}. ${month}. ${day}.`
}

interface CalendarEventListProps {
  groups: TeamCalendarEventGroup[]
  isLeader: boolean
  onEdit: (event: TeamCalendarEventRecord) => void
  isSelectionMode?: boolean
  selectedEventIds?: string[]
  onSelectToggle?: (eventId: string, checked: boolean) => void
  onDelete?: (event: TeamCalendarEventRecord) => void
}

export function CalendarEventList({
  groups,
  isLeader,
  onEdit,
  isSelectionMode = false,
  selectedEventIds = [],
  onSelectToggle,
  onDelete,
}: CalendarEventListProps) {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.date} className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="font-display text-2xl text-campus-900">{formatDateHeading(group.date)}</h3>
            <div className="h-px flex-1 bg-campus-200" />
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {group.events.map((event) => (
              <CalendarEventCard
                key={event.id}
                event={event}
                isLeader={isLeader}
                onEdit={onEdit}
                isSelectionMode={isSelectionMode}
                isSelected={selectedEventIds.includes(event.id)}
                onSelectToggle={onSelectToggle}
                onDelete={onDelete}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
