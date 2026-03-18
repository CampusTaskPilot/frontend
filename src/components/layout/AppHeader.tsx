import { Button } from '../ui/Button'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-campus-200/80 bg-white/90 px-5 py-4 backdrop-blur md:px-8 lg:px-10">
      <div className="flex items-center gap-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-400 text-sm font-bold uppercase tracking-widest text-white">
          sc
        </span>
        <div>
          <p className="font-display text-lg tracking-tight text-campus-900">SyncCrew Campus</p>
          <p className="text-xs text-campus-500">대학생 팀 프로젝트를 위한 협업 공간</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost">팀원 초대</Button>
        <div className="hidden items-center gap-3 rounded-full border border-campus-200 bg-brand-50 px-3 py-1.5 sm:flex">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-accent-400 text-xs font-semibold text-white">
            김유
          </span>
          <div>
            <p className="text-sm font-semibold text-campus-800">김유진</p>
            <p className="text-xs text-campus-500">캡스톤 리더</p>
          </div>
        </div>
      </div>
    </header>
  )
}
