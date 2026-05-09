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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/shadcn/dialog'
import { Button } from '../components/ui/Button'
import { InputField } from '../components/ui/InputField'
import { useSupabaseAuth } from '../features/auth/hooks/useSupabaseAuth'
import { getAuthErrorMessage } from '../features/auth/lib/authErrorMessages'
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
    description: '이름, 이메일, 비밀번호를 확인하고 바로 계정을 만듭니다.',
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

const termsSections = [
  {
    title: '수집하는 개인정보',
    items: [
      '이름: 서비스 내 프로필 표시와 계정 식별에 사용합니다.',
      '이메일: 로그인, 이메일 인증, 계정 안내에 사용합니다.',
      '비밀번호: 로그인 인증을 위해 사용하며, 원문을 저장하거나 직접 확인하지 않습니다.',
    ],
  },
  {
    title: '이용 목적',
    items: [
      '회원 계정 생성 및 본인 계정 식별',
      '로그인, 이메일 인증, 계정 보안 유지',
      'TaskPilot 대시보드와 워크스페이스 이용 제공',
    ],
  },
  {
    title: '보관 및 파기',
    items: [
      '개인정보는 회원 탈퇴 또는 서비스 이용 목적 달성 시 지체 없이 파기합니다.',
      '관련 법령에 따라 보관이 필요한 정보는 정해진 기간 동안 분리 보관할 수 있습니다.',
    ],
  },
  {
    title: '비밀번호 처리 방식',
    items: [
      '비밀번호는 로그인 인증을 위해 암호화 등 안전한 방식으로 처리되며, 원문을 저장하거나 운영자가 확인할 수 있는 형태로 보관하지 않습니다.',
      'TaskPilot은 비밀번호 원문을 저장하거나 운영자가 확인할 수 있는 형태로 보관하지 않습니다.',
    ],
  },
  {
    title: '동의 거부 안내',
    items: [
      '개인정보 수집 및 이용에 동의하지 않을 수 있습니다.',
      '다만 이름, 이메일, 비밀번호는 회원가입에 필요한 최소 정보이므로 동의하지 않으면 가입이 제한됩니다.',
    ],
  },
  // {
  //   title: '개인정보 문의',
  //   items: ['개인정보 관련 문의는 서비스 운영자에게 요청할 수 있습니다. 문의 이메일: taskpilot.support@example.com'],
  // },
]

function isAlreadyRegisteredSignUpResult(data: {
  user: { identities?: unknown[] | null } | null
}) {
  return Boolean(data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
}

export function SignupPage() {
  const { signUpWithPassword } = useSupabaseAuth()
  const navigate = useNavigate()
  const ime = useImeSafeSubmit()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    setMessage('')

    if (password !== passwordConfirm) {
      setStatus('error')
      setMessage('비밀번호가 일치하지 않습니다. 다시 확인해 주세요.')
      return
    }

    setStatus('loading')

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
      setMessage(getAuthErrorMessage(error, '회원가입 중 오류가 발생했습니다. 다시 시도해 주세요.'))
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
                <InputField
                  label="비밀번호 확인"
                  id="passwordConfirm"
                  type="password"
                  value={passwordConfirm}
                  placeholder="비밀번호를 다시 입력해 주세요"
                  hint="입력한 비밀번호와 동일해야 회원가입을 진행할 수 있습니다."
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  onCompositionStart={ime.handleCompositionStart}
                  onCompositionEnd={ime.handleCompositionEnd}
                  onKeyDown={ime.preventEnterWhileComposing()}
                  required
                  minLength={8}
                />

                <div className="rounded-[1.35rem] border border-brand-100/80 bg-brand-50/70 px-4 py-4 text-sm leading-6 text-campus-700">
                  워크스페이스 이름, 팀 소개, 운영 정보는 가입 후 내부 설정 화면에서 추가할 수 있습니다.
                </div>

                <p className="break-keep px-1 text-xs leading-5 text-campus-500">
                  회원가입을 진행하면 TaskPilot의{' '}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="font-semibold text-brand-600 underline-offset-4 hover:underline focus:outline-none focus:ring-2 focus:ring-brand-200"
                      >
                        개인정보 수집 및 이용 동의
                      </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-[38rem]">
                      <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6 pr-14">
                        <DialogTitle>개인정보 수집 및 이용 동의</DialogTitle>
                        <DialogDescription className="break-keep">
                          TaskPilot 회원가입에 필요한 최소 개인정보 수집 및 이용 안내입니다.
                        </DialogDescription>
                      </DialogHeader>

                      <div className="max-h-[60svh] overflow-y-auto px-6 py-5 text-sm leading-7 text-slate-600">
                        <p className="break-keep text-slate-700">
                          TaskPilot은 회원가입과 서비스 제공을 위해 이름, 이메일, 비밀번호를 수집합니다. 입력한
                          정보는 계정 생성, 로그인, 이메일 인증, 서비스 이용 제공을 위해서만 사용되며 회원 탈퇴 시
                          지체 없이 파기됩니다.
                        </p>

                        <div className="mt-5 space-y-5">
                          {termsSections.map((section) => (
                            <section key={section.title}>
                              <h3 className="text-sm font-semibold text-slate-950">{section.title}</h3>
                              <ul className="mt-2 list-disc space-y-1 pl-5">
                                {section.items.map((item) => (
                                  <li key={item} className="break-keep">
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </section>
                          ))}
                        </div>

                        <p className="mt-5 break-keep rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
                          이 약관은 현재 서비스 운영을 위한 기본 안내이며, 정식 정책 문서가 마련되면 해당 문서가
                          우선 적용됩니다.
                        </p>
                      </div>
                    </DialogContent>
                  </Dialog>
                  에 동의한 것으로 간주됩니다.
                </p>

                <Button
                  type="submit"
                  onMouseDown={ime.preventBlurOnMouseDown}
                  className="w-full gap-2 py-3 text-base"
                  disabled={!name.trim() || !email.trim() || !password || !passwordConfirm || status === 'loading'}
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
