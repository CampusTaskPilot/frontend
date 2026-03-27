import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { Badge } from '../../../components/ui/Badge'
import { cn } from '../../../lib/cn'
import { useProjectDirectionOverview } from '../hooks/useProjectDirectionOverview'
import type {
  ProjectDirectionActionType,
  ProjectDirectionOverview,
  ProjectDirectionPriority,
  ProjectDirectionRecommendation,
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
  onOpenAssistant: () => void
  onOpenTasks?: () => void
  onOpenCalendar?: () => void
}

function statusLabel(status: ProjectDirectionStatus) {
  if (status === 'risk') return '일정 주의'
  if (status === 'warning') return '재정리 필요'
  return '안정적 진행'
}

function statusVariant(status: ProjectDirectionStatus) {
  if (status === 'risk') return 'warning' as const
  if (status === 'warning') return 'neutral' as const
  return 'success' as const
}

function priorityLabel(priority: ProjectDirectionPriority | undefined) {
  if (priority === 'high') return '우선'
  if (priority === 'medium') return '중요'
  return '가이드'
}

function priorityCardClass(priority: ProjectDirectionPriority | undefined) {
  if (priority === 'high') return 'border-rose-200 bg-rose-50/85'
  if (priority === 'medium') return 'border-amber-200 bg-amber-50/85'
  return 'border-campus-200 bg-white'
}

function formatUpdatedAt(value: string | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function triggerAction(
  actionType: ProjectDirectionActionType | undefined,
  handlers: {
    onOpenAssistant: () => void
    onOpenTasks?: () => void
    onOpenCalendar?: () => void
  },
) {
  if (actionType === 'open_tasks') {
    handlers.onOpenTasks?.()
    return
  }
  if (actionType === 'open_calendar') {
    handlers.onOpenCalendar?.()
    return
  }
  handlers.onOpenAssistant()
}

function LoadingState({ compact }: { compact: boolean }) {
  return (
    <Card className="overflow-hidden border-brand-100 bg-gradient-to-br from-white via-brand-50/70 to-campus-50 p-0">
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded-full bg-campus-200" />
          <div className="h-6 w-2/3 rounded-full bg-campus-200" />
          <div className="h-4 w-full rounded-full bg-campus-100" />
        </div>
        <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'md:grid-cols-2')}>
          {[0, 1].map((index) => (
            <div key={index} className="rounded-[24px] border border-campus-200 bg-white/90 p-4">
              <div className="h-3 w-16 rounded-full bg-campus-100" />
              <div className="mt-3 h-4 w-3/4 rounded-full bg-campus-200" />
              <div className="mt-2 h-4 w-full rounded-full bg-campus-100" />
              <div className="mt-2 h-4 w-5/6 rounded-full bg-campus-100" />
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
  onOpenAssistant: () => void
}) {
  return (
    <Card className="overflow-hidden border-brand-100 bg-gradient-to-br from-white via-brand-50 to-campus-50 p-0">
      <div className="relative p-5">
        <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-brand-200/30 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-20 w-20 rounded-full bg-accent-300/20 blur-2xl" />
        <div className="relative space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">{title}</p>
            <h3 className="font-display text-xl leading-tight text-campus-900">
              아직 저장된 프로젝트 방향 제안이 없어요
            </h3>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-sm">
            <p className="text-sm leading-6 text-campus-700">
              한 번도 방향 제안을 생성하지 않았다면 여기에는 추천 카드가 보이지 않습니다. PM Assistant의
              방향 제안 탭에서 현재 프로젝트 상황을 바탕으로 추천을 만들고 저장할 수 있어요.
            </p>
            <p className="mt-3 text-xs text-campus-500">{subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={onOpenAssistant} disabled={actionDisabled}>
              {actionLabel}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function RecommendationCard({
  recommendation,
  compact,
  onAction,
}: {
  recommendation: ProjectDirectionRecommendation
  compact: boolean
  onAction: () => void
}) {
  return (
    <div
      className={cn(
        'rounded-[24px] border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md',
        priorityCardClass(recommendation.priority),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Badge variant={recommendation.priority === 'high' ? 'warning' : recommendation.priority === 'medium' ? 'neutral' : 'success'}>
          {priorityLabel(recommendation.priority)}
        </Badge>
      </div>
      <h4 className="mt-4 text-sm font-semibold leading-6 text-campus-900">{recommendation.title}</h4>
      <p className="mt-2 text-sm leading-6 text-campus-600">{recommendation.description}</p>
      {recommendation.actionLabel && (
        <div className="mt-4">
          <Button type="button" size="sm" variant={compact ? 'ghost' : 'subtle'} onClick={onAction}>
            {recommendation.actionLabel}
          </Button>
        </div>
      )}
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
  onOpenTasks,
  onOpenCalendar,
  hideAssistantAction,
}: {
  overview: ProjectDirectionOverview
  compact: boolean
  title: string
  subtitle: string
  showReloadAction: boolean
  onReload: () => void
  onOpenAssistant: () => void
  onOpenTasks?: () => void
  onOpenCalendar?: () => void
  hideAssistantAction?: boolean
}) {
  return (
    <Card className="overflow-hidden border-brand-100 bg-gradient-to-br from-white via-brand-50/70 to-campus-50 p-0">
      <div className="space-y-5 p-5">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">{title}</p>
              <h3 className="font-display text-xl leading-tight text-campus-900">{overview.headline}</h3>
              <p className="text-sm text-campus-500">{subtitle}</p>
            </div>
            <Badge variant={statusVariant(overview.status)}>{statusLabel(overview.status)}</Badge>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/85 p-4 shadow-sm">
            <p className="text-sm leading-6 text-campus-700">{overview.summary}</p>
            {overview.updatedAt && (
              <p className="mt-3 text-xs text-campus-500">마지막 저장 {formatUpdatedAt(overview.updatedAt)}</p>
            )}
          </div>
        </div>

        <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'md:grid-cols-2')}>
          {overview.recommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              compact={compact}
              onAction={() =>
                triggerAction(recommendation.actionType, {
                  onOpenAssistant,
                  onOpenTasks,
                  onOpenCalendar,
                })
              }
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-3 border-t border-campus-200/70 pt-1">
          {!hideAssistantAction && (
            <Button type="button" variant="subtle" onClick={onOpenAssistant}>
              PM Assistant에서 보기
            </Button>
          )}
          {showReloadAction && (
            <Button type="button" variant="ghost" onClick={onReload}>
              새로고침
            </Button>
          )}
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
  title = 'AI 방향 제안',
  subtitle = '현재 프로젝트 흐름을 기준으로 저장된 방향 제안을 보여드려요.',
  compact = false,
  emptyActionLabel = 'PM Assistant에서 추천 받기',
  emptyActionDisabled = false,
  showReloadAction = true,
  hideAssistantAction = false,
  collapsible = false,
  defaultCollapsed = false,
  onOpenAssistant,
  onOpenTasks,
  onOpenCalendar,
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
              {overview ? overview.headline : '저장된 방향 제안이 없으면 PM Assistant에서 생성할 수 있어요.'}
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
    return (
      <div className="space-y-3">
        {collapsible && (
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => setIsCollapsed(true)}>
              접기
            </Button>
          </div>
        )}
        <LoadingState compact={compact} />
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="space-y-3">
        {collapsible && (
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => setIsCollapsed(true)}>
              접기
            </Button>
          </div>
        )}
        <Card className="space-y-4 border-rose-200 bg-rose-50">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-600">{title}</p>
            <h3 className="font-display text-xl text-campus-900">방향 제안을 불러오지 못했어요</h3>
            <p className="text-sm leading-6 text-rose-700">{errorMessage}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="ghost" onClick={() => void reload()}>
              다시 시도
            </Button>
            <Button type="button" onClick={onOpenAssistant}>
              PM Assistant 열기
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!overview) {
    return (
      <div className="space-y-3">
        {collapsible && (
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => setIsCollapsed(true)}>
              접기
            </Button>
          </div>
        )}
        <EmptyState
          title={title}
          subtitle={subtitle}
          actionLabel={emptyActionLabel}
          actionDisabled={emptyActionDisabled}
          onOpenAssistant={onOpenAssistant}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {collapsible && (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="ghost" onClick={() => setIsCollapsed(true)}>
            접기
          </Button>
        </div>
      )}
      <SuccessState
        overview={overview}
        compact={compact}
        title={title}
        subtitle={subtitle}
        showReloadAction={showReloadAction}
        onReload={() => void reload()}
        onOpenAssistant={onOpenAssistant}
        onOpenTasks={onOpenTasks}
        onOpenCalendar={onOpenCalendar}
        hideAssistantAction={hideAssistantAction || collapsible}
      />
    </div>
  )
}
