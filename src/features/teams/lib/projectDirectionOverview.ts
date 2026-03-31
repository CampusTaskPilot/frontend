import type { ProjectDirectionOverview } from '../types/team'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
const projectDirectionUpdatedEvent = 'taskpilot:project-direction-updated'

interface ProjectDirectionApiErrorPayload {
  detail?: string | { message?: string }
}

interface ProjectDirectionApiResponse {
  id: string
  team_id: string
  status: ProjectDirectionOverview['status']
  headline: string
  summary: string
  project_summary?: {
    phase?: string
    short_term_goal?: string
    key_metrics?: string[]
  }
  diagnosis?: Array<{
    title: string
    description: string
    severity: 'low' | 'medium' | 'high'
  }>
  actions?: Array<{
    importance: 'normal' | 'important' | 'urgent'
    title: string
    description: string
  }>
  meeting_focus?: string[]
  created_by?: string | null
  created_at: string
  updated_at: string
  generation_source?: 'llm' | 'fallback'
}

export class ProjectDirectionApiError extends Error {
  statusCode: number
  payload: ProjectDirectionApiErrorPayload | null

  constructor(message: string, statusCode: number, payload: ProjectDirectionApiErrorPayload | null = null) {
    super(message)
    this.name = 'ProjectDirectionApiError'
    this.statusCode = statusCode
    this.payload = payload
  }
}

function parseApiErrorMessage(payload: ProjectDirectionApiErrorPayload | null, statusCode: number) {
  const detail = payload?.detail
  if (typeof detail === 'string') {
    return detail
  }
  if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
    return detail.message
  }
  return `프로젝트 방향 제안을 불러오지 못했습니다. (${statusCode})`
}

function toProjectDirectionOverview(payload: ProjectDirectionApiResponse): ProjectDirectionOverview {
  return {
    id: payload.id,
    teamId: payload.team_id,
    status: payload.status,
    headline: payload.headline,
    summary: payload.summary,
    projectSummary: {
      phase: payload.project_summary?.phase ?? '방향 분석 필요',
      shortTermGoal: payload.project_summary?.short_term_goal ?? '현재 데이터 기준으로 다음 단계 목표를 다시 정리하세요.',
      keyMetrics: payload.project_summary?.key_metrics ?? [],
    },
    diagnosis: (payload.diagnosis ?? []).map((item) => ({
      title: item.title,
      description: item.description,
      severity: item.severity,
    })),
    actions: (payload.actions ?? []).map((item) => ({
      importance: item.importance,
      title: item.title,
      description: item.description,
    })),
    meetingFocus: payload.meeting_focus ?? [],
    createdBy: payload.created_by ?? null,
    createdAt: payload.created_at,
    updatedAt: payload.updated_at,
    source: payload.generation_source ?? 'fallback',
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : null
}

export async function fetchProjectDirectionOverview(
  teamId: string,
  userId: string,
): Promise<ProjectDirectionOverview | null> {
  const response = await fetch(
    `${apiBaseUrl}/pm-assistant/project-direction?team_id=${encodeURIComponent(teamId)}&user_id=${encodeURIComponent(userId)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  const payload = await parseJsonResponse<ProjectDirectionApiResponse | ProjectDirectionApiErrorPayload>(response)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new ProjectDirectionApiError(
      parseApiErrorMessage(payload as ProjectDirectionApiErrorPayload | null, response.status),
      response.status,
      payload as ProjectDirectionApiErrorPayload | null,
    )
  }

  return toProjectDirectionOverview(payload as ProjectDirectionApiResponse)
}

export async function generateProjectDirectionOverview(params: {
  teamId: string
  requestedBy: string
}): Promise<ProjectDirectionOverview> {
  const response = await fetch(`${apiBaseUrl}/pm-assistant/project-direction/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      team_id: params.teamId,
      requested_by: params.requestedBy,
    }),
  })

  const payload = await parseJsonResponse<ProjectDirectionApiResponse | ProjectDirectionApiErrorPayload>(response)

  if (!response.ok) {
    throw new ProjectDirectionApiError(
      parseApiErrorMessage(payload as ProjectDirectionApiErrorPayload | null, response.status),
      response.status,
      payload as ProjectDirectionApiErrorPayload | null,
    )
  }

  return toProjectDirectionOverview(payload as ProjectDirectionApiResponse)
}

export function notifyProjectDirectionOverviewUpdated(teamId: string) {
  window.dispatchEvent(
    new CustomEvent(projectDirectionUpdatedEvent, {
      detail: { teamId },
    }),
  )
}

export function subscribeProjectDirectionOverviewUpdated(
  listener: (teamId: string) => void,
) {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ teamId?: string }>
    const teamId = customEvent.detail?.teamId
    if (!teamId) return
    listener(teamId)
  }

  window.addEventListener(projectDirectionUpdatedEvent, handler)
  return () => {
    window.removeEventListener(projectDirectionUpdatedEvent, handler)
  }
}
