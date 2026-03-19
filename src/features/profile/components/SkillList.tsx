import { Badge } from '../../../components/ui/Badge'

export interface SkillListItem {
  skill_id: number
  name: string
  level: 'beginner' | 'intermediate' | 'advanced'
  category: string | null
}

interface SkillListProps {
  items: SkillListItem[]
  emptyMessage?: string
}

const levelLabelMap: Record<SkillListItem['level'], string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
}

export function SkillList({ items, emptyMessage = '등록된 스킬이 없습니다.' }: SkillListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-6 text-sm text-campus-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={`${item.skill_id}-${item.level}`}
          className="inline-flex items-center gap-2 rounded-full border border-campus-200 bg-campus-50 px-3 py-1.5"
        >
          <span className="text-sm font-medium text-campus-800">{item.name}</span>
          <Badge variant="neutral">{levelLabelMap[item.level]}</Badge>
          {item.category && <span className="text-xs text-campus-500">{item.category}</span>}
        </div>
      ))}
    </div>
  )
}

