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
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">워크스페이스</p>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
        {tabItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={[
              'flex shrink-0 items-center rounded-[1rem] px-3 py-2.5 text-left text-sm font-medium transition lg:w-full',
              activeTab === item.key
                ? 'border border-campus-900 bg-campus-900 text-white shadow-[0_12px_24px_rgba(26,34,51,0.12)]'
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
