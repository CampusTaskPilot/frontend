import type {
  AiTodoGenerationStartResponse,
  AiTodoGenerationStatus,
} from '../types/team'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')

interface ApiErrorShape {
  message?: string
  status?: AiTodoGenerationStatus['status']
  cooldown_until?: string | null
  remaining_seconds?: number
  error_message?: string | null
  created_count?: number
  last_run_at?: string | null
  current_job_id?: string | null
  latest_log?: AiTodoGenerationStatus['latest_log']
  created_todos?: AiTodoGenerationStatus['created_todos']
}

export class AiTodoGenerationApiError extends Error {
  statusCode: number
  payload: ApiErrorShape | null

  constructor(message: string, statusCode: number, payload: ApiErrorShape | null) {
    super(message)
    this.name = 'AiTodoGenerationApiError'
    this.statusCode = statusCode
    this.payload = payload
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const payload = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload ? payload.detail : payload
    const errorPayload = detail && typeof detail === 'object' ? (detail as ApiErrorShape) : null
    throw new AiTodoGenerationApiError(
      errorPayload?.message || `요청에 실패했습니다. (${response.status})`,
      response.status,
      errorPayload,
    )
  }

  return payload as T
}

function toReadableNetworkError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return 'AI Todo 요청이 서버까지 도달하지 못했습니다. CORS 또는 네트워크 설정을 확인해주세요.'
    }
    return error.message
  }
  return 'AI Todo 요청 중 알 수 없는 네트워크 오류가 발생했습니다.'
}

export async function startAiTodoGeneration(params: {
  taskId: string
  requesterProfileId: string
}): Promise<AiTodoGenerationStartResponse> {
  try {
    const response = await fetch(`${apiBaseUrl}/tasks/${params.taskId}/ai-todo-generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requester_profile_id: params.requesterProfileId,
      }),
    })

    return parseResponse<AiTodoGenerationStartResponse>(response)
  } catch (error) {
    if (error instanceof AiTodoGenerationApiError) {
      throw error
    }

    throw new AiTodoGenerationApiError(toReadableNetworkError(error), 0, null)
  }
}

export async function fetchAiTodoGenerationStatus(taskId: string): Promise<AiTodoGenerationStatus> {
  const response = await fetch(`${apiBaseUrl}/tasks/${taskId}/ai-todo-generation/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  return parseResponse<AiTodoGenerationStatus>(response)
}

export async function fetchAiTodoGenerationStatuses(
  teamId: string,
  taskIds: string[],
): Promise<Record<string, AiTodoGenerationStatus>> {
  if (taskIds.length === 0) {
    return {}
  }

  const params = new URLSearchParams({
    task_ids: taskIds.join(','),
  })
  const response = await fetch(`${apiBaseUrl}/teams/${teamId}/ai-todo-generation/statuses?${params.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = await parseResponse<{ statuses: Record<string, AiTodoGenerationStatus> }>(response)
  return payload.statuses ?? {}
}
