import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { TeamListItem } from '../types/team'

interface TeamCardProps {
  team: TeamListItem
  onJoin?: (teamId: string) => Promise<void>
  isJoining?: boolean
}

function roleLabel(role: string | null) {
  if (role === 'leader') return '관리 중'
  if (role === 'member') return '참여 중'
  return '미참여'
}

export function TeamCard({ team, onJoin, isJoining = false }: TeamCardProps) {
  const isRecruiting = team.is_recruiting ?? false
  const isFull = team.max_members !== null && team.current_members >= team.max_members
  const canJoin =
    Boolean(onJoin) && !team.current_user_role && isRecruiting && !isFull

  return (
    <Card className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-2xl text-campus-900">{team.name}</h3>
          <Badge variant={isRecruiting ? 'success' : 'warning'}>
            {isRecruiting ? '모집 중' : '모집 마감'}
          </Badge>
          <Badge variant="neutral">{roleLabel(team.current_user_role)}</Badge>
        </div>
        <p className="text-sm text-campus-700">{team.summary || '한 줄 소개가 아직 없습니다.'}</p>
      </div>

      <div className="grid gap-2 text-sm text-campus-600 md:grid-cols-2">
        <p>
          팀장: <span className="font-medium text-campus-900">{team.leader_name || '미지정'}</span>
        </p>
        <p>
          카테고리: <span className="font-medium text-campus-900">{team.category || '미분류'}</span>
        </p>
        <p>
          인원: <span className="font-medium text-campus-900">{team.current_members}명</span>
        </p>
        <p>
          최대 인원:{' '}
          <span className="font-medium text-campus-900">
            {team.max_members !== null ? `${team.max_members}명` : '제한 없음'}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link to={`/teams/${team.id}`}>팀 상세 보기</Link>
        </Button>
        {canJoin && (
          <Button
            variant="ghost"
            type="button"
            disabled={isJoining}
            onClick={() => void onJoin?.(team.id)}
          >
            {isJoining ? '참여 중...' : '팀 참여하기'}
          </Button>
        )}
      </div>
    </Card>
  )
}
