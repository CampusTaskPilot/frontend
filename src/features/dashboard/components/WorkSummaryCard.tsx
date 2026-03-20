import { Card } from '../../../components/ui/Card'
import type { DashboardWorkSummary } from '../types'

interface WorkSummaryCardProps {
  summary: DashboardWorkSummary
  isLoading: boolean
}

const summaryItems = [
  { key: 'inProgressCount', label: '진행 중 업무', accent: 'text-brand-600' },
  { key: 'dueTodayCount', label: '오늘 마감', accent: 'text-rose-600' },
  { key: 'highPriorityCount', label: '높은 우선순위', accent: 'text-amber-600' },
  { key: 'incompleteTodoCount', label: '남은 Todo', accent: 'text-campus-900' },
] as const

export function WorkSummaryCard({ summary, isLoading }: WorkSummaryCardProps) {
  return (
    <Card className="space-y-4 rounded-[30px] border-campus-200 bg-white/95">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
          My Summary
        </p>
        <h2 className="font-display text-2xl text-campus-900">내 업무 요약</h2>
        <p className="text-sm leading-6 text-campus-500">
          오늘 확인해야 할 업무 흐름을 숫자로 빠르게 훑어볼 수 있게 정리했습니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {summaryItems.map((item) => (
          <div
            key={item.key}
            className="rounded-[24px] border border-campus-200 bg-campus-50 px-4 py-4"
          >
            <p className="text-xs text-campus-500">{item.label}</p>
            <p className={`mt-2 text-3xl font-semibold ${item.accent}`}>
              {isLoading ? '...' : summary[item.key]}
            </p>
          </div>
        ))}
      </div>
    </Card>
  )
}
