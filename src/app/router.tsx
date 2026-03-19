import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute'
import { PublicOnlyRoute } from '../features/auth/components/PublicOnlyRoute'
import { AppLayout } from '../layouts/AppLayout'
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/LoginPage'
import { MainDashboard } from '../pages/MainDashboard'
import { ProfileEditPage } from '../pages/ProfileEditPage'
import { ProfilePage } from '../pages/ProfilePage'
import { ProfileViewPage } from '../pages/ProfileViewPage'
import { SignupPage } from '../pages/SignupPage'
import { TeamCreatePage } from '../pages/TeamCreatePage'
import { TeamListPage } from '../pages/TeamListPage'
import { TeamWorkspacePage } from '../pages/TeamWorkspacePage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <MainDashboard />,
      },
      {
        path: 'teams',
        element: <Navigate to="/teams" replace />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
    ],
  },
  {
    path: '/teams',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <TeamListPage />,
      },
      {
        path: 'create',
        element: <TeamCreatePage />,
      },
      {
        path: ':teamId',
        element: <TeamWorkspacePage />,
      },
    ],
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <ProfilePage />,
      },
      {
        path: ':userId',
        element: <ProfileViewPage />,
      },
      {
        path: ':userId/edit',
        element: <ProfileEditPage />,
      },
    ],
  },
  {
    path: '/app',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/app/*',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: (
      <PublicOnlyRoute>
        <LoginPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '/signup',
    element: (
      <PublicOnlyRoute>
        <SignupPage />
      </PublicOnlyRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

