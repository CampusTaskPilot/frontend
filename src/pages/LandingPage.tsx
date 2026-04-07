import { Link } from 'react-router-dom'

const featureItems = [
  {
    eyebrow: 'AI 업무 정리',
    title: '흩어진 업무 내용을 한 번에 정리합니다',
    description:
      '채팅, 회의 메모, 작업 요청을 모아 현재 해야 할 일과 담당자, 우선순위를 빠르게 정리합니다.',
  },
  {
    eyebrow: '일정과 할 일 관리',
    title: '일정 변화까지 반영해 팀 흐름을 맞춥니다',
    description:
      '프로젝트 일정, 마감일, 진행 상태를 같은 화면에서 확인하고 변경 사항이 생기면 바로 공유할 수 있습니다.',
  },
  {
    eyebrow: '회의 액션 추출',
    title: '회의 후속 작업을 놓치지 않게 만듭니다',
    description:
      '회의 내용을 요약하고 실제로 실행해야 할 액션만 추려서 업무 보드와 팀 캘린더에 연결합니다.',
  },
  {
    eyebrow: '진행 방향 제안',
    title: '막히는 구간에서는 다음 우선순위를 제안합니다',
    description:
      '현재 진행률과 팀 리소스를 바탕으로 무엇을 먼저 처리해야 하는지 자연스럽게 안내합니다.',
  },
]

const workflowPoints = [
  {
    title: '여러 도구를 오가며 정리하지 않아도 됩니다',
    description:
      '할 일, 일정, 회의 기록, 다음 액션이 한 흐름 안에서 이어져 팀이 지금 무엇을 하고 있는지 바로 이해할 수 있습니다.',
  },
  {
    title: '팀 정보와 업무 맥락을 기반으로 AI가 돕습니다',
    description:
      '누가 어떤 역할을 맡고 있는지, 어떤 일정이 남아 있는지까지 반영해 더 현실적인 제안을 제공합니다.',
  },
  {
    title: '실제 협업 흐름 안에서 바로 사용할 수 있습니다',
    description:
      '별도 정리용 도구가 아니라 프로젝트를 운영하는 화면 안에서 AI 요약, 액션 제안, 일정 연결이 함께 동작합니다.',
  },
]

const summaryItems = [
  { label: '오늘 정리된 업무', value: '12건', tone: 'blue' },
  { label: '자동 배정 제안', value: '4건', tone: 'emerald' },
  { label: '이번 주 주요 일정', value: '7개', tone: 'slate' },
]

const taskItems = [
  {
    team: '제품팀',
    title: '온보딩 화면 문구 확정',
    meta: '오늘 · 민지, 준호',
    status: '검토 필요',
  },
  {
    team: '마케팅팀',
    title: '런칭 캠페인 일정 조정',
    meta: '내일 오전 · 소연',
    status: 'AI 제안 반영',
  },
  {
    team: '개발팀',
    title: '회의 액션 항목 백로그 반영',
    meta: '이번 주 · 태훈, 지원',
    status: '진행 중',
  },
]

const meetingActions = [
  '디자인 시안 최종본 공유 후 개발 일정 확정',
  '고객 인터뷰 요약을 바탕으로 우선 기능 재정렬',
  '이번 주 금요일 전까지 QA 범위 문서 업데이트',
]

const suggestions = [
  '마감이 가까운 작업 2건은 오늘 오후 리뷰 슬롯에 배치하는 편이 좋습니다.',
  '회의에서 논의된 이슈 중 일정 영향이 있는 항목을 캘린더에 먼저 반영하세요.',
]

function toneClass(tone: string) {
  switch (tone) {
    case 'blue':
      return 'bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100'
    case 'emerald':
      return 'bg-accent-100 text-accent-500 ring-1 ring-inset ring-emerald-100'
    default:
      return 'bg-campus-100 text-campus-700 ring-1 ring-inset ring-campus-200'
  }
}

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-campus-900">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-[44rem] bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.18),transparent_32%),radial-gradient(circle_at_88%_14%,rgba(33,199,168,0.14),transparent_28%),linear-gradient(180deg,#f7fafe_0%,#eff4fa_45%,#f4f7fb_100%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[linear-gradient(120deg,rgba(255,255,255,0.58),rgba(255,255,255,0.08))]" />

        <header className="border-b border-white/70 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-campus-900 text-sm font-semibold tracking-[0.22em] text-white">
                TP
              </span>
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight text-campus-900">TaskPilot</p>
                <p className="hidden text-sm text-campus-500 sm:block">AI 기반 협업 플랫폼</p>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-campus-200 bg-white px-4 text-sm font-medium text-campus-700 transition hover:border-campus-300 hover:bg-campus-50 sm:px-5"
              >
                로그인
              </Link>
              <Link
                to="/signup"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-campus-900 px-4 text-sm font-medium text-white shadow-card transition hover:-translate-y-0.5 hover:bg-campus-700 sm:px-5"
              >
                무료로 시작하기
              </Link>
            </div>
          </div>
        </header>

        <main>
          <section className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-5 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:px-8 lg:pb-24 lg:pt-16">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)] lg:gap-14">
              <div className="min-w-0">
                <div className="inline-flex rounded-full border border-brand-100 bg-white/85 px-4 py-2 text-sm font-medium text-brand-600 shadow-[0_10px_30px_rgba(77,125,255,0.08)] backdrop-blur">
                  복잡한 협업을 한 곳에서 정리하는 AI 워크스페이스
                </div>

                <h1 className="mt-6 max-w-[11ch] break-keep text-[2.5rem] font-semibold leading-[1.22] tracking-[-0.04em] text-campus-900 sm:text-[3.4rem] lg:text-[4.3rem]">
                  팀의 업무 흐름을 이해하고 다음 액션까지 이어줍니다
                </h1>

                <p className="mt-6 max-w-[34ch] break-keep text-base leading-8 text-campus-600 sm:text-lg">
                  TaskPilot은 할 일, 일정, 회의 내용을 따로 정리하지 않아도 되는 협업 플랫폼입니다. 팀이 실제로
                  일하는 흐름 안에서 AI가 업무를 정리하고 역할을 맞추고 다음 할 일을 제안합니다.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/signup"
                    className="inline-flex min-h-12 items-center justify-center rounded-full bg-campus-900 px-6 text-sm font-medium text-white shadow-card transition hover:-translate-y-0.5 hover:bg-campus-700"
                  >
                    팀 워크스페이스 열기
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex min-h-12 items-center justify-center rounded-full border border-campus-200 bg-white px-6 text-sm font-medium text-campus-700 transition hover:border-campus-300 hover:bg-campus-50"
                  >
                    서비스 둘러보기
                  </Link>
                </div>

                <div className="mt-9 grid gap-3 sm:grid-cols-3">
                  {summaryItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[1.4rem] border border-white/80 bg-white/88 px-5 py-4 shadow-[0_20px_40px_rgba(31,45,70,0.06)] backdrop-blur"
                    >
                      <p className="text-sm text-campus-500">{item.label}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-2xl font-semibold tracking-tight text-campus-900">{item.value}</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClass(item.tone)}`}>
                          실시간 반영
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="min-w-0">
                <div className="rounded-[2rem] border border-white/80 bg-white/80 p-3 shadow-[0_28px_80px_rgba(31,45,70,0.12)] backdrop-blur sm:p-4">
                  <div className="overflow-hidden rounded-[1.6rem] bg-campus-900">
                    <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
                      <div>
                        <p className="text-sm font-medium text-white/70">이번 주 협업 보드</p>
                        <p className="mt-1 text-lg font-semibold text-white">런칭 준비 워크스페이스</p>
                      </div>
                      <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80">
                        AI 동기화 완료
                      </div>
                    </div>

                    <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                      <section className="rounded-[1.4rem] bg-white px-4 py-4 text-campus-900 sm:px-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-campus-500">오늘의 업무 요약</p>
                            <p className="mt-1 text-xl font-semibold tracking-tight text-campus-900">
                              현재 팀이 먼저 처리할 작업
                            </p>
                          </div>
                          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-600">
                            우선순위 정렬
                          </span>
                        </div>

                        <div className="mt-5 space-y-3">
                          {taskItems.map((item) => (
                            <div
                              key={item.title}
                              className="rounded-[1.2rem] border border-campus-100 bg-campus-50 px-4 py-3"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-campus-500">{item.team}</p>
                                  <p className="mt-1 break-keep text-base font-semibold leading-6 text-campus-900">
                                    {item.title}
                                  </p>
                                  <p className="mt-1 text-sm text-campus-500">{item.meta}</p>
                                </div>
                                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-campus-700 ring-1 ring-inset ring-campus-200">
                                  {item.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <div className="grid gap-4">
                        <section className="rounded-[1.4rem] border border-white/10 bg-white/8 px-4 py-4 text-white backdrop-blur sm:px-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-white/60">팀 일정</p>
                              <p className="mt-1 text-lg font-semibold text-white">이번 주 주요 일정</p>
                            </div>
                            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/75">
                              3월 2주차
                            </span>
                          </div>

                          <div className="mt-4 space-y-3">
                            <div className="rounded-[1.1rem] bg-white/8 px-4 py-3">
                              <p className="text-sm text-white/60">화요일 10:00</p>
                              <p className="mt-1 break-keep text-sm font-medium text-white">
                                온보딩 시나리오 검토 회의
                              </p>
                            </div>
                            <div className="rounded-[1.1rem] bg-white/8 px-4 py-3">
                              <p className="text-sm text-white/60">수요일 15:00</p>
                              <p className="mt-1 break-keep text-sm font-medium text-white">
                                마케팅 캠페인 일정 확정
                              </p>
                            </div>
                          </div>
                        </section>

                        <section className="rounded-[1.4rem] bg-[#111b2f] px-4 py-4 text-white ring-1 ring-inset ring-white/10 sm:px-5">
                          <p className="text-sm font-medium text-white/60">회의 요약에서 추린 액션</p>
                          <ul className="mt-4 space-y-3">
                            {meetingActions.map((item) => (
                              <li key={item} className="flex gap-3">
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-400" />
                                <p className="break-keep text-sm leading-6 text-white/88">{item}</p>
                              </li>
                            ))}
                          </ul>
                        </section>

                        <section className="rounded-[1.4rem] bg-[linear-gradient(180deg,#e9f2ff_0%,#f8fbff_100%)] px-4 py-4 text-campus-900 sm:px-5">
                          <p className="text-sm font-medium text-campus-500">AI 제안</p>
                          <div className="mt-4 space-y-3">
                            {suggestions.map((item) => (
                              <div key={item} className="rounded-[1.1rem] bg-white px-4 py-3 shadow-[0_14px_30px_rgba(53,93,255,0.08)]">
                                <p className="break-keep text-sm leading-6 text-campus-700">{item}</p>
                              </div>
                            ))}
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 rounded-[2rem] border border-white/80 bg-white/88 p-5 shadow-[0_24px_60px_rgba(31,45,70,0.08)] sm:p-7 lg:grid-cols-3 lg:gap-8">
              {workflowPoints.map((item) => (
                <div key={item.title} className="min-w-0">
                  <p className="text-lg font-semibold tracking-tight text-campus-900">{item.title}</p>
                  <p className="mt-3 break-keep text-sm leading-7 text-campus-600 sm:text-base">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="border-y border-white/70 bg-white/78 backdrop-blur-sm">
            <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
              <div className="max-w-3xl">
                <p className="text-sm font-medium text-brand-600">핵심 기능</p>
                <h2 className="mt-4 max-w-[15ch] break-keep text-3xl font-semibold leading-[1.28] tracking-[-0.03em] text-campus-900 sm:text-4xl">
                  팀이 실제로 일하는 과정에 맞춰 필요한 기능만 담았습니다
                </h2>
                <p className="mt-5 max-w-[38ch] break-keep text-base leading-8 text-campus-600 sm:text-lg">
                  기능을 많이 나열하기보다, 협업에서 가장 자주 필요한 흐름을 한 화면 안에서 자연스럽게 이어지도록
                  구성했습니다.
                </p>
              </div>

              <div className="mt-10 grid gap-4 lg:grid-cols-2">
                {featureItems.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[1.8rem] border border-campus-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-6 shadow-[0_20px_50px_rgba(31,45,70,0.06)] sm:px-6 sm:py-7"
                  >
                    <p className="text-sm font-medium text-brand-600">{item.eyebrow}</p>
                    <h3 className="mt-3 max-w-[18ch] break-keep text-2xl font-semibold leading-[1.35] tracking-tight text-campus-900">
                      {item.title}
                    </h3>
                    <p className="mt-4 max-w-[34ch] break-keep text-sm leading-7 text-campus-600 sm:text-base">
                      {item.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
              <div className="min-w-0">
                <p className="text-sm font-medium text-brand-600">왜 편한가요</p>
                <h2 className="mt-4 max-w-[14ch] break-keep text-3xl font-semibold leading-[1.28] tracking-[-0.03em] text-campus-900 sm:text-4xl">
                  정리용 도구가 아니라 협업이 이어지는 작업 공간입니다
                </h2>
                <p className="mt-5 max-w-[36ch] break-keep text-base leading-8 text-campus-600 sm:text-lg">
                  업무가 생기면 정리하고, 회의를 하면 액션을 남기고, 일정이 바뀌면 팀 전체 흐름을 다시 맞추는 과정이
                  하나의 워크스페이스 안에서 이어집니다.
                </p>
              </div>

              <div className="rounded-[2rem] bg-campus-900 p-5 text-white shadow-[0_28px_80px_rgba(19,30,49,0.18)] sm:p-6">
                <div className="grid gap-4">
                  <div className="rounded-[1.5rem] bg-white/8 p-5">
                    <p className="text-sm font-medium text-white/60">업무 흐름</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {['업무 요청', 'AI 정리', '담당자 배정', '일정 반영', '회의 후속 처리'].map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/85 ring-1 ring-inset ring-white/10"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-[1.5rem] bg-white px-5 py-5 text-campus-900">
                      <p className="text-sm font-medium text-campus-500">도구 이동 없이</p>
                      <p className="mt-3 break-keep text-lg font-semibold leading-7">
                        업무와 일정, 회의 정리를 같은 화면에서 처리
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,#e7faf5_0%,#f7fffc_100%)] px-5 py-5 text-campus-900">
                      <p className="text-sm font-medium text-campus-500">맥락 기반 제안</p>
                      <p className="mt-3 break-keep text-lg font-semibold leading-7">
                        팀 역할과 일정 상황을 반영한 다음 액션 제안
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-7xl px-5 pb-20 sm:px-6 lg:px-8 lg:pb-24">
            <div className="rounded-[2.2rem] bg-[linear-gradient(135deg,#1a2233_0%,#24324a_56%,#294a61_100%)] px-6 py-10 text-white shadow-[0_32px_90px_rgba(20,31,50,0.24)] sm:px-8 sm:py-12 lg:flex lg:items-end lg:justify-between lg:gap-8">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/65">지금 바로 시작</p>
                <h2 className="mt-4 max-w-[15ch] break-keep text-3xl font-semibold leading-[1.28] tracking-[-0.03em] text-white sm:text-4xl">
                  팀이 바쁘게 일하는 흐름 그대로, 더 정돈된 협업을 시작하세요
                </h2>
                <p className="mt-5 max-w-[38ch] break-keep text-base leading-8 text-white/72 sm:text-lg">
                  새로운 프로젝트를 열고 팀원과 일정, 회의 후속 작업을 한곳에서 연결해 보세요. 처음부터 정리가 잘되는
                  협업 환경을 만들 수 있습니다.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0">
                <Link
                  to="/signup"
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-medium text-campus-900 transition hover:-translate-y-0.5 hover:bg-campus-50"
                >
                  무료로 시작하기
                </Link>
                <Link
                  to="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/18 bg-white/8 px-6 text-sm font-medium text-white transition hover:bg-white/12"
                >
                  로그인
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}
