import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/AuthContext'
import { Button } from '../ui/Button'

const SERVICE_NAME = 'TaskPilot'

interface NavItem {
  label: string
  to: string
}

interface ActionItem {
  label: string
  to: string
  variant?: 'primary' | 'ghost' | 'subtle'
}

const guestActions: ActionItem[] = [
  { label: '로그인', to: '/login', variant: 'ghost' },
  { label: '회원가입', to: '/signup', variant: 'primary' },
]

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  const displayName = useMemo(() => {
    const fullName =
      typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : ''

    if (fullName) {
      return fullName
    }

    if (user?.email) {
      return user.email.split('@')[0]
    }

    return '사용자'
  }, [user])

  const userMenuItems = useMemo<NavItem[]>(() => {
    if (!user) {
      return []
    }

    return [
      { label: '프로필', to: `/profile/${user.id}` },
      { label: '대시보드', to: '/dashboard' },
    ]
  }, [user])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  async function handleSignOut() {
    setIsSubmitting(true)

    try {
      await signOut()
      setIsMenuOpen(false)
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Failed to sign out', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  function isMenuItemActive(path: string) {
    if (path.startsWith('/profile/')) {
      return location.pathname.startsWith(path)
    }

    return location.pathname === path
  }

  return (
    <header className="sticky top-0 z-30 border-b border-campus-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-4 md:px-8 lg:px-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-400 text-sm font-bold uppercase tracking-widest text-white">
            tp
          </span>
          <div>
            <p className="font-display text-lg tracking-tight text-campus-900">{SERVICE_NAME}</p>
            <p className="text-xs text-campus-500">팀 협업을 위한 스마트 워크스페이스</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-campus-200 bg-white px-4 py-2 text-sm font-medium text-campus-700 transition hover:bg-brand-50"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                  {displayName.slice(0, 1)}
                </span>
                <span>{displayName}</span>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] w-56 rounded-3xl border border-campus-200 bg-white p-2 shadow-card">
                  <div className="border-b border-campus-100 px-3 py-2">
                    <p className="text-sm font-semibold text-campus-900">{displayName}</p>
                    <p className="text-xs text-campus-500">{user.email}</p>
                  </div>

                  <div className="mt-2 space-y-1">
                    {userMenuItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setIsMenuOpen(false)}
                        className={[
                          'block rounded-2xl px-3 py-2 text-sm transition',
                          isMenuItemActive(item.to)
                            ? 'bg-brand-50 font-medium text-brand-600'
                            : 'text-campus-700 hover:bg-campus-50',
                        ].join(' ')}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      disabled={isSubmitting}
                      className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
                    >
                      {isSubmitting ? '로그아웃 중...' : '로그아웃'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            guestActions.map((action) => (
              <Button key={action.to} variant={action.variant ?? 'ghost'} asChild>
                <Link to={action.to}>{action.label}</Link>
              </Button>
            ))
          )}
        </div>
      </div>
    </header>
  )
}

