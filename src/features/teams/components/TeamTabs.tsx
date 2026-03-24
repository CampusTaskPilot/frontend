export type TeamWorkspaceTabKey = 'overview' | 'members' | 'tasks' | 'calendar' | 'pm'

const tabItems: Array<{ key: TeamWorkspaceTabKey; label: string }> = [
  { key: 'overview', label: '개요' },
  { key: 'tasks', label: '업무' },
  { key: 'members', label: '팀원' },
  { key: 'calendar', label: '캘린더' },
  { key: 'pm', label: 'PM 상담' },
]

interface TeamTabsProps {
  activeTab: TeamWorkspaceTabKey
  onChange: (tab: TeamWorkspaceTabKey) => void
}

export function TeamTabs({ activeTab, onChange }: TeamTabsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">워크스페이스</p>
      <div className="space-y-1">
        {tabItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={[
              'flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm font-medium transition',
              activeTab === item.key
                ? 'border border-brand-200 bg-brand-50 text-brand-700'
                : 'border border-transparent text-campus-600 hover:border-campus-200 hover:bg-white',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
