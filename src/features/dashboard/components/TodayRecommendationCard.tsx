import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import {
  DashboardRecommendationApiError,
  applyDashboardTodos,
  fetchTodayRecommendationStatus,
  startTodayRecommendation,
} from '../lib/dashboardRecommendations'
import {
  clearTodayRecommendationDraft,
  getTodayRecommendationDraftKey,
  loadTodayRecommendationDraft,
  saveTodayRecommendationDraft,
} from '../lib/todayRecommendationDraft'
import type {
  DashboardTodayRecommendation,
  DashboardTodayRecommendationItem,
  DashboardTodayRecommendationJobStatus,
} from '../types'

interface TodayRecommendationCardProps {
  userId: string | null
}

type RecommendationViewState = 'idle' | 'loading' | 'success' | 'error'
type ApplyState = 'idle' | 'submitting' | 'success'

const emptySummary = '오늘 바로 처리할 추천 Todo가 없습니다. 현재 진행 중인 업무를 잘 관리하고 있어요.'

function priorityLabel(priority: DashboardTodayRecommendationItem['priority']) {
  if (priority === 'high') return '높음'
  if (priority === 'low') return '낮음'
  return '보통'
}

function formatDueDate(value: string | null) {
  if (!value) return '마감일 미정'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '마감일 미정'

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function buildEmptyRecommendation(): DashboardTodayRecommendation {
  return {
    summary: emptySummary,
    items: [],
  }
}

function deriveViewState(
  jobStatus: DashboardTodayRecommendationJobStatus | null,
  recommendation: DashboardTodayRecommendation | null,
  errorMessage: string,
): RecommendationViewState {
  if (errorMessage && !recommendation && jobStatus?.status !== 'pending' && jobStatus?.status !== 'running') {
    return 'error'
  }
  if (jobStatus?.status === 'pending' || jobStatus?.status === 'running') {
    return 'loading'
  }
  if (recommendation) {
    return 'success'
  }
  return 'idle'
}

function toCooldownJobStatus(
  current: DashboardTodayRecommendationJobStatus | null,
  detail: {
    status?: DashboardTodayRecommendationJobStatus['status']
    cooldown_until?: string | null
    remaining_seconds?: number
    current_job_id?: string | null
  },
): DashboardTodayRecommendationJobStatus {
  return {
    status: detail.status ?? 'cooldown',
    cooldown_until: detail.cooldown_until ?? current?.cooldown_until ?? null,
    remaining_seconds: detail.remaining_seconds ?? current?.remaining_seconds ?? 0,
    error_message: null,
    recommended_count: current?.recommended_count ?? 0,
    last_run_at: current?.last_run_at ?? null,
    current_job_id: detail.current_job_id ?? current?.current_job_id ?? null,
    latest_log: current?.latest_log ?? null,
    recommendation: null,
  }
}

export function TodayRecommendationCard({ userId }: TodayRecommendationCardProps) {
  const [jobStatus, setJobStatus] = useState<DashboardTodayRecommendationJobStatus | null>(null)
  const [recommendation, setRecommendation] = useState<DashboardTodayRecommendation | null>(null)
  const [checkedTodoIds, setCheckedTodoIds] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [applyState, setApplyState] = useState<ApplyState>('idle')
  const [successMessage, setSuccessMessage] = useState('')

  const draftKey = useMemo(() => (userId ? getTodayRecommendationDraftKey(userId) : ''), [userId])

  useEffect(() => {
    setJobStatus(null)
    setRecommendation(null)
    setCheckedTodoIds([])
    setErrorMessage('')
    setApplyState('idle')
    setSuccessMessage('')

    if (!userId) {
      return
    }

    const savedDraft = loadTodayRecommendationDraft(draftKey)
    if (savedDraft) {
      setJobStatus(savedDraft.jobStatus)
      setRecommendation(savedDraft.recommendation)
      setCheckedTodoIds(savedDraft.checkedTodoIds)
      return
    }

    let isMounted = true
    void (async () => {
      try {
        const nextStatus = await fetchTodayRecommendationStatus(userId)
        if (!isMounted) return

        setJobStatus({
          ...nextStatus,
          recommendation: null,
        })
      } catch {
        if (!isMounted) return
      }
    })()

    return () => {
      isMounted = false
    }
  }, [draftKey, userId])

  useEffect(() => {
    if (!userId || !draftKey) return

    if (!recommendation && !jobStatus && checkedTodoIds.length === 0) {
      clearTodayRecommendationDraft(draftKey)
      return
    }

    saveTodayRecommendationDraft(draftKey, {
      recommendation,
      checkedTodoIds,
      jobStatus,
    })
  }, [checkedTodoIds, draftKey, jobStatus, recommendation, userId])

  useEffect(() => {
    if (!userId) return
    if (!(jobStatus?.status === 'pending' || jobStatus?.status === 'running')) {
      return
    }

    const interval = window.setInterval(() => {
      void (async () => {
        try {
          const nextStatus = await fetchTodayRecommendationStatus(userId)
          setJobStatus(nextStatus)

          if (nextStatus.recommendation) {
            setRecommendation(nextStatus.recommendation)
            setCheckedTodoIds([])
            setApplyState('idle')
            setSuccessMessage('')
          }
        } catch (error) {
          setErrorMessage(
            error instanceof Error ? error.message : '오늘 할 일 추천 상태를 확인하지 못했습니다.',
          )
        }
      })()
    }, 2500)

    return () => {
      window.clearInterval(interval)
    }
  }, [jobStatus?.status, userId])

  useEffect(() => {
    if (!jobStatus?.cooldown_until) return
    if (jobStatus.status === 'pending' || jobStatus.status === 'running') return

    const interval = window.setInterval(() => {
      setJobStatus((current) => {
        if (!current?.cooldown_until) {
          return current
        }

        const remainingSeconds = Math.max(
          Math.ceil((new Date(current.cooldown_until).getTime() - Date.now()) / 1000),
          0,
        )

        if (remainingSeconds === current.remaining_seconds) {
          return current
        }

        return {
          ...current,
          status:
            current.status === 'completed' || current.status === 'failed' || current.status === 'cooldown'
              ? remainingSeconds > 0
                ? 'cooldown'
                : recommendation
                  ? 'completed'
                  : 'idle'
              : current.status,
          remaining_seconds: remainingSeconds,
        }
      })
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [jobStatus?.cooldown_until, jobStatus?.status, recommendation])

  const requestRecommendation = async () => {
    if (!userId) {
      setErrorMessage('로그인이 필요합니다.')
      return
    }

    setErrorMessage('')
    setCheckedTodoIds([])
    setApplyState('idle')
    setSuccessMessage('')

    try {
      const started = await startTodayRecommendation(userId)
      setJobStatus({
        status: started.status,
        cooldown_until: started.cooldown_until,
        remaining_seconds: started.remaining_seconds,
        error_message: null,
        recommended_count: 0,
        last_run_at: started.latest_log?.started_at ?? null,
        current_job_id: started.latest_log?.id ?? null,
        latest_log: started.latest_log,
        recommendation: null,
      })
      setRecommendation(null)
    } catch (error) {
      if (error instanceof DashboardRecommendationApiError) {
        const detail = error.payload?.detail
        if (detail && typeof detail === 'object' && detail.status === 'cooldown') {
          setJobStatus((current) => toCooldownJobStatus(current, detail))
          return
        }
      }

      setErrorMessage(
        error instanceof Error ? error.message : '오늘 할 일 추천을 시작하지 못했습니다.',
      )
    }
  }

  const handleTodoToggle = (todoId: string) => {
    if (applyState === 'submitting') {
      return
    }

    setSuccessMessage('')
    setCheckedTodoIds((current) =>
      current.includes(todoId)
        ? current.filter((id) => id !== todoId)
        : [...current, todoId],
    )
  }

  const handleApply = async () => {
    if (!userId || !recommendation || recommendation.items.length === 0) {
      return
    }

    const todoIds = recommendation.items.map((item) => item.todo_id)
    const allChecked = todoIds.every((todoId) => checkedTodoIds.includes(todoId))
    if (!allChecked || applyState === 'submitting') {
      return
    }

    setApplyState('submitting')
    setErrorMessage('')

    try {
      await applyDashboardTodos({
        todoIds,
        userId,
      })

      setApplyState('success')
      setSuccessMessage('추천된 Todo가 모두 적용되었습니다.')
      setRecommendation(null)
      setCheckedTodoIds([])
      if (draftKey) {
        clearTodayRecommendationDraft(draftKey)
      }
    } catch (error) {
      setApplyState('idle')
      setErrorMessage(
        error instanceof Error ? error.message : '추천 Todo 적용 중 문제가 발생했습니다.',
      )
    }
  }

  const viewState = deriveViewState(jobStatus, recommendation, errorMessage)
  const showEmptyResult = viewState === 'success' && (recommendation?.items.length ?? 0) === 0
  const isCoolingDown = (jobStatus?.remaining_seconds ?? 0) > 0
  const recommendationButtonLabel = isCoolingDown
    ? `다시 추천까지 ${formatCountdown(jobStatus?.remaining_seconds ?? 0)}`
    : '오늘 할 일 추천받기'
  const rerunButtonLabel = isCoolingDown
    ? `다시 추천까지 ${formatCountdown(jobStatus?.remaining_seconds ?? 0)}`
    : '다시 추천받기'
  const recommendedTodoIds = recommendation?.items.map((item) => item.todo_id) ?? []
  const allChecked =
    recommendedTodoIds.length > 0 &&
    recommendedTodoIds.every((todoId) => checkedTodoIds.includes(todoId))

  return (
    <Card className="space-y-5 rounded-[30px] border-campus-200 bg-white/95">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
          Today Focus
        </p>
        <h2 className="font-display text-2xl text-campus-900">오늘 할 일 추천</h2>
        <p className="text-sm leading-6 text-campus-500">
          LLM이 내 업무 상태를 보고 오늘 먼저 처리할 Todo를 골라드립니다.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      {isCoolingDown && (
        <div className="rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          다시 추천까지 {formatCountdown(jobStatus?.remaining_seconds ?? 0)} 남았습니다.
        </div>
      )}

      {viewState === 'idle' && (
        <div className="rounded-[26px] border border-campus-200 bg-campus-50 px-5 py-5">
          <p className="text-sm leading-6 text-campus-600">
            버튼을 누르면 LLM이 현재 맡고 있는 Task와 Todo를 바탕으로 오늘 먼저 끝내면 좋은 작업을 골라줍니다.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              onClick={() => void requestRecommendation()}
              disabled={!userId || isCoolingDown}
            >
              {recommendationButtonLabel}
            </Button>
          </div>
        </div>
      )}

      {viewState === 'loading' && (
        <div className="space-y-3 rounded-[26px] border border-campus-200 bg-campus-50 px-5 py-5">
          <p className="text-sm font-medium text-campus-900">오늘 할 일을 추천하는 중입니다...</p>
          <p className="text-sm leading-6 text-campus-600">
            다른 작업을 계속해도 됩니다. 추천이 완료되면 이 카드 안에 바로 표시됩니다.
          </p>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-campus-100 bg-white px-4 py-4">
                <div className="h-4 w-3/4 rounded-full bg-campus-100" />
                <div className="mt-3 h-3 w-1/2 rounded-full bg-campus-100" />
              </div>
            ))}
          </div>
        </div>
      )}

      {viewState === 'error' && (
        <div className="space-y-4 rounded-[26px] border border-rose-200 bg-rose-50 px-5 py-5">
          <p className="text-sm leading-6 text-rose-700">
            {errorMessage || '오늘 할 일 추천을 불러오지 못했습니다.'}
          </p>
          <Button
            type="button"
            onClick={() => void requestRecommendation()}
            disabled={!userId || isCoolingDown}
          >
            {recommendationButtonLabel}
          </Button>
        </div>
      )}

      {viewState === 'success' && recommendation && (
        <div className="space-y-4">
          <div className="rounded-[26px] border border-campus-200 bg-campus-50 px-5 py-5">
            <p className="text-sm leading-6 text-campus-700">{recommendation.summary}</p>
          </div>

          {showEmptyResult ? (
            <div className="rounded-[26px] border border-dashed border-campus-200 bg-white px-5 py-5 text-sm leading-6 text-campus-600">
              오늘 바로 처리할 추천 Todo가 없습니다.
            </div>
          ) : (
            <>
              <div className="rounded-[22px] border border-campus-200 bg-campus-50 px-4 py-3 text-sm text-campus-600">
                체크만으로는 실제 적용되지 않습니다. 모든 항목을 확인한 뒤 완료 버튼을 눌러야 실제 반영됩니다.
              </div>

              <div className="space-y-3">
                {recommendation.items.map((item) => {
                  const isChecked = checkedTodoIds.includes(item.todo_id)

                  return (
                    <label
                      key={item.todo_id}
                      className={cn(
                        'flex items-start gap-3 rounded-[26px] border border-campus-200 bg-white px-4 py-4 transition-colors',
                        applyState !== 'submitting' && 'hover:border-campus-300',
                        isChecked && 'border-brand-200 bg-brand-50/40',
                        applyState === 'submitting' && 'opacity-70',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={applyState === 'submitting'}
                        onChange={() => handleTodoToggle(item.todo_id)}
                        className="mt-1 h-4 w-4 rounded border-campus-300 text-brand-500 focus:ring-brand-300"
                        aria-label={`${item.todo_content} 체크`}
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-campus-900">{item.todo_content}</p>
                          <p className="text-xs text-campus-500">{item.task_title}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="neutral">{priorityLabel(item.priority)}</Badge>
                          {item.is_overdue && (
                            <Badge variant="warning" className="bg-rose-50 text-rose-700 ring-rose-200">
                              기한 지남
                            </Badge>
                          )}
                          {!item.is_overdue && item.is_due_today && <Badge variant="warning">오늘 마감</Badge>}
                          <span className="text-xs text-campus-500">{formatDueDate(item.due_date)}</span>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="rounded-[24px] border border-campus-200 bg-campus-50 px-4 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-campus-900">
                      {allChecked
                        ? '모든 항목을 확인했습니다. 완료 버튼으로 실제 적용할 수 있습니다.'
                        : '모든 항목을 체크하면 완료 버튼이 활성화됩니다.'}
                    </p>
                    <p className="text-xs text-campus-500">
                      {checkedTodoIds.length} / {recommendedTodoIds.length}개 확인됨
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => void handleApply()}
                    disabled={!allChecked || applyState === 'submitting'}
                    className={cn(
                      !allChecked &&
                        'bg-campus-200 text-campus-500 shadow-none hover:brightness-100 focus-visible:outline-campus-300',
                    )}
                  >
                    {applyState === 'submitting' ? '적용 중...' : '완료'}
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void requestRecommendation()}
              disabled={!userId || isCoolingDown || applyState === 'submitting'}
            >
              {rerunButtonLabel}
            </Button>
            <Button asChild type="button" variant="ghost">
              <Link to="/teams">업무 탭으로 이동</Link>
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
