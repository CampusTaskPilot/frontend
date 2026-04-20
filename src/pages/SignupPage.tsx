import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MailCheck,
  Workflow,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { Button } from '../components/ui/Button'
import { InputField } from '../components/ui/InputField'
import { useSupabaseAuth } from '../features/auth/hooks/useSupabaseAuth'
import { useImeSafeSubmit } from '../hooks/useImeSafeSubmit'
import { supabase } from '../lib/supabase'

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

const onboardingSteps = [
  {
    step: '01',
    title: '기본 계정 생성',
    description: '이름, 이메일, 비밀번호만 입력하고 바로 계정을 만듭니다.',
  },
  {
    step: '02',
    title: '이메일 인증',
    description: '받은 메일에서 인증을 완료하면 안전하게 첫 로그인 흐름이 열립니다.',
  },
  {
    step: '03',
    title: '워크스페이스 설정',
    description: '대시보드에 들어간 뒤 팀 정보, 프로젝트, 프로필을 자연스럽게 확장합니다.',
  },
]

function isAlreadyRegisteredSignUpResult(data: {
  user: { identities?: unknown[] | null } | null
}) {
  return Boolean(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
}

function getSignupErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return '회원가입 중 오류가 발생했습니다. 다시 시도해 주세요.'
  }

  const normalized = error.message.toLowerCase()

  if (
    normalized.includes('already registered') ||
    normalized.includes('already been registered') ||
    normalized.includes('user already registered') ||
    normalized.includes('duplicate key value')
  ) {
    return '이미 가입된 이메일입니다. 로그인해 주세요.'
  }

  if (normalized.includes('failed to fetch') || normalized.includes('network')) {
    return '네트워크 연결이 불안정합니다. 잠시 후 다시 시도해 주세요.'
  }

  return '회원가입 중 오류가 발생했습니다. 다시 시도해 주세요.'
}

export function SignupPage() {
  const { signUpWithPassword } = useSupabaseAuth()
  const navigate = useNavigate()
  const ime = useImeSafeSubmit()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    setStatus('loading')
    setMessage('')

    try {
      const trimmedName = name.trim()
      const trimmedEmail = email.trim()
      const data = await signUpWithPassword({ email: trimmedEmail, password, name: trimmedName })

      if (isAlreadyRegisteredSignUpResult(data)) {
        setStatus('error')
        setMessage('이미 가입된 이메일입니다. 로그인해 주세요.')
        return
      }

      if (!data.user) {
        setStatus('error')
        setMessage('회원가입에 실패했습니다. 다시 시도해 주세요.')
        return
      }

      if (data.session) {
        const { error: metadataError } = await supabase.auth.updateUser({
          data: {
            full_name: trimmedName,
            display_name: trimmedName,
          },
        })

        if (metadataError) {
          console.error('Failed to save user metadata', metadataError)
        }

        navigate('/dashboard', { replace: true })
        return
      }

      const params = new URLSearchParams({ email: trimmedEmail })
      navigate(`/signup/verify-email?${params.toString()}`, {
        replace: true,
      })
    } catch (error) {
      setStatus('error')
      setMessage(getSignupErrorMessage(error))
    }
  }

  return (
    <div className="app-shell min-h-screen overflow-x-hidden bg-[#eef3fa]">
      <div className="absolute inset-x-0 top-0 -z-10 h-[38rem] bg-[radial-gradient(circle_at_14%_14%,rgba(53,93,255,0.16),transparent_24%),radial-gradient(circle_at_86%_10%,rgba(33,199,168,0.12),transparent_18%),linear-gradient(180deg,#f9fbff_0%,#eef4fb_42%,#e8eef7_100%)]" />
      <Navbar />

      <div className="mx-auto grid min-h-[calc(100vh-var(--app-header-height))] w-full max-w-[88rem] grid-cols-1 gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.96fr)_minmax(420px,1.02fr)] lg:gap-10 lg:px-8 xl:px-10">
        <section className="flex min-h-[calc(100vh-var(--app-header-height)-3rem)] items-center">
          <div className="relative w-full overflow-hidden rounded-[2.2rem] border border-white/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(244,248,253,0.94)_100%)] p-6 shadow-[0_28px_80px_rgba(26,34,51,0.1)] backdrop-blur-xl sm:p-8 xl:p-9">
            <div className="absolute inset-x-10 top-5 h-28 rounded-full bg-[rgba(53,93,255,0.09)] blur-3xl" />
            <div className="absolute -right-8 bottom-0 h-44 w-44 rounded-full bg-[rgba(33,199,168,0.1)] blur-3xl" />

            <div className="relative mx-auto max-w-[31rem]">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/84 px-4 py-2 text-sm font-semibold text-brand-600 shadow-[0_14px_30px_rgba(53,93,255,0.08)]">
                <MailCheck className="h-4 w-4" />
                이메일 인증으로 시작하는 안전한 가입
              </div>

              <p className="mt-7 text-sm font-semibold tracking-[0.24em] text-campus-500">CREATE ACCOUNT</p>

              <h1 className="mt-4 break-keep text-[2.5rem] font-semibold leading-[1.12] tracking-[-0.06em] text-campus-900 sm:text-[3.2rem]">
                빠르게 가입하고
                <br />
                인증 후 바로 시작하세요
              </h1>

              <p className="mt-5 break-keep text-base leading-8 text-campus-600">
                가입 단계에서는 꼭 필요한 정보만 받고, 팀 이름이나 운영 정보는 워크스페이스 안에서
                자연스럽게 이어서 설정할 수 있게 구성했습니다.
              </p>

              <form className="mt-8 space-y-4" onSubmit={ime.createSubmitHandler(handleSubmit)} noValidate>
                <InputField
                  label="이름"
                  id="name"
                  value={name}
                  placeholder="이름을 입력해 주세요"
                  onChange={(event) => setName(event.target.value)}
                  onCompositionStart={ime.handleCompositionStart}
                  onCompositionEnd={ime.handleCompositionEnd}
                  onKeyDown={ime.preventEnterWhileComposing()}
                  required
                />
                <InputField
                  label="이메일"
                  id="email"
                  type="email"
                  value={email}
                  placeholder="you@example.com"
                  onChange={(event) => setEmail(event.target.value)}
                  onCompositionStart={ime.handleCompositionStart}
                  onCompositionEnd={ime.handleCompositionEnd}
                  onKeyDown={ime.preventEnterWhileComposing()}
                  required
                />
                <InputField
                  label="비밀번호"
                  id="password"
                  type="password"
                  value={password}
                  placeholder="8자 이상 입력해 주세요"
                  hint="계정을 만든 뒤 이메일 인증을 완료하면 대시보드로 이어집니다."
                  onChange={(event) => setPassword(event.target.value)}
                  onCompositionStart={ime.handleCompositionStart}
                  onCompositionEnd={ime.handleCompositionEnd}
                  onKeyDown={ime.preventEnterWhileComposing()}
                  required
                  minLength={8}
                />

                <div className="rounded-[1.35rem] border border-brand-100/80 bg-brand-50/70 px-4 py-4 text-sm leading-6 text-campus-700">
                  워크스페이스 이름, 팀 소개, 운영 정보는 가입 후 내부 설정 화면에서 추가할 수 있습니다.
                </div>

                <Button
                  type="submit"
                  onMouseDown={ime.preventBlurOnMouseDown}
                  className="w-full gap-2 py-3 text-base"
                  disabled={!name.trim() || !email.trim() || !password || status === 'loading'}
                >
                  {status === 'loading' ? '가입 처리 중...' : '회원가입'}
                  {status !== 'loading' && <ArrowRight className="h-4 w-4" />}
                </Button>
              </form>

              {message && <p className="mt-4 text-sm text-rose-500">{message}</p>}

              <div className="mt-7 space-y-4">
                <div className="flex items-start gap-3 rounded-[1.35rem] border border-white/85 bg-white/72 px-4 py-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  <p className="text-sm leading-6 text-campus-700">
                    가입 후에는 인증 메일 확인 페이지로 바로 이동합니다. 메일함에서 인증을 마치면 대시보드
                    또는 로그인 흐름으로 자연스럽게 이어집니다.
                  </p>
                </div>

                <p className="text-sm text-campus-600">
                  이미 계정이 있으신가요?{' '}
                  <Link to="/login" className="font-semibold text-brand-600 hover:underline">
                    로그인
                  </Link>
                </p>
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
                가입 후 바로
                <br />
                팀 작업 흐름으로
              </h2>
              <p className="mt-5 max-w-[30rem] break-keep text-base leading-8 text-campus-600 sm:text-lg">
                계정 생성과 이메일 인증만 마치면 대시보드, 팀 워크스페이스, 일정 기반 실행 화면으로 자연스럽게 이어집니다.
              </p>

              <div className="mt-10 flex flex-wrap gap-3">
                {onboardingSteps.map((item) => (
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
                <p className="text-sm font-semibold text-campus-900">가입 직후 흐름</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {onboardingSteps.map((item) => (
                    <div key={item.step} className="rounded-[1.2rem] bg-campus-50/90 px-4 py-4">
                      <p className="text-xs font-semibold tracking-[0.18em] text-brand-600">{item.step}</p>
                      <p className="mt-2 text-sm font-semibold text-campus-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-campus-600">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
