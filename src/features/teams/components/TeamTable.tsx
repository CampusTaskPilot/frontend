import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import type { TeamSummary } from '../types/team'

interface TeamTableProps {
  teams: TeamSummary[]
}

const statusMap: Record<string, string> = {
  Active: '운영 중',
  Paused: '일시중지',
}

const availabilityMap: Record<string, string> = {
  Focus: '집중',
  'At capacity': '가득 참',
  Out: '부재',
}

export function TeamTable({ teams }: TeamTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[780px] border-collapse text-sm">
        <thead className="bg-campus-50 text-left text-xs uppercase tracking-[0.2em] text-campus-500">
          <tr>
            {['팀', '팀 소개', '팀 규모', '상태', '구성원', '최근 업데이트', ''].map((header) => (
              <th key={header} className="px-5 py-4">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team.id} className="border-t border-campus-100 hover:bg-campus-50/60">
              <td className="px-5 py-4">
                <p className="font-semibold text-campus-900">{team.name}</p>
                <p className="text-xs text-campus-500">팀 코드: {team.id}</p>
              </td>
              <td className="px-5 py-4 text-campus-700">{team.mission}</td>
              <td className="px-5 py-4">
                <Badge variant="neutral">{team.velocity}명</Badge>
              </td>
              <td className="px-5 py-4">
                <Badge variant={team.status === 'Active' ? 'success' : 'warning'}>
                  {statusMap[team.status] ?? team.status}
                </Badge>
              </td>
              <td className="px-5 py-4">
                <div className="space-y-2">
                  {team.members.slice(0, 2).map((member) => (
                    <div key={member.id} className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
                        {initials(member.name)}
                      </span>
                      <p className="text-xs text-campus-600">
                        {member.role} · {availabilityMap[member.availability]}
                      </p>
                    </div>
                  ))}
                  {team.members.length > 2 && (
                    <p className="text-xs text-campus-500">외 {team.members.length - 2}명</p>
                  )}
                </div>
              </td>
              <td className="px-5 py-4 text-campus-500">
                {new Date(team.lastUpdated).toLocaleDateString('ko-KR')}
              </td>
              <td className="px-5 py-4 text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link to={`/teams/${team.id}`}>팀 보기</Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}
