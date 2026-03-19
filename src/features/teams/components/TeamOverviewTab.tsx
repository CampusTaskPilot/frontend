import { Card } from '../../../components/ui/Card'
import { SkillTagList } from './SkillTagList'
import type { SkillOption, TeamMemberWithProfile, TeamRecord, TeamTaskItem } from '../types/team'

interface TeamOverviewTabProps {
  team: TeamRecord
  leaderName: string
  members: TeamMemberWithProfile[]
  skills: SkillOption[]
  tasks: TeamTaskItem[]
}

function progressLabel(tasks: TeamTaskItem[]) {
  if (tasks.length === 0) return '업무 없음'
  const doneCount = tasks.filter((task) => task.status === 'done').length
  return `${doneCount}/${tasks.length} 완료`
}

export function TeamOverviewTab({ team, leaderName, members, skills, tasks }: TeamOverviewTabProps) {
  const recentTask = tasks.find((task) => task.status !== 'done') ?? tasks[0] ?? null

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-campus-500">최근 TODO</p>
          <p className="mt-1 text-sm font-medium text-campus-900">
            {recentTask ? recentTask.title : '등록된 업무가 없습니다.'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-campus-500">팀원 수</p>
          <p className="mt-1 text-sm font-medium text-campus-900">
            {members.length}명 / {team.max_members ?? '제한 없음'}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-campus-500">진행 상태</p>
          <p className="mt-1 text-sm font-medium text-campus-900">{progressLabel(tasks)}</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="font-display text-2xl text-campus-900">팀 기본 정보</h2>
        <div className="space-y-2 text-sm text-campus-700">
          <p>
            팀명: <span className="font-medium text-campus-900">{team.name}</span>
          </p>
          <p>
            한 줄 소개: <span className="font-medium text-campus-900">{team.summary || '-'}</span>
          </p>
          <p>
            상세 설명: <span className="font-medium text-campus-900">{team.description || '-'}</span>
          </p>
          <p>
            팀장: <span className="font-medium text-campus-900">{leaderName}</span>
          </p>
          <p>
            모집 상태:{' '}
            <span className="font-medium text-campus-900">{team.is_recruiting ? '모집 중' : '운영 중'}</span>
          </p>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-display text-2xl text-campus-900">기술 스택</h2>
        <SkillTagList skills={skills} />
      </Card>
    </div>
  )
}
