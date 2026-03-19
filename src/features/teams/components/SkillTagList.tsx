import { Badge } from '../../../components/ui/Badge'
import type { SkillOption } from '../types/team'

interface SkillTagListProps {
  skills: SkillOption[]
  emptyMessage?: string
}

export function SkillTagList({
  skills,
  emptyMessage = '등록된 기술 스택이 없습니다.',
}: SkillTagListProps) {
  if (skills.length === 0) {
    return (
      <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <Badge key={skill.id} variant="neutral" className="px-3 py-1.5 text-xs">
          {skill.name}
          {skill.category ? ` · ${skill.category}` : ''}
        </Badge>
      ))}
    </div>
  )
}
