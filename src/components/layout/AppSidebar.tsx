import { NavLink } from 'react-router-dom'
import { Button } from '../ui/Button'

const navItems = [
  { label: '대시보드', to: '/app' },
  { label: '팀 관리', to: '/app/teams' },
  { label: '프로젝트', to: '/app/projects', disabled: true },
  { label: '워크플로', to: '/app/workflows', disabled: true },
  { label: '리포트', to: '/app/reports', disabled: true },
]

export function AppSidebar() {
  return (
    <aside className="border-b border-campus-200 bg-white px-5 py-5 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
      <div className="space-y-3 lg:space-y-4">
        <p className="text-xs uppercase tracking-[0.3em] text-campus-500">
          워크스페이스
        </p>
        <div className="rounded-2xl border border-campus-200 bg-brand-50 px-4 py-3 text-sm font-medium text-campus-800">
          한양대 캡스톤 3팀
        </div>
      </div>

      <nav className="mt-5 grid grid-cols-2 gap-2 text-sm font-medium lg:mt-8 lg:grid-cols-1 lg:space-y-1">
        {navItems.map((item) =>
          item.disabled ? (
            <span
              key={item.label}
              className="flex items-center gap-3 rounded-2xl px-3 py-2 text-campus-400"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-campus-300" />
              {item.label}
            </span>
          ) : (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/app'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-2xl px-3 py-2 transition',
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-campus-600 hover:bg-campus-100',
                ].join(' ')
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-r from-brand-500 to-accent-400" />
              {item.label}
            </NavLink>
          ),
        )}
      </nav>

      <div className="mt-5 space-y-4 rounded-3xl border border-campus-200 bg-campus-50 p-5 lg:mt-8">
        <div className="flex items-center justify-between text-xs text-campus-500">
          <span>학기 진행률</span>
          <span>7주차 / 16주</span>
        </div>
        <div className="h-2 rounded-full bg-campus-200">
          <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-brand-500 to-accent-400" />
        </div>
        <Button variant="subtle" size="sm">
          마일스톤 확인
        </Button>
      </div>
    </aside>
  )
}
