import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import type { TeamMemberWithProfile } from '../types/team'

type TeamMemberActionKind = 'remove' | 'leave'

interface TeamMemberListProps {
  members: TeamMemberWithProfile[]
  isLeader: boolean
  currentUserId: string | null
  pendingMemberId: string | null
  onActionClick: (member: TeamMemberWithProfile, action: TeamMemberActionKind) => void
}

function roleLabel(role: string) {
  if (role === 'leader') return '리더'
  if (role === 'member') return '멤버'
  return role
}

function displayName(member: TeamMemberWithProfile) {
  return member.profile?.full_name || member.profile?.email || member.user_id
}

function visibleSkills(member: TeamMemberWithProfile) {
  return member.skills.slice(0, 4)
}

function getActionForMember(params: {
  member: TeamMemberWithProfile
  isLeader: boolean
  currentUserId: string | null
}): TeamMemberActionKind | null {
  const { member, isLeader, currentUserId } = params
  const isSelf = member.user_id === currentUserId
  const isLeaderRow = member.role === 'leader'

  if (isLeader && isSelf) {
    return null
  }

  if (!isLeader && isSelf) {
    return 'leave'
  }

  if (isLeader && !isLeaderRow) {
    return 'remove'
  }

  return null
}

function MemberAvatar({ member }: { member: TeamMemberWithProfile }) {
  const profileImageUrl = member.profile?.profile_image_url ?? null
  const initial = displayName(member).trim().charAt(0).toUpperCase() || 'U'

  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={displayName(member)}
        className="h-14 w-14 shrink-0 rounded-2xl border border-white/80 object-cover"
      />
    )
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-campus-200 bg-campus-50 text-sm font-bold text-campus-700">
      {initial}
    </div>
  )
}

export function TeamMemberList({
  members,
  isLeader,
  currentUserId,
  pendingMemberId,
  onActionClick,
}: TeamMemberListProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-500">
        아직 등록된 멤버가 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {members.map((member) => {
        const action = getActionForMember({ member, isLeader, currentUserId })
        const isPending = pendingMemberId === member.id
        const memberSkills = visibleSkills(member)
        const hiddenSkillCount = Math.max(member.skills.length - memberSkills.length, 0)

        return (
          <div
            key={`${member.team_id}-${member.user_id}`}
            className="flex flex-col gap-4 rounded-2xl border border-campus-200 bg-campus-50/60 px-4 py-4 md:flex-row md:items-start md:justify-between"
          >
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <MemberAvatar member={member} />

              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 text-base font-semibold text-campus-900">
                    <span className="line-clamp-1 break-all sm:break-words">{displayName(member)}</span>
                  </p>
                  <Badge variant={member.role === 'leader' ? 'success' : 'neutral'}>
                    {roleLabel(member.role)}
                  </Badge>
                </div>

                <p className="line-clamp-1 break-all text-sm text-campus-600 sm:break-words">
                  {member.profile?.email ?? '이메일 정보 없음'}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {memberSkills.length > 0 ? (
                    <>
                      {memberSkills.map((skill) => (
                        <Badge key={`${member.id}-${skill.id}`} variant="neutral">
                          {skill.name}
                        </Badge>
                      ))}
                      {hiddenSkillCount > 0 ? <Badge variant="neutral">+{hiddenSkillCount}</Badge> : null}
                    </>
                  ) : (
                    <span className="text-sm text-campus-400">등록된 스킬이 없습니다.</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 md:pl-4">
              {action && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onActionClick(member, action)}
                  disabled={isPending}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 focus-visible:outline-rose-300"
                >
                  {isPending ? '처리 중...' : action === 'leave' ? '탈퇴' : '추방'}
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
