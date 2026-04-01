import type {
  DashboardTodayRecommendation,
  DashboardTodayRecommendationItem,
  DashboardTodayRecommendationJobStatus,
} from '../types'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
const dashboardDataUpdatedEvent = 'taskpilot:dashboard-data-updated'

interface DashboardApiErrorPayload {
  detail?:
    | string
    | {
        message?: string
        status?: DashboardTodayRecommendationJobStatus['status']
        cooldown_until?: string | null
        remaining_seconds?: number
        current_job_id?: string | null
      }
}

interface TodayRecommendationApiResponse {
  summary: string
  items: Array<{
    todo_id: string
    task_id: string
    team_id: string
    todo_content: string
    task_title: string
    priority: DashboardTodayRecommendationItem['priority']
    due_date: string | null
    is_done: boolean
    task_status: DashboardTodayRecommendationItem['task_status']
    is_overdue: boolean
    is_due_today: boolean
  }>
}

interface TodayRecommendationStartApiResponse {
  accepted: boolean
  message: string
  status: DashboardTodayRecommendationJobStatus['status']
  cooldown_until: string
  remaining_seconds: number
  latest_log: DashboardTodayRecommendationJobStatus['latest_log']
}

interface TodayRecommendationStatusApiResponse extends DashboardTodayRecommendationJobStatus {
  recommendation: TodayRecommendationApiResponse | null
}

interface DashboardTodoUpdateApiResponse {
  todo_id: string
  task_id: string
  is_done: boolean
  updated_at: string | null
}

interface DashboardTodoApplyApiResponse {
  todo_ids: string[]
  applied_count: number
  is_done: boolean
  updated_at: string | null
}

export class DashboardRecommendationApiError extends Error {
  statusCode: number
  payload: DashboardApiErrorPayload | null

  constructor(message: string, statusCode: number, payload: DashboardApiErrorPayload | null = null) {
    super(message)
    this.name = 'DashboardRecommendationApiError'
    this.statusCode = statusCode
    this.payload = payload
  }
}

function parseApiErrorMessage(payload: DashboardApiErrorPayload | null, statusCode: number) {
  const detail = payload?.detail
  if (typeof detail === 'string') {
    return detail
  }
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
    return detail.message
  }
  return `오늘 할 일 추천을 처리하지 못했습니다. (${statusCode})`
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : null
}

function toTodayRecommendation(payload: TodayRecommendationApiResponse): DashboardTodayRecommendation {
  return {
    summary: payload.summary,
    items: payload.items.map((item) => ({
      todo_id: item.todo_id,
      task_id: item.task_id,
      team_id: item.team_id,
      todo_content: item.todo_content,
      task_title: item.task_title,
      priority: item.priority,
      due_date: item.due_date,
      is_done: item.is_done,
      task_status: item.task_status,
      is_overdue: item.is_overdue,
      is_due_today: item.is_due_today,
    })),
  }
}

export async function startTodayRecommendation(userId: string): Promise<TodayRecommendationStartApiResponse> {
  const response = await fetch(`${apiBaseUrl}/dashboard/today-recommendation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      requester_profile_id: userId,
    }),
  })

  const payload = await parseJsonResponse<TodayRecommendationStartApiResponse | DashboardApiErrorPayload>(response)

  if (!response.ok) {
    throw new DashboardRecommendationApiError(
      parseApiErrorMessage(payload as DashboardApiErrorPayload | null, response.status),
      response.status,
      payload as DashboardApiErrorPayload | null,
    )
  }

  return payload as TodayRecommendationStartApiResponse
}

export async function fetchTodayRecommendationStatus(
  userId: string,
): Promise<DashboardTodayRecommendationJobStatus> {
  const response = await fetch(
    `${apiBaseUrl}/dashboard/today-recommendation/status?requester_profile_id=${encodeURIComponent(userId)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  const payload = await parseJsonResponse<TodayRecommendationStatusApiResponse | DashboardApiErrorPayload>(response)

  if (!response.ok) {
    throw new DashboardRecommendationApiError(
      parseApiErrorMessage(payload as DashboardApiErrorPayload | null, response.status),
      response.status,
      payload as DashboardApiErrorPayload | null,
    )
  }

  const parsed = payload as TodayRecommendationStatusApiResponse
  return {
    ...parsed,
    recommendation: parsed.recommendation ? toTodayRecommendation(parsed.recommendation) : null,
  }
}

export async function updateDashboardTodo(params: {
  todoId: string
  userId: string
  isDone: boolean
}): Promise<DashboardTodoUpdateApiResponse> {
  const response = await fetch(`${apiBaseUrl}/dashboard/todos/${encodeURIComponent(params.todoId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      requester_profile_id: params.userId,
      is_done: params.isDone,
    }),
  })

  const payload = await parseJsonResponse<DashboardTodoUpdateApiResponse | DashboardApiErrorPayload>(response)

  if (!response.ok) {
    throw new DashboardRecommendationApiError(
      parseApiErrorMessage(payload as DashboardApiErrorPayload | null, response.status),
      response.status,
      payload as DashboardApiErrorPayload | null,
    )
  }

  return payload as DashboardTodoUpdateApiResponse
}

export async function applyDashboardTodos(params: {
  todoIds: string[]
  userId: string
}): Promise<DashboardTodoApplyApiResponse> {
  const response = await fetch(`${apiBaseUrl}/dashboard/todos/apply`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      requester_profile_id: params.userId,
      todo_ids: params.todoIds,
    }),
  })

  const payload = await parseJsonResponse<DashboardTodoApplyApiResponse | DashboardApiErrorPayload>(response)

  if (!response.ok) {
    throw new DashboardRecommendationApiError(
      parseApiErrorMessage(payload as DashboardApiErrorPayload | null, response.status),
      response.status,
      payload as DashboardApiErrorPayload | null,
    )
  }

  return payload as DashboardTodoApplyApiResponse
}

export function notifyDashboardDataUpdated() {
  window.dispatchEvent(new CustomEvent(dashboardDataUpdatedEvent))
}

export function subscribeDashboardDataUpdated(listener: () => void) {
  const handler = () => {
    listener()
  }

  window.addEventListener(dashboardDataUpdatedEvent, handler)
  return () => {
    window.removeEventListener(dashboardDataUpdatedEvent, handler)
  }
}
