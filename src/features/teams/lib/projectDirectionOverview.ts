import type {
  ProjectDirectionOverview,
  ProjectDirectionStatusInfo,
} from '../types/team'

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '')
const projectDirectionUpdatedEvent = 'taskpilot:project-direction-updated'

interface ProjectDirectionApiErrorDetail {
  message?: string
  status?: ProjectDirectionStatusInfo['status']
  can_trigger?: boolean
  remaining_seconds?: number
  cooldown_minutes?: number
  cooldown_until?: string | null
}

interface ProjectDirectionApiErrorPayload {
  detail?: string | ProjectDirectionApiErrorDetail
}

interface ProjectDirectionOverviewApiResponse {
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

interface ProjectDirectionGenerationLogApiResponse {
  id: string
  requested_by: string | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  error_message: string | null
  cooldown_until: string | null
  started_at: string | null
  completed_at: string | null
  updated_at: string | null
}

interface ProjectDirectionStatusApiResponse {
  can_trigger: boolean
  status: ProjectDirectionStatusInfo['status']
  cooldown_minutes: number
  remaining_seconds: number
  cooldown_until: string | null
  latest_log: ProjectDirectionGenerationLogApiResponse | null
  overview: ProjectDirectionOverviewApiResponse | null
  message: string | null
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
  return `Failed to process project direction request. (${statusCode})`
}

function toProjectDirectionOverview(payload: ProjectDirectionOverviewApiResponse): ProjectDirectionOverview {
  return {
    id: payload.id,
    teamId: payload.team_id,
    status: payload.status,
    headline: payload.headline,
    summary: payload.summary,
    projectSummary: {
      phase: payload.project_summary?.phase ?? 'Analysis needed',
      shortTermGoal:
        payload.project_summary?.short_term_goal ??
        'Generate the latest project direction overview to see the next focus area.',
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

function toProjectDirectionStatus(payload: ProjectDirectionStatusApiResponse): ProjectDirectionStatusInfo {
  return {
    can_trigger: payload.can_trigger,
    status: payload.status,
    cooldown_minutes: payload.cooldown_minutes,
    remaining_seconds: payload.remaining_seconds,
    cooldown_until: payload.cooldown_until,
    latest_log: payload.latest_log,
    overview: payload.overview ? toProjectDirectionOverview(payload.overview) : null,
    message: payload.message,
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : null
}

export async function fetchProjectDirectionStatus(teamId: string, userId: string): Promise<ProjectDirectionStatusInfo> {
  const response = await fetch(
    `${apiBaseUrl}/pm-assistant/project-direction/status?team_id=${encodeURIComponent(teamId)}&user_id=${encodeURIComponent(userId)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  )

  const payload = await parseJsonResponse<ProjectDirectionStatusApiResponse | ProjectDirectionApiErrorPayload>(response)
  if (!response.ok) {
    throw new ProjectDirectionApiError(
      parseApiErrorMessage(payload as ProjectDirectionApiErrorPayload | null, response.status),
      response.status,
      payload as ProjectDirectionApiErrorPayload | null,
    )
  }

  return toProjectDirectionStatus(payload as ProjectDirectionStatusApiResponse)
}

export async function fetchProjectDirectionOverview(teamId: string, userId: string): Promise<ProjectDirectionOverview | null> {
  const status = await fetchProjectDirectionStatus(teamId, userId)
  return status.overview
}

export function notifyProjectDirectionOverviewUpdated(teamId: string) {
  window.dispatchEvent(
    new CustomEvent(projectDirectionUpdatedEvent, {
      detail: { teamId },
    }),
  )
}

export function subscribeProjectDirectionOverviewUpdated(listener: (teamId: string) => void) {
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
