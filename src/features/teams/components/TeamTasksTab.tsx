import { Badge } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import type { TeamTaskItem } from '../types/team'

interface TeamTasksTabProps {
  tasks: TeamTaskItem[]
}

function statusLabel(status: TeamTaskItem['status']) {
  if (status === 'todo') return 'TODO'
  if (status === 'doing') return 'DOING'
  return 'DONE'
}

function badgeVariant(status: TeamTaskItem['status']) {
  if (status === 'done') return 'success' as const
  if (status === 'doing') return 'warning' as const
  return 'neutral' as const
}

export function TeamTasksTab({ tasks }: TeamTasksTabProps) {
  return (
    <Card className="space-y-4">
      <h2 className="font-display text-2xl text-campus-900">TODO / Task</h2>
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-500">
          등록된 업무가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col gap-2 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium text-campus-900">{task.title}</p>
                <p className="text-xs text-campus-500">담당자: {task.assignee}</p>
              </div>
              <Badge variant={badgeVariant(task.status)}>{statusLabel(task.status)}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
