import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import {
  DashboardRecommendationApiError,
  applyDashboardTodos,
  fetchTodayRecommendationStatus,
  notifyDashboardDataUpdated,
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

const emptySummary =
  '오늘 바로 처리할 추천 Todo가 없습니다. 현재 진행 중인 업무를 잘 관리하고 있어요.'

function priorityLabel(priority: DashboardTodayRecommendationItem['priority']) {
  if (priority === 'high') return '높음'
  if (priority === 'low') return '낮음'
  return '보통'
}

function formatDueDate(value: string | null) {
  if (!value) return '마감 미정'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '마감 미정'

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

function StatusNotice({
  tone,
  children,
}: {
  tone: 'error' | 'success' | 'cooldown'
  children: ReactNode
}) {
  const toneClassName =
    tone === 'error'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-amber-200 bg-amber-50 text-amber-800'

  return <div className={cn('rounded-[20px] border px-4 py-3 text-sm', toneClassName)}>{children}</div>
}

function RecommendationSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse rounded-[24px] border border-campus-100 bg-white px-4 py-4"
        >
          <div className="h-4 w-2/3 rounded-full bg-campus-100" />
          <div className="mt-3 h-3 w-1/2 rounded-full bg-campus-100" />
          <div className="mt-4 flex gap-2">
            <div className="h-6 w-16 rounded-full bg-campus-100" />
            <div className="h-6 w-20 rounded-full bg-campus-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function TodayRecommendationCard({ userId }: TodayRecommendationCardProps) {
  const [jobStatus, setJobStatus] = useState<DashboardTodayRecommendationJobStatus | null>(null)
  const [recommendation, setRecommendation] = useState<DashboardTodayRecommendation | null>(null)
  const [checkedTodoIds, setCheckedTodoIds] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [applyState, setApplyState] = useState<ApplyState>('idle')
  const [successMessage, setSuccessMessage] = useState('')
  const [isDraftHydrated, setIsDraftHydrated] = useState(false)

  const draftKey = useMemo(() => (userId ? getTodayRecommendationDraftKey(userId) : ''), [userId])

  useEffect(() => {
    setIsDraftHydrated(false)
    setJobStatus(null)
    setRecommendation(null)
    setCheckedTodoIds([])
    setErrorMessage('')
    setApplyState('idle')
    setSuccessMessage('')

    if (!userId) {
      setIsDraftHydrated(true)
      return
    }

    const savedDraft = loadTodayRecommendationDraft(draftKey)
    if (savedDraft) {
      setJobStatus(savedDraft.jobStatus)
      setRecommendation(savedDraft.recommendation)
      setCheckedTodoIds(savedDraft.checkedTodoIds)
      setIsDraftHydrated(true)
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
      } finally {
        if (isMounted) {
          setIsDraftHydrated(true)
        }
      }
    })()

    return () => {
      isMounted = false
    }
  }, [draftKey, userId])

  useEffect(() => {
    if (!userId || !draftKey || !isDraftHydrated) return

    if (!recommendation && !jobStatus && checkedTodoIds.length === 0) {
      clearTodayRecommendationDraft(draftKey)
      return
    }

    saveTodayRecommendationDraft(draftKey, {
      recommendation,
      checkedTodoIds,
      jobStatus,
    })
  }, [checkedTodoIds, draftKey, isDraftHydrated, jobStatus, recommendation, userId])

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

      setErrorMessage(error instanceof Error ? error.message : '오늘 할 일 추천을 시작하지 못했습니다.')
    }
  }

  const handleTodoToggle = (todoId: string) => {
    if (applyState === 'submitting') {
      return
    }

    setSuccessMessage('')
    setCheckedTodoIds((current) =>
      current.includes(todoId) ? current.filter((id) => id !== todoId) : [...current, todoId],
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
      notifyDashboardDataUpdated()
    } catch (error) {
      setApplyState('idle')
      setErrorMessage(
        error instanceof Error ? error.message : '추천 Todo 적용 중 문제가 발생했습니다.',
      )
    }
  }

  const viewState = deriveViewState(jobStatus, recommendation, errorMessage)
  const recommendedTodoIds = recommendation?.items.map((item) => item.todo_id) ?? []
  const checkedCount = checkedTodoIds.length
  const totalCount = recommendedTodoIds.length
  const allChecked =
    recommendedTodoIds.length > 0 &&
    recommendedTodoIds.every((todoId) => checkedTodoIds.includes(todoId))
  const showEmptyResult = viewState === 'success' && totalCount === 0
  const isCoolingDown = (jobStatus?.remaining_seconds ?? 0) > 0
  const recommendationButtonLabel = isCoolingDown
    ? `다시 추천까지 ${formatCountdown(jobStatus?.remaining_seconds ?? 0)}`
    : '오늘 할 일 추천받기'
  const selectionProgress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  return (
    <Card className="overflow-hidden bg-white/95 p-0">
      <div className="border-b border-campus-100 bg-gradient-to-br from-brand-50/70 via-white to-white px-6 py-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
                Today Focus
              </p>
              <h2 className="font-display text-2xl text-campus-900">오늘 할 일 추천</h2>
            </div>
            <div className="inline-flex shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium text-campus-700 ring-1 ring-inset ring-campus-200">
              {viewState === 'success' && totalCount > 0 ? `${totalCount}개 추천` : 'AI 큐레이션'}
            </div>
          </div>

          <p className="max-w-md text-sm leading-6 text-campus-600">
            현재 진행 중인 Task와 Todo를 바탕으로 오늘 먼저 끝내기 좋은 항목만 추려서 보여드립니다.
          </p>
        </div>
      </div>

      <div className="space-y-4 px-6 py-5">
        {errorMessage && <StatusNotice tone="error">{errorMessage}</StatusNotice>}
        {successMessage && <StatusNotice tone="success">{successMessage}</StatusNotice>}
        {viewState === 'idle' && (
          <div className="rounded-[26px] border border-campus-200 bg-campus-50 px-5 py-5">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">Task 우선순위 반영</Badge>
                <Badge variant="neutral">Todo 마감일 반영</Badge>
              </div>
              <p className="text-sm leading-6 text-campus-600">
                버튼을 누르면 현재 맡고 있는 업무 흐름을 분석해 오늘 집중하면 좋은 Todo만 골라드립니다.
              </p>
              <div className="pt-1">
                <Button
                  type="button"
                  onClick={() => void requestRecommendation()}
                  disabled={!userId || isCoolingDown}
                >
                  {recommendationButtonLabel}
                </Button>
              </div>
            </div>
          </div>
        )}

        {viewState === 'loading' && (
          <div className="rounded-[26px] border border-campus-200 bg-campus-50 px-5 py-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-campus-900">오늘 우선 처리할 항목을 정리하는 중입니다.</p>
                <p className="text-sm leading-6 text-campus-600">
                  다른 작업을 계속해도 됩니다. 추천이 완료되면 이 카드 안에 바로 결과가 표시됩니다.
                </p>
              </div>
              <RecommendationSkeleton />
            </div>
          </div>
        )}

        {viewState === 'error' && (
          <div className="rounded-[26px] border border-rose-200 bg-rose-50 px-5 py-5">
            <div className="space-y-4">
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
          </div>
        )}

        {viewState === 'success' && recommendation && (
          <div className="space-y-4">
            <section className="rounded-[26px] border border-campus-200 bg-campus-50 px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-campus-500">
                    Recommendation Summary
                  </p>
                  <p className="text-sm leading-6 text-campus-700">
                    {recommendation.summary || emptySummary}
                  </p>
                </div>
                {!showEmptyResult && (
                  <div className="min-w-[120px] rounded-[20px] bg-white px-4 py-3 ring-1 ring-inset ring-campus-200">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-campus-500">선택 진행률</p>
                    <p className="mt-1 text-lg font-semibold text-campus-900">{selectionProgress}%</p>
                    <p className="text-xs text-campus-500">
                      {checkedCount} / {totalCount} 확인
                    </p>
                  </div>
                )}
              </div>
            </section>

            {showEmptyResult ? (
              <div className="rounded-[26px] border border-dashed border-campus-200 bg-white px-5 py-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-campus-900">오늘 바로 처리할 추천 Todo가 없습니다.</p>
                  <p className="text-sm leading-6 text-campus-600">
                    현재 진행 중인 일정을 유지하면서 기존 업무를 이어가면 됩니다.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <section className="rounded-[26px] border border-campus-200 bg-white">
                  <div className="border-b border-campus-100 px-5 py-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-campus-900">추천된 Todo</h3>
                        <p className="mt-1 text-sm leading-6 text-campus-500">
                          항목을 모두 확인한 뒤 완료 버튼을 누르면 실제 업무 목록에 반영됩니다.
                        </p>
                      </div>
                      <div className="inline-flex rounded-full bg-campus-50 px-3 py-1 text-xs font-medium text-campus-700 ring-1 ring-inset ring-campus-200">
                        체크만으로는 적용되지 않음
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 px-4 py-4">
                    {recommendation.items.map((item, index) => {
                      const isChecked = checkedTodoIds.includes(item.todo_id)

                      return (
                        <label
                          key={item.todo_id}
                          className={cn(
                            'group relative flex items-start gap-4 rounded-[24px] border border-campus-200 px-4 py-4 transition-all',
                            applyState !== 'submitting' && 'hover:border-campus-300 hover:bg-campus-50/70',
                            isChecked && 'border-brand-200 bg-brand-50/50 shadow-sm',
                            applyState === 'submitting' && 'opacity-70',
                          )}
                        >
                          <div
                            className={cn(
                              'absolute inset-y-4 left-0 w-1 rounded-full bg-transparent transition-colors',
                              isChecked && 'bg-brand-400',
                            )}
                          />
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={applyState === 'submitting'}
                            onChange={() => handleTodoToggle(item.todo_id)}
                            className="mt-1 h-4 w-4 rounded border-campus-300 text-brand-500 focus:ring-brand-300"
                            aria-label={`${item.todo_content} 체크`}
                          />
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-campus-400">
                                    {String(index + 1).padStart(2, '0')}
                                  </span>
                                  <p className="text-sm font-semibold text-campus-900">{item.todo_content}</p>
                                </div>
                                <p className="text-xs text-campus-500">{item.task_title}</p>
                              </div>
                              {isChecked && <Badge variant="success">확인 완료</Badge>}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="neutral">우선순위 {priorityLabel(item.priority)}</Badge>
                              {item.is_overdue && (
                                <Badge variant="warning" className="bg-rose-50 text-rose-700 ring-rose-200">
                                  기한 지남
                                </Badge>
                              )}
                              {!item.is_overdue && item.is_due_today && (
                                <Badge variant="warning">오늘 마감</Badge>
                              )}
                              <span className="text-xs text-campus-500">{formatDueDate(item.due_date)}</span>
                            </div>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </section>

                <section className="rounded-[26px] border border-campus-200 bg-campus-50 px-5 py-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-campus-900">
                        {allChecked
                          ? '모든 추천 항목을 확인했습니다. 완료 버튼으로 실제 Todo에 반영할 수 있습니다.'
                          : '모든 항목을 확인하면 완료 버튼이 활성화됩니다.'}
                      </p>
                      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white ring-1 ring-inset ring-campus-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-400 transition-[width] duration-300"
                          style={{ width: `${selectionProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-campus-500">
                        현재 {checkedCount}개를 확인했고, 총 {totalCount}개를 적용할 수 있습니다.
                      </p>
                    </div>

                    <Button
                      type="button"
                      onClick={() => void handleApply()}
                      disabled={!allChecked || applyState === 'submitting'}
                      className={cn(
                        'min-w-[112px]',
                        !allChecked &&
                          'bg-campus-200 text-campus-500 shadow-none hover:brightness-100 focus-visible:outline-campus-300',
                      )}
                    >
                      {applyState === 'submitting' ? '적용 중...' : '완료'}
                    </Button>
                  </div>
                </section>
              </>
            )}

            <div className="flex flex-wrap gap-2">
              <Button asChild type="button" variant="ghost">
                <Link to="/teams">업무 화면으로 이동</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
