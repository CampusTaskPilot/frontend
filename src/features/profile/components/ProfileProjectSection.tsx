import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import type { ProfileProjectRecord } from '../types'

interface ProfileProjectSectionProps {
  projects: ProfileProjectRecord[]
}

function splitTextList(value: string | null | undefined) {
  return (value ?? '')
    .split(/\r?\n|,/)
    .map((item) => item.replace(/^[\s\-•·]+/, '').trim())
    .filter(Boolean)
}

function formatProjectPeriod(project: ProfileProjectRecord) {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
  })

  const start = project.start_date ? formatter.format(new Date(project.start_date)) : null
  const end = project.is_ongoing
    ? '진행 중'
    : project.end_date
      ? formatter.format(new Date(project.end_date))
      : null

  if (start && end) {
    return `${start} - ${end}`
  }

  if (start) {
    return `${start} 시작`
  }

  if (end) {
    return end
  }

  return '기간 미입력'
}

export function ProfileProjectSection({ projects }: ProfileProjectSectionProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-[1.6rem] border border-dashed border-campus-200 bg-campus-50/70 px-5 py-10">
        <h3 className="text-lg font-semibold text-campus-900">프로젝트 경험이 아직 없습니다.</h3>
        <p className="mt-2 text-sm leading-6 text-campus-500">
          팀 리더가 역할 적합도와 실제 기여를 판단하기 쉽도록 주요 프로젝트를 추가해 주세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {projects.map((project) => {
        const contributions = splitTextList(project.contribution_summary)
        const techStack = splitTextList(project.tech_stack)

        return (
          <article
            key={project.id}
            className="rounded-[1.7rem] border border-campus-200/80 bg-white/92 p-5 shadow-[0_18px_40px_rgba(26,34,51,0.05)]"
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={project.project_type === 'team' ? 'success' : 'neutral'}>
                    {project.project_type === 'team' ? '팀 프로젝트' : '개인 프로젝트'}
                  </Badge>
                  {project.role?.trim() ? <Badge>{project.role}</Badge> : null}
                  <span className="text-sm font-medium text-campus-500">{formatProjectPeriod(project)}</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-campus-900">{project.name}</h3>
                  <p className="break-words text-sm leading-7 text-campus-700">
                    {project.summary?.trim() || '프로젝트 설명이 아직 등록되지 않았습니다.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                {project.project_url?.trim() ? (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={project.project_url} target="_blank" rel="noreferrer">
                      결과물 보기
                    </a>
                  </Button>
                ) : null}
                {project.github_url?.trim() ? (
                  <Button variant="ghost" size="sm" asChild>
                    <a href={project.github_url} target="_blank" rel="noreferrer">
                      GitHub
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]">
              <section className="rounded-[1.3rem] bg-campus-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-campus-500">
                  주요 기여
                </p>
                {contributions.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-campus-700">
                    {contributions.map((contribution) => (
                      <li key={contribution} className="break-words">
                        {contribution}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-campus-500">
                    구체적인 기여 내용이 아직 등록되지 않았습니다.
                  </p>
                )}
              </section>

              <section className="rounded-[1.3rem] bg-campus-50/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-campus-500">
                  사용 기술
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {techStack.length > 0 ? (
                    techStack.map((tech) => <Badge key={`${project.id}-${tech}`}>{tech}</Badge>)
                  ) : (
                    <p className="text-sm text-campus-500">기술 스택 정보가 아직 없습니다.</p>
                  )}
                </div>
              </section>
            </div>
          </article>
        )
      })}
    </div>
  )
}
