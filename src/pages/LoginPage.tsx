import { Link } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { Card } from '../components/ui/Card'
import { LoginForm } from '../features/auth/components/LoginForm'

const workflowSteps = ['업무 요청 수집', 'AI task 추천', '담당자 자동 배분']

const productNotes = [
  {
    title: '업무와 회의를 한 흐름으로',
    description: '회의 메모와 요청을 연결해 다음 실행이 끊기지 않도록 이어줍니다.',
  },
  {
    title: '팀 상황에 맞는 자동 제안',
    description: '진행도와 일정, 팀원 스킬을 반영해 지금 해야 할 일을 먼저 정리합니다.',
  },
]

export function LoginPage() {
  return (
    <div className="app-shell min-h-screen overflow-x-hidden bg-[#eef3fa]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_12%_18%,rgba(53,93,255,0.13),transparent_24%),radial-gradient(circle_at_88%_12%,rgba(33,199,168,0.12),transparent_18%),linear-gradient(180deg,#f6f9fe_0%,#eef3fa_45%,#e9eef6_100%)]" />
      <Navbar />

      <div className="mx-auto grid min-h-[calc(100vh-var(--app-header-height))] w-full max-w-[88rem] grid-cols-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(420px,0.78fr)] lg:gap-10 lg:px-8 xl:px-10">
        <section className="relative flex min-h-[calc(100vh-var(--app-header-height)-3rem)] flex-col justify-center overflow-hidden rounded-[2.25rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(243,247,253,0.9)_100%)] px-6 py-10 shadow-[0_26px_70px_rgba(26,34,51,0.08)] backdrop-blur-xl sm:px-8 lg:px-10 xl:px-12">
          <div className="absolute inset-x-10 top-8 h-28 rounded-full bg-[rgba(53,93,255,0.08)] blur-3xl" />
          <div className="absolute -right-10 bottom-10 h-52 w-52 rounded-full bg-[rgba(33,199,168,0.08)] blur-3xl" />

          <div className="relative mx-auto w-full max-w-2xl">
            <div className="inline-flex items-center rounded-full border border-white/90 bg-white/82 px-4 py-2 text-sm font-medium text-brand-600 shadow-[0_14px_30px_rgba(53,93,255,0.08)]">
              AI 기반 팀 협업 워크플로우
            </div>

            <p className="mt-7 text-sm font-semibold tracking-[0.24em] text-campus-500">TASKPILOT</p>

            <h1 className="mt-4 max-w-[11ch] break-keep text-[2.8rem] font-semibold leading-[1.14] tracking-[-0.06em] text-campus-900 sm:text-[4rem] xl:text-[4.6rem]">
              팀의 업무 흐름을
              <br />
              자동으로 정리하세요
            </h1>

            <p className="mt-6 max-w-[31ch] break-keep text-base leading-8 text-campus-600 sm:text-lg">
              TaskPilot은 업무, 회의, 일정을 연결해 다음 해야 할 일을 자동으로 제안합니다.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              {workflowSteps.map((step, index) => (
                <div
                  key={step}
                  className="inline-flex items-center gap-3 rounded-full border border-white/80 bg-white/88 px-4 py-3 text-sm font-medium text-campus-700 shadow-[0_14px_34px_rgba(31,45,70,0.05)]"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-campus-900 text-xs font-semibold text-white">
                    0{index + 1}
                  </span>
                  <span className="break-keep">{step}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {productNotes.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.6rem] border border-white/80 bg-white/82 p-5 shadow-[0_18px_40px_rgba(31,45,70,0.06)]"
                >
                  <p className="text-lg font-semibold tracking-tight text-campus-900">{item.title}</p>
                  <p className="mt-3 break-keep text-sm leading-7 text-campus-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100vh-var(--app-header-height)-3rem)] items-center justify-center">
          <Card className="w-full max-w-[30rem] rounded-[2rem] border-white/80 bg-white/94 p-7 shadow-[0_24px_70px_rgba(26,34,51,0.1)] sm:p-8">
            <div className="space-y-3">
              <p className="text-sm font-semibold tracking-[0.18em] text-brand-600">WELCOME BACK</p>
              <h2 className="break-keep text-[2rem] font-semibold tracking-[-0.04em] text-campus-900">
                TaskPilot에 로그인
              </h2>
              <p className="break-keep text-sm leading-7 text-campus-600 sm:text-base">
                팀의 업무 흐름을 다시 이어가세요. 로그인하면 정리된 실행 화면으로 바로 이동합니다.
              </p>
            </div>

            <div className="mt-8">
              <LoginForm />
            </div>

            <div className="mt-7 rounded-[1.4rem] bg-campus-50/90 px-4 py-4">
              <p className="text-sm font-medium text-campus-700">처음이신가요?</p>
              <p className="mt-1 break-keep text-sm leading-6 text-campus-600">
                회원가입 후 바로 워크스페이스를 만들고 팀 협업 흐름을 시작할 수 있습니다.
              </p>
              <Link to="/signup" className="mt-3 inline-flex text-sm font-semibold text-brand-600 hover:text-brand-500">
                회원가입 하기
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </div>
  )
}
