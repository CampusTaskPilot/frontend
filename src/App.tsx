import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { appRouter } from './app/router'

const APP_NAME = 'TaskPilot'

const TEAM_TAB_TITLES: Record<string, string> = {
  overview: '팀 개요',
  applications: '지원 관리',
  tasks: '업무',
  members: '멤버',
  calendar: '캘린더',
  pm: 'PM Assistant',
}

function formatTitle(pageTitle: string) {
  return pageTitle === APP_NAME ? APP_NAME : `${pageTitle} | ${APP_NAME}`
}

function getDocumentTitle(pathname: string, search: string) {
  if (pathname === '/') {
    return APP_NAME
  }

  if (pathname === '/dashboard') {
    return formatTitle('대시보드')
  }

  if (pathname === '/notifications' || pathname === '/dashboard/notifications') {
    return formatTitle('알림')
  }

  if (pathname === '/teams') {
    return formatTitle('팀')
  }

  if (pathname === '/teams/create') {
    return formatTitle('팀 만들기')
  }

  if (/^\/teams\/[^/]+$/.test(pathname)) {
    const activeTab = new URLSearchParams(search).get('tab') ?? 'overview'
    return formatTitle(TEAM_TAB_TITLES[activeTab] ?? '팀 워크스페이스')
  }

  if (pathname === '/profile' || /^\/profile\/[^/]+$/.test(pathname)) {
    return formatTitle('프로필')
  }

  if (/^\/profile\/[^/]+\/edit$/.test(pathname)) {
    return formatTitle('프로필 수정')
  }

  if (pathname === '/login') {
    return formatTitle('로그인')
  }

  if (pathname === '/signup') {
    return formatTitle('회원가입')
  }

  if (pathname === '/signup/verify-email') {
    return formatTitle('이메일 인증')
  }

  return APP_NAME
}

export default function App() {
  useEffect(() => {
    function updateDocumentTitle() {
      const { pathname, search } = appRouter.state.location
      document.title = getDocumentTitle(pathname, search)
    }

    updateDocumentTitle()
    return appRouter.subscribe(updateDocumentTitle)
  }, [])

  return <RouterProvider router={appRouter} />
}
