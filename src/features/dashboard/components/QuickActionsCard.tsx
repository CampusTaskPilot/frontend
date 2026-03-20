import { Link } from 'react-router-dom'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'

interface QuickActionsCardProps {
  dueTodayCount: number
  inProgressCount: number
  teamCount: number
}

export function QuickActionsCard({
  dueTodayCount,
  inProgressCount,
  teamCount,
}: QuickActionsCardProps) {
  return (
    <Card className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Quick Access</p>
        <h2 className="mt-2 font-display text-2xl text-campus-900">빠른 이동</h2>
        <p className="mt-1 text-sm text-campus-500">지금 자주 보게 될 화면으로 바로 이동할 수 있게 묶어두었습니다.</p>
      </div>

      <div className="space-y-3">
        <div className="rounded-3xl border border-campus-200 bg-campus-50 px-4 py-4">
          <p className="text-sm font-medium text-campus-900">내 팀 보기</p>
          <p className="mt-1 text-xs text-campus-500">현재 참여 중인 팀과 워크스페이스로 이동합니다.</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-campus-500">{teamCount}개 팀 연결</span>
            <Button asChild size="sm" variant="ghost">
              <Link to="/teams">열기</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-campus-200 bg-campus-50 px-4 py-4">
          <p className="text-sm font-medium text-campus-900">오늘 마감 업무 보기</p>
          <p className="mt-1 text-xs text-campus-500">오늘 확인이 필요한 업무를 빠르게 추적할 수 있습니다.</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-campus-500">{dueTodayCount}개 업무</span>
            <Button asChild size="sm" variant="ghost">
              <Link to="/teams?filter=due-today">이동</Link>
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-campus-200 bg-campus-50 px-4 py-4">
          <p className="text-sm font-medium text-campus-900">진행 중 업무 보기</p>
          <p className="mt-1 text-xs text-campus-500">멈추지 않고 이어가야 할 작업들을 다시 확인합니다.</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-campus-500">{inProgressCount}개 진행 중</span>
            <Button asChild size="sm" variant="ghost">
              <Link to="/teams?filter=in-progress">이동</Link>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
