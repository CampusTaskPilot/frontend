import type {
  TeamCalendarEventType,
  TeamTaskPriority,
  TeamTaskStatus,
  TeamTodoRecord,
} from '../teams/types/team'

export interface DashboardTeamSummary {
  id: string
  name: string
  summary: string | null
}

export interface DashboardAssignedTask {
  id: string
  team_id: string
  title: string
  description: string | null
  status: TeamTaskStatus
  priority: TeamTaskPriority
  assignee_id: string | null
  due_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  team: DashboardTeamSummary | null
  todos: TeamTodoRecord[]
}

export interface DashboardWorkSummary {
  inProgressCount: number
  dueTodayCount: number
  highPriorityCount: number
  incompleteTodoCount: number
}

export interface DashboardScheduleItem {
  id: string
  team_id: string
  title: string
  description: string | null
  type: TeamCalendarEventType
  event_date: string
  start_time: string | null
  end_time: string | null
  is_all_day: boolean
  created_by: string
  created_at: string
  updated_at: string
  team: DashboardTeamSummary | null
}
