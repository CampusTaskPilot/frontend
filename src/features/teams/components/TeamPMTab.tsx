import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import type { TeamMemberWithProfile } from '../types/team'
import { MeetingActionizerTab } from './MeetingActionizerTab'
import { ReportWriterTab } from './ReportWriterTab'

export type PMAssistantTabKey = 'direction' | 'meeting-actionizer' | 'report-writer'
type VisiblePMAssistantTabKey = Exclude<PMAssistantTabKey, 'direction'>

const pmAssistantTabs: Array<{ key: VisiblePMAssistantTabKey; label: string; description: string }> = [
  {
    key: 'meeting-actionizer',
    label: '회의 액션 정리',
    description: '회의 내용을 Task, Todo, 일정 초안으로 빠르게 정리합니다.',
  },
  {
    key: 'report-writer',
    label: 'PM 보고서',
    description: '현재 진행 현황을 바탕으로 보고서를 생성합니다.',
  },
]

interface TeamPMTabProps {
  teamId: string
  currentUserId: string | null
  isLeader: boolean
  members: TeamMemberWithProfile[]
  onOpenTasks: () => void
  onOpenCalendar: () => void
  initialTab?: PMAssistantTabKey
}

function normalizePMAssistantTab(tab: PMAssistantTabKey): VisiblePMAssistantTabKey {
  if (tab === 'report-writer') {
    return 'report-writer'
  }
  return 'meeting-actionizer'
}

export function TeamPMTab({
  teamId,
  currentUserId,
  isLeader,
  members,
  onOpenTasks,
  onOpenCalendar: _onOpenCalendar,
  initialTab = 'meeting-actionizer',
}: TeamPMTabProps) {
  const [activeTab, setActiveTab] = useState<VisiblePMAssistantTabKey>(normalizePMAssistantTab(initialTab))

  useEffect(() => {
    setActiveTab(normalizePMAssistantTab(initialTab))
  }, [initialTab])

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl text-campus-900">PM Assistant</h1>
          <p className="text-sm text-campus-600">
            팀 운영에 필요한 회의 정리와 보고서 작성을 한 곳에서 도와주는 AI 보조 공간입니다.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {pmAssistantTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={[
                'rounded-3xl border px-4 py-4 text-left transition',
                activeTab === tab.key
                  ? 'border-brand-200 bg-brand-50 shadow-sm'
                  : 'border-campus-200 bg-white hover:border-campus-300',
              ].join(' ')}
            >
              <p className="text-sm font-semibold text-campus-900">{tab.label}</p>
              <p className="mt-1 text-xs leading-5 text-campus-600">{tab.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {activeTab === 'meeting-actionizer' && (
        <MeetingActionizerTab
          teamId={teamId}
          requestedBy={currentUserId}
          isLeader={isLeader}
          members={members}
          onOpenTasks={onOpenTasks}
        />
      )}

      {activeTab === 'report-writer' && (
        <ReportWriterTab teamId={teamId} currentUserId={currentUserId} />
      )}
    </div>
  )
}
