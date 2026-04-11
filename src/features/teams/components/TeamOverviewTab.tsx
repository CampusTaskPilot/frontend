import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Button } from '../../../components/ui/Button'
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
  isDeletingTeam: boolean
  deleteErrorMessage: string
  onOpenMembers: () => void
  onDeleteTeam: () => Promise<void>
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(280px,340px)]">
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

function TeamDeleteConfirmModal({
  open,
  teamName,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: {
  open: boolean
  teamName: string
  isSubmitting: boolean
  errorMessage: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const titleId = useId()
  const descriptionId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [confirmationName, setConfirmationName] = useState('')

  const isMatched = useMemo(
    () => confirmationName.trim() === teamName.trim(),
    [confirmationName, teamName],
  )

  useEffect(() => {
    if (!open) {
      return
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isSubmitting) {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSubmitting, onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-campus-900/60 px-4 py-6 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose()
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg"
      >
        <Card className="space-y-5 rounded-[2rem] border-rose-300 bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">Danger Zone</p>
              <h3 id={titleId} className="font-display text-2xl text-campus-900">
                팀을 영구 삭제하시겠습니까?
              </h3>
              <div id={descriptionId} className="space-y-2 text-sm leading-6 text-campus-600">
                <p>이 작업은 되돌릴 수 없습니다.</p>
                <p>삭제가 완료되면 현재 워크스페이스에 다시 들어올 수 없으며, 관련 핵심 데이터도 함께 제거될 수 있습니다.</p>
                <p>로그는 현재 DB 정책에 맞게 처리되며, 프론트는 팀 삭제 요청만 수행합니다.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="팀 삭제 모달 닫기"
              className="shrink-0 px-3"
            >
              닫기
            </Button>
          </div>

          <div className="rounded-2xl border border-rose-300 bg-rose-100 px-4 py-4 text-sm text-rose-800">
            <p className="font-semibold">
              주의: 팀 정보, 멤버 연결, 업무, 할 일, 일정 등 핵심 데이터가 즉시 영향을 받을 수 있습니다.
            </p>
            <p className="mt-2 font-medium">
              실수 방지를 위해 현재 팀 이름을 정확히 입력해야만 삭제를 진행할 수 있습니다.
            </p>
            <p className="mt-2 break-all">
              확인 문자열: <span className="font-semibold">{teamName}</span>
            </p>
          </div>

          <label className="block space-y-2 text-sm font-medium text-campus-700">
            <span>팀 이름 확인</span>
            <input
              ref={inputRef}
              value={confirmationName}
              onChange={(event) => setConfirmationName(event.target.value)}
              placeholder={teamName}
              disabled={isSubmitting}
              aria-invalid={Boolean(confirmationName) && !isMatched}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-campus-50"
            />
          </label>

          <p className="text-xs leading-5 text-campus-500">
            앞뒤 공백은 자동으로 제외되며, 대소문자까지 현재 팀 이름과 정확히 일치해야 삭제 버튼이 활성화됩니다.
          </p>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              취소
            </Button>
            <Button
              type="button"
              onClick={() => void onConfirm()}
              disabled={!isMatched || isSubmitting}
              className="bg-rose-500 text-white shadow-none hover:bg-rose-600 focus-visible:outline-rose-300"
            >
              {isSubmitting ? '삭제 중...' : '팀 영구 삭제'}
            </Button>
          </div>
        </Card>
      </div>
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
  isDeletingTeam,
  deleteErrorMessage,
  onOpenMembers,
  onDeleteTeam,
  onTeamUpdated,
}: TeamOverviewTabProps) {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editRequestKey, setEditRequestKey] = useState(0)

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
    <>
      <div className="space-y-6">
        <TeamOverviewHeader
          team={team}
          leader={leader}
          members={members}
          skills={skills}
          isLeader={isLeader}
          currentUserId={currentUserId}
          tasks={tasks}
          editRequestKey={editRequestKey}
          onOpenMembers={onOpenMembers}
          onTeamUpdated={onTeamUpdated}
        />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),320px]">
          <div className="space-y-6">
            <TeamOverviewSkills skills={skills} />
            <TeamOverviewMembers members={members} team={team} />
          </div>

          <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
            <Card className="border-campus-200/80 bg-white/90 p-5 shadow-card">
              <div className="space-y-5">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">
                    Workspace Actions
                  </p>
                  <h2 className="text-xl font-semibold tracking-tight text-campus-900">빠르게 이동하고 관리하기</h2>
                  <p className="text-sm leading-6 text-campus-500">
                    현재 팀 상태를 확인하면서 자주 쓰는 관리 작업으로 바로 이어질 수 있게 정리했습니다.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  {isLeader && (
                    <button
                      type="button"
                      onClick={() => setEditRequestKey((current) => current + 1)}
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
                  {isLeader && (
                    <button
                      type="button"
                      onClick={() => setIsDeleteModalOpen(true)}
                      disabled={isDeletingTeam}
                      className="inline-flex w-full items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDeletingTeam ? '삭제 중...' : '팀 삭제'}
                    </button>
                  )}
                </div>

                {deleteErrorMessage && !isDeleteModalOpen && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {deleteErrorMessage}
                  </div>
                )}
              </div>
            </Card>

            <Card className="border-campus-200/80 bg-white/90 p-5 shadow-card">
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
                        ? '새로운 멤버를 받을 수 있는 상태입니다.'
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
                    value={
                      skills.length > 0
                        ? `${skills.length}개의 연결 기술이 등록되어 있습니다.`
                        : '아직 연결된 기술이 없습니다.'
                    }
                  />
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </div>

      <TeamDeleteConfirmModal
        key={`${team.id}-${String(isDeleteModalOpen)}`}
        open={isDeleteModalOpen}
        teamName={team.name}
        isSubmitting={isDeletingTeam}
        errorMessage={deleteErrorMessage}
        onClose={() => {
          if (!isDeletingTeam) {
            setIsDeleteModalOpen(false)
          }
        }}
        onConfirm={async () => {
          await onDeleteTeam()
        }}
      />
    </>
  )
}
