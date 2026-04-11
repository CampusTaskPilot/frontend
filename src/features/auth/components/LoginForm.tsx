import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { InputField } from '../../../components/ui/InputField'
import { useImeSafeSubmit } from '../../../hooks/useImeSafeSubmit'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

interface RedirectState {
  from?: {
    pathname?: string
  }
}

export function LoginForm() {
  const { signInWithPassword } = useSupabaseAuth()
  const ime = useImeSafeSubmit()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const redirectTo = (location.state as RedirectState | null)?.from?.pathname ?? '/dashboard'

  async function handlePasswordLogin() {
    setStatus('loading')
    setMessage('')

    try {
      await signInWithPassword({ email, password })
      setStatus('success')
      setMessage('로그인되었습니다. 대시보드로 이동합니다.')
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.')
    }
  }

  return (
    <form className="space-y-5" onSubmit={ime.createSubmitHandler(handlePasswordLogin)} noValidate>
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
        placeholder="비밀번호를 입력하세요"
        onChange={(event) => setPassword(event.target.value)}
        onCompositionStart={ime.handleCompositionStart}
        onCompositionEnd={ime.handleCompositionEnd}
        onKeyDown={ime.preventEnterWhileComposing()}
        required
      />

      <div className="flex justify-end">
        <Button type="submit" onMouseDown={ime.preventBlurOnMouseDown} disabled={!email || !password || status === 'loading'}>
          {status === 'loading' ? '로그인 중...' : '로그인'}
        </Button>
      </div>

      {message && (
        <p className={`text-sm ${status === 'error' ? 'text-rose-500' : 'text-campus-600'}`}>
          {message}
        </p>
      )}
    </form>
  )
}

