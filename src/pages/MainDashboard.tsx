import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/AuthContext'

const quickStats = [
  { label: '진행 중인 프로젝트', value: '6', sub: '이번 주 모집 중인 항목 2건' },
  { label: '이번 주 마감', value: '4', sub: '발표 준비 포함 2건' },
  { label: '확인할 작업', value: '9', sub: '피드백 점검이 필요한 항목' },
]

const activities = [
  { title: '캡스톤 주간 회의', detail: '오늘 19:00 · 온라인', status: '예정' },
  { title: '서비스 기획안 리뷰', detail: '내일 14:00 · 미팅룸 A', status: '검토 필요' },
  { title: 'UI 시안 확정', detail: '금요일 17:00 · 디자인 채널', status: '완료' },
]

export function MainDashboard() {
  const { user } = useAuth()

  const metadata = user?.user_metadata as { full_name?: string; workspace_name?: string } | undefined
  const displayName = metadata?.full_name ?? user?.email?.split('@')[0] ?? '사용자'
  const workspaceName = metadata?.workspace_name ?? '기본 워크스페이스'
  const lastSignInAt = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString('ko-KR')
    : '확인 불가'

  return (
    <section className="space-y-6">
      <Card className="bg-gradient-to-r from-brand-50 via-white to-accent-100">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              인증 대시보드
            </p>
            <h1 className="font-display text-3xl leading-tight text-campus-900 md:text-4xl">
              {displayName}님, 환영합니다.
              <br />
              팀을 만들거나 참여해서 바로 협업을 시작해 보세요.
            </h1>
            <p className="max-w-2xl text-sm text-campus-700">
              Supabase 세션 기반 인증 환경에서 팀과 프로필 기능을 안전하게 사용할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link to="/teams/create">팀 생성하기</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/teams">팀 참가하기</Link>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl text-campus-900">현재 로그인 사용자</h2>
            <Badge variant="success">로그인됨</Badge>
          </div>
          <div className="mt-5 space-y-4 text-sm text-campus-700">
            <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3">
              <p className="text-campus-500">이메일</p>
              <p className="mt-1 font-medium text-campus-900">{user?.email ?? '이메일 없음'}</p>
            </div>
            <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3">
              <p className="text-campus-500">사용자 ID</p>
              <p className="mt-1 break-all font-medium text-campus-900">{user?.id ?? '사용자 ID 없음'}</p>
            </div>
            <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3">
              <p className="text-campus-500">워크스페이스</p>
              <p className="mt-1 font-medium text-campus-900">{workspaceName}</p>
            </div>
            <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3">
              <p className="text-campus-500">마지막 로그인</p>
              <p className="mt-1 font-medium text-campus-900">{lastSignInAt}</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          {quickStats.map((item) => (
            <Card key={item.label}>
              <p className="text-sm text-campus-500">{item.label}</p>
              <p className="mt-2 font-display text-3xl text-campus-900">{item.value}</p>
              <p className="mt-1 text-sm text-campus-600">{item.sub}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl text-campus-900">이번 주 일정</h2>
          <Button variant="subtle" size="sm">
            전체 보기
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
