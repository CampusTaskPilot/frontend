import { useEffect, useState } from 'react'
import { Card } from '../../../components/ui/Card'
import type { TeamMemberWithProfile } from '../types/team'
import { MeetingActionizerTab } from './MeetingActionizerTab'
import { ProjectDirectionAssistantTab } from './ProjectDirectionAssistantTab'
import { ReportWriterTab } from './ReportWriterTab'

export type PMAssistantTabKey = 'direction' | 'meeting-actionizer' | 'report-writer'

const pmAssistantTabs: Array<{ key: PMAssistantTabKey; label: string; description: string }> = [
  {
    key: 'direction',
    label: '방향 제안',
    description: '현재 프로젝트 흐름을 보고 다음 우선순위를 추천합니다.',
  },
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

export function TeamPMTab({
  teamId,
  currentUserId,
  isLeader,
  members,
  onOpenTasks,
  onOpenCalendar,
  initialTab = 'direction',
}: TeamPMTabProps) {
  const [activeTab, setActiveTab] = useState<PMAssistantTabKey>(initialTab)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl text-campus-900">PM Assistant</h1>
          <p className="text-sm text-campus-600">
            팀 운영에 필요한 방향 제안, 회의 정리, 보고서 작성을 한 흐름 안에서 도와주는 AI 보조 공간입니다.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
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

      {activeTab === 'direction' && (
        <ProjectDirectionAssistantTab
          teamId={teamId}
          currentUserId={currentUserId}
          isLeader={isLeader}
          onOpenTasks={onOpenTasks}
          onOpenCalendar={onOpenCalendar}
        />
      )}

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
