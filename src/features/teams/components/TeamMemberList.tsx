import { Badge } from '../../../components/ui/Badge'
import type { TeamMemberWithProfile } from '../types/team'

interface TeamMemberListProps {
  members: TeamMemberWithProfile[]
}

function roleLabel(role: string) {
  if (role === 'leader') return '팀장'
  if (role === 'member') return '팀원'
  return role
}

function displayName(member: TeamMemberWithProfile) {
  return member.profile?.full_name || member.profile?.email || member.user_id
}

export function TeamMemberList({ members }: TeamMemberListProps) {
  if (members.length === 0) {
    return (
      <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 text-sm text-campus-500">
        팀원이 아직 없습니다.
      </div>
    )
  }

  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'leader' && b.role !== 'leader') return -1
    if (a.role !== 'leader' && b.role === 'leader') return 1
    return 0
  })

  return (
    <div className="space-y-3">
      {sortedMembers.map((member) => (
        <div
          key={`${member.team_id}-${member.user_id}`}
          className="flex flex-col gap-3 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="font-medium text-campus-900">{displayName(member)}</p>
            <p className="text-xs text-campus-500">{member.profile?.email ?? member.user_id}</p>
          </div>
          <Badge variant={member.role === 'leader' ? 'success' : 'neutral'}>
            {roleLabel(member.role)}
          </Badge>
        </div>
      ))}
    </div>
  )
}
