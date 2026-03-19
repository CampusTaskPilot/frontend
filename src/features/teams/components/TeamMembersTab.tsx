import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { TeamMemberList } from './TeamMemberList'
import type { TeamMemberWithProfile } from '../types/team'

interface TeamMembersTabProps {
  members: TeamMemberWithProfile[]
  isLeader: boolean
}

export function TeamMembersTab({ members, isLeader }: TeamMembersTabProps) {
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-2xl text-campus-900">팀원</h2>
        {isLeader && (
          <Button type="button" variant="ghost">
            팀원 관리
          </Button>
        )}
      </div>
      <TeamMemberList members={members} />
    </Card>
  )
}
