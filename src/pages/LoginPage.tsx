import { CalendarDays, CheckCircle2, MailCheck, Workflow } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { LoginForm } from '../features/auth/components/LoginForm'

const loginFlow = [
  { step: '01', title: '할당 업무 확인' },
  { step: '02', title: '팀 워크스페이스 진입' },
  { step: '03', title: '회의와 일정 이어가기' },
]

const serviceSummary = [
  {
    title: '업무 대시보드',
    description: '할당 업무, 오늘 일정, 추천 액션을 한 화면에서 확인합니다.',
    icon: Workflow,
  },
  {
    title: '팀 워크스페이스',
    description: 'task, todo, 캘린더를 연결해 팀 운영 흐름을 정리합니다.',
    icon: CalendarDays,
  },
]

export function LoginPage() {
  return (
    <div className="app-shell min-h-screen overflow-x-hidden bg-[#eef3fa]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_14%_14%,rgba(53,93,255,0.16),transparent_24%),radial-gradient(circle_at_86%_10%,rgba(33,199,168,0.12),transparent_18%),linear-gradient(180deg,#f9fbff_0%,#eef4fb_42%,#e8eef7_100%)]" />
      <Navbar />

      <div className="mx-auto grid min-h-[calc(100vh-var(--app-header-height))] w-full max-w-[88rem] grid-cols-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,1.02fr)] lg:gap-10 lg:px-8 xl:px-10">
        <section className="flex min-h-[calc(100vh-var(--app-header-height)-3rem)] items-center">
          <div className="relative w-full overflow-hidden rounded-[2.2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(244,248,253,0.96)_100%)] p-6 shadow-[0_28px_80px_rgba(26,34,51,0.1)] backdrop-blur-xl sm:p-8 xl:p-9">
            <div className="absolute inset-x-10 top-5 h-24 rounded-full bg-[rgba(53,93,255,0.08)] blur-3xl" />
            <div className="absolute -right-8 bottom-0 h-40 w-40 rounded-full bg-[rgba(33,199,168,0.08)] blur-3xl" />

            <div className="relative mx-auto max-w-[31rem]">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/84 px-4 py-2 text-sm font-semibold text-brand-600 shadow-[0_14px_30px_rgba(53,93,255,0.08)]">
                  <MailCheck className="h-4 w-4" />
                  WELCOME BACK
                </div>
                <p className="pt-3 text-sm font-semibold tracking-[0.24em] text-campus-500">LOGIN</p>
                <h1 className="break-keep text-[2.2rem] font-semibold tracking-[-0.05em] text-campus-900 sm:text-[2.6rem]">
                  다시 로그인하고
                  <br />
                  팀 작업 흐름을 이어가세요
                </h1>
                <p className="break-keep text-sm leading-7 text-campus-600 sm:text-base">
                  로그인하면 대시보드와 팀 화면으로 바로 이동해 현재 진행 중인 업무와 일정을 이어서 확인할 수 있습니다.
                </p>
              </div>

              <div className="mt-8">
                <LoginForm />
              </div>

              <div className="mt-7 flex items-start gap-3 rounded-[1.35rem] border border-white/85 bg-white/72 px-4 py-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                <p className="text-sm leading-6 text-campus-700">
                  이전에 보던 업무 상태와 팀 워크스페이스 흐름을 바로 이어서 확인할 수 있습니다.
                </p>
              </div>

              <div className="mt-6 rounded-[1.4rem] bg-campus-50/90 px-4 py-4">
                <p className="text-sm font-medium text-campus-700">처음이신가요?</p>
                <p className="mt-1 break-keep text-sm leading-6 text-campus-600">
                  회원가입 후 이메일 인증을 마치면 팀 협업 흐름을 바로 시작할 수 있습니다.
                </p>
                <Link to="/signup" className="mt-3 inline-flex text-sm font-semibold text-brand-600 hover:text-brand-500">
                  회원가입 하기
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-var(--app-header-height)-3rem)] items-center">
          <div className="relative w-full overflow-hidden rounded-[2.25rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.8)_0%,rgba(243,247,253,0.92)_100%)] px-6 py-10 shadow-[0_26px_70px_rgba(26,34,51,0.08)] backdrop-blur-xl sm:px-8 lg:px-10 xl:px-12">
            <div className="absolute inset-x-10 top-8 h-28 rounded-full bg-[rgba(53,93,255,0.08)] blur-3xl" />
            <div className="absolute -right-10 bottom-10 h-52 w-52 rounded-full bg-[rgba(33,199,168,0.08)] blur-3xl" />

            <div className="relative mx-auto w-full max-w-2xl">
              <div className="inline-flex items-center rounded-full border border-white/90 bg-white/82 px-4 py-2 text-sm font-medium text-brand-600 shadow-[0_14px_30px_rgba(53,93,255,0.08)]">
                TASKPILOT WORKSPACE
              </div>

              <p className="mt-7 text-sm font-semibold tracking-[0.24em] text-campus-500">SMART WORKSPACE</p>
              <h2 className="mt-4 max-w-[12ch] break-keep text-[2.7rem] font-semibold leading-[1.08] tracking-[-0.06em] text-campus-900 sm:text-[3.7rem] xl:text-[4.2rem]">
                로그인 후 바로
                <br />
                팀 작업 화면으로
              </h2>
              <p className="mt-5 max-w-[30rem] break-keep text-base leading-8 text-campus-600 sm:text-lg">
                회원가입 화면과 같은 흐름으로, 로그인 이후 확인하게 되는 핵심 작업 화면들을 한눈에 볼 수 있게 구성했습니다.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                {loginFlow.map((item) => (
                  <div
                    key={item.step}
                    className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/88 px-4 py-3 text-sm font-medium text-campus-700 shadow-[0_14px_34px_rgba(31,45,70,0.05)]"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-campus-900 text-xs font-semibold text-white">
                      {item.step}
                    </span>
                    <span className="break-keep">{item.title}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {serviceSummary.map(({ title, description, icon: Icon }) => (
                  <div
                    key={title}
                    className="rounded-[1.6rem] border border-white/80 bg-white/82 p-5 shadow-[0_18px_40px_rgba(31,45,70,0.06)]"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
                      <Icon className="h-5 w-5 text-brand-600" />
                    </div>
                    <p className="mt-4 text-lg font-semibold tracking-tight text-campus-900">{title}</p>
                    <p className="mt-3 break-keep text-sm leading-7 text-campus-600">{description}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[1.6rem] border border-white/80 bg-white/78 px-5 py-5 shadow-[0_18px_40px_rgba(31,45,70,0.05)]">
                <p className="text-sm font-semibold text-campus-900">로그인 후 이어지는 흐름</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] bg-campus-50/90 px-4 py-4">
                    <p className="text-xs font-semibold tracking-[0.18em] text-brand-600">DASHBOARD</p>
                    <p className="mt-2 text-sm font-semibold text-campus-900">오늘 해야 할 일</p>
                    <p className="mt-1 text-sm leading-6 text-campus-600">현재 할당 업무와 가까운 일정을 확인합니다.</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-campus-50/90 px-4 py-4">
                    <p className="text-xs font-semibold tracking-[0.18em] text-brand-600">TEAM</p>
                    <p className="mt-2 text-sm font-semibold text-campus-900">팀 작업 관리</p>
                    <p className="mt-1 text-sm leading-6 text-campus-600">task, todo, 일정 흐름을 한 화면에서 이어갑니다.</p>
                  </div>
                  <div className="rounded-[1.2rem] bg-campus-50/90 px-4 py-4">
                    <p className="text-xs font-semibold tracking-[0.18em] text-brand-600">ACTION</p>
                    <p className="mt-2 text-sm font-semibold text-campus-900">실행 화면 복귀</p>
                    <p className="mt-1 text-sm leading-6 text-campus-600">회의 정리와 보고서 작성 흐름으로 자연스럽게 이어집니다.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
