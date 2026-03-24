import type {
  AiTaskAssignmentStartResponse,
  AiTaskAssignmentStatus,
} from '../types/team'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')

interface ApiErrorShape {
  message?: string
  status?: AiTaskAssignmentStatus['status']
  cooldown_until?: string | null
  remaining_seconds?: number
  error_message?: string | null
  assigned_count?: number
  last_run_at?: string | null
  current_job_id?: string | null
  latest_log?: AiTaskAssignmentStatus['latest_log']
}

export class AiTaskAssignmentApiError extends Error {
  statusCode: number
  payload: ApiErrorShape | null

  constructor(message: string, statusCode: number, payload: ApiErrorShape | null) {
    super(message)
    this.name = 'AiTaskAssignmentApiError'
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
    throw new AiTaskAssignmentApiError(
      errorPayload?.message || `요청에 실패했습니다. (${response.status})`,
      response.status,
      errorPayload,
    )
  }

  return payload as T
}

export async function startAiTaskAssignment(params: {
  teamId: string
  requesterProfileId: string
}): Promise<AiTaskAssignmentStartResponse> {
  const response = await fetch(`${apiBaseUrl}/teams/${params.teamId}/ai-task-assignment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requester_profile_id: params.requesterProfileId,
    }),
  })

  return parseResponse<AiTaskAssignmentStartResponse>(response)
}

export async function fetchAiTaskAssignmentStatus(teamId: string): Promise<AiTaskAssignmentStatus> {
  const response = await fetch(`${apiBaseUrl}/teams/${teamId}/ai-task-assignment/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  return parseResponse<AiTaskAssignmentStatus>(response)
}
