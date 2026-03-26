import type { MeetingActionizerResponse } from '../types/team'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')

interface ApiErrorShape {
  message?: string
  reason?: string
  available_at?: string
  remaining_seconds?: number
}

export class MeetingActionizerApiError extends Error {
  statusCode: number
  payload: ApiErrorShape | null

  constructor(message: string, statusCode: number, payload: ApiErrorShape | null) {
    super(message)
    this.name = 'MeetingActionizerApiError'
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
    throw new MeetingActionizerApiError(
      errorPayload?.reason
        ? `${errorPayload.message || `회의 실행화 요청에 실패했습니다. (${response.status})`}\n${errorPayload.reason}`
        : errorPayload?.message || `회의 실행화 요청에 실패했습니다. (${response.status})`,
      response.status,
      errorPayload,
    )
  }

  return payload as T
}

function toReadableNetworkError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === 'Failed to fetch') {
      return 'Meeting Actionizer API 서버에 연결하지 못했습니다. 백엔드 실행 상태와 CORS 설정을 확인해 주세요.'
    }
    return error.message
  }
  return 'Meeting Actionizer 요청 중 알 수 없는 오류가 발생했습니다.'
}

export async function requestMeetingActionizer(params: {
  teamId: string
  requestedBy: string
  title: string
  meetingDate: string
  participantNames: string[]
  rawMeetingText: string
}): Promise<MeetingActionizerResponse> {
  try {
    const response = await fetch(`${apiBaseUrl}/pm-assistant/meeting-actionize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        team_id: params.teamId,
        requested_by: params.requestedBy,
        title: params.title.trim() || null,
        meeting_date: params.meetingDate || null,
        participant_names: params.participantNames,
        raw_meeting_text: params.rawMeetingText,
      }),
    })

    return parseResponse<MeetingActionizerResponse>(response)
  } catch (error) {
    if (error instanceof MeetingActionizerApiError) {
      throw error
    }

    throw new MeetingActionizerApiError(toReadableNetworkError(error), 0, null)
  }
}
