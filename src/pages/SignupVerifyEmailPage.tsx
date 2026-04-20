import { ArrowRight, CheckCircle2, MailCheck } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { Button } from '../components/ui/Button'

const verificationChecklist = [
  '메일함과 스팸함, 프로모션함까지 함께 확인해 주세요.',
  '인증 링크를 누르면 TaskPilot으로 돌아와 로그인 또는 대시보드 흐름이 이어집니다.',
  '잘못 입력했다면 다른 이메일로 다시 회원가입할 수 있습니다.',
]

export function SignupVerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')?.trim() || '입력한 이메일'

  return (
    <div className="app-shell min-h-screen overflow-x-hidden bg-[#eef3fa]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_15%_16%,rgba(53,93,255,0.16),transparent_22%),radial-gradient(circle_at_85%_12%,rgba(33,199,168,0.12),transparent_18%),linear-gradient(180deg,#f9fbff_0%,#eef4fb_42%,#e8eef7_100%)]" />
      <Navbar />

      <main className="mx-auto flex min-h-[calc(100vh-var(--app-header-height))] w-full max-w-[82rem] items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="relative w-full max-w-[42rem] overflow-hidden rounded-[2.4rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(244,248,253,0.96)_100%)] p-6 shadow-[0_28px_80px_rgba(26,34,51,0.1)] backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="absolute -left-10 top-8 h-36 w-36 rounded-full bg-[rgba(53,93,255,0.08)] blur-3xl" />
          <div className="absolute right-0 top-12 h-44 w-44 rounded-full bg-[rgba(33,199,168,0.09)] blur-3xl" />

          <div className="relative mx-auto max-w-[38rem]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/84 px-4 py-2 text-sm font-semibold text-brand-600 shadow-[0_14px_30px_rgba(53,93,255,0.08)]">
              <MailCheck className="h-4 w-4" />
              이메일 인증을 기다리는 중
            </div>

            <p className="mt-7 text-sm font-semibold tracking-[0.24em] text-campus-500">VERIFY EMAIL</p>
            <h1 className="mt-4 break-keep text-[2.5rem] font-semibold leading-[1.1] tracking-[-0.06em] text-campus-900 sm:text-[3.3rem]">
              인증 메일을 보냈습니다.
              <br />
              메일함을 확인해 주세요
            </h1>
            <p className="mt-5 max-w-[38rem] break-keep text-base leading-8 text-campus-600 sm:text-lg">
              아래 이메일 주소로 TaskPilot 인증 메일을 발송했습니다. 메일 안의 인증 링크를 누르면 가입
              절차가 완료되고 서비스 이용을 이어갈 수 있습니다.
            </p>

            <div className="mt-8 rounded-[1.7rem] border border-brand-100 bg-brand-50/80 px-5 py-5">
              <p className="text-sm font-semibold tracking-[0.18em] text-brand-600">인증 메일 수신 주소</p>
              <p className="mt-3 break-all text-xl font-semibold tracking-tight text-campus-900">{email}</p>
            </div>

            <div className="mt-8 space-y-4">
              {verificationChecklist.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-[1.35rem] border border-white/85 bg-white/75 px-4 py-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <p className="text-sm leading-6 text-campus-700">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild className="gap-2 px-6">
                <Link to="/login">
                  인증 후 로그인하기
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="px-6">
                <Link to="/signup">다른 이메일로 다시 가입</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
