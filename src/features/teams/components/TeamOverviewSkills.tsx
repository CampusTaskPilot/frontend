import { Card } from '../../../components/ui/Card'
import type { TeamSkillTag } from '../types/team'

interface TeamOverviewSkillsProps {
  skills: TeamSkillTag[]
}

export function TeamOverviewSkills({ skills }: TeamOverviewSkillsProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Connected Skills</p>
        <h2 className="text-2xl font-semibold tracking-tight text-campus-900">기술 연결</h2>
        <p className="text-sm leading-6 text-campus-500">
          팀에서 다루는 기술을 한곳에 정리해 역할 분담과 팀 성격이 바로 드러나도록 구성했습니다.
        </p>
      </div>

      <Card className="rounded-[24px] border-campus-200/80 bg-white/90 p-5 shadow-card">
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {skills.map((skill) => (
              <span
                key={skill.id}
                className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50/70 px-4 py-2 text-sm font-medium text-brand-700 transition hover:border-brand-200 hover:bg-white"
              >
                {skill.name}
              </span>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-campus-200 bg-campus-50 px-5 py-6 text-sm leading-6 text-campus-500">
            아직 연결된 기술 스택이 없습니다. 팀 정보 수정에서 기술을 추가하면 이 영역에 함께 반영됩니다.
          </div>
        )}
      </Card>
    </section>
  )
}
