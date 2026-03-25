import { supabase } from '../../../lib/supabase'
import type {
  ProfileSummary,
  TeamTaskPriority,
  TeamTaskRecord,
  TeamTaskStatus,
  TeamTaskWithTodos,
  TeamTodoRecord,
} from '../types/team'

const taskSelectColumns =
  'id,team_id,title,description,status,priority,assignee_id,created_by,due_date,completed_at,position,created_at,updated_at'
const todoSelectColumns =
  'id,task_id,content,is_done,position,created_by,created_at,updated_at'

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
    .select(taskSelectColumns)
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
          .select(todoSelectColumns)
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
    .select(taskSelectColumns)
    .eq('id', taskId)
    .maybeSingle()

  if (taskResult.error) {
    throw taskResult.error
  }

  return taskResult.data ? toTaskRecord(taskResult.data) : null
}

export async function fetchTaskWorkspace(taskId: string): Promise<TeamTaskWithTodos | null> {
  const taskResult = await supabase
    .from('tasks')
    .select(taskSelectColumns)
    .eq('id', taskId)
    .maybeSingle()

  if (taskResult.error) {
    throw taskResult.error
  }

  if (!taskResult.data) {
    return null
  }

  const task = toTaskRecord(taskResult.data)
  const [todosResult, profilesResult] = await Promise.all([
    supabase
      .from('todos')
      .select(todoSelectColumns)
      .eq('task_id', taskId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true }),
    task.assignee_id
      ? supabase
          .from('profiles')
          .select('id,full_name,email,profile_image_url')
          .eq('id', task.assignee_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (todosResult.error) {
    throw todosResult.error
  }

  if (profilesResult.error) {
    throw profilesResult.error
  }

  return {
    ...task,
    assignee: profilesResult.data ? toProfileSummary(profilesResult.data) : null,
    todos: ((todosResult.data ?? []) as unknown[]).map(toTodoRecord),
  }
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

export interface WorkspaceTaskCreateInput {
  clientId: string
  teamId: string
  title: string
  description: string
  priority: TeamTaskPriority
  assigneeId: string | null
  dueDate: string | null
  createdBy: string
  position: number
  status: TeamTaskStatus
}

export interface WorkspaceTaskUpdateInput {
  taskId: string
  title?: string
  description?: string
  priority?: TeamTaskPriority
  assigneeId?: string | null
  dueDate?: string | null
  status?: TeamTaskStatus
  position?: number
}

export interface WorkspaceTodoCreateInput {
  clientId: string
  taskId: string
  content: string
  createdBy: string
  position: number
  isDone?: boolean
}

export interface WorkspaceTodoUpdateInput {
  todoId: string
  content?: string
  isDone?: boolean
  position?: number
}

export interface SaveWorkspaceChangesInput {
  taskCreates: WorkspaceTaskCreateInput[]
  taskUpdates: WorkspaceTaskUpdateInput[]
  taskDeletes: string[]
  todoCreates: WorkspaceTodoCreateInput[]
  todoUpdates: WorkspaceTodoUpdateInput[]
}

export interface SaveWorkspaceChangesResult {
  createdTasks: Array<{ clientId: string; task: TeamTaskRecord }>
  updatedTasks: TeamTaskRecord[]
  deletedTaskIds: string[]
  createdTodos: Array<{ clientId: string; todo: TeamTodoRecord }>
  updatedTodos: TeamTodoRecord[]
}

function buildTaskUpdatePayload(update: WorkspaceTaskUpdateInput) {
  const payload: Record<string, unknown> = {}

  if (update.title !== undefined) {
    payload.title = update.title.trim()
  }
  if (update.description !== undefined) {
    payload.description = update.description.trim() || null
  }
  if (update.priority !== undefined) {
    payload.priority = update.priority
  }
  if (update.assigneeId !== undefined) {
    payload.assignee_id = update.assigneeId
  }
  if (update.dueDate !== undefined) {
    payload.due_date = update.dueDate
  }
  if (update.status !== undefined) {
    payload.status = update.status
    payload.completed_at = update.status === 'done' ? new Date().toISOString() : null
  }
  if (update.position !== undefined) {
    payload.position = update.position
  }

  return payload
}

function buildTodoUpdatePayload(update: WorkspaceTodoUpdateInput) {
  const payload: Record<string, unknown> = {}

  if (update.content !== undefined) {
    payload.content = update.content.trim()
  }
  if (update.isDone !== undefined) {
    payload.is_done = update.isDone
  }
  if (update.position !== undefined) {
    payload.position = update.position
  }

  return payload
}

export async function saveWorkspaceChanges(
  input: SaveWorkspaceChangesInput,
): Promise<SaveWorkspaceChangesResult> {
  const createdTasks: Array<{ clientId: string; task: TeamTaskRecord }> = []
  const updatedTasks: TeamTaskRecord[] = []
  const createdTodos: Array<{ clientId: string; todo: TeamTodoRecord }> = []
  const updatedTodos: TeamTodoRecord[] = []
  const taskIdMap = new Map<string, string>()

  if (input.taskDeletes.length > 0) {
    const { error } = await supabase.from('tasks').delete().in('id', input.taskDeletes)
    if (error) {
      throw error
    }
  }

  if (input.taskCreates.length > 0) {
    const rows = input.taskCreates.map((task) => ({
      team_id: task.teamId,
      title: task.title.trim(),
      description: task.description.trim() || null,
      status: task.status,
      priority: task.priority,
      assignee_id: task.assigneeId,
      created_by: task.createdBy,
      due_date: task.dueDate,
      completed_at: task.status === 'done' ? new Date().toISOString() : null,
      position: task.position,
    }))

    const { data, error } = await supabase.from('tasks').insert(rows).select(taskSelectColumns)
    if (error) {
      throw error
    }

    const parsed = ((data ?? []) as unknown[]).map(toTaskRecord)
    parsed.forEach((task, index) => {
      const clientId = input.taskCreates[index]?.clientId
      if (!clientId) return
      createdTasks.push({ clientId, task })
      taskIdMap.set(clientId, task.id)
    })
  }

  if (input.taskUpdates.length > 0) {
    const updateResults = await Promise.all(
      input.taskUpdates.map(async (update) => {
        const payload = buildTaskUpdatePayload(update)
        if (Object.keys(payload).length === 0) {
          return null
        }

        const { data, error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', update.taskId)
          .select(taskSelectColumns)
          .single()

        if (error) {
          throw error
        }

        return toTaskRecord(data)
      }),
    )

    updateResults.forEach((task) => {
      if (task) {
        updatedTasks.push(task)
      }
    })
  }

  if (input.todoCreates.length > 0) {
    const normalizedCreates = input.todoCreates
      .map((todo) => ({
        ...todo,
        resolvedTaskId: taskIdMap.get(todo.taskId) ?? todo.taskId,
      }))
      .filter((todo) => !input.taskDeletes.includes(todo.resolvedTaskId))

    if (normalizedCreates.length > 0) {
      const rows = normalizedCreates.map((todo) => ({
        task_id: todo.resolvedTaskId,
        content: todo.content.trim(),
        is_done: todo.isDone ?? false,
        position: todo.position,
        created_by: todo.createdBy,
      }))

      const { data, error } = await supabase.from('todos').insert(rows).select(todoSelectColumns)
      if (error) {
        throw error
      }

      const parsed = ((data ?? []) as unknown[]).map(toTodoRecord)
      parsed.forEach((todo, index) => {
        const clientId = normalizedCreates[index]?.clientId
        if (!clientId) return
        createdTodos.push({ clientId, todo })
      })
    }
  }

  if (input.todoUpdates.length > 0) {
    const updateResults = await Promise.all(
      input.todoUpdates.map(async (update) => {
        const payload = buildTodoUpdatePayload(update)
        if (Object.keys(payload).length === 0) {
          return null
        }

        const { data, error } = await supabase
          .from('todos')
          .update(payload)
          .eq('id', update.todoId)
          .select(todoSelectColumns)
          .single()

        if (error) {
          throw error
        }

        return toTodoRecord(data)
      }),
    )

    updateResults.forEach((todo) => {
      if (todo) {
        updatedTodos.push(todo)
      }
    })
  }

  return {
    createdTasks,
    updatedTasks,
    deletedTaskIds: input.taskDeletes,
    createdTodos,
    updatedTodos,
  }
}
