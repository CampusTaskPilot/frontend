const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')

export function getApiBaseUrl() {
  return apiBaseUrl
}

export class ApiError extends Error {
  statusCode: number
  payload: unknown

  constructor(message: string, statusCode: number, payload: unknown) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.payload = payload
  }
}

export async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : null
}

export function extractApiErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === 'object') {
    if ('detail' in payload) {
      const detail = (payload as { detail?: unknown }).detail
      if (typeof detail === 'string' && detail.trim()) {
        return detail
      }
      if (detail && typeof detail === 'object' && 'message' in detail) {
        const message = (detail as { message?: unknown }).message
        if (typeof message === 'string' && message.trim()) {
          return message
        }
      }
    }

    if ('message' in payload) {
      const message = (payload as { message?: unknown }).message
      if (typeof message === 'string' && message.trim()) {
        return message
      }
    }
  }

  return fallback
}

export async function apiFetch<T>(path: string, options: RequestInit & { accessToken?: string } = {}): Promise<T> {
  const { accessToken, headers, ...rest } = options
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(rest.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(headers ?? {}),
    },
  })

  const payload = await parseJsonResponse<T | { detail?: unknown }>(response)

  if (!response.ok) {
    throw new ApiError(
      extractApiErrorMessage(payload, `요청을 처리하지 못했습니다. (${response.status})`),
      response.status,
      payload,
    )
  }

  return payload as T
}
