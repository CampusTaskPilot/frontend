import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { TeamOverviewHeader } from './TeamOverviewHeader'
import { TeamOverviewMembers } from './TeamOverviewMembers'
import { TeamOverviewSkills } from './TeamOverviewSkills'
import type {
  ProfileSummary,
  TeamMemberWithProfile,
  TeamRecord,
  TeamSkillTag,
  TeamTaskItem,
} from '../types/team'

interface TeamOverviewTabProps {
  team: TeamRecord
  leader: ProfileSummary | null
  members: TeamMemberWithProfile[]
  skills: TeamSkillTag[]
  tasks: TeamTaskItem[]
  isLoading: boolean
  errorMessage: string
  isLeader: boolean
  currentUserId: string | null
  onOpenMembers: () => void
  onTeamUpdated: (payload: { team: TeamRecord; skills: TeamSkillTag[] }) => void
}

function OverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-campus-200/80 bg-white/90 shadow-card">
        <div className="h-56 bg-campus-100" />
        <div className="space-y-6 px-6 pb-6 pt-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="h-4 w-28 rounded-full bg-campus-100" />
              <div className="h-10 w-72 max-w-full rounded-full bg-campus-200" />
              <div className="h-4 w-[32rem] max-w-full rounded-full bg-campus-100" />
              <div className="h-4 w-[26rem] max-w-full rounded-full bg-campus-100" />
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-32 rounded-full bg-campus-100" />
              <div className="h-11 w-32 rounded-full bg-campus-100" />
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-24 rounded-2xl bg-campus-50" />
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-36 rounded-[24px] bg-white/80 shadow-card" />
            ))}
          </div>
          <div className="h-48 rounded-[24px] bg-white/80 shadow-card" />
          <div className="h-80 rounded-[24px] bg-white/80 shadow-card" />
        </div>
        <div className="space-y-6">
          <div className="h-56 rounded-[24px] bg-white/80 shadow-card" />
          <div className="h-56 rounded-[24px] bg-white/80 shadow-card" />
        </div>
      </div>
    </div>
  )
}

function PulseItem({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'brand' | 'accent'
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-4',
        tone === 'brand' && 'border-brand-100 bg-brand-50/70',
        tone === 'accent' && 'border-emerald-100 bg-emerald-50/80',
        tone === 'neutral' && 'border-campus-200 bg-white',
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-campus-500">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-campus-900">{value}</p>
    </div>
  )
}

export function TeamOverviewTab({
  team,
  leader,
  members,
  skills,
  tasks,
  isLoading,
  errorMessage,
  isLeader,
  currentUserId,
  onOpenMembers,
  onTeamUpdated,
}: TeamOverviewTabProps) {
  if (isLoading) {
    return <OverviewSkeleton />
  }

  if (errorMessage) {
    return (
      <Card className="rounded-[28px] border-rose-200 bg-rose-50/90 p-5 shadow-none">
        <p className="text-sm leading-6 text-rose-700">
          {errorMessage} Overview 정보를 다시 불러오지 못했습니다. 잠시 후 다시 시도하거나 권한 상태를 확인해 주세요.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <TeamOverviewHeader
        team={team}
        leader={leader}
        members={members}
        skills={skills}
        isLeader={isLeader}
        currentUserId={currentUserId}
        tasks={tasks}
        onOpenMembers={onOpenMembers}
        onTeamUpdated={onTeamUpdated}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
        <div className="space-y-6">
          <TeamOverviewSkills skills={skills} />
          <TeamOverviewMembers members={members} team={team} />
        </div>

        <aside className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <Card className="rounded-[24px] border-campus-200/80 bg-white/90 p-5 shadow-card">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">
                  Workspace Actions
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-campus-900">빠르게 이동하고 관리하기</h2>
                <p className="text-sm leading-6 text-campus-500">
                  현재 팀 상태를 확인하면서 자주 쓰는 관리 동작으로 바로 이어질 수 있게 정리했습니다.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {isLeader && (
                  <button
                    type="button"
                    onClick={() => {
                      const editButton = document.querySelector<HTMLButtonElement>(
                        '[data-team-edit-trigger="true"]',
                      )
                      editButton?.click()
                    }}
                    className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-brand-500 via-brand-400 to-accent-400 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/20 transition hover:brightness-105"
                  >
                    팀 정보 수정
                  </button>
                )}
                <button
                  type="button"
                  onClick={onOpenMembers}
                  className="inline-flex w-full items-center justify-center rounded-full border border-campus-200 bg-white px-5 py-3 text-sm font-semibold text-campus-700 transition hover:border-campus-300 hover:bg-campus-50"
                >
                  멤버 관리 보기
                </button>
                <button
                  type="button"
                  disabled
                  title="현재 팀 삭제 기능은 아직 연결되어 있지 않습니다."
                  className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-campus-200 bg-campus-50 px-5 py-3 text-sm font-semibold text-campus-500"
                >
                  팀 삭제 준비 중
                </button>
              </div>
            </div>
          </Card>

          <Card className="rounded-[24px] border-campus-200/80 bg-white/90 p-5 shadow-card">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">
                  Workspace Pulse
                </p>
                <h2 className="text-xl font-semibold tracking-tight text-campus-900">운영 현황</h2>
              </div>

              <div className="space-y-3">
                <PulseItem
                  label="Recruiting"
                  value={
                    team.is_recruiting
                      ? '새 팀원을 받을 수 있는 상태입니다.'
                      : '현재는 신규 모집을 닫아둔 상태입니다.'
                  }
                  tone={team.is_recruiting ? 'accent' : 'neutral'}
                />
                <PulseItem
                  label="Members"
                  value={`${members.length}/${team.max_members || '-'}명 참여 중`}
                  tone="brand"
                />
                <PulseItem
                  label="Skills"
                  value={skills.length > 0 ? `${skills.length}개의 연결 기술이 등록되어 있습니다.` : '아직 연결된 기술이 없습니다.'}
                />
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
