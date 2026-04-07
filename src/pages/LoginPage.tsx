import { Link } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { Card } from '../components/ui/Card'
import { LoginForm } from '../features/auth/components/LoginForm'

export function LoginPage() {
  return (
    <div className="app-shell min-h-screen">
      <Navbar />

      <div className="mx-auto grid min-h-[calc(100vh-var(--app-header-height))] w-full max-w-[88rem] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.9fr),minmax(420px,0.8fr)] lg:px-8 xl:px-10">
        <section className="flex min-h-[calc(100vh-var(--app-header-height)-3rem)] flex-col justify-center">
          <Card className="mx-auto w-full max-w-[34rem] space-y-6 border-white/80 bg-white/92 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
                다시 오신 것을 환영합니다
              </p>
              <h1 className="font-display text-3xl text-campus-900">로그인</h1>
              <p className="text-sm text-campus-600">
                이메일과 비밀번호로 로그인하고 보호된 대시보드로 이동하세요.
              </p>
            </div>

            <LoginForm />

            <p className="text-sm text-campus-600">
              아직 계정이 없으신가요?{' '}
              <Link to="/signup" className="font-semibold text-brand-600 hover:underline">
                회원가입
              </Link>
            </p>
          </Card>
        </section>

        <section className="hidden min-h-[calc(100vh-var(--app-header-height)-3rem)] rounded-[2rem] border border-white/70 bg-white/78 p-8 shadow-[0_22px_54px_rgba(26,34,51,0.08)] lg:flex lg:flex-col lg:justify-center xl:p-10">
          <div className="mx-auto w-full max-w-xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-campus-500">
              안전한 인증
            </p>
            <h2 className="font-display text-4xl leading-tight text-campus-900">
              팀 작업 공간을
              <br />
              Supabase Auth로 안전하게 보호하세요
            </h2>
            <p className="text-campus-600">
              새로고침 후에도 로그인 세션이 유지되고, 인증되지 않은 사용자는 자동으로 로그인
              페이지로 이동합니다.
            </p>
            <div className="grid gap-3 pt-4 md:grid-cols-2">
              <Card className="bg-brand-50">
                <p className="text-sm font-semibold text-brand-600">세션 유지</p>
                <p className="mt-1 text-sm text-campus-700">
                  새로고침 후에도 인증 상태가 복원됩니다.
                </p>
              </Card>
              <Card className="bg-accent-100">
                <p className="text-sm font-semibold text-accent-500">라우트 보호</p>
                <p className="mt-1 text-sm text-campus-700">
                  로그인한 사용자는 바로 대시보드로 이동합니다.
                </p>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
