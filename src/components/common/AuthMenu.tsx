import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/useAuth'
import { Button } from '../ui/Button'

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

interface AuthMenuProps {
  loadingClassName?: string
  guestPrimaryLabel?: string
}

export function AuthMenu({
  loadingClassName = 'h-11 w-28 rounded-full border border-campus-200 bg-white/70',
  guestPrimaryLabel,
}: AuthMenuProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoading, user, signOut } = useAuth()
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

  const actions = useMemo(
    () =>
      guestActions.map((action) =>
        action.to === '/signup' && guestPrimaryLabel
          ? { ...action, label: guestPrimaryLabel }
          : action,
      ),
    [guestPrimaryLabel],
  )

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

  if (isLoading) {
    return <div aria-hidden="true" className={loadingClassName} />
  }

  if (!user) {
    return (
      <>
        {actions.map((action) => (
          <Button key={action.to} variant={action.variant ?? 'ghost'} asChild>
            <Link to={action.to}>{action.label}</Link>
          </Button>
        ))}
      </>
    )
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-campus-200 bg-white/94 px-3 py-2 text-sm font-semibold text-campus-700 transition hover:border-campus-300 hover:bg-campus-50 sm:px-4"
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-campus-100 text-campus-900">
          {displayName.slice(0, 1)}
        </span>
        <span className="hidden break-keep sm:inline">{displayName}</span>
      </button>

      {isMenuOpen && (
        <div className="absolute right-0 top-full mt-3 w-56 rounded-3xl border border-campus-200 bg-white/96 p-2 shadow-card">
          <div className="border-b border-campus-100 px-3 py-3">
            <p className="text-sm font-semibold text-campus-900">{displayName}</p>
            <p className="text-sm leading-relaxed text-campus-500">{user.email}</p>
          </div>

          <div className="mt-2 space-y-1">
            {userMenuItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setIsMenuOpen(false)}
                className={[
                  'block rounded-2xl px-3 py-2 text-sm font-medium transition',
                  isMenuItemActive(item.to)
                    ? 'bg-brand-50 text-brand-600'
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
              className="block w-full rounded-2xl px-3 py-2 text-left text-sm font-medium text-rose-500 transition hover:bg-rose-50 disabled:opacity-50"
            >
              {isSubmitting ? '로그아웃 중...' : '로그아웃'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
