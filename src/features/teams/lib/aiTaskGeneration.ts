import type {
  AiTaskGenerationStartResponse,
  AiTaskGenerationStatus,
} from '../types/team'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')

interface ApiErrorShape {
  message?: string
  can_trigger?: boolean
  cooldown_minutes?: number
  cooldown_remaining_seconds?: number
  cooldown_until?: string | null
  latest_log?: AiTaskGenerationStatus['latest_log']
}

export class AiTaskGenerationApiError extends Error {
  statusCode: number
  payload: ApiErrorShape | null

  constructor(message: string, statusCode: number, payload: ApiErrorShape | null) {
    super(message)
    this.name = 'AiTaskGenerationApiError'
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
    throw new AiTaskGenerationApiError(
      errorPayload?.message || `요청에 실패했습니다. (${response.status})`,
      response.status,
      errorPayload,
    )
  }

  return payload as T
}

export async function startAiTaskGeneration(params: {
  teamId: string
  requesterProfileId: string
}): Promise<AiTaskGenerationStartResponse> {
  const response = await fetch(`${apiBaseUrl}/teams/${params.teamId}/ai-task-generation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requester_profile_id: params.requesterProfileId,
    }),
  })

  return parseResponse<AiTaskGenerationStartResponse>(response)
}

export async function fetchAiTaskGenerationStatus(
  teamId: string,
  options?: { signal?: AbortSignal },
): Promise<AiTaskGenerationStatus> {
  const response = await fetch(`${apiBaseUrl}/teams/${teamId}/ai-task-generation/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: options?.signal,
  })

  return parseResponse<AiTaskGenerationStatus>(response)
}
