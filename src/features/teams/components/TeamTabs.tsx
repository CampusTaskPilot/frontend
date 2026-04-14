export type TeamWorkspaceTabKey = 'overview' | 'applications' | 'members' | 'tasks' | 'calendar' | 'pm'

export interface TeamWorkspaceTabItem {
  key: TeamWorkspaceTabKey
  label: string
}

export const TEAM_WORKSPACE_TABS: TeamWorkspaceTabItem[] = [
  { key: 'overview', label: '개요' },
  { key: 'applications', label: '지원 관리' },
  { key: 'tasks', label: '업무' },
  { key: 'members', label: '멤버' },
  { key: 'calendar', label: '캘린더' },
  { key: 'pm', label: 'PM Assistant' },
]

export function parseTeamWorkspaceTab(value: string | null): TeamWorkspaceTabKey {
  return value === 'applications' || value === 'members' || value === 'tasks' || value === 'calendar' || value === 'pm'
    ? value
    : 'overview'
}

export function getVisibleTeamWorkspaceTabs(
  isTeamMember: boolean,
  canManageApplications: boolean,
): TeamWorkspaceTabItem[] {
  if (!isTeamMember) {
    return TEAM_WORKSPACE_TABS.filter((tab) => tab.key === 'overview')
  }

  return TEAM_WORKSPACE_TABS.filter((tab) => tab.key !== 'applications' || canManageApplications)
}

export function getAccessibleTeamWorkspaceTab(
  tab: TeamWorkspaceTabKey,
  isTeamMember: boolean,
  canManageApplications: boolean,
): TeamWorkspaceTabKey {
  if (!isTeamMember && tab !== 'overview') {
    return 'overview'
  }

  if (tab === 'applications' && !canManageApplications) {
    return 'overview'
  }

  return tab
}

interface TeamTabsProps {
  activeTab: TeamWorkspaceTabKey
  onChange: (tab: TeamWorkspaceTabKey) => void
  tabs?: TeamWorkspaceTabItem[]
}

export function TeamTabs({ activeTab, onChange, tabs = TEAM_WORKSPACE_TABS }: TeamTabsProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">Workspace</p>
      <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible lg:pb-0">
        {tabs.map((item) => (
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
