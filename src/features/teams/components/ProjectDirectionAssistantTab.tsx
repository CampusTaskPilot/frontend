import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useProjectDirectionOverview } from '../hooks/useProjectDirectionOverview'
import { ProjectDirectionOverviewPanel } from './ProjectDirectionOverviewPanel'

interface ProjectDirectionAssistantTabProps {
  teamId: string
  currentUserId: string | null
  isLeader: boolean
  onOpenTasks: () => void
  onOpenCalendar: () => void
}

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const restSeconds = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return '없음'
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

function resolveStatusLabel(status: string | undefined) {
  if (status === 'pending') return '대기 중'
  if (status === 'running') return '분석 중'
  if (status === 'cooldown') return '쿨다운'
  if (status === 'failed') return '실패'
  if (status === 'completed') return '완료'
  return '준비됨'
}

export function ProjectDirectionAssistantTab({
  teamId,
  currentUserId,
  isLeader: _isLeader,
  onOpenTasks,
  onOpenCalendar,
}: ProjectDirectionAssistantTabProps) {
  const { overview, jobStatus, isLoading, errorMessage, reload } = useProjectDirectionOverview(teamId, currentUserId)

  const remainingSeconds = jobStatus?.remaining_seconds ?? 0
  const isRunning = jobStatus?.status === 'pending' || jobStatus?.status === 'running'
  const isCooldown = jobStatus?.status === 'cooldown' || (!jobStatus?.can_trigger && remainingSeconds > 0)

  return (
    <div className="relative space-y-4">
      <div>
        <Card className="space-y-5 overflow-hidden border-brand-100 bg-gradient-to-br from-white via-campus-50 to-brand-50">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700">
              PM Assistant
            </span>
            <div className="space-y-2">
              <h2 className="font-display text-3xl text-campus-900">프로젝트의 다음 방향을 정리해보세요</h2>
              <p className="max-w-2xl text-sm leading-6 text-campus-600">
                현재 Task, Todo, 일정 데이터를 기준으로 저장된 방향 제안 결과를 확인할 수 있습니다. 이번 정리에서는
                실행 버튼과 시작 요청 흐름을 숨기고, 기존 결과와 서버 상태만 보여주도록 조정했습니다.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-campus-200 bg-white/80 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-campus-900">상태와 최근 기록은 서버 기준으로 표시됩니다</p>
              <p className="text-sm text-campus-600">
                저장된 최근 실행 시각과 남은 쿨다운 시간을 참고해 이전 분석 상태를 확인할 수 있습니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={onOpenTasks}>
                업무 보러가기
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-campus-200 bg-white px-4 py-3">
              <p className="text-xs text-campus-500">현재 상태</p>
              <p className="mt-1 font-semibold text-campus-900">{resolveStatusLabel(jobStatus?.status)}</p>
            </div>
            <div className="rounded-2xl border border-campus-200 bg-white px-4 py-3">
              <p className="text-xs text-campus-500">최근 실행</p>
              <p className="mt-1 font-semibold text-campus-900">{formatTimestamp(jobStatus?.latest_log?.started_at)}</p>
            </div>
            <div className="rounded-2xl border border-campus-200 bg-white px-4 py-3">
              <p className="text-xs text-campus-500">남은 쿨다운</p>
              <p className="mt-1 font-semibold text-campus-900">{remainingSeconds > 0 ? formatElapsed(remainingSeconds) : '없음'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-campus-200 bg-white/80 px-4 py-3 text-sm text-campus-700">
            방향 제안 실행 버튼은 현재 숨김 처리되어 있습니다. 이 탭에서는 저장된 결과와 서버 상태만 확인할 수 있습니다.
          </div>

          {isRunning ? (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
              이전에 시작된 방향 분석이 아직 진행 중입니다. 완료되면 저장된 결과가 자동으로 반영됩니다.
            </div>
          ) : null}

          {isCooldown ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <span>재실행 쿨다운 기록이 남아 있습니다.</span>
              <span className="font-medium tabular-nums">{formatElapsed(remainingSeconds)}</span>
            </div>
          ) : null}

          {jobStatus?.status === 'failed' && jobStatus.message ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              최근 분석이 실패 상태로 남아 있습니다. {jobStatus.message}
            </div>
          ) : null}

          {errorMessage && !isLoading && !overview ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          ) : null}
        </Card>

        <ProjectDirectionOverviewPanel
          teamId={teamId}
          currentUserId={currentUserId}
          overviewData={overview}
          isLoadingOverride={isLoading}
          errorMessageOverride={errorMessage}
          onReloadOverride={() => void reload()}
          title="최근 방향 제안"
          subtitle="현재 보이는 내용은 서버에 저장된 최신 방향 제안 결과입니다."
          emptyActionLabel=""
          emptyActionDisabled
          showReloadAction={false}
          hideAssistantAction
          onOpenAssistant={undefined}
          onOpenTasks={onOpenTasks}
          onOpenCalendar={onOpenCalendar}
        />
      </div>
    </div>
  )
}
