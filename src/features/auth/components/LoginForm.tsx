import { type FormEvent, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { InputField } from '../../../components/ui/InputField'
import { useSupabaseAuth } from '../hooks/useSupabaseAuth'

export function LoginForm() {
  const { signInWithPassword, sendOtp } = useSupabaseAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  )
  const [message, setMessage] = useState('')

  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')
    try {
      await signInWithPassword({ email, password })
      setStatus('success')
      setMessage('MFA 또는 추가 인증 단계를 이어서 완료하세요.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '로그인에 실패했어요.')
    }
  }

  async function handleOtpRequest() {
    setStatus('loading')
    setMessage('')
    try {
      await sendOtp({ email })
      setStatus('success')
      setMessage('인증 메일을 보냈어요. 받은 코드로 계속 진행하세요.')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : '매직 링크를 보낼 수 없어요.')
    }
  }

  return (
    <form className="space-y-5" onSubmit={handlePasswordLogin}>
      <InputField
        label="업무 이메일"
        id="email"
        type="email"
        value={email}
        placeholder="you@synccrew.com"
        onChange={(event) => setEmail(event.target.value)}
        required
      />

      <InputField
        label="비밀번호"
        id="password"
        type="password"
        value={password}
        placeholder="••••••••"
        hint="조직에서 매직 링크를 사용한다면 비워두세요."
        onChange={(event) => setPassword(event.target.value)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleOtpRequest}
          disabled={!email || status === 'loading'}
        >
          매직 링크 보내기
        </Button>
        <Button type="submit" disabled={!email || status === 'loading'}>
          {status === 'loading' ? '로그인 중...' : '로그인'}
        </Button>
      </div>

      {message && (
        <p
          className={`text-sm ${
            status === 'error' ? 'text-rose-500' : 'text-campus-600'
          }`}
        >
          {message}
        </p>
      )}
    </form>
  )
}
