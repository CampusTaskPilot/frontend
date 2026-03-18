import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const quickStats = [
  { label: '활성 팀', value: '6팀', sub: '이번 주 모집 중 2팀' },
  { label: '이번 주 마감', value: '4건', sub: '발표 준비 2건 포함' },
  { label: '역할 요청', value: '9건', sub: '디자인/프론트 우선' },
]

const activities = [
  { title: '캡스톤 3팀 주간 회의', detail: '오늘 19:00 · 온라인', status: '진행 예정' },
  { title: '서비스 기획안 피드백', detail: '내일 14:00 · 팀 라운지', status: '검토 필요' },
  { title: 'UI 시안 확정', detail: '금요일 17:00 · 디자인 채널', status: '완료' },
]

export function MainDashboard() {
  return (
    <section className="space-y-6">
      <Card className="bg-gradient-to-r from-brand-50 via-white to-accent-100">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              오늘의 팀 프로젝트
            </p>
            <h1 className="font-display text-3xl leading-tight text-campus-900 md:text-4xl">
              이번 주 목표를 정하고
              <br />
              팀원과 바로 공유해보세요
            </h1>
            <p className="max-w-2xl text-sm text-campus-700">
              모집, 역할 분담, 일정 공지를 하나의 보드에서 운영하면 팀 커뮤니케이션 비용을
              크게 줄일 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/app/teams">팀 관리로 이동</Link>
            </Button>
            <Button variant="ghost">공지 작성</Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {quickStats.map((item) => (
          <Card key={item.label}>
            <p className="text-sm text-campus-500">{item.label}</p>
            <p className="mt-2 font-display text-3xl text-campus-900">{item.value}</p>
            <p className="mt-1 text-sm text-campus-600">{item.sub}</p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-campus-900">이번 주 주요 일정</h2>
          <Button variant="subtle" size="sm">
            전체 일정 보기
          </Button>
        </div>
        <div className="mt-5 space-y-3">
          {activities.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-2 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium text-campus-900">{item.title}</p>
                <p className="text-sm text-campus-600">{item.detail}</p>
              </div>
              <Badge
                variant={
                  item.status === '완료'
                    ? 'success'
                    : item.status === '검토 필요'
                      ? 'warning'
                      : 'neutral'
                }
              >
                {item.status}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </section>
  )
}
