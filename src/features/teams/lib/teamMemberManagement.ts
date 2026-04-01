import type { TeamMemberRemovalResponse } from '../types/team'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')

interface TeamMemberApiErrorPayload {
  code?: string
  message?: string
}

export class TeamMemberManagementApiError extends Error {
  statusCode: number
  payload: TeamMemberApiErrorPayload | null

  constructor(message: string, statusCode: number, payload: TeamMemberApiErrorPayload | null) {
    super(message)
    this.name = 'TeamMemberManagementApiError'
    this.statusCode = statusCode
    this.payload = payload
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const payload = text ? (JSON.parse(text) as unknown) : null

  if (!response.ok) {
    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail?: unknown }).detail
        : payload
    const errorPayload = detail && typeof detail === 'object' ? (detail as TeamMemberApiErrorPayload) : null
    throw new TeamMemberManagementApiError(
      errorPayload?.message || `요청이 실패했습니다. (${response.status})`,
      response.status,
      errorPayload,
    )
  }

  return payload as T
}

export async function removeTeamMember(params: {
  teamId: string
  memberId: string
  accessToken: string
}): Promise<TeamMemberRemovalResponse> {
  const response = await fetch(`${apiBaseUrl}/teams/${params.teamId}/members/${params.memberId}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${params.accessToken}`,
    },
  })

  return parseResponse<TeamMemberRemovalResponse>(response)
}
