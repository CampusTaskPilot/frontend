import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../features/auth/context/useAuth'
import { PageContainer } from '../layout/PageContainer'
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
  { label: '\uB85C\uADF8\uC778', to: '/login', variant: 'ghost' },
  { label: '\uD68C\uC6D0\uAC00\uC785', to: '/signup', variant: 'primary' },
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

    return '\uC0AC\uC6A9\uC790'
  }, [user])

  const userMenuItems = useMemo<NavItem[]>(() => {
    if (!user) {
      return []
    }

    return [
      { label: '\uD504\uB85C\uD544', to: `/profile/${user.id}` },
      { label: '\uB300\uC2DC\uBCF4\uB4DC', to: '/dashboard' },
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
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <PageContainer className="flex min-h-[var(--app-header-height)] items-center justify-between gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-campus-900 text-sm font-bold uppercase tracking-[0.24em] text-white shadow-card">
            tp
          </span>
          <div className="min-w-0 space-y-1">
            <p className="font-display text-lg font-semibold tracking-tight text-campus-900 sm:text-xl">
              {SERVICE_NAME}
            </p>
            <p className="hidden break-keep text-sm leading-relaxed text-campus-500 sm:block">
              {'\uD300 \uC2E4\uD589\uC744 \uC704\uD55C \uC2A4\uB9C8\uD2B8 \uC6CC\uD06C\uC2A4\uD398\uC774\uC2A4'}
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user ? (
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
                      {isSubmitting ? '\uB85C\uADF8\uC544\uC6C3 \uC911...' : '\uB85C\uADF8\uC544\uC6C3'}
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
      </PageContainer>
    </header>
  )
}
