import { supabase } from '../../../lib/supabase'
import type {
  ProfileSummary,
  TeamTaskPriority,
  TeamTaskRecord,
  TeamTaskStatus,
  TeamTaskWithTodos,
  TeamTodoRecord,
} from '../types/team'

function toProfileSummary(value: unknown): ProfileSummary {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    full_name: typeof row.full_name === 'string' ? row.full_name : null,
    email: typeof row.email === 'string' ? row.email : null,
    profile_image_url:
      typeof row.profile_image_url === 'string' ? row.profile_image_url : null,
  }
}

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

function toTaskRecord(value: unknown): TeamTaskRecord {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    team_id: String(row.team_id ?? ''),
    title: String(row.title ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    status: toTaskStatus(row.status),
    priority: toTaskPriority(row.priority),
    assignee_id: typeof row.assignee_id === 'string' ? row.assignee_id : null,
    created_by: String(row.created_by ?? ''),
    due_date: typeof row.due_date === 'string' ? row.due_date : null,
    completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
    position: typeof row.position === 'number' ? row.position : 0,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  }
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

export async function fetchTeamTasksWorkspace(teamId: string): Promise<TeamTaskWithTodos[]> {
  const tasksResult = await supabase
    .from('tasks')
    .select(
      'id,team_id,title,description,status,priority,assignee_id,created_by,due_date,completed_at,position,created_at,updated_at',
    )
    .eq('team_id', teamId)
    .order('status', { ascending: true })
    .order('position', { ascending: true })
    .order('created_at', { ascending: false })

  if (tasksResult.error) {
    throw tasksResult.error
  }

  const tasks = ((tasksResult.data ?? []) as unknown[]).map(toTaskRecord)
  const taskIds = Array.from(new Set(tasks.map((task) => task.id))).filter(Boolean)
  const assigneeIds = Array.from(new Set(tasks.map((task) => task.assignee_id).filter(Boolean))) as string[]

  const [todosResult, profilesResult] = await Promise.all([
    taskIds.length > 0
      ? supabase
          .from('todos')
          .select('id,task_id,content,is_done,position,created_by,created_at,updated_at')
          .in('task_id', taskIds)
          .order('position', { ascending: true })
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    assigneeIds.length > 0
      ? supabase
          .from('profiles')
          .select('id,full_name,email,profile_image_url')
          .in('id', assigneeIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (todosResult.error) {
    throw todosResult.error
  }

  if (profilesResult.error) {
    throw profilesResult.error
  }

  const todoMap = new Map<string, TeamTodoRecord[]>()
  ;((todosResult.data ?? []) as unknown[]).map(toTodoRecord).forEach((todo) => {
    const existing = todoMap.get(todo.task_id) ?? []
    existing.push(todo)
    todoMap.set(todo.task_id, existing)
  })

  const profileMap = new Map<string, ProfileSummary>(
    ((profilesResult.data ?? []) as unknown[]).map((profile) => {
      const parsed = toProfileSummary(profile)
      return [parsed.id, parsed]
    }),
  )

  return tasks.map((task) => ({
    ...task,
    assignee: task.assignee_id ? profileMap.get(task.assignee_id) ?? null : null,
    todos: todoMap.get(task.id) ?? [],
  }))
}

export async function fetchTaskSnapshot(taskId: string): Promise<TeamTaskRecord | null> {
  const taskResult = await supabase
    .from('tasks')
    .select(
      'id,team_id,title,description,status,priority,assignee_id,created_by,due_date,completed_at,position,created_at,updated_at',
    )
    .eq('id', taskId)
    .maybeSingle()

  if (taskResult.error) {
    throw taskResult.error
  }

  return taskResult.data ? toTaskRecord(taskResult.data) : null
}

export async function createTask(params: {
  teamId: string
  title: string
  description: string
  priority: TeamTaskPriority
  assigneeId: string | null
  dueDate: string | null
  createdBy: string
  position: number
}) {
  const { teamId, title, description, priority, assigneeId, dueDate, createdBy, position } = params

  const { error } = await supabase.from('tasks').insert({
    team_id: teamId,
    title: title.trim(),
    description: description.trim() || null,
    status: 'todo',
    priority,
    assignee_id: assigneeId,
    created_by: createdBy,
    due_date: dueDate,
    completed_at: null,
    position,
  })

  if (error) {
    throw error
  }
}

export async function updateTaskStatus(taskId: string, status: TeamTaskStatus) {
  const payload = {
    status,
    completed_at: status === 'done' ? new Date().toISOString() : null,
  }

  const { error } = await supabase.from('tasks').update(payload).eq('id', taskId)

  if (error) {
    throw error
  }
}

export async function updateTaskAssignee(taskId: string, assigneeId: string | null) {
  const { error } = await supabase.from('tasks').update({ assignee_id: assigneeId }).eq('id', taskId)

  if (error) {
    throw error
  }
}

export async function updateTask(params: {
  taskId: string
  title: string
  description: string
  priority: TeamTaskPriority
  assigneeId: string | null
  dueDate: string | null
  status: TeamTaskStatus
}) {
  const { taskId, title, description, priority, assigneeId, dueDate, status } = params

  const { error } = await supabase
    .from('tasks')
    .update({
      title: title.trim(),
      description: description.trim() || null,
      priority,
      assignee_id: assigneeId,
      due_date: dueDate,
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    })
    .eq('id', taskId)

  if (error) {
    throw error
  }
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)

  if (error) {
    throw error
  }
}

export async function createTodo(params: {
  taskId: string
  content: string
  createdBy: string
  position: number
}) {
  const { taskId, content, createdBy, position } = params

  const { error } = await supabase.from('todos').insert({
    task_id: taskId,
    content: content.trim(),
    is_done: false,
    position,
    created_by: createdBy,
  })

  if (error) {
    throw error
  }
}

export async function updateTodoDone(todoId: string, isDone: boolean) {
  const { error } = await supabase.from('todos').update({ is_done: isDone }).eq('id', todoId)

  if (error) {
    throw error
  }
}
