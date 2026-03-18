import { useMemo, useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TeamTable } from '../features/teams/components/TeamTable'
import { mockTeams } from '../features/teams/data/mockTeams'

const filters = [
  { label: '전체', value: 'All' },
  { label: '운영 중', value: 'Active' },
  { label: '휴면', value: 'Paused' },
]

export function TeamManagementPage() {
  const [selectedFilter, setSelectedFilter] = useState('All')

  const filteredTeams = useMemo(() => {
    if (selectedFilter === 'All') return mockTeams
    return mockTeams.filter((team) => team.status === selectedFilter)
  }, [selectedFilter])

  const totalMembers = filteredTeams.reduce((acc, team) => acc + team.members.length, 0)
  const focusedMembers = filteredTeams.reduce(
    (acc, team) => acc + team.members.filter((member) => member.availability === 'Focus').length,
    0,
  )

  return (
    <section className="space-y-6">
      <Card className="space-y-5 bg-gradient-to-r from-white via-brand-50 to-accent-100">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.3em] text-brand-600">
              팀 스튜디오
            </p>
            <h1 className="font-display text-3xl text-campus-900">팀 운영 관리</h1>
            <p className="max-w-2xl text-sm text-campus-700">
              팀원 모집, 역할 배분, 진행 상태를 한 번에 확인하고 다음 액션을 바로 결정하세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost">모집 글 가져오기</Button>
            <Button>새 팀 만들기</Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="bg-white p-4">
            <p className="text-xs text-campus-500">현재 팀 수</p>
            <p className="mt-1 text-2xl font-semibold text-campus-900">
              {filteredTeams.length}팀
            </p>
          </Card>
          <Card className="bg-white p-4">
            <p className="text-xs text-campus-500">참여 인원</p>
            <p className="mt-1 text-2xl font-semibold text-campus-900">{totalMembers}명</p>
          </Card>
          <Card className="bg-white p-4">
            <p className="text-xs text-campus-500">집중 상태</p>
            <p className="mt-1 text-2xl font-semibold text-campus-900">{focusedMembers}명</p>
          </Card>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setSelectedFilter(filter.value)}
              className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                selectedFilter === filter.value
                  ? 'border-brand-200 bg-brand-100 text-brand-700'
                  : 'border-campus-200 bg-white text-campus-600 hover:bg-campus-50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr,320px]">
        <Card className="p-0">
          <TeamTable teams={filteredTeams} />
        </Card>
        <Card className="space-y-3">
          <h2 className="font-display text-xl text-campus-900">모집 현황</h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-campus-200 bg-campus-50 p-4">
              <p className="text-sm font-medium text-campus-800">프론트엔드 모집</p>
              <p className="text-sm text-campus-600">2개 팀이 React 경험자를 찾고 있어요.</p>
              <Badge className="mt-2" variant="warning">
                지원 마감 임박
              </Badge>
            </div>
            <div className="rounded-2xl border border-campus-200 bg-campus-50 p-4">
              <p className="text-sm font-medium text-campus-800">디자이너 모집</p>
              <p className="text-sm text-campus-600">UX 시안 담당 가능 인원을 우선 매칭합니다.</p>
              <Badge className="mt-2" variant="neutral">
                상시 모집
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
