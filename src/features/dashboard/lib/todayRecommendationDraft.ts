import type {
  DashboardTodayRecommendation,
  DashboardTodayRecommendationJobStatus,
} from '../types'

interface TodayRecommendationDraft {
  recommendation: DashboardTodayRecommendation | null
  checkedTodoIds: string[]
  jobStatus: DashboardTodayRecommendationJobStatus | null
  updatedAt: string
}

function isValidDraft(value: unknown): value is TodayRecommendationDraft {
  if (!value || typeof value !== 'object') {
    return false
  }

  const draft = value as Partial<TodayRecommendationDraft>
  return 'recommendation' in draft && Array.isArray(draft.checkedTodoIds)
}

export function getTodayRecommendationDraftKey(userId: string) {
  return `dashboard-today-recommendation:${userId}`
}

export function loadTodayRecommendationDraft(key: string): TodayRecommendationDraft | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as unknown
    return isValidDraft(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveTodayRecommendationDraft(
  key: string,
  payload: Pick<TodayRecommendationDraft, 'recommendation' | 'checkedTodoIds' | 'jobStatus'>,
) {
  const draft: TodayRecommendationDraft = {
    recommendation: payload.recommendation,
    checkedTodoIds: payload.checkedTodoIds,
    jobStatus: payload.jobStatus,
    updatedAt: new Date().toISOString(),
  }

  window.sessionStorage.setItem(key, JSON.stringify(draft))
}

export function clearTodayRecommendationDraft(key: string) {
  window.sessionStorage.removeItem(key)
}
