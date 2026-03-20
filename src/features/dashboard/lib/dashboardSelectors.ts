import type {
  TeamCalendarEventType,
  TeamTaskPriority,
  TeamTodoRecord,
} from '../../teams/types/team'
import type { DashboardAssignedTask, DashboardScheduleItem } from '../types'

const priorityWeight: Record<TeamTaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function parseDateValue(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isSameDay(date: Date, target: Date) {
  return (
    date.getFullYear() === target.getFullYear() &&
    date.getMonth() === target.getMonth() &&
    date.getDate() === target.getDate()
  )
}

function timeWeight(value: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER
  const [hours = '23', minutes = '59'] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

export function isTodayDateValue(value: string | null) {
  const date = parseDateValue(value)
  if (!date) return false
  return isSameDay(date, new Date())
}

export function isActiveAssignedTask(task: DashboardAssignedTask) {
  return task.status === 'todo' || task.status === 'in_progress'
}

export function getDashboardTaskPreviewTodos(todos: TeamTodoRecord[]) {
  return [...todos]
    .sort((a, b) => {
      if (a.is_done !== b.is_done) {
        return Number(a.is_done) - Number(b.is_done)
      }
      return a.position - b.position
    })
    .slice(0, 3)
}

export function sortDashboardAssignedTasks(tasks: DashboardAssignedTask[]) {
  return [...tasks].sort((a, b) => {
    const aDue = parseDateValue(a.due_date)
    const bDue = parseDateValue(b.due_date)

    if (aDue && bDue) {
      const dueGap = aDue.getTime() - bDue.getTime()
      if (dueGap !== 0) return dueGap
    } else if (aDue && !bDue) {
      return -1
    } else if (!aDue && bDue) {
      return 1
    }

    const priorityGap = priorityWeight[a.priority] - priorityWeight[b.priority]
    if (priorityGap !== 0) return priorityGap

    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
}

export function getDashboardWorkSummary(tasks: DashboardAssignedTask[]) {
  const activeTasks = tasks.filter(isActiveAssignedTask)
  const todos = activeTasks.flatMap((task) => task.todos)

  return {
    inProgressCount: activeTasks.filter((task) => task.status === 'in_progress').length,
    dueTodayCount: activeTasks.filter((task) => isTodayDateValue(task.due_date)).length,
    highPriorityCount: activeTasks.filter((task) => task.priority === 'high').length,
    incompleteTodoCount: todos.filter((todo) => !todo.is_done).length,
  }
}

export function toCalendarEventType(value: unknown): TeamCalendarEventType {
  if (value === 'meeting' || value === 'deadline' || value === 'presentation') {
    return value
  }

  return 'general'
}

export function sortDashboardSchedule(items: DashboardScheduleItem[]) {
  return [...items].sort((a, b) => {
    if (a.event_date !== b.event_date) {
      return a.event_date.localeCompare(b.event_date)
    }

    if (a.is_all_day !== b.is_all_day) {
      return a.is_all_day ? -1 : 1
    }

    const startGap = timeWeight(a.start_time) - timeWeight(b.start_time)
    if (startGap !== 0) return startGap

    return a.created_at.localeCompare(b.created_at)
  })
}

export function getUpcomingDashboardSchedule(items: DashboardScheduleItem[], limit = 5) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return sortDashboardSchedule(items)
    .filter((item) => {
      const date = parseDateValue(item.event_date)
      if (!date) return false
      date.setHours(0, 0, 0, 0)
      return date.getTime() >= today.getTime()
    })
    .slice(0, limit)
}

export function formatDashboardScheduleTime(item: DashboardScheduleItem) {
  if (item.is_all_day) {
    return '종일'
  }

  if (item.start_time && item.end_time) {
    return `${item.start_time.slice(0, 5)} ~ ${item.end_time.slice(0, 5)}`
  }

  return '시간 미정'
}
