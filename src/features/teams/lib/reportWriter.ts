import type { PMReportCooldownStatus, PMReportResponse } from '../types/team'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')

interface PMReportApiErrorPayload {
  detail?:
    | string
    | {
        message?: string
        status?: PMReportCooldownStatus['status']
        cooldown_remaining_seconds?: number
        cooldown_until?: string | null
        can_trigger?: boolean
        cooldown_minutes?: number
      }
}

export class PMReportApiError extends Error {
  statusCode: number
  payload: PMReportApiErrorPayload | null

  constructor(message: string, statusCode: number, payload: PMReportApiErrorPayload | null = null) {
    super(message)
    this.name = 'PMReportApiError'
    this.statusCode = statusCode
    this.payload = payload
  }
}

function parseErrorMessage(payload: PMReportApiErrorPayload | null, statusCode: number) {
  const detail = payload?.detail
  if (typeof detail === 'string') {
    return detail
  }
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
    return detail.message
  }
  return `PM 보고서 생성에 실패했습니다. (${statusCode})`
}

export async function requestPMReport(params: {
  teamId: string
  reportScope: 'team' | 'personal'
  userId: string | null
  startDate: string
  endDate: string
}): Promise<PMReportResponse> {
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}/pm-assistant/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        team_id: params.teamId,
        report_scope: params.reportScope,
        user_id: params.userId,
        start_date: params.startDate,
        end_date: params.endDate,
      }),
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Failed to fetch') {
      throw new PMReportApiError(
        'PM 보고서 API에 연결하지 못했습니다. 서버 실행 상태와 CORS 설정을 확인해 주세요.',
        0,
      )
    }
    throw new PMReportApiError(
      error instanceof Error ? error.message : 'PM 보고서 요청 중 알 수 없는 오류가 발생했습니다.',
      0,
      null,
    )
  }

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as PMReportResponse | PMReportApiErrorPayload) : null

  if (!response.ok) {
    throw new PMReportApiError(
      parseErrorMessage(payload as PMReportApiErrorPayload | null, response.status),
      response.status,
      payload as PMReportApiErrorPayload | null,
    )
  }

  return payload as PMReportResponse
}

export async function fetchPMReportStatus(params: {
  teamId: string
  reportScope: 'team' | 'personal'
  userId: string | null
  signal?: AbortSignal
}): Promise<PMReportCooldownStatus> {
  const search = new URLSearchParams({
    team_id: params.teamId,
    report_scope: params.reportScope,
  })
  if (params.userId) {
    search.set('user_id', params.userId)
  }

  const response = await fetch(`${apiBaseUrl}/pm-assistant/report/status?${search.toString()}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    signal: params.signal,
  })

  const text = await response.text()
  const payload = text ? (JSON.parse(text) as PMReportCooldownStatus | PMReportApiErrorPayload) : null

  if (!response.ok) {
    throw new PMReportApiError(
      parseErrorMessage(payload as PMReportApiErrorPayload | null, response.status),
      response.status,
      payload as PMReportApiErrorPayload | null,
    )
  }

  return payload as PMReportCooldownStatus
}
