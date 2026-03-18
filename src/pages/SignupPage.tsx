import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { InputField } from '../components/ui/InputField'

export function SignupPage() {
  return (
    <div className="grid min-h-screen grid-cols-1 bg-campus-grid lg:grid-cols-2">
      <section className="flex min-h-screen flex-col justify-center gap-6 px-6 py-12 md:px-10">
        <Card className="mx-auto w-full max-w-xl space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
              새 팀 시작하기
            </p>
            <h1 className="font-display text-3xl text-campus-900">회원가입</h1>
            <p className="text-sm text-campus-600">
              팀 이름과 기본 정보를 입력하면 프로젝트 공간이 바로 생성됩니다.
            </p>
          </div>

          <form className="space-y-4">
            <InputField label="이름" id="name" placeholder="홍길동" required />
            <InputField
              label="학교 이메일"
              id="email"
              type="email"
              placeholder="you@university.ac.kr"
              required
            />
            <InputField
              label="팀 이름"
              id="workspace"
              placeholder="예: 스마트캠퍼스 5팀"
              required
            />
            <InputField
              label="비밀번호"
              id="password"
              type="password"
              placeholder="8자 이상 입력"
              required
            />
            <Button className="w-full py-3 text-base">무료로 시작하기</Button>
          </form>

          <p className="text-sm text-campus-600">
            이미 계정이 있으신가요?{' '}
            <Link to="/login" className="font-semibold text-brand-600 hover:underline">
              로그인
            </Link>
          </p>
        </Card>
      </section>

      <section className="hidden min-h-screen bg-white p-10 lg:flex lg:flex-col lg:justify-center">
        <div className="mx-auto w-full max-w-xl space-y-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-campus-500">
            빠른 시작 가이드
          </p>
          <h2 className="font-display text-4xl leading-tight text-campus-900">
            모집부터 발표까지,
            <br />
            한 화면에서 관리하세요
          </h2>
          <p className="text-campus-600">
            팀 생성 후 즉시 역할 배정 보드, 일정 캘린더, 회의 노트를 사용할 수 있어요.
          </p>
          <div className="space-y-3 pt-3">
            {[
              '1) 팀 개설 후 멤버 초대 링크 공유',
              '2) 역할/기여도를 카드 형태로 배분',
              '3) 발표 일정과 주간 할 일을 자동 정리',
            ].map((item) => (
              <Card key={item} className="bg-campus-50 py-4">
                <p className="text-sm text-campus-700">{item}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
