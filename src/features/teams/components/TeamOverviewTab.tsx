import { Card } from '../../../components/ui/Card'
import { TeamProfileHero } from './TeamProfileHero'
import type {
  ProfileSummary,
  TeamMemberRole,
  TeamMemberWithProfile,
  TeamRecord,
  TeamSkillTag,
  TeamTaskItem,
} from '../types/team'

interface TeamOverviewTabProps {
  team: TeamRecord
  leader: ProfileSummary | null
  members: TeamMemberWithProfile[]
  skills: TeamSkillTag[]
  tasks: TeamTaskItem[]
  isLoading: boolean
  errorMessage: string
  isLeader: boolean
  currentUserId: string | null
  onOpenMembers: () => void
  onTeamUpdated: (payload: { team: TeamRecord; skills: TeamSkillTag[] }) => void
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

function OverviewSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <Card className="overflow-hidden p-0">
        <div className="grid lg:grid-cols-[320px,1fr]">
          <div className="min-h-[280px] bg-campus-200" />
          <div className="space-y-5 p-6 md:p-8">
            <div className="h-4 w-28 rounded-full bg-campus-200" />
            <div className="h-10 w-2/3 rounded-2xl bg-campus-200" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded-full bg-campus-100" />
              <div className="h-4 w-11/12 rounded-full bg-campus-100" />
              <div className="h-4 w-3/4 rounded-full bg-campus-100" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-campus-200 bg-white/80 px-4 py-3">
                  <div className="h-3 w-20 rounded-full bg-campus-100" />
                  <div className="mt-3 h-6 w-24 rounded-full bg-campus-200" />
                  <div className="mt-2 h-3 w-24 rounded-full bg-campus-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export function TeamOverviewTab({
  team,
  leader,
  members,
  skills,
  tasks,
  isLoading,
  errorMessage,
  isLeader,
  currentUserId,
  onOpenMembers,
  onTeamUpdated,
}: TeamOverviewTabProps) {
  const sortedMembers = [...members].sort((a, b) => {
    const aLeader = a.user_id === team.leader_id || isLeaderRole(a.role)
    const bLeader = b.user_id === team.leader_id || isLeaderRole(b.role)
    if (aLeader && !bLeader) return -1
    if (!aLeader && bLeader) return 1
    return 0
  })

  const summaryCards = [
    {
      label: '충원 현황',
      value: `${members.length}/${team.max_members || '-'}`,
      description: team.is_recruiting ? '현재 팀원을 모집 중입니다.' : '현재 모집은 마감된 상태입니다.',
    },
    {
      label: '기술 스택',
      value: `${skills.length}개`,
      description: skills.length > 0 ? 'Overview 헤더에 연결된 대표 스택입니다.' : '아직 연결된 스택이 없습니다.',
    },
    {
      label: '생성일',
      value: createdDateLabel(team.created_at),
      description: '팀 워크스페이스가 만들어진 날짜입니다.',
    },
    {
      label: '작업 준비',
      value: `${tasks.length}개`,
      description: tasks.length > 0 ? 'Overview에서 연결된 작업 수입니다.' : '아직 연결된 작업이 없습니다.',
    },
  ]

  return (
    <div className="space-y-4">
      {isLoading && <OverviewSkeleton />}

      {!isLoading && errorMessage && (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-600">
            {errorMessage} 권한(RLS) 정책이나 연결 상태로 인해 일부 데이터 조회가 제한될 수 있습니다.
          </p>
        </Card>
      )}

      {!isLoading && !errorMessage && (
        <>
          <TeamProfileHero
            team={team}
            leader={leader}
            members={members}
            skills={skills}
            isLeader={isLeader}
            currentUserId={currentUserId}
            onOpenMembers={onOpenMembers}
            onTeamUpdated={onTeamUpdated}
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {summaryCards.map((card) => (
              <Card key={card.label} className="border border-campus-200/80 bg-white/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-campus-500">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-campus-900">{card.value}</p>
                <p className="mt-2 text-xs leading-5 text-campus-500">{card.description}</p>
              </Card>
            ))}
          </div>

          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-campus-900">Team Members</h2>
                <p className="mt-1 text-sm text-campus-500">리더가 상단에 오도록 정렬해 팀 구성을 빠르게 파악할 수 있습니다.</p>
              </div>
            </div>

            {sortedMembers.length === 0 ? (
              <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-500">
                아직 팀 멤버가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {sortedMembers.map((member) => {
                  const leaderMember = member.user_id === team.leader_id || isLeaderRole(member.role)
                  return (
                    <div
                      key={`${member.team_id}-${member.user_id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3 transition hover:border-brand-200 hover:bg-white"
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
                          leaderMember ? 'bg-emerald-50 text-emerald-700' : 'bg-campus-100 text-campus-700',
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
        </>
      )}
    </div>
  )
}
