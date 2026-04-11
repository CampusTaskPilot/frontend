import { Link } from 'react-router-dom'
import { AuthMenu } from './AuthMenu'
import { PageContainer } from '../layout/PageContainer'

const SERVICE_NAME = 'TaskPilot'

export function Navbar() {
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
          <AuthMenu />
        </div>
      </PageContainer>
    </header>
  )
}
