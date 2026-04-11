import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { InputField } from '../components/ui/InputField'
import { useImeSafeSubmit } from '../hooks/useImeSafeSubmit'
import { useSupabaseAuth } from '../features/auth/hooks/useSupabaseAuth'
import { supabase } from '../lib/supabase'

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
  const [workspace, setWorkspace] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit() {
    setStatus('loading')
    setMessage('')

    try {
      const data = await signUpWithPassword({ email, password })

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
            full_name: name,
            workspace_name: workspace,
          },
        })

        if (metadataError) {
          console.error('Failed to save user metadata', metadataError)
        }
      }

      setStatus('success')
      setMessage(
        data.session
          ? '회원가입이 완료되었습니다. 대시보드로 이동합니다.'
          : '인증 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.',
      )

      if (data.session) {
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      setStatus('error')
      setMessage(getSignupErrorMessage(error))
    }
  }

  return (
    <div className="app-shell min-h-screen">
      <Navbar />

      <div className="mx-auto grid min-h-[calc(100vh-var(--app-header-height))] w-full max-w-[88rem] grid-cols-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,0.96fr),minmax(420px,0.8fr)] lg:px-8 xl:px-10">
        <section className="flex min-h-[calc(100vh-var(--app-header-height)-3rem)] flex-col justify-center">
          <Card className="mx-auto w-full max-w-[36rem] space-y-6 border-white/80 bg-white/92 p-6 sm:p-8">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
                새 협업 공간 만들기
              </p>
              <h1 className="font-display text-3xl text-campus-900">회원가입</h1>
              <p className="text-sm text-campus-600">
                이름과 비밀번호로 계정을 만들고, 인증 후 대시보드로 이동해 보세요.
              </p>
            </div>

            <form className="space-y-4" onSubmit={ime.createSubmitHandler(handleSubmit)} noValidate>
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
                label="워크스페이스 이름"
                id="workspace"
                value={workspace}
                placeholder="예: TaskPilot Team"
                onChange={(event) => setWorkspace(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
                onCompositionStart={ime.handleCompositionStart}
                onCompositionEnd={ime.handleCompositionEnd}
                onKeyDown={ime.preventEnterWhileComposing()}
                required
                minLength={8}
              />
              <Button
                type="submit"
                onMouseDown={ime.preventBlurOnMouseDown}
                className="w-full py-3 text-base"
                disabled={!name || !workspace || !email || !password || status === 'loading'}
              >
                {status === 'loading' ? '가입 처리 중...' : '회원가입'}
              </Button>
            </form>

            {message && (
              <p className={`text-sm ${status === 'error' ? 'text-rose-500' : 'text-campus-600'}`}>
                {message}
              </p>
            )}

            <p className="text-sm text-campus-600">
              이미 계정이 있으신가요?{' '}
              <Link to="/login" className="font-semibold text-brand-600 hover:underline">
                로그인
              </Link>
            </p>
          </Card>
        </section>

        <section className="hidden min-h-[calc(100vh-var(--app-header-height)-3rem)] rounded-[2rem] border border-white/70 bg-white/78 p-8 shadow-[0_22px_54px_rgba(26,34,51,0.08)] lg:flex lg:flex-col lg:justify-center xl:p-10">
          <div className="mx-auto w-full max-w-xl space-y-5">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-campus-500">
              빠른 시작
            </p>
            <h2 className="font-display text-4xl leading-tight text-campus-900">
              회원가입부터
              <br />
              첫 대시보드까지 빠르게 시작하세요
            </h2>
            <p className="text-campus-600">
              계정 생성 후 인증을 완료하면, 팀 정보와 개인 프로필을 바로 확인할 수 있습니다.
            </p>
            <div className="space-y-3 pt-3">
              {[
                '1. 이메일과 비밀번호로 계정을 생성합니다.',
                '2. 이름과 워크스페이스 정보를 함께 입력합니다.',
                '3. 인증 완료 후 대시보드로 이동합니다.',
              ].map((item) => (
                <Card key={item} className="bg-campus-50 py-4">
                  <p className="text-sm text-campus-700">{item}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

