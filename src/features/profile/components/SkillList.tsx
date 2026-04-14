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
  beginner: '기초',
  intermediate: '활용 가능',
  advanced: '강점',
}

const levelStrengthMap: Record<SkillListItem['level'], number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
}

function normalizeCategory(category: string | null) {
  const value = category?.trim()

  if (!value) {
    return '기타'
  }

  return value
}

export function SkillList({ items, emptyMessage = '등록된 스킬이 없습니다.' }: SkillListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-campus-200 bg-campus-50/70 px-5 py-8 text-sm text-campus-500">
        {emptyMessage}
      </div>
    )
  }

  const groupedItems = Object.entries(
    items.reduce<Record<string, SkillListItem[]>>((acc, item) => {
      const category = normalizeCategory(item.category)
      acc[category] = [...(acc[category] ?? []), item]
      return acc
    }, {}),
  ).sort(([left], [right]) => left.localeCompare(right, 'ko'))

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groupedItems.map(([category, categoryItems]) => (
        <section
          key={category}
          className="rounded-[1.5rem] border border-campus-200/80 bg-campus-50/70 p-5"
        >
          <div className="flex items-center justify-between gap-3 border-b border-campus-200/70 pb-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-campus-900">{category}</h3>
              <p className="text-sm text-campus-500">{categoryItems.length}개 스킬</p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {categoryItems.map((item) => (
              <div
                key={`${item.skill_id}-${item.level}`}
                className="flex min-w-0 items-start justify-between gap-3 rounded-[1.1rem] bg-white/90 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-campus-900">{item.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <div className="flex items-center gap-1" aria-hidden="true">
                    {[0, 1, 2].map((index) => (
                      <span
                        key={`${item.skill_id}-${index}`}
                        className={`h-2 w-2 rounded-full ${
                          index < levelStrengthMap[item.level] ? 'bg-brand-500' : 'bg-brand-100'
                        }`}
                      />
                    ))}
                  </div>
                  <Badge variant="neutral">{levelLabelMap[item.level]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
