import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { useRef } from 'react'
import { useCallback } from 'react'
import { Card } from '../../../components/ui/Card'
import { useImeSafeSubmit } from '../../../hooks/useImeSafeSubmit'
import { cn } from '../../../lib/cn'
import { formatDateRangeWithWeekday, getPresetDateRange, validateCustomDateRange } from '../lib/reportDateRange'
import { fetchPMReportStatus, PMReportApiError, requestPMReport } from '../lib/reportWriter'
import type {
  PMReportCooldownStatus,
  PMReportResponse,
  PMReportScope,
  PMReportTaskItem,
  ReportPeriodPreset,
} from '../types/team'

interface ReportWriterTabProps {
  teamId: string
  currentUserId: string | null
}

const REPORT_SCOPE_OPTIONS: Array<{ value: PMReportScope; label: string; helper: string }> = [
  { value: 'team', label: '전체 보고서', helper: '팀 전체 업무 현황 기준' },
  { value: 'personal', label: '개인 보고서', helper: '내 담당 업무 진행 현황 기준' },
]

const PRESET_OPTIONS: Array<{ value: ReportPeriodPreset; label: string; helper: string }> = [
  { value: 'this_week', label: '이번주', helper: '이번주 월요일부터 오늘까지' },
  { value: 'last_week', label: '지난주', helper: '지난주 월요일부터 일요일까지' },
  { value: 'custom', label: '직접 선택', helper: '원하는 기간 지정' },
]

function statusLabel(status: PMReportTaskItem['status']) {
  if (status === 'done') return '완료'
  if (status === 'in_progress') return '진행 중'
  return '대기'
}

function priorityLabel(priority: PMReportTaskItem['priority']) {
  if (priority === 'high') return '높음'
  if (priority === 'low') return '낮음'
  return '보통'
}

function inclusionReasonLabel(reason: PMReportTaskItem['inclusion_reasons'][number]) {
  if (reason === 'due_date_in_range') return '기간 내 마감'
  if (reason === 'task_updated_in_range') return 'task 수정 발생'
  return 'todo 변경 발생'
}

function formatDateTime(value: string | null) {
  if (!value) return '미정'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function formatCooldownMinutes(seconds: number) {
  return Math.max(Math.ceil(seconds / 60), 0)
}

function ProgressBar({ value }: { value: number }) {
  const percent = Math.round(value * 100)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-campus-500">
        <span>todo 진행률</span>
        <span>{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-campus-100">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-brand-500 via-brand-400 to-accent-400 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

function SummaryMetric({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string | number
  tone?: 'default' | 'brand' | 'soft'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3',
        tone === 'brand' && 'border-brand-200 bg-brand-50',
        tone === 'soft' && 'border-campus-200 bg-campus-50',
        tone === 'default' && 'border-campus-200 bg-white',
      )}
    >
      <p className="text-[11px] uppercase tracking-[0.18em] text-campus-500">{label}</p>
      <p className="mt-1 font-display text-2xl text-campus-900">{value}</p>
    </div>
  )
}

function TaskSummaryCard({ task }: { task: PMReportTaskItem }) {
  const assignee = task.assignee?.full_name || task.assignee?.email || task.assignee?.id || '미지정'

  return (
    <div className="rounded-3xl border border-campus-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-campus-100 px-3 py-1 text-xs font-semibold text-campus-700">
              {statusLabel(task.status)}
            </span>
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              우선순위 {priorityLabel(task.priority)}
            </span>
            <span className="rounded-full bg-campus-100 px-3 py-1 text-xs font-semibold text-campus-700">
              마감 {task.due_date ? formatDateTime(task.due_date) : '미정'}
            </span>
          </div>

          <div>
            <h4 className="font-display text-xl text-campus-900">{task.title}</h4>
            <p className="mt-1 text-sm text-campus-600">담당자 {assignee}</p>
            <p className="mt-2 text-sm leading-6 text-campus-700">
              {task.description || '설명은 아직 등록되지 않았습니다.'}
            </p>
          </div>
        </div>

        <div className="min-w-full rounded-3xl border border-campus-200 bg-campus-50 p-4 xl:min-w-[320px]">
          <div className="space-y-3">
            <ProgressBar value={task.progress_ratio} />
            <div className="grid grid-cols-2 gap-3 text-sm text-campus-700">
              <div className="rounded-2xl bg-white px-3 py-3">
                <p className="text-xs text-campus-500">전체 todo</p>
                <p className="mt-1 font-semibold text-campus-900">{task.todo_total_count}</p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3">
                <p className="text-xs text-campus-500">기간 내 변경</p>
                <p className="mt-1 font-semibold text-campus-900">{task.changed_todo_count_in_period}</p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3">
                <p className="text-xs text-campus-500">완료 todo</p>
                <p className="mt-1 font-semibold text-campus-900">{task.todo_completed_count}</p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-3">
                <p className="text-xs text-campus-500">남은 todo</p>
                <p className="mt-1 font-semibold text-campus-900">{task.todo_pending_count}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {task.inclusion_reasons.map((reason) => (
          <span
            key={`${task.id}-${reason}`}
            className="rounded-full border border-campus-200 bg-campus-50 px-3 py-1 text-xs font-medium text-campus-700"
          >
            포함 사유: {inclusionReasonLabel(reason)}
          </span>
        ))}
      </div>
    </div>
  )
}

function ReportSectionCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-campus-200 bg-campus-50 p-5">
      <h4 className="font-display text-xl text-campus-900">{title}</h4>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-campus-700">{body}</p>
    </div>
  )
}

function FullReportPreview({ reportResult }: { reportResult: PMReportResponse }) {
  const scopeLabel = reportResult.report_scope === 'personal' ? '개인' : '전체'
  const fullText = [
    `${scopeLabel} ${reportResult.report_label} PM 보고서`,
    `보고 기간: ${reportResult.report_period_label}`,
    `기준: ${reportResult.criteria_description}`,
    '',
    '[전체 요약]',
    reportResult.report_sections.summary,
    '',
    '[완료된 업무]',
    reportResult.report_sections.completed,
    '',
    '[진행 중 업무]',
    reportResult.report_sections.in_progress,
    '',
    '[리스크 및 확인 필요 사항]',
    reportResult.report_sections.risks,
    '',
    '[다음 액션]',
    reportResult.report_sections.next_actions,
  ].join('\n')

  return (
    <div className="rounded-3xl border border-campus-200 bg-white p-5">
      <h4 className="font-display text-xl text-campus-900">제출용 보고서 미리보기</h4>
      <pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-campus-800">{fullText}</pre>
    </div>
  )
}

export function ReportWriterTab({ teamId, currentUserId }: ReportWriterTabProps) {
  const ime = useImeSafeSubmit()
  const initialRange = useMemo(() => getPresetDateRange('this_week'), [])

  const [reportScope, setReportScope] = useState<PMReportScope>('team')
  const [preset, setPreset] = useState<ReportPeriodPreset>('this_week')
  const [startDate, setStartDate] = useState(initialRange.startDate)
  const [endDate, setEndDate] = useState(initialRange.endDate)
  const [reportResult, setReportResult] = useState<PMReportResponse | null>(null)
  const [cooldownStatus, setCooldownStatus] = useState<PMReportCooldownStatus | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isActiveRef = useRef(false)

  useEffect(() => {
    isActiveRef.current = true

    return () => {
      isActiveRef.current = false
    }
  }, [])

  const refreshCooldownStatus = useCallback(async (signal?: AbortSignal) => {
    if (!isActiveRef.current) {
      return null
    }

    if (reportScope === 'personal' && !currentUserId) {
      setCooldownStatus(null)
      return null
    }

    const result = await fetchPMReportStatus({
      teamId,
      reportScope,
      userId: currentUserId,
      signal,
    })
    if (!isActiveRef.current || signal?.aborted) {
      return null
    }
    setCooldownStatus(result)
    return result
  }, [currentUserId, reportScope, teamId])

  useEffect(() => {
    if (preset === 'custom') return
    const nextRange = getPresetDateRange(preset)
    setStartDate(nextRange.startDate)
    setEndDate(nextRange.endDate)
  }, [preset])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadCooldownStatus() {
      try {
        await refreshCooldownStatus(controller.signal)
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          return
        }
        if (isMounted) {
          setCooldownStatus(null)
        }
      }
    }

    void loadCooldownStatus()
    return () => {
      isMounted = false
      controller.abort()
    }
  }, [refreshCooldownStatus])

  useEffect(() => {
    if (!cooldownStatus?.cooldown_until) return

    const timer = window.setInterval(() => {
      setCooldownStatus((current) => {
        if (!current?.cooldown_until) return current

        const remainingSeconds = Math.max(
          Math.ceil((new Date(current.cooldown_until).getTime() - Date.now()) / 1000),
          0,
        )

        return {
          ...current,
          can_trigger: remainingSeconds === 0,
          cooldown_remaining_seconds: remainingSeconds,
        }
      })
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldownStatus?.cooldown_until])

  useEffect(() => {
    if (!cooldownStatus) return
    const isServerJobRunning =
      cooldownStatus.status === 'pending' || cooldownStatus.status === 'running'
    if (!isServerJobRunning) return

    let controller: AbortController | null = null
    const timer = window.setInterval(() => {
      if (!isActiveRef.current) return

      controller?.abort()
      controller = new AbortController()
      void refreshCooldownStatus(controller.signal).catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
      })
    }, 5000)

    return () => {
      window.clearInterval(timer)
      controller?.abort()
    }
  }, [cooldownStatus?.status, refreshCooldownStatus])

  const customValidationError = preset === 'custom' ? validateCustomDateRange(startDate, endDate) : ''
  const scopeValidationError =
    reportScope === 'personal' && !currentUserId
      ? '개인 보고서를 생성하려면 로그인된 사용자 정보가 필요합니다.'
      : ''
  const isReportRunning = cooldownStatus?.status === 'pending' || cooldownStatus?.status === 'running'
  const isReportCooldown = cooldownStatus?.status === 'cooldown' || (
    Boolean(cooldownStatus) &&
    !isReportRunning &&
    !cooldownStatus?.can_trigger &&
    (cooldownStatus?.cooldown_remaining_seconds ?? 0) > 0
  )
  const cooldownValidationError =
    isReportRunning
      ? '보고서 생성이 진행 중입니다. 완료될 때까지 다시 요청할 수 없습니다.'
      : isReportCooldown && cooldownStatus && cooldownStatus.cooldown_remaining_seconds > 0
      ? `다시 생성까지 ${formatCooldownMinutes(cooldownStatus.cooldown_remaining_seconds)}분 남았습니다.`
      : ''
  const isCustomMode = preset === 'custom'
  const canSubmit =
    !isSubmitting &&
    Boolean(startDate) &&
    Boolean(endDate) &&
    !customValidationError &&
    !scopeValidationError &&
    !cooldownValidationError
  const periodLabel = formatDateRangeWithWeekday(startDate, endDate)

  async function handleSubmit() {
    if (!canSubmit) return

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const latestStatus = await refreshCooldownStatus()
      if (
        latestStatus &&
        (!latestStatus.can_trigger ||
          latestStatus.status === 'pending' ||
          latestStatus.status === 'running' ||
          latestStatus.status === 'cooldown')
      ) {
        setErrorMessage(latestStatus.message || '이미 보고서 생성이 진행 중이거나 쿨다운 중입니다.')
        setReportResult(null)
        return
      }

      const result = await requestPMReport({
        teamId,
        reportScope,
        userId: currentUserId,
        startDate,
        endDate,
      })
      setReportResult(result)
      setCooldownStatus({
        can_trigger: false,
        status: 'cooldown',
        cooldown_minutes: result.cooldown_minutes,
        cooldown_remaining_seconds: result.cooldown_remaining_seconds,
        cooldown_until: result.cooldown_until,
        latest_log: null,
        message: null,
      })
      void refreshCooldownStatus().catch(() => undefined)
    } catch (error) {
      if (error instanceof PMReportApiError && error.payload?.detail && typeof error.payload.detail === 'object') {
        const detail = error.payload.detail
        if (typeof detail.cooldown_remaining_seconds === 'number') {
          setCooldownStatus({
            can_trigger: Boolean(detail.can_trigger),
            status: detail.status ?? (detail.can_trigger ? 'completed' : 'cooldown'),
            cooldown_minutes: detail.cooldown_minutes ?? 60,
            cooldown_remaining_seconds: detail.cooldown_remaining_seconds,
            cooldown_until: detail.cooldown_until ?? null,
            latest_log: null,
            message: detail.message ?? null,
          })
        }
      }
      setErrorMessage(error instanceof Error ? error.message : 'PM 보고서 생성에 실패했습니다.')
      setReportResult(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative space-y-4">
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 px-4 py-8 backdrop-blur-[3px]">
          <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-white px-6 py-6 text-center shadow-xl">
            <div className="mx-auto flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-brand-100 border-t-brand-500" />
            <p className="mt-4 font-medium text-campus-900">보고서를 생성하고 있습니다...</p>
            <p className="mt-2 text-sm leading-6 text-campus-600">
              선택한 기간의 업무와 todo, 일정 정보를 모아 보고서 초안을 정리하는 중입니다. 잠시만 기다려 주세요.
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          'space-y-4 transition-opacity',
          isSubmitting && 'pointer-events-none select-none opacity-60',
        )}
        aria-busy={isSubmitting}
      >
      <Card className="space-y-5">
        <div className="space-y-2">
          <h2 className="font-display text-2xl text-campus-900">보고서 작성</h2>
          <p className="text-sm leading-6 text-campus-600">
            마감일뿐 아니라 선택 기간 안의 실제 변경 흔적까지 반영해, 전체 또는 개인 기준의 PM 보고서를 생성합니다.
          </p>
          <div className="rounded-3xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            보고서 기준: 선택 기간 내 마감 또는 진행 흔적이 있는 업무 현황
          </div>
        </div>

        <form className="space-y-5" onSubmit={ime.createSubmitHandler(handleSubmit)} noValidate>
          <div className="grid gap-3 md:grid-cols-2">
            {REPORT_SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setReportScope(option.value)}
                className={cn(
                  'rounded-3xl border px-4 py-4 text-left transition',
                  reportScope === option.value
                    ? 'border-brand-200 bg-brand-50 shadow-sm'
                    : 'border-campus-200 bg-white hover:border-campus-300',
                )}
              >
                <p className="text-sm font-semibold text-campus-900">{option.label}</p>
                <p className="mt-1 text-xs leading-5 text-campus-600">{option.helper}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {PRESET_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPreset(option.value)}
                className={cn(
                  'rounded-3xl border px-4 py-4 text-left transition',
                  preset === option.value
                    ? 'border-brand-200 bg-brand-50 shadow-sm'
                    : 'border-campus-200 bg-white hover:border-campus-300',
                )}
              >
                <p className="text-sm font-semibold text-campus-900">{option.label}</p>
                <p className="mt-1 text-xs leading-5 text-campus-600">{option.helper}</p>
              </button>
            ))}
          </div>

          <div className="rounded-[28px] border border-campus-200 bg-campus-50 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-campus-500">선택된 기간</p>
                <p className="mt-2 font-display text-2xl text-campus-900">
                  {periodLabel || '기간을 선택해 주세요.'}
                </p>
              </div>
              <div className="rounded-full border border-campus-200 bg-white px-4 py-2 text-sm text-campus-700">
                {reportScope === 'team' ? '팀 전체 기준' : '개인 기준'}
              </div>
            </div>
            <p className="mt-3 text-sm text-campus-600">
              {isCustomMode
                ? '직접 선택 모드에서는 시작일과 종료일을 모두 입력해야 생성할 수 있습니다.'
                : '이번주/지난주 모드에서는 기간이 자동 계산되며 날짜 입력은 잠겨 있습니다.'}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>시작일</span>
              <input
                type="date"
                value={startDate}
                disabled={!isCustomMode}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-campus-100 disabled:text-campus-500"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>종료일</span>
              <input
                type="date"
                value={endDate}
                disabled={!isCustomMode}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-campus-100 disabled:text-campus-500"
              />
            </label>
          </div>

          {customValidationError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {customValidationError}
            </div>
          )}
          {scopeValidationError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {scopeValidationError}
            </div>
          )}
          {cooldownValidationError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              {cooldownValidationError}
            </div>
          )}
          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" onMouseDown={ime.preventBlurOnMouseDown} disabled={!canSubmit}>
              {isSubmitting
                ? '보고서 생성 중...'
                : isReportRunning
                  ? '보고서 생성 중...'
                : cooldownValidationError
                  ? `${formatCooldownMinutes(cooldownStatus?.cooldown_remaining_seconds ?? 0)}분 후 다시 생성`
                  : '보고서 생성'}
            </Button>
          </div>
        </form>
      </Card>

      {reportResult && (
        <>
          <Card className="space-y-5 overflow-hidden">
            <div className="rounded-[28px] border border-campus-200 bg-gradient-to-br from-white via-campus-50 to-brand-50 p-5">
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.95fr)] xl:items-start">
                <div className="max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-medium text-brand-700">
                      {reportResult.report_scope === 'personal' ? '개인 보고서' : '전체 보고서'}
                    </span>
                    <span className="rounded-full border border-campus-200 bg-white/80 px-3 py-1 text-xs font-medium text-campus-700">
                      생성 방식 {reportResult.report_source === 'llm' ? 'LLM' : 'Fallback'}
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-3xl text-campus-900">보고서 결과</h3>
                  <p className="mt-2 text-sm leading-6 text-campus-600">{reportResult.criteria_description}</p>
                  <p className="mt-4 text-base text-campus-900">{reportResult.report_period_label}</p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:self-start">
                  <SummaryMetric label="대상 업무" value={reportResult.total_task_count} tone="brand" />
                  <SummaryMetric label="기간 내 일정" value={reportResult.total_calendar_event_count} tone="soft" />
                  <SummaryMetric label="완료" value={reportResult.status_summary.done} />
                  <SummaryMetric label="진행 중" value={reportResult.status_summary.in_progress} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-campus-200/70 pt-4">
                <div className="rounded-full border border-campus-200 bg-white/80 px-4 py-2 text-sm text-campus-700">
                  대기 업무 <span className="font-semibold text-campus-900">{reportResult.status_summary.todo}건</span>
                </div>
                <div className="rounded-full border border-campus-200 bg-white/80 px-4 py-2 text-sm text-campus-700">
                  보고 범위 <span className="font-semibold text-campus-900">{reportResult.report_scope === 'personal' ? '개인' : '전체'}</span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <ReportSectionCard title="전체 요약" body={reportResult.report_sections.summary} />
              <ReportSectionCard title="완료된 업무" body={reportResult.report_sections.completed} />
              <ReportSectionCard title="진행 중 업무" body={reportResult.report_sections.in_progress} />
              <ReportSectionCard title="리스크 및 확인 필요 사항" body={reportResult.report_sections.risks} />
              <div className="xl:col-span-2">
                <ReportSectionCard title="다음 액션" body={reportResult.report_sections.next_actions} />
              </div>
            </div>

            <FullReportPreview reportResult={reportResult} />

            {reportResult.calendar_events.length > 0 && (
              <div className="rounded-3xl border border-campus-200 bg-campus-50 p-5">
                <h4 className="font-display text-xl text-campus-900">기간 내 일정</h4>
                <ul className="mt-3 space-y-2 text-sm text-campus-700">
                  {reportResult.calendar_events.map((event) => (
                    <li key={event.id}>
                      • {event.event_date} / {event.title} / {event.type}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="space-y-1">
              <h3 className="font-display text-2xl text-campus-900">대상 업무 상세</h3>
              <p className="text-sm text-campus-600">
                포함 대상 업무는 마감 기준과 실제 진행 흔적 기준을 함께 반영하며, todo 수준의 진행 정보까지 같이 표시됩니다.
              </p>
            </div>

            {reportResult.tasks.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-campus-200 bg-campus-50 px-4 py-8 text-sm text-campus-500">
                선택 기간에 포함할 업무가 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {reportResult.tasks.map((task) => (
                  <TaskSummaryCard key={task.id} task={task} />
                ))}
              </div>
            )}
          </Card>
        </>
      )}
      </div>
    </div>
  )
}

