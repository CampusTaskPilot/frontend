import { useState } from 'react'
import { Card } from '../../../components/ui/Card'
import type { TeamMemberWithProfile } from '../types/team'
import { DiagnoseTab } from './DiagnoseTab'
import { MeetingActionizerTab } from './MeetingActionizerTab'
import { ReportWriterTab } from './ReportWriterTab'

type PMAssistantTabKey = 'diagnose' | 'meeting-actionizer' | 'report-writer'

const PM_ASSISTANT_TABS: Array<{ key: PMAssistantTabKey; label: string; description: string }> = [
  {
    key: 'diagnose',
    label: '문제 진단',
    description: '채팅 기반 이슈 진단',
  },
  {
    key: 'meeting-actionizer',
    label: '회의 실행화',
    description: '회의 텍스트를 draft로 전환',
  },
  {
    key: 'report-writer',
    label: '보고서 작성',
    description: '기간 기반 문서 초안 생성',
  },
]

interface TeamPMTabProps {
  teamId: string
  currentUserId: string | null
  isLeader: boolean
  members: TeamMemberWithProfile[]
  onOpenTasks: () => void
}

export function TeamPMTab({ teamId, currentUserId, isLeader, members, onOpenTasks }: TeamPMTabProps) {
  const [activeTab, setActiveTab] = useState<PMAssistantTabKey>('meeting-actionizer')

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div className="space-y-1">
          <h1 className="font-display text-2xl text-campus-900">PM Assistant</h1>
          <p className="text-sm text-campus-600">
            기능별 책임을 분리해 Diagnose, Meeting Actionizer, Report Writer를 독립적으로 확장할 수 있게 구성했습니다.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {PM_ASSISTANT_TABS.map((tab) => (
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
              <p className="mt-1 text-xs text-campus-600">{tab.description}</p>
            </button>
          ))}
        </div>
      </Card>

      {activeTab === 'diagnose' && <DiagnoseTab />}
      {activeTab === 'meeting-actionizer' && (
        <MeetingActionizerTab
          teamId={teamId}
          requestedBy={currentUserId}
          isLeader={isLeader}
          members={members}
          onOpenTasks={onOpenTasks}
        />
      )}
      {activeTab === 'report-writer' && <ReportWriterTab />}
    </div>
  )
}
