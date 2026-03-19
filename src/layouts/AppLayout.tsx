import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { AppSidebar } from '../components/layout/AppSidebar'

export function AppLayout() {
  return (
    <div className="grid min-h-screen grid-rows-[auto,1fr] bg-campus-grid">
      <Navbar />
      <div className="grid min-h-0 grid-cols-1 lg:grid-cols-[260px,1fr]">
        <AppSidebar />
        <main className="min-h-0 overflow-y-auto px-5 py-8 md:px-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-6xl space-y-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
