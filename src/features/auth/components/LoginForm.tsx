import { type FormEvent, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { InputField } from '../../../components/ui/InputField'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

interface RedirectState {
  from?: {
    pathname?: string
  }
}

export function LoginForm() {
  const { signInWithPassword } = useSupabaseAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const redirectTo = (location.state as RedirectState | null)?.from?.pathname ?? '/dashboard'

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
    <form className="space-y-5" onSubmit={handlePasswordLogin}>
      <InputField
        label="이메일"
        id="email"
        type="email"
        value={email}
        placeholder="you@example.com"
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <InputField
        label="비밀번호"
        id="password"
        type="password"
        value={password}
        placeholder="비밀번호를 입력하세요"
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={!email || !password || status === 'loading'}>
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
