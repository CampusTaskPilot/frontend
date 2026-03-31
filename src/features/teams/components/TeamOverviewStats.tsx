import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import type { TeamRecord } from '../types/team'

interface TeamOverviewStatsProps {
  team: TeamRecord
  memberCount: number
  taskCount: number
  skillCount: number
}

function createdDateLabel(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '-'
  const year = String(date.getFullYear()).slice(-2)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}.${month}.${day}`
}

export function TeamOverviewStats({ team, memberCount, taskCount, skillCount }: TeamOverviewStatsProps) {
  const stats: Array<{
    label: string
    value: string
    description: string
    tone: 'brand' | 'neutral' | 'accent'
    compact?: boolean
  }> = [
    {
      label: '멤버 현황',
      value: `${memberCount}/${team.max_members || '-'}`,
      description: team.is_recruiting ? '현재 모집이 열려 있습니다.' : '현재 모집이 닫혀 있습니다.',
      tone: 'brand',
    },
    {
      label: '업무 카드',
      value: `${taskCount}`,
      description: taskCount > 0 ? '연결된 작업 항목 수' : '아직 등록된 작업이 없습니다.',
      tone: 'neutral',
    },
    {
      label: '기술 스택',
      value: `${skillCount}`,
      description: skillCount > 0 ? 'Overview에 연결된 기술 수' : '연결된 기술이 없습니다.',
      tone: 'accent',
    },
    {
      label: '생성일',
      value: createdDateLabel(team.created_at),
      description: '워크스페이스 시작일',
      tone: 'neutral',
      compact: true,
    },
  ]

  return (
    <section>
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.label}
            className={cn(
              'rounded-[24px] border p-5 shadow-card transition duration-200 hover:-translate-y-0.5',
              stat.tone === 'brand' && 'border-brand-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)]',
              stat.tone === 'accent' && 'border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f1fcf8_100%)]',
              stat.tone === 'neutral' && 'border-campus-200/80 bg-white/90',
            )}
          >
            <div className="flex h-full flex-col justify-between gap-7">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-campus-500">{stat.label}</p>
                <p
                  className={cn(
                    'font-semibold tracking-tight text-campus-900',
                    stat.compact ? 'text-2xl whitespace-nowrap' : 'text-3xl',
                  )}
                >
                  {stat.value}
                </p>
              </div>
              <p className="text-sm leading-6 text-campus-500">{stat.description}</p>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
