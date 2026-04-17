import { useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { useProjectDirectionOverview } from '../hooks/useProjectDirectionOverview'
import type {
  ProjectDirectionActionItem,
  ProjectDirectionDiagnosisItem,
  ProjectDirectionOverview,
  ProjectDirectionSeverity,
  ProjectDirectionStatus,
} from '../types/team'

interface ProjectDirectionOverviewPanelProps {
  teamId: string
  currentUserId: string | null
  overviewData?: ProjectDirectionOverview | null
  isLoadingOverride?: boolean
  errorMessageOverride?: string
  onReloadOverride?: () => Promise<void> | void
  title?: string
  subtitle?: string
  compact?: boolean
  emptyActionLabel?: string
  emptyActionDisabled?: boolean
  showReloadAction?: boolean
  hideAssistantAction?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
  onOpenAssistant?: () => void
  onOpenTasks?: () => void
  onOpenCalendar?: () => void
}

function statusLabel(status: ProjectDirectionStatus) {
  if (status === 'risk') return '리스크'
  if (status === 'warning') return '주의'
  return '안정'
}

function statusVariant(status: ProjectDirectionStatus) {
  if (status === 'risk') return 'warning' as const
  if (status === 'warning') return 'neutral' as const
  return 'success' as const
}

function severityVariant(severity: ProjectDirectionSeverity) {
  if (severity === 'high') return 'warning' as const
  if (severity === 'medium') return 'neutral' as const
  return 'success' as const
}

function importanceLabel(importance: ProjectDirectionActionItem['importance']) {
  if (importance === 'urgent') return '지금'
  if (importance === 'important') return '이번 주'
  return '다음'
}

function diagnosisCardClass(severity: ProjectDirectionSeverity) {
  if (severity === 'high') return 'border-rose-200 bg-rose-50/90'
  if (severity === 'medium') return 'border-amber-200 bg-amber-50/85'
  return 'border-emerald-200 bg-emerald-50/85'
}

function actionCardClass(importance: ProjectDirectionActionItem['importance']) {
  if (importance === 'urgent') return 'border-campus-900 bg-campus-900 text-white'
  if (importance === 'important') return 'border-brand-200 bg-brand-50/80'
  return 'border-campus-200 bg-white'
}

function LoadingState({ compact }: { compact: boolean }) {
  return (
    <Card className="overflow-hidden border-brand-100 bg-gradient-to-br from-white via-brand-50/70 to-campus-50 p-0">
      <div className="space-y-4 p-5">
        <div className="h-6 w-1/2 rounded-full bg-campus-200" />
        <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'md:grid-cols-2')}>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} className="rounded-[24px] border border-campus-200 bg-white/90 p-4">
              <div className="h-3 w-16 rounded-full bg-campus-100" />
              <div className="mt-3 h-4 w-3/4 rounded-full bg-campus-200" />
              <div className="mt-2 h-4 w-full rounded-full bg-campus-100" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

function EmptyState({
  title,
  subtitle,
  actionLabel,
  actionDisabled,
  onOpenAssistant,
}: {
  title: string
  subtitle: string
  actionLabel: string
  actionDisabled: boolean
  onOpenAssistant?: () => void
}) {
  return (
    <Card className="overflow-hidden border-brand-100 bg-gradient-to-br from-white via-brand-50 to-campus-50 p-0">
      <div className="relative p-5">
        <div className="relative space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">{title}</p>
            <h3 className="font-display text-xl leading-tight text-campus-900">저장된 방향 브리프가 아직 없습니다</h3>
          </div>
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-sm">
            <p className="text-sm leading-6 text-campus-700">{subtitle}</p>
          </div>
          {onOpenAssistant ? (
            <Button type="button" onClick={onOpenAssistant} disabled={actionDisabled}>
              {actionLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function DirectionCard({ overview }: { overview: ProjectDirectionOverview }) {
  return (
    <div className="overflow-hidden rounded-[30px] border border-brand-200 bg-gradient-to-br from-brand-50 via-white to-campus-50 shadow-sm">
      <div className="relative p-5">
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-brand-200 bg-white/90 px-3 py-1 text-xs font-semibold text-brand-700">
              다음 방향
            </span>
            <Badge variant={statusVariant(overview.status)}>{statusLabel(overview.status)}</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[24px] border border-white/80 bg-white/85 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-campus-500">현재 단계</p>
              <p className="mt-2 text-lg font-semibold text-campus-900">{overview.projectSummary.phase}</p>
            </div>
            <div className="rounded-[24px] border border-brand-200 bg-brand-50/75 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">단기 목표</p>
              <p className="mt-2 text-lg font-semibold leading-7 text-campus-900">{overview.projectSummary.shortTermGoal}</p>
            </div>
          </div>
          {overview.projectSummary.keyMetrics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {overview.projectSummary.keyMetrics.map((metric) => (
                <span key={metric} className="rounded-full border border-campus-200 bg-white px-3 py-1 text-xs font-medium text-campus-700">
                  {metric}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DiagnosisCard({ item }: { item: ProjectDirectionDiagnosisItem }) {
  return (
    <div className={cn('rounded-[24px] border p-4 shadow-sm', diagnosisCardClass(item.severity))}>
      <div className="space-y-3">
        <Badge variant={severityVariant(item.severity)}>
          {item.severity === 'high' ? '높음' : item.severity === 'medium' ? '중간' : '낮음'}
        </Badge>
        <h5 className="text-sm font-semibold text-campus-900">{item.title}</h5>
      </div>
      <p className="mt-3 text-sm leading-6 text-campus-700">{item.description}</p>
    </div>
  )
}

function ActionCard({ item }: { item: ProjectDirectionActionItem }) {
  const isUrgent = item.importance === 'urgent'
  return (
    <div className={cn('rounded-[24px] border p-4 shadow-sm', actionCardClass(item.importance))}>
      <div className="flex items-start justify-between gap-3">
        <Badge variant={isUrgent ? 'warning' : item.importance === 'important' ? 'neutral' : 'success'}>
          {importanceLabel(item.importance)}
        </Badge>
      </div>
      <h5 className={cn('mt-4 text-sm font-semibold', isUrgent ? 'text-white' : 'text-campus-900')}>{item.title}</h5>
      <p className={cn('mt-2 text-sm leading-6', isUrgent ? 'text-white/85' : 'text-campus-700')}>{item.description}</p>
    </div>
  )
}

function SuccessState({
  overview,
  compact,
  title,
  subtitle,
  showReloadAction,
  onReload,
  onOpenAssistant,
  hideAssistantAction,
}: {
  overview: ProjectDirectionOverview
  compact: boolean
  title: string
  subtitle: string
  showReloadAction: boolean
  onReload: () => void
  onOpenAssistant?: () => void
  hideAssistantAction?: boolean
}) {
  const [showMeetingFocus, setShowMeetingFocus] = useState(false)

  return (
    <Card className="overflow-hidden border-brand-100 bg-gradient-to-br from-white via-brand-50/70 to-campus-50 p-0">
      <div className="space-y-6 p-5">
        <DirectionCard overview={overview} />

        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">{title}</p>
          <h3 className="font-display text-xl leading-tight text-campus-900">{overview.headline}</h3>
          <p className="text-sm text-campus-500">{subtitle}</p>
          <p className="text-sm leading-6 text-campus-700">{overview.summary}</p>
        </div>

        {overview.diagnosis.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-campus-900">핵심 진단</h4>
            <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'md:grid-cols-2')}>
              {overview.diagnosis.map((item, index) => (
                <DiagnosisCard key={`${item.title}-${index}`} item={item} />
              ))}
            </div>
          </div>
        ) : null}

        {overview.actions.length > 0 ? (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-campus-900">추천 액션</h4>
            <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'md:grid-cols-2')}>
              {overview.actions.map((item, index) => (
                <ActionCard key={`${item.title}-${index}`} item={item} />
              ))}
            </div>
          </div>
        ) : null}

        {overview.meetingFocus.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-[20px] border border-campus-200 bg-white/75 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-campus-900">회의 포인트</p>
                <p className="text-xs text-campus-500">필요할 때만 펼쳐서 확인할 수 있습니다.</p>
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowMeetingFocus((value) => !value)}>
                {showMeetingFocus ? '숨기기' : '보기'}
              </Button>
            </div>
            {showMeetingFocus ? (
              <div className="rounded-[24px] border border-campus-200 bg-white/90 p-4 shadow-sm">
                <ul className="space-y-2 text-sm leading-6 text-campus-700">
                  {overview.meetingFocus.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 border-t border-campus-200/70 pt-1">
          {!hideAssistantAction && onOpenAssistant ? (
            <Button type="button" variant="subtle" onClick={onOpenAssistant}>
              PM Assistant에서 보기
            </Button>
          ) : null}
          {showReloadAction ? (
            <Button type="button" variant="ghost" onClick={onReload}>
              새로고침
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

export function ProjectDirectionOverviewPanel({
  teamId,
  currentUserId,
  overviewData,
  isLoadingOverride,
  errorMessageOverride,
  onReloadOverride,
  title = 'AI 방향 브리프',
  subtitle = '지금 팀 상태를 바탕으로 정리한 PM 브리프를 보여줍니다.',
  compact = false,
  emptyActionLabel = 'PM Assistant에서 확인하기',
  emptyActionDisabled = false,
  showReloadAction = true,
  hideAssistantAction = false,
  collapsible = false,
  defaultCollapsed = false,
  onOpenAssistant,
}: ProjectDirectionOverviewPanelProps) {
  const useExternalState =
    overviewData !== undefined || isLoadingOverride !== undefined || errorMessageOverride !== undefined || onReloadOverride !== undefined
  const hookResult = useProjectDirectionOverview(teamId, currentUserId, !useExternalState)
  const overview = overviewData ?? hookResult.overview
  const isLoading = isLoadingOverride ?? hookResult.isLoading
  const errorMessage = errorMessageOverride ?? hookResult.errorMessage
  const reload = onReloadOverride ?? hookResult.reload
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  if (collapsible && isCollapsed) {
    return (
      <Card className="border-brand-100 bg-gradient-to-r from-white via-brand-50/70 to-campus-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">{title}</p>
            <p className="mt-1 truncate text-sm text-campus-600">
              {overview ? overview.headline : '저장된 방향 브리프가 없으면 PM Assistant에서 확인할 수 있습니다.'}
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setIsCollapsed(false)}>
            펼치기
          </Button>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return <LoadingState compact={compact} />
  }

  if (errorMessage) {
    return (
      <Card className="space-y-4 border-rose-200 bg-rose-50">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">{title}</p>
          <h3 className="font-display text-xl text-campus-900">방향 브리프를 불러오지 못했습니다</h3>
          <p className="text-sm leading-6 text-rose-700">{errorMessage}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="ghost" onClick={() => void reload()}>
            다시 시도
          </Button>
          {!hideAssistantAction && onOpenAssistant ? (
            <Button type="button" onClick={onOpenAssistant}>
              PM Assistant 열기
            </Button>
          ) : null}
        </div>
      </Card>
    )
  }

  if (!overview) {
    return (
      <EmptyState
        title={title}
        subtitle={subtitle}
        actionLabel={emptyActionLabel}
        actionDisabled={emptyActionDisabled}
        onOpenAssistant={!hideAssistantAction ? onOpenAssistant : undefined}
      />
    )
  }

  return (
    <div className="space-y-3">
      {collapsible ? (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="ghost" onClick={() => setIsCollapsed(true)}>
            접기
          </Button>
        </div>
      ) : null}
      <SuccessState
        overview={overview}
        compact={compact}
        title={title}
        subtitle={subtitle}
        showReloadAction={showReloadAction}
        onReload={() => void reload()}
        onOpenAssistant={onOpenAssistant}
        hideAssistantAction={hideAssistantAction || collapsible}
      />
    </div>
  )
}
