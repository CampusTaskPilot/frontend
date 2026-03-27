import { Navigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/useAuth'

export function ProfilePage() {
  const { isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <section className="space-y-6">
        <Card>
          <p className="text-sm text-campus-600">계정 정보를 확인하는 중입니다...</p>
        </Card>
      </section>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Navigate to={`/profile/${user.id}`} replace />
}

