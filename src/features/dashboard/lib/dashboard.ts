import { supabase } from '../../../lib/supabase'
import type {
  TeamTaskPriority,
  TeamTaskStatus,
  TeamTodoRecord,
} from '../../teams/types/team'
import type { DashboardAssignedTask, DashboardScheduleItem, DashboardTeamSummary } from '../types'
import { toCalendarEventType } from './dashboardSelectors'

function toTaskStatus(value: unknown): TeamTaskStatus {
  if (value === 'in_progress' || value === 'done') {
    return value
  }
  return 'todo'
}

function toTaskPriority(value: unknown): TeamTaskPriority {
  if (value === 'low' || value === 'high') {
    return value
  }
  return 'medium'
}

function toTodoRecord(value: unknown): TeamTodoRecord {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    task_id: String(row.task_id ?? ''),
    content: String(row.content ?? ''),
    is_done: Boolean(row.is_done),
    position: typeof row.position === 'number' ? row.position : 0,
    created_by: String(row.created_by ?? ''),
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  }
}

function toTeamSummary(value: unknown): DashboardTeamSummary {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    summary: typeof row.summary === 'string' ? row.summary : null,
  }
}

function toDashboardScheduleItem(value: unknown): Omit<DashboardScheduleItem, 'team'> {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    team_id: String(row.team_id ?? ''),
    title: String(row.title ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    type: toCalendarEventType(row.type),
    event_date: typeof row.event_date === 'string' ? row.event_date : '',
    start_time: typeof row.start_time === 'string' ? row.start_time : null,
    end_time: typeof row.end_time === 'string' ? row.end_time : null,
    is_all_day: Boolean(row.is_all_day),
    created_by: String(row.created_by ?? ''),
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  }
}

export async function fetchAssignedDashboardTasks(userId: string): Promise<DashboardAssignedTask[]> {
  const tasksResult = await supabase
    .from('tasks')
    .select(
      'id,team_id,title,description,status,priority,assignee_id,due_date,completed_at,created_at,updated_at',
    )
    .eq('assignee_id', userId)

  if (tasksResult.error) {
    throw tasksResult.error
  }

  const tasks = ((tasksResult.data ?? []) as Array<Record<string, unknown>>).map((task) => ({
    id: String(task.id ?? ''),
    team_id: String(task.team_id ?? ''),
    title: String(task.title ?? ''),
    description: typeof task.description === 'string' ? task.description : null,
    status: toTaskStatus(task.status),
    priority: toTaskPriority(task.priority),
    assignee_id: typeof task.assignee_id === 'string' ? task.assignee_id : null,
    due_date: typeof task.due_date === 'string' ? task.due_date : null,
    completed_at: typeof task.completed_at === 'string' ? task.completed_at : null,
    created_at: typeof task.created_at === 'string' ? task.created_at : '',
    updated_at: typeof task.updated_at === 'string' ? task.updated_at : '',
  }))

  const taskIds = Array.from(new Set(tasks.map((task) => task.id))).filter(Boolean)
  const teamIds = Array.from(new Set(tasks.map((task) => task.team_id))).filter(Boolean)

  const [todosResult, teamsResult] = await Promise.all([
    taskIds.length > 0
      ? supabase
          .from('todos')
          .select('id,task_id,content,is_done,position,created_by,created_at,updated_at')
          .in('task_id', taskIds)
          .order('position', { ascending: true })
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    teamIds.length > 0
      ? supabase.from('teams').select('id,name,summary').in('id', teamIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (todosResult.error) {
    throw todosResult.error
  }

  if (teamsResult.error) {
    throw teamsResult.error
  }

  const todoMap = new Map<string, TeamTodoRecord[]>()
  ;((todosResult.data ?? []) as unknown[]).map(toTodoRecord).forEach((todo) => {
    const current = todoMap.get(todo.task_id) ?? []
    current.push(todo)
    todoMap.set(todo.task_id, current)
  })

  const teamMap = new Map<string, DashboardTeamSummary>(
    ((teamsResult.data ?? []) as unknown[]).map((team) => {
      const parsed = toTeamSummary(team)
      return [parsed.id, parsed]
    }),
  )

  return tasks.map((task) => ({
    ...task,
    team: teamMap.get(task.team_id) ?? null,
    todos: todoMap.get(task.id) ?? [],
  }))
}

export async function fetchDashboardSchedule(userId: string): Promise<DashboardScheduleItem[]> {
  const membershipsResult = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)

  if (membershipsResult.error) {
    throw membershipsResult.error
  }

  const teamIds = Array.from(
    new Set(
      ((membershipsResult.data ?? []) as Array<Record<string, unknown>>)
        .map((membership) => String(membership.team_id ?? ''))
        .filter(Boolean),
    ),
  )

  if (teamIds.length === 0) {
    return []
  }

  const today = new Date()
  const todayLabel = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  const [eventsResult, teamsResult] = await Promise.all([
    supabase
      .from('calendar_events')
      .select(
        'id,team_id,title,description,type,event_date,start_time,end_time,is_all_day,created_by,created_at,updated_at',
      )
      .in('team_id', teamIds)
      .gte('event_date', todayLabel)
      .order('event_date', { ascending: true })
      .order('is_all_day', { ascending: false })
      .order('start_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabase.from('teams').select('id,name,summary').in('id', teamIds),
  ])

  if (eventsResult.error) {
    throw eventsResult.error
  }

  if (teamsResult.error) {
    throw teamsResult.error
  }

  const teamMap = new Map<string, DashboardTeamSummary>(
    ((teamsResult.data ?? []) as unknown[]).map((team) => {
      const parsed = toTeamSummary(team)
      return [parsed.id, parsed]
    }),
  )

  return ((eventsResult.data ?? []) as unknown[]).map((item) => {
    const parsed = toDashboardScheduleItem(item)

    return {
      ...parsed,
      team: teamMap.get(parsed.team_id) ?? null,
    }
  })
}
