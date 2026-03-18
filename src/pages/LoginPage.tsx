import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { LoginForm } from '../features/auth/components/LoginForm'

export function LoginPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-campus-grid lg:grid-cols-2">
      <section className="flex min-h-screen flex-col justify-center gap-6 px-6 py-12 md:px-10">
        <Card className="mx-auto w-full max-w-xl space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              다시 만나서 반가워요
            </p>
            <h1 className="font-display text-3xl text-campus-900">로그인</h1>
            <p className="text-sm text-campus-600">
              팀 프로젝트 진행 중이라면 지금 바로 들어와 일정과 역할 현황을 확인하세요.
            </p>
          </div>

          <LoginForm />

          <p className="text-sm text-campus-600">
            계정이 없으신가요?{' '}
            <Link to="/signup" className="font-semibold text-brand-600 hover:underline">
              회원가입
            </Link>
          </p>
        </Card>
      </section>

      <section className="hidden min-h-screen bg-white p-10 lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto w-full max-w-xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-campus-500">
            팀 운영 팁
          </p>
          <h2 className="font-display text-4xl leading-tight text-campus-900">
            한 학기 프로젝트,
            <br />
            끝까지 같이 가는 방법
          </h2>
          <p className="text-campus-600">
            주간 목표를 설정하고 회의 기록을 쌓아두면 발표 직전에도 팀 전체 맥락을 쉽게
            맞출 수 있어요.
          </p>
          <div className="grid gap-3 pt-4 md:grid-cols-2">
            <Card className="bg-brand-50">
              <p className="text-sm font-semibold text-brand-600">주간 스탠드업</p>
              <p className="mt-1 text-sm text-campus-700">팀별 진행률 자동 요약 제공</p>
            </Card>
            <Card className="bg-accent-100">
              <p className="text-sm font-semibold text-accent-500">역할 체크</p>
              <p className="mt-1 text-sm text-campus-700">역할 공백을 미리 알림으로 안내</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
