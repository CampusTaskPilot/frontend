import { ApiError, apiFetch } from '../../../lib/api'
import type {
  TeamApplicationAnalysisLookupRecord,
  TeamApplicationRecord,
  TeamApplicationSummaryRecord,
} from '../types/team'

interface TeamApplicationListResponse {
  items: TeamApplicationSummaryRecord[]
}

interface TeamApplicationMineResponse {
  application: TeamApplicationSummaryRecord | null
}

interface TeamApplicationSubmitResponse {
  application: TeamApplicationSummaryRecord
  rate_limit: {
    cooldown_seconds: number
    limit_10m: number
    limit_24h: number
  }
}

export class TeamApplicationApiError extends ApiError {
  retryAfterSeconds: number | null

  constructor(message: string, statusCode: number, payload: unknown) {
    super(message, statusCode, payload)
    this.name = 'TeamApplicationApiError'

    const detail =
      payload && typeof payload === 'object' && 'detail' in payload
        ? (payload as { detail?: unknown }).detail
        : null

    this.retryAfterSeconds =
      detail && typeof detail === 'object' && 'retry_after_seconds' in detail
        ? Number((detail as { retry_after_seconds?: unknown }).retry_after_seconds ?? 0) || null
        : null
  }
}

async function wrapTeamApplicationRequest<T>(fn: () => Promise<T>) {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof ApiError) {
      throw new TeamApplicationApiError(error.message, error.statusCode, error.payload)
    }
    throw error
  }
}

export function submitTeamApplication(params: {
  teamId: string
  accessToken: string
  applicantMessage?: string
}) {
  return wrapTeamApplicationRequest(async () => {
    const response = await apiFetch<TeamApplicationSubmitResponse>(`/teams/${params.teamId}/applications`, {
      method: 'POST',
      accessToken: params.accessToken,
      body: JSON.stringify({
        applicant_message: params.applicantMessage?.trim() || null,
      }),
    })

    return response.application
  })
}

export function fetchMyTeamApplication(params: {
  teamId: string
  accessToken: string
}) {
  return wrapTeamApplicationRequest(async () => {
    const response = await apiFetch<TeamApplicationMineResponse>(`/teams/${params.teamId}/applications/mine`, {
      method: 'GET',
      accessToken: params.accessToken,
    })
    return response.application
  })
}

export function fetchTeamApplications(params: {
  teamId: string
  accessToken: string
}) {
  return wrapTeamApplicationRequest(async () => {
    const response = await apiFetch<TeamApplicationListResponse>(`/teams/${params.teamId}/applications`, {
      method: 'GET',
      accessToken: params.accessToken,
    })
    return response.items
  })
}

export function fetchTeamApplicationDetail(params: {
  applicationId: string
  accessToken: string
}) {
  return wrapTeamApplicationRequest(async () => {
    return apiFetch<TeamApplicationRecord>(`/applications/${params.applicationId}`, {
      method: 'GET',
      accessToken: params.accessToken,
    })
  })
}

export function fetchTeamApplicationAnalysis(params: {
  applicationId: string
  accessToken: string
}) {
  return wrapTeamApplicationRequest(async () => {
    return apiFetch<TeamApplicationAnalysisLookupRecord>(`/applications/${params.applicationId}/analysis`, {
      method: 'GET',
      accessToken: params.accessToken,
    })
  })
}

export function updateTeamApplicationStatus(params: {
  applicationId: string
  accessToken: string
  status: 'accepted' | 'rejected' | 'withdrawn'
  reviewNote?: string
}) {
  return wrapTeamApplicationRequest(async () => {
    return apiFetch<TeamApplicationSummaryRecord>(`/applications/${params.applicationId}/status`, {
      method: 'PATCH',
      accessToken: params.accessToken,
      body: JSON.stringify({
        status: params.status,
        review_note: params.reviewNote?.trim() || null,
      }),
    })
  })
}

export function ensureTeamApplicationAnalysis(params: {
  applicationId: string
  accessToken: string
  triggerSource?: 'on_first_view' | 'manual_retry'
}) {
  return wrapTeamApplicationRequest(async () => {
    return apiFetch<TeamApplicationSummaryRecord>(`/applications/${params.applicationId}/analysis/ensure`, {
      method: 'POST',
      accessToken: params.accessToken,
      body: JSON.stringify({
        trigger_source: params.triggerSource ?? 'on_first_view',
      }),
    })
  })
}
