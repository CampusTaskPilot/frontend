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
  if (role === 'leader') return '팀장'
  if (role === 'member') return '팀원'
  return role
}

function displayName(member: TeamMemberWithProfile) {
  return member.profile?.full_name || member.profile?.email || member.user_id
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
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {members.map((member) => {
        const action = getActionForMember({ member, isLeader, currentUserId })
        const isPending = pendingMemberId === member.id

        return (
          <div
            key={`${member.team_id}-${member.user_id}`}
            className="flex h-full flex-col gap-3 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="line-clamp-1 font-medium text-campus-900">{displayName(member)}</p>
                <p className="line-clamp-2 text-xs text-campus-500">{member.profile?.email ?? member.user_id}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={member.role === 'leader' ? 'success' : 'neutral'}>{roleLabel(member.role)}</Badge>
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
          </div>
        )
      })}
    </div>
  )
}
