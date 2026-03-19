import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/AuthContext'
import { Button } from '../ui/Button'

export function AppHeader() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const email = user?.email ?? 'guest@example.com'
  const fullName =
    typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.length > 0
      ? user.user_metadata.full_name
      : email.split('@')[0]
  const initials = fullName.slice(0, 2).toUpperCase()

  async function handleSignOut() {
    setIsSubmitting(true)

    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Failed to sign out', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-campus-200/80 bg-white/90 px-5 py-4 backdrop-blur md:px-8 lg:px-10">
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-400 text-sm font-bold uppercase tracking-widest text-white">
          tp
        </span>
        <div>
          <p className="font-display text-lg tracking-tight text-campus-900">TaskPilot</p>
          <p className="text-xs text-campus-500">Supabase Auth로 보호되는 대시보드</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={handleSignOut} disabled={isSubmitting}>
          {isSubmitting ? '로그아웃 중...' : '로그아웃'}
        </Button>
        <div className="hidden items-center gap-3 rounded-full border border-campus-200 bg-brand-50 px-3 py-1.5 sm:flex">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-xs font-semibold text-white">
            {initials}
          </span>
          <div>
            <p className="text-sm font-semibold text-campus-800">{fullName}</p>
            <p className="text-xs text-campus-500">{email}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
