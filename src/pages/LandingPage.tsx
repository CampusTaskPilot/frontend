import { Link } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const highlights = [
  {
    title: '팀 모집 보드',
    description: '필요한 역할과 관심 분야를 기준으로 함께할 팀원을 빠르게 찾을 수 있습니다.',
  },
  {
    title: '업무 분담과 진행률',
    description: '기획, 디자인, 개발 작업을 나누고 각자 진행 상태를 한눈에 확인할 수 있습니다.',
  },
  {
    title: '발표 일정 관리',
    description: '주간 목표와 발표 일정을 정리해 마감 직전의 혼란을 줄여줍니다.',
  },
]

const stats = [
  { label: '이번 학기 생성된 팀', value: '1,280+' },
  { label: '활성 프로젝트', value: '340개' },
  { label: '평균 주간 참여율', value: '86%' },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-campus-grid">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl space-y-10 px-5 pb-16 pt-8 md:px-8">
        <section className="grid gap-8 rounded-[2rem] border border-campus-200 bg-white p-7 shadow-card md:p-10 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-brand-50 px-4 py-1 text-xs font-semibold text-brand-600">
              캠퍼스 팀빌딩을 더 쉽게
            </p>
            <h1 className="font-display text-4xl leading-tight text-campus-900 md:text-5xl">
              팀원을 찾고, 프로젝트를 시작하고,
              <br />
              끝까지 운영하세요
            </h1>
            <p className="text-base leading-relaxed text-campus-700">
              TaskPilot은 학생 팀 프로젝트에 필요한 모집, 역할 분담, 일정 관리, 진행 공유를
              한곳에 모아주는 협업 도구입니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="px-7 py-3" asChild>
                <Link to="/signup">지금 시작하기</Link>
              </Button>
              <Button variant="ghost" className="px-7 py-3" asChild>
                <Link to="/login">기존 계정으로 로그인</Link>
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="bg-campus-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">
                오늘의 추천 팀
              </p>
              <p className="mt-2 text-lg font-semibold text-campus-900">
                AI 스터디 매칭 프로젝트
              </p>
              <p className="mt-1 text-sm text-campus-600">
                모집 역할: 프론트엔드 1명 · PM 1명 · UX 1명
              </p>
            </Card>
            <Card className="bg-brand-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                이번 주 일정
              </p>
              <p className="mt-2 text-lg font-semibold text-campus-900">중간 발표 D-4</p>
              <p className="mt-1 text-sm text-campus-700">
                체크리스트 기반으로 산출물을 정리해 발표 준비 시간을 줄여보세요.
              </p>
            </Card>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.label} className="bg-white">
              <p className="text-sm text-campus-500">{stat.label}</p>
              <p className="mt-2 font-display text-3xl text-campus-900">{stat.value}</p>
            </Card>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {highlights.map((item) => (
            <Card key={item.title} className="bg-white">
              <p className="text-lg font-semibold text-campus-900">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-campus-600">{item.description}</p>
            </Card>
          ))}
        </section>
      </main>
    </div>
  )
}
