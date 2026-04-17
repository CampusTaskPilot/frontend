import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AuthMenu } from '../components/common/AuthMenu'
import { Button } from '../components/ui/Button'
import { useAuth } from '../features/auth/context/useAuth'

const featureItems = [
  {
    title: 'AI Task 추천',
    description:
      '진행 중인 목표와 팀의 맥락을 바탕으로 지금 필요한 Task를 빠르게 추천합니다.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path
          d="M6.5 7.5h11m-11 4h7m-7 4h11M5 4.75h14A1.25 1.25 0 0 1 20.25 6v12A1.25 1.25 0 0 1 19 19.25H5A1.25 1.25 0 0 1 3.75 18V6A1.25 1.25 0 0 1 5 4.75Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    title: '자동 업무 배분',
    description:
      '업무량과 일정, 역할을 반영해 가장 적절한 담당자에게 자연스럽게 연결합니다.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path
          d="M12 12a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm-5.75 6.25a5.75 5.75 0 0 1 11.5 0M18.25 8.5h2m-1-1v2M3.75 8.5h2m-1-1v2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    title: '회의 내용을 실행 Task로 전환',
    description:
      '회의 메모와 요청사항을 실행 가능한 Task로 바꾸고 일정과 우선순위까지 이어서 정리합니다.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path
          d="M6.75 5.75h10.5A1.75 1.75 0 0 1 19 7.5v6a1.75 1.75 0 0 1-1.75 1.75H11.5l-3.75 3v-3H6.75A1.75 1.75 0 0 1 5 13.5v-6a1.75 1.75 0 0 1 1.75-1.75Zm6.25 2.75 3 3-3 3"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
  {
    title: '업무 흐름 분석 및 추천',
    description:
      '막히는 구간을 파악하고 다음에 해야 할 일을 먼저 제안해 실행 속도를 높여줍니다.',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
        <path
          d="M5.5 16.5 9 13l2.5 2.5L18.5 8.5M15.5 8.5h3v3M5 19.25h14"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    ),
  },
]

const processItems = ['업무 요청', 'Task 추천', '담당자 배정', '일정 생성', '실행 시작']

const supportMetrics = [
  { label: '정리되는 업무', value: '2.4배 빠르게' },
  { label: '회의 후속 전환', value: '즉시 연결' },
  { label: '팀 일정 반영', value: '실시간 동기화' },
]

function useReveal() {
  const ref = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return
        }

        setIsVisible(true)
        observer.unobserve(entry.target)
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return {
    ref,
    className: isVisible ? 'reveal is-visible' : 'reveal',
  }
}

function RevealSection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const { ref, className: revealClassName } = useReveal()

  return (
    <section ref={ref} className={[revealClassName, className].filter(Boolean).join(' ')}>
      {children}
    </section>
  )
}

export function LandingPage() {
  const { user } = useAuth()
  const primaryCta = user
    ? { label: '대시보드로 이동', to: '/dashboard' }
    : { label: '지금 시작하기', to: '/signup' }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f3f7fc] text-campus-900">
      <div className="relative isolate">
        <div className="absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_top,rgba(53,93,255,0.16),transparent_34%),radial-gradient(circle_at_85%_18%,rgba(33,199,168,0.14),transparent_24%),linear-gradient(180deg,#f7fbff_0%,#eef4fb_56%,#f3f7fc_100%)]" />
        <div className="absolute left-1/2 top-24 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-white/55 blur-3xl" />

        <header className="sticky top-0 z-30 border-b border-white/60 bg-white/72 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-campus-900 text-sm font-semibold tracking-[0.22em] text-white shadow-[0_16px_40px_rgba(26,34,51,0.16)]">
                TP
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight text-campus-900">TaskPilot</p>
                <p className="hidden break-keep text-sm text-campus-500 sm:block">
                  팀의 업무 흐름을 AI로 정리하는 협업 플랫폼
                </p>
              </div>
            </Link>

              <div className="flex items-center gap-2 sm:gap-3">
                <AuthMenu
                  guestPrimaryLabel="무료로 시작하기"
                  loadingClassName="h-11 w-32 rounded-full border border-campus-200 bg-white/70"
                />
              </div>
          </div>
        </header>

        <main>
          <section className="relative mx-auto flex min-h-[calc(100svh-76px)] w-full max-w-6xl items-center px-5 pb-20 pt-14 sm:px-6 sm:pb-24 sm:pt-20 lg:px-8 lg:pt-24">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="mx-auto mt-7 break-keep text-[3.4rem] font-semibold leading-none tracking-[-0.08em] text-[#162033] sm:text-[5.25rem] lg:text-[6.8rem]">
                TaskPilot
              </h1>

              <p className="mx-auto mt-5 max-w-[18ch] break-keep text-lg font-medium leading-8 text-campus-600 sm:text-xl">
                흩어진 업무를 실행까지 정리합니다
              </p>

              <p className="mx-auto mt-7 max-w-[35ch] break-keep text-base leading-8 text-campus-600 sm:text-lg">
                회의 메모, 업무 요청, 일정 변경이 쌓여도 괜찮습니다.
                <br />
                TaskPilot은 맥락을 정리하고 담당자와 우선순위, 실행 순서까지 자연스럽게 연결합니다.
              </p>

              <div className="mt-10 flex items-center justify-center">
                <Button
                  asChild
                  className="min-h-12 min-w-[12.5rem] px-7 text-base shadow-[0_18px_40px_rgba(26,34,51,0.14)]"
                >
                  <Link to={primaryCta.to}>{primaryCta.label}</Link>
                </Button>
              </div>

              <p className="mt-8 text-sm font-medium text-campus-500">
                여러 팀이 이미 TaskPilot으로 회의 이후 실행 속도를 높이고 있습니다
              </p>

              <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
                {supportMetrics.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.6rem] border border-white/80 bg-white/82 px-5 py-5 text-left shadow-[0_18px_40px_rgba(31,45,70,0.06)] backdrop-blur"
                  >
                    <p className="text-sm font-medium text-campus-500">{item.label}</p>
                    <p className="mt-3 break-keep text-2xl font-semibold tracking-tight text-campus-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <RevealSection className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-semibold tracking-[0.18em] text-brand-600">핵심 기능</p>
              <h2 className="mx-auto mt-4 max-w-[13ch] break-keep text-3xl font-semibold leading-[1.24] tracking-[-0.04em] text-campus-900 sm:text-4xl">
                복잡한 업무를 간단한
                <br />
                실행 흐름으로 바꾸는 기능
              </h2>
              <p className="mx-auto mt-5 max-w-[34ch] break-keep text-base leading-8 text-campus-600 sm:text-lg">
                필요한 기능만 명확하게 보여주고, 실제 팀 운영에서 자주 마주치는 흐름에 맞춰 설계했습니다.
              </p>
            </div>

            <div className="mt-12 grid gap-4 md:grid-cols-2">
              {featureItems.map((item, index) => (
                <article
                  key={item.title}
                  className="reveal-card rounded-[1.9rem] border border-white/80 bg-white/86 p-6 shadow-[0_20px_50px_rgba(31,45,70,0.07)] backdrop-blur transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(31,45,70,0.1)] sm:p-7"
                  style={{ transitionDelay: `${index * 70}ms` }}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#edf3ff_0%,#eefcf8_100%)] text-campus-900 ring-1 ring-inset ring-brand-100/70">
                    {item.icon}
                  </div>
                  <h3 className="mt-6 break-keep text-2xl font-semibold tracking-tight text-campus-900">
                    {item.title}
                  </h3>
                  <p className="mt-4 max-w-[26ch] break-keep text-base leading-7 text-campus-600">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </RevealSection>

          <RevealSection className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
            <div className="overflow-hidden rounded-[2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(244,248,253,0.9)_100%)] p-6 shadow-[0_24px_70px_rgba(31,45,70,0.08)] backdrop-blur sm:p-8 lg:p-10">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-semibold tracking-[0.18em] text-brand-600">업무 흐름</p>
                <h2 className="mt-4 break-keep text-3xl font-semibold leading-[1.24] tracking-[-0.04em] text-campus-900 sm:text-4xl">
                  요청이 들어오면 실행까지
                  <br />
                  하나의 흐름으로 이어집니다
                </h2>
                <p className="mx-auto mt-5 max-w-[34ch] break-keep text-base leading-8 text-campus-600 sm:text-lg">
                  업무 요청만 올려두면 다시 정리할 필요 없이, AI가 다음 단계로 자연스럽게 연결합니다.
                </p>
              </div>

              <div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_auto_minmax(0,1.3fr)_auto_minmax(0,1.3fr)_auto_minmax(0,1.3fr)_auto_minmax(0,1.3fr)] lg:items-stretch">
                {processItems.map((item, index) => (
                  <div key={item} className="contents">
                    <div className="rounded-[1.7rem] border border-campus-100 bg-white/90 p-5 text-center shadow-[0_18px_40px_rgba(31,45,70,0.06)]">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-campus-900 text-sm font-semibold text-white">
                        0{index + 1}
                      </div>
                      <p className="mt-4 break-keep text-lg font-semibold text-campus-900">{item}</p>
                    </div>

                    {index < processItems.length - 1 ? (
                      <div className="hidden items-center justify-center lg:flex">
                        <svg
                          viewBox="0 0 56 24"
                          aria-hidden="true"
                          className="h-6 w-14 text-campus-300"
                        >
                          <path
                            d="M4 12h45m0 0-7-7m7 7-7 7"
                            fill="none"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.8"
                          />
                        </svg>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </RevealSection>

          <RevealSection className="mx-auto w-full max-w-6xl px-5 pb-24 pt-10 sm:px-6 lg:px-8 lg:pb-28">
            <div className="overflow-hidden rounded-[2.2rem] bg-[linear-gradient(135deg,#0f1727_0%,#17243a_52%,#1f3d53_100%)] px-6 py-10 text-white shadow-[0_32px_90px_rgba(15,23,39,0.3)] sm:px-8 sm:py-12 lg:px-12 lg:py-14">
              <div className="mx-auto max-w-3xl text-center">
                <p className="text-sm font-semibold tracking-[0.18em] text-white/65">지금 시작하기</p>
                <h2 className="mt-4 break-keep text-3xl font-semibold leading-[1.24] tracking-[-0.04em] text-white sm:text-4xl">
                  이제 팀의 업무를
                  <br />
                  더 효율적으로 관리해보세요
                </h2>
                <p className="mx-auto mt-5 max-w-[34ch] break-keep text-base leading-8 text-white/74 sm:text-lg">
                  지금 시작하면 AI가 팀의 흐름을 정리하고 실행이 멈추지 않도록 다음 액션까지 이어줍니다.
                </p>

                <div className="mt-10 flex items-center justify-center">
                  <Button
                    asChild
                    className="min-h-12 min-w-[12.5rem] bg-white px-7 text-base text-campus-900 shadow-[0_18px_40px_rgba(255,255,255,0.12)] hover:bg-campus-50"
                  >
                    <Link to={primaryCta.to}>{primaryCta.label}</Link>
                  </Button>
                </div>
              </div>
            </div>
          </RevealSection>
        </main>
      </div>
    </div>
  )
}
