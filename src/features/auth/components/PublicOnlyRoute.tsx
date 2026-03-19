import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface PublicOnlyRouteProps {
  children: ReactNode
}

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-campus-grid px-6">
        <p className="text-sm text-campus-600">인증 상태를 확인하고 있습니다...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
