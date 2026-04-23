import { Link } from 'react-router-dom'
import logo from '@/assets/logo.svg'
import { AuthMenu } from './AuthMenu'
import { PageContainer } from '../layout/PageContainer'
import { NotificationBell } from '../../features/notifications/components/NotificationBell'

const SERVICE_NAME = 'TaskPilot'

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <PageContainer className="flex min-h-[var(--app-header-height)] items-center justify-between gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-3">
          <img src={logo} alt="TaskPilot logo" className="h-8 w-auto shrink-0" />
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
          <NotificationBell />
          <AuthMenu />
        </div>
      </PageContainer>
    </header>
  )
}
