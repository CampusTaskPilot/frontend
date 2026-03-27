import { useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import {
  generateProjectDirectionOverview,
  notifyProjectDirectionOverviewUpdated,
} from '../lib/projectDirectionOverview'
import { useProjectDirectionOverview } from '../hooks/useProjectDirectionOverview'
import { ProjectDirectionOverviewPanel } from './ProjectDirectionOverviewPanel'

interface ProjectDirectionAssistantTabProps {
  teamId: string
  currentUserId: string | null
  isLeader: boolean
  onOpenTasks: () => void
  onOpenCalendar: () => void
}

export function ProjectDirectionAssistantTab({
  teamId,
  currentUserId,
  isLeader,
  onOpenTasks,
  onOpenCalendar,
}: ProjectDirectionAssistantTabProps) {
  const { overview, isLoading, errorMessage, reload } = useProjectDirectionOverview(teamId, currentUserId)
  const [isGenerating, setIsGenerating] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')

  const actionLabel = useMemo(() => {
    if (isGenerating) return '방향 제안 생성 중...'
    if (overview) return '다시 추천받기'
    return '방향 제안 생성하기'
  }, [isGenerating, overview])

  async function handleGenerate() {
    if (!currentUserId || isGenerating || !isLeader) {
      return
    }

    setIsGenerating(true)
    setSubmitError('')
    setSubmitMessage('')

    try {
      await generateProjectDirectionOverview({
        teamId,
        requestedBy: currentUserId,
      })
      notifyProjectDirectionOverviewUpdated(teamId)
      await reload()
      setSubmitMessage(
        overview ? '방향 제안을 새 내용으로 갱신했어요. 업무 탭에서도 같은 결과를 바로 볼 수 있습니다.' : '방향 제안을 생성하고 저장했어요. 업무 탭에서도 바로 확인할 수 있습니다.',
      )
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '방향 제안을 생성하지 못했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="relative space-y-4">
      {isGenerating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 px-4 py-8 backdrop-blur-[3px]">
          <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-white px-6 py-6 text-center shadow-xl">
            <div className="mx-auto flex h-12 w-12 animate-spin items-center justify-center rounded-full border-4 border-brand-100 border-t-brand-500" />
            <p className="mt-4 font-medium text-campus-900">프로젝트 방향을 정리하고 있어요...</p>
            <p className="mt-2 text-sm leading-6 text-campus-600">
              현재 Task, Todo, 일정 흐름을 바탕으로 다음 단계 제안을 생성한 뒤 팀 overview로 저장합니다.
            </p>
          </div>
        </div>
      )}

      <div className={isGenerating ? 'pointer-events-none select-none opacity-60' : ''} aria-busy={isGenerating}>
        <Card className="space-y-5 overflow-hidden border-brand-100 bg-gradient-to-br from-white via-campus-50 to-brand-50">
          <div className="space-y-3">
            <span className="inline-flex rounded-full border border-brand-200 bg-white/80 px-3 py-1 text-xs font-semibold text-brand-700">
              PM Assistant
            </span>
            <div className="space-y-2">
              <h2 className="font-display text-3xl text-campus-900">프로젝트가 지금 어디에 집중하면 좋을지 추천해드려요</h2>
              <p className="max-w-2xl text-sm leading-6 text-campus-600">
                업무 탭의 실제 Task, Todo, 일정 정보를 바탕으로 다음 방향을 짧고 선명하게 정리합니다.
                생성된 결과는 팀의 방향 제안 overview로 저장되고, 업무 탭에서도 같은 내용을 바로 보여줍니다.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-campus-200 bg-white/80 p-4">
            <div>
              <p className="text-sm font-semibold text-campus-900">팀 방향 제안을 지금 다시 만들 수 있어요</p>
              <p className="mt-1 text-sm text-campus-600">
                저장된 값이 있으면 업데이트하고, 없으면 새로 생성합니다.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="ghost" onClick={onOpenTasks}>
                업무 탭 보기
              </Button>
              <Button type="button" onClick={() => void handleGenerate()} disabled={!currentUserId || !isLeader || isGenerating}>
                {actionLabel}
              </Button>
            </div>
          </div>

          {!isLeader && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              방향 제안 생성과 갱신은 팀 리더만 실행할 수 있습니다. 저장된 결과는 팀원도 함께 볼 수 있어요.
            </div>
          )}
          {!currentUserId && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              로그인 정보가 확인되지 않아 방향 제안을 생성할 수 없습니다.
            </div>
          )}
          {submitError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {submitError}
            </div>
          )}
          {submitMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {submitMessage}
            </div>
          )}
          {errorMessage && !isLoading && !overview && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {errorMessage}
            </div>
          )}
        </Card>

        <ProjectDirectionOverviewPanel
          teamId={teamId}
          currentUserId={currentUserId}
          overviewData={overview}
          isLoadingOverride={isLoading}
          errorMessageOverride={errorMessage}
          onReloadOverride={reload}
          title="저장된 방향 제안"
          subtitle="여기서 보는 결과는 업무 탭 위젯과 같은 저장 데이터입니다."
          emptyActionLabel="방향 제안 생성하기"
          emptyActionDisabled={!currentUserId || !isLeader}
          showReloadAction={false}
          hideAssistantAction
          onOpenAssistant={() => void handleGenerate()}
          onOpenTasks={onOpenTasks}
          onOpenCalendar={onOpenCalendar}
        />
      </div>
    </div>
  )
}
