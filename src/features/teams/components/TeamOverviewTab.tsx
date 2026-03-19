import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type {
  TeamMemberRole,
  TeamMemberWithProfile,
  TeamRecord,
  TeamSkillTag,
  TeamTaskItem,
} from '../types/team'

interface TeamOverviewTabProps {
  team: TeamRecord
  members: TeamMemberWithProfile[]
  skills: TeamSkillTag[]
  tasks: TeamTaskItem[]
  isLoading: boolean
  errorMessage: string
  isLeader: boolean
  onOpenMembers: () => void
}

function isLeaderRole(role: TeamMemberRole) {
  return role === 'leader'
}

function roleLabel(role: TeamMemberRole) {
  if (isLeaderRole(role)) return 'Leader'
  if (role === 'member') return 'Member'
  return role
}

function displayName(member: TeamMemberWithProfile) {
  return member.profile?.full_name || member.profile?.email || member.user_id
}

function createdDateLabel(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function statusLabel(team: TeamRecord) {
  return team.is_recruiting ? 'Recruiting' : 'Closed'
}

function MemberAvatar({ member }: { member: TeamMemberWithProfile }) {
  const profileImageUrl = member.profile?.profile_image_url ?? null
  const initial = displayName(member).trim().charAt(0).toUpperCase() || 'U'

  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={displayName(member)}
        className="h-10 w-10 rounded-full border border-campus-200 object-cover"
      />
    )
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-campus-200 bg-campus-100 text-sm font-semibold text-campus-700">
      {initial}
    </div>
  )
}

export function TeamOverviewTab({
  team,
  members,
  skills,
  tasks,
  isLoading,
  errorMessage,
  isLeader,
  onOpenMembers,
}: TeamOverviewTabProps) {
  const sortedMembers = [...members].sort((a, b) => {
    const aLeader = a.user_id === team.leader_id || isLeaderRole(a.role)
    const bLeader = b.user_id === team.leader_id || isLeaderRole(b.role)
    if (aLeader && !bLeader) return -1
    if (!aLeader && bLeader) return 1
    return 0
  })

  const leaderName =
    sortedMembers.find((member) => member.user_id === team.leader_id || isLeaderRole(member.role))?.profile
      ?.full_name ??
    sortedMembers.find((member) => member.user_id === team.leader_id || isLeaderRole(member.role))?.profile
      ?.email ??
    sortedMembers.find((member) => member.user_id === team.leader_id || isLeaderRole(member.role))?.user_id ??
    'Unknown'

  const summaryCards = [
    {
      label: 'Members',
      value: `${members.length}`,
      description: 'Team participants',
    },
    {
      label: 'Skills',
      value: `${skills.length}`,
      description: 'Linked stack tags',
    },
    {
      label: 'Created',
      value: createdDateLabel(team.created_at),
      description: 'Workspace start date',
    },
    {
      label: 'Tasks (Soon)',
      value: `${tasks.length}`,
      description: 'Placeholder for task metrics',
    },
  ]

  return (
    <div className="space-y-4">
      {isLoading && (
        <Card>
          <p className="text-sm text-campus-600">Overview 데이터를 불러오는 중입니다...</p>
        </Card>
      )}

      {!isLoading && errorMessage && (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-600">
            {errorMessage} 권한(RLS) 정책으로 조회가 제한될 수 있습니다.
          </p>
        </Card>
      )}

      {!isLoading && !errorMessage && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.label} className="p-4">
                <p className="text-xs text-campus-500">{card.label}</p>
                <p className="mt-1 text-2xl font-semibold text-campus-900">{card.value}</p>
                <p className="mt-1 text-xs text-campus-500">{card.description}</p>
              </Card>
            ))}
          </div>

          <Card className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl text-campus-900">Team Info</h2>
              <div className="flex flex-wrap gap-2">
                {isLeader && (
                  <Button type="button" variant="ghost">
                    팀 설정 수정
                  </Button>
                )}
                <Button type="button" variant="ghost" onClick={onOpenMembers}>
                  멤버 관리로 이동
                </Button>
              </div>
            </div>
            <div className="grid gap-2 text-sm text-campus-700 md:grid-cols-2">
              <p>
                팀 이름: <span className="font-medium text-campus-900">{team.name}</span>
              </p>
              <p>
                팀 상태: <span className="font-medium text-campus-900">{statusLabel(team)}</span>
              </p>
              <p className="md:col-span-2">
                팀 요약: <span className="font-medium text-campus-900">{team.summary}</span>
              </p>
              <p className="md:col-span-2">
                팀 설명: <span className="font-medium text-campus-900">{team.description || '-'}</span>
              </p>
              <p>
                생성일: <span className="font-medium text-campus-900">{createdDateLabel(team.created_at)}</span>
              </p>
              <p>
                팀 멤버 수: <span className="font-medium text-campus-900">{members.length}명</span>
              </p>
              <p>
                Leader: <span className="font-medium text-campus-900">{leaderName}</span>
              </p>
            </div>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-2xl text-campus-900">Team Members</h2>
            {sortedMembers.length === 0 ? (
              <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-500">
                아직 팀 멤버가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedMembers.map((member) => {
                  const leader = member.user_id === team.leader_id || isLeaderRole(member.role)
                  return (
                    <div
                      key={`${member.team_id}-${member.user_id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <MemberAvatar member={member} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-campus-900">{displayName(member)}</p>
                          <p className="truncate text-xs text-campus-500">{member.profile?.email ?? member.user_id}</p>
                          <p className="truncate text-xs text-campus-500">상태: {member.status || '-'}</p>
                        </div>
                      </div>
                      <span
                        className={[
                          'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
                          leader ? 'bg-emerald-50 text-emerald-700' : 'bg-campus-100 text-campus-700',
                        ].join(' ')}
                      >
                        {roleLabel(member.role)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-2xl text-campus-900">Team Skills</h2>
            {skills.length === 0 ? (
              <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-500">
                연결된 팀 스킬이 아직 없습니다.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center rounded-full bg-campus-100 px-3 py-1 text-xs font-semibold text-campus-700 ring-1 ring-inset ring-campus-200"
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
