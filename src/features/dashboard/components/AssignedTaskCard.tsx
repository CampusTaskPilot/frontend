import { Link } from 'react-router-dom'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { getDashboardTaskPreviewTodos, isTodayDateValue } from '../lib/dashboardSelectors'
import type { DashboardAssignedTask } from '../types'

interface AssignedTaskCardProps {
  task: DashboardAssignedTask
}

function statusLabel(status: DashboardAssignedTask['status']) {
  if (status === 'in_progress') return '진행 중'
  if (status === 'done') return '완료'
  return '시작 전'
}

function statusBadgeClass(status: DashboardAssignedTask['status']) {
  if (status === 'in_progress') {
    return 'bg-brand-50 text-brand-600 ring-brand-100'
  }

  if (status === 'done') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  }

  return 'bg-campus-100 text-campus-700 ring-campus-200'
}

function priorityLabel(priority: DashboardAssignedTask['priority']) {
  if (priority === 'high') return '높음'
  if (priority === 'low') return '낮음'
  return '보통'
}

function priorityBadgeClass(priority: DashboardAssignedTask['priority']) {
  if (priority === 'high') {
    return 'bg-rose-50 text-rose-700 ring-rose-200'
  }

  if (priority === 'low') {
    return 'bg-campus-100 text-campus-600 ring-campus-200'
  }

  return 'bg-amber-50 text-amber-700 ring-amber-200'
}

function formatDueDate(value: string | null) {
  if (!value) return '마감일 미정'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return '마감일 미정'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(date)
}

export function AssignedTaskCard({ task }: AssignedTaskCardProps) {
  const previewTodos = getDashboardTaskPreviewTodos(task.todos)
  const hiddenCount = Math.max(task.todos.length - previewTodos.length, 0)

  return (
    <Link to={`/teams/${task.team_id}?tab=tasks`} className="block h-full">
      <Card className="group h-full rounded-[30px] border-campus-200 bg-white/95 p-5 transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-[0_24px_48px_rgba(53,93,255,0.12)]">
        <div className="space-y-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <div className="min-w-0 space-y-2">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
                {task.team?.name ?? '팀 미지정'}
              </p>
              <h3 className="line-clamp-2 text-lg font-semibold leading-7 text-campus-900 transition group-hover:text-brand-600">
                {task.title}
              </h3>
            </div>
            <span
              className={cn(
                'inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
                statusBadgeClass(task.status),
              )}
            >
              {statusLabel(task.status)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset',
                priorityBadgeClass(task.priority),
              )}
            >
              우선순위 {priorityLabel(task.priority)}
            </span>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset',
                isTodayDateValue(task.due_date)
                  ? 'bg-rose-50 text-rose-700 ring-rose-200'
                  : 'bg-white text-campus-600 ring-campus-200',
              )}
            >
              {isTodayDateValue(task.due_date) ? '오늘 마감' : formatDueDate(task.due_date)}
            </span>
          </div>

          <p className="line-clamp-2 text-sm leading-6 text-campus-600">
            {task.description?.trim() ||
              task.team?.summary ||
              '설명이 아직 없습니다. 팀 워크스페이스에서 목적이나 결과물을 정리해 두면 업무 맥락을 더 빠르게 파악할 수 있습니다.'}
          </p>

          <div className="rounded-[26px] border border-campus-200 bg-campus-50 px-4 py-3 transition-colors group-hover:border-rose-200/80 group-hover:bg-rose-50/40">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-campus-500">
              Todo Preview
            </p>

            {previewTodos.length === 0 ? (
              <p className="mt-2 text-sm text-campus-500">아직 연결된 Todo가 없습니다.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {previewTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className={cn(
                      'flex items-center gap-2 rounded-2xl px-2.5 py-1.5 text-sm transition-colors',
                      todo.is_done
                        ? 'text-campus-700'
                        : 'border border-rose-200/80 bg-rose-50/80 text-rose-700 group-hover:border-rose-300/80 group-hover:bg-rose-100/70',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2.5 w-2.5 rounded-full',
                        todo.is_done ? 'bg-emerald-400' : 'bg-rose-400',
                      )}
                    />
                    <span
                      className={cn(
                        'truncate',
                        !todo.is_done && 'text-rose-700',
                        todo.is_done && 'text-campus-500 line-through',
                      )}
                    >
                      {todo.content}
                    </span>
                  </div>
                ))}
                {hiddenCount > 0 && <p className="text-xs text-campus-500">+{hiddenCount} more</p>}
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  )
}
