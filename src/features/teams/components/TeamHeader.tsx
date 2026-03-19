import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { TeamRecord } from '../types/team'

interface TeamHeaderProps {
  team: TeamRecord
  leaderName: string
  isLeader: boolean
  onOpenPM: () => void
}

export function TeamHeader({ team, leaderName, isLeader, onOpenPM }: TeamHeaderProps) {
  const statusLabel = team.is_recruiting ? '모집 중' : '운영 중'

  return (
    <Card className="space-y-5 bg-gradient-to-r from-brand-50 via-white to-accent-100">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl text-campus-900">{team.name}</h1>
          <Badge variant={team.is_recruiting ? 'success' : 'neutral'}>{statusLabel}</Badge>
          {isLeader && <Badge variant="warning">리더 권한</Badge>}
        </div>
        <p className="text-sm text-campus-700">{team.summary || '한 줄 소개가 등록되지 않았습니다.'}</p>
        <p className="text-sm text-campus-600">
          팀장: <span className="font-medium text-campus-900">{leaderName}</span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {isLeader && (
          <Button type="button" variant="ghost">
            팀 수정
          </Button>
        )}
        {isLeader && (
          <Button type="button" variant="ghost">
            팀원 관리
          </Button>
        )}
        <Button type="button" onClick={onOpenPM}>
          PM 상담
        </Button>
      </div>
    </Card>
  )
}
