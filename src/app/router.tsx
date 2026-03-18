import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { LandingPage } from '../pages/LandingPage'
import { LoginPage } from '../pages/LoginPage'
import { MainDashboard } from '../pages/MainDashboard'
import { SignupPage } from '../pages/SignupPage'
import { TeamManagementPage } from '../pages/TeamManagementPage'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <MainDashboard />,
      },
      {
        path: 'teams',
        element: <TeamManagementPage />,
      },
    ],
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/signup',
    element: <SignupPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])
