import { ApiError, apiFetch } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
import type {
  TeamApplicationMutationResult,
  TeamApplicationAnalysisLookupRecord,
  TeamApplicationAnalysisSummary,
  TeamApplicationSummaryRecord,
} from '../types/team'

const TEAM_APPLICATION_BASE_SELECT = `
  id,
  team_id,
  applicant_user_id,
  status,
  applied_at,
  reviewed_at,
  reviewed_by_user_id,
  review_note,
  applicant_display_name:applicant_snapshot->>display_name,
  applicant_headline:applicant_snapshot->>headline,
  applicant_profile_image_url:applicant_snapshot->>profile_image_url,
  applicant_application_message:applicant_snapshot->>application_message
`

const TEAM_APPLICATION_ANALYSIS_SUMMARY_SELECT = `
  id,
  application_id,
  status,
  trigger_source,
  suitability_level,
  one_line_summary,
  confidence,
  attempt_count,
  queued_at,
  started_at,
  completed_at,
  failed_at,
  last_error,
  updated_at
`

const TEAM_APPLICATION_LIST_SELECT = `
  ${TEAM_APPLICATION_BASE_SELECT},
  team_application_ai_analyses (
    ${TEAM_APPLICATION_ANALYSIS_SUMMARY_SELECT}
  )
`

const TEAM_APPLICATION_ANALYSIS_DETAIL_SELECT = `
  id,
  application_id,
  status,
  trigger_source,
  model,
  provider,
  prompt_version,
  suitability_level,
  one_line_summary,
  reasons,
  strengths,
  concerns,
  follow_up_questions,
  confidence,
  input_tokens,
  output_tokens,
  estimated_cost,
  attempt_count,
  queued_at,
  started_at,
  completed_at,
  failed_at,
  last_error,
  created_at,
  updated_at
`

function extractSupabaseErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

function extractSupabaseErrorCode(error: unknown) {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string') {
      return code
    }
  }

  return ''
}

function asAnalysisSummary(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const row = value as Record<string, unknown>
  return {
    id: String(row.id ?? ''),
    application_id: String(row.application_id ?? ''),
    status: String(row.status ?? 'queued') as TeamApplicationAnalysisSummary['status'],
    trigger_source: String(row.trigger_source ?? 'on_apply') as 'on_apply' | 'on_first_view' | 'manual_retry',
    suitability_level:
      typeof row.suitability_level === 'string'
        ? (row.suitability_level as 'high' | 'medium' | 'low' | 'insufficient_data')
        : null,
    one_line_summary: typeof row.one_line_summary === 'string' ? row.one_line_summary : null,
    confidence: typeof row.confidence === 'string' ? (row.confidence as 'high' | 'medium' | 'low') : null,
    attempt_count: typeof row.attempt_count === 'number' ? row.attempt_count : 0,
    queued_at: typeof row.queued_at === 'string' ? row.queued_at : null,
    started_at: typeof row.started_at === 'string' ? row.started_at : null,
    completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
    failed_at: typeof row.failed_at === 'string' ? row.failed_at : null,
    last_error: typeof row.last_error === 'string' ? row.last_error : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date(0).toISOString(),
  }
}

function extractAnalysisSummary(value: unknown) {
  if (Array.isArray(value)) {
    return asAnalysisSummary(value[0] ?? null)
  }

  return asAnalysisSummary(value)
}

function mapApplicationSummary(value: unknown): TeamApplicationSummaryRecord {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    team_id: String(row.team_id ?? ''),
    applicant_user_id: String(row.applicant_user_id ?? ''),
    status: String(row.status ?? 'pending') as TeamApplicationSummaryRecord['status'],
    applied_at: typeof row.applied_at === 'string' ? row.applied_at : new Date(0).toISOString(),
    reviewed_at: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
    reviewed_by_user_id: typeof row.reviewed_by_user_id === 'string' ? row.reviewed_by_user_id : null,
    review_note: typeof row.review_note === 'string' ? row.review_note : null,
    applicant: {
      display_name: typeof row.applicant_display_name === 'string' ? row.applicant_display_name : '',
      headline: typeof row.applicant_headline === 'string' ? row.applicant_headline : null,
      profile_image_url: typeof row.applicant_profile_image_url === 'string' ? row.applicant_profile_image_url : null,
      skills: [],
      application_message:
        typeof row.applicant_application_message === 'string' ? row.applicant_application_message : null,
    },
    analysis: extractAnalysisSummary(row.team_application_ai_analyses),
  }
}

function localizeApplicationMutationMessage(message: string) {
  if (message === 'Application accepted.') {
    return '지원을 승인했습니다.'
  }

  if (message === 'Application rejected.') {
    return '지원을 거절했습니다.'
  }

  if (message === 'Application updated.') {
    return '지원 상태를 변경했습니다.'
  }

  return message
}

function mapApplicationMutationResult(value: unknown): TeamApplicationMutationResult {
  const row = (value ?? {}) as Record<string, unknown>

  return {
    ok: Boolean(row.ok),
    action: String(row.action ?? 'rejected') as TeamApplicationMutationResult['action'],
    application_id: String(row.application_id ?? ''),
    team_id: String(row.team_id ?? ''),
    applicant_user_id: String(row.applicant_user_id ?? ''),
    status: String(row.status ?? 'pending') as TeamApplicationMutationResult['status'],
    reviewed_at: typeof row.reviewed_at === 'string' ? row.reviewed_at : null,
    reviewed_by_user_id: typeof row.reviewed_by_user_id === 'string' ? row.reviewed_by_user_id : null,
    review_note: typeof row.review_note === 'string' ? row.review_note : null,
    message:
      typeof row.message === 'string' && row.message.trim()
        ? localizeApplicationMutationMessage(row.message)
        : '지원 상태를 변경했습니다.',
  }
}

function normalizeListError(error: unknown, fallback: string) {
  throw new Error(extractSupabaseErrorMessage(error, fallback))
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

async function wrapTeamApplicationApiRequest<T>(fn: () => Promise<T>) {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof ApiError) {
      throw new TeamApplicationApiError(error.message, error.statusCode, error.payload)
    }
    throw error
  }
}

export async function submitTeamApplication(params: {
  teamId: string
  applicantUserId: string
  applicantMessage?: string
}) {
  const { data, error } = await supabase
    .from('team_applications')
    .insert({
      team_id: params.teamId,
      applicant_user_id: params.applicantUserId,
      applicant_message: params.applicantMessage?.trim() || null,
    })
    .select(TEAM_APPLICATION_BASE_SELECT)
    .single()

  if (error) {
    const code = extractSupabaseErrorCode(error)
    const message =
      code === '23505'
        ? '이미 이 팀에 신청한 기록이 있어요.'
        : extractSupabaseErrorMessage(error, '팀 신청을 저장하지 못했습니다.')
    throw new TeamApplicationApiError(message, 400, error)
  }

  return mapApplicationSummary(data)
}

export async function fetchMyTeamApplication(params: {
  teamId: string
  userId: string
}) {
  const { data, error } = await supabase
    .from('team_applications')
    .select(TEAM_APPLICATION_BASE_SELECT)
    .eq('team_id', params.teamId)
    .eq('applicant_user_id', params.userId)
    .limit(1)
    .maybeSingle()

  if (error) {
    normalizeListError(error, '내 팀 신청 상태를 불러오지 못했습니다.')
  }

  return data ? mapApplicationSummary(data) : null
}

export async function fetchTeamApplications(params: {
  teamId: string
}) {
  const { data, error } = await supabase
    .from('team_applications')
    .select(TEAM_APPLICATION_LIST_SELECT)
    .eq('team_id', params.teamId)
    .order('applied_at', { ascending: false })

  if (error) {
    normalizeListError(error, '팀 신청 목록을 불러오지 못했습니다.')
  }

  return ((data ?? []) as unknown[]).map(mapApplicationSummary)
}

export async function fetchTeamApplicationAnalysis(params: {
  applicationId: string
}) {
  const { data, error } = await supabase
    .from('team_application_ai_analyses')
    .select(TEAM_APPLICATION_ANALYSIS_DETAIL_SELECT)
    .eq('application_id', params.applicationId)
    .limit(1)
    .maybeSingle()

  if (error) {
    normalizeListError(error, 'AI 분석 결과를 불러오지 못했습니다.')
  }

  if (!data) {
    throw new Error('AI 분석 정보가 아직 준비되지 않았습니다.')
  }

  const row = data as Record<string, unknown>
  return {
    id: String(row.id ?? ''),
    application_id: String(row.application_id ?? ''),
    status: String(row.status ?? 'queued') as TeamApplicationAnalysisLookupRecord['status'],
    trigger_source: String(row.trigger_source ?? 'on_apply') as 'on_apply' | 'on_first_view' | 'manual_retry',
    suitability_level:
      typeof row.suitability_level === 'string'
        ? (row.suitability_level as TeamApplicationAnalysisLookupRecord['suitability_level'])
        : null,
    one_line_summary: typeof row.one_line_summary === 'string' ? row.one_line_summary : null,
    confidence:
      typeof row.confidence === 'string' ? (row.confidence as TeamApplicationAnalysisLookupRecord['confidence']) : null,
    attempt_count: typeof row.attempt_count === 'number' ? row.attempt_count : 0,
    queued_at: typeof row.queued_at === 'string' ? row.queued_at : null,
    started_at: typeof row.started_at === 'string' ? row.started_at : null,
    completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
    failed_at: typeof row.failed_at === 'string' ? row.failed_at : null,
    last_error: typeof row.last_error === 'string' ? row.last_error : null,
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : new Date(0).toISOString(),
    details_available: true,
    reasons: Array.isArray(row.reasons) ? row.reasons.filter((item): item is string => typeof item === 'string') : [],
    strengths: Array.isArray(row.strengths) ? row.strengths.filter((item): item is string => typeof item === 'string') : [],
    concerns: Array.isArray(row.concerns) ? row.concerns.filter((item): item is string => typeof item === 'string') : [],
    follow_up_questions: Array.isArray(row.follow_up_questions)
      ? row.follow_up_questions.filter((item): item is string => typeof item === 'string')
      : [],
  }
}

async function runTeamApplicationReviewRpc(
  functionName: 'accept_team_application' | 'reject_team_application',
  params: {
    applicationId: string
    reviewNote?: string
  },
) {
  const { data, error } = await supabase.rpc(functionName, {
    p_application_id: params.applicationId,
    p_review_note: params.reviewNote?.trim() || null,
  })

  if (error) {
    throw new TeamApplicationApiError(
      extractSupabaseErrorMessage(error, '지원 상태를 변경하지 못했습니다.'),
      400,
      error,
    )
  }

  return mapApplicationMutationResult(data)
}

export function acceptTeamApplication(params: {
  applicationId: string
  reviewNote?: string
}) {
  return runTeamApplicationReviewRpc('accept_team_application', params)
}

export function rejectTeamApplication(params: {
  applicationId: string
  reviewNote?: string
}) {
  return runTeamApplicationReviewRpc('reject_team_application', params)
}

export function requestTeamApplicationAnalysis(params: {
  applicationId: string
  accessToken: string
  triggerSource?: 'on_apply' | 'on_first_view' | 'manual_retry'
}) {
  return wrapTeamApplicationApiRequest(async () => {
    return apiFetch<{ accepted: boolean; application: TeamApplicationSummaryRecord }>(
      `/applications/${params.applicationId}/analysis/process`,
      {
        method: 'POST',
        accessToken: params.accessToken,
        body: JSON.stringify({
          trigger_source: params.triggerSource ?? 'on_apply',
        }),
      },
    )
  })
}
