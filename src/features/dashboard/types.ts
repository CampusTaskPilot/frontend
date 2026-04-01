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

export interface DashboardTodayRecommendationItem {
  todo_id: string
  task_id: string
  team_id: string
  todo_content: string
  task_title: string
  priority: TeamTaskPriority
  due_date: string | null
  is_done: boolean
  task_status: TeamTaskStatus
  is_overdue: boolean
  is_due_today: boolean
}

export interface DashboardTodayRecommendation {
  summary: string
  items: DashboardTodayRecommendationItem[]
}

export type DashboardTodayRecommendationStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cooldown'

export interface DashboardTodayRecommendationLog {
  id: string
  requested_by: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  recommended_count: number
  summary: string | null
  error_message: string | null
  cooldown_until: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface DashboardTodayRecommendationJobStatus {
  status: DashboardTodayRecommendationStatus
  cooldown_until: string | null
  remaining_seconds: number
  error_message: string | null
  recommended_count: number
  last_run_at: string | null
  current_job_id: string | null
  latest_log: DashboardTodayRecommendationLog | null
  recommendation: DashboardTodayRecommendation | null
}
