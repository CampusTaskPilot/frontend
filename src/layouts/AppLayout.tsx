import { Outlet } from 'react-router-dom'
import { Navbar } from '../components/common/Navbar'
import { PageContainer } from '../components/layout/PageContainer'
import { AppSidebar } from '../components/layout/AppSidebar'

export function AppLayout() {
  return (
    <div className="app-shell grid min-h-screen grid-rows-[auto,1fr]">
      <Navbar />
      <div className="mx-auto grid w-full max-w-screen-2xl grid-cols-1 lg:grid-cols-[280px,minmax(0,1fr)] xl:px-4">
        <AppSidebar />
        <main className="min-w-0 py-5 sm:py-6 lg:px-4 lg:py-8 xl:py-10">
          <PageContainer className="page-shell" size="wide">
            <Outlet />
          </PageContainer>
        </main>
      </div>
    </div>
  )
}
