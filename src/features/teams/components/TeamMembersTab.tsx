import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { TeamMemberList } from './TeamMemberList'
import type { TeamMemberWithProfile } from '../types/team'

type TeamMemberActionKind = 'remove' | 'leave'

interface TeamMemberActionIntent {
  member: TeamMemberWithProfile
  action: TeamMemberActionKind
}

interface TeamMembersTabProps {
  members: TeamMemberWithProfile[]
  isLeader: boolean
  currentUserId: string | null
  pendingMemberId: string | null
  successMessage: string
  errorMessage: string
  onClearMessage: () => void
  onConfirmMemberAction: (member: TeamMemberWithProfile, action: TeamMemberActionKind) => Promise<void>
}

function TeamMemberConfirmDialog({
  open,
  action,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: {
  open: boolean
  action: TeamMemberActionKind | null
  isSubmitting: boolean
  errorMessage: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  useEffect(() => {
    if (!open || isSubmitting) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSubmitting, onClose, open])

  if (!open || !action) {
    return null
  }

  const isLeave = action === 'leave'
  const title = isLeave ? '팀에서 탈퇴하시겠습니까?' : '팀원을 추방하시겠습니까?'
  const description = isLeave
    ? '탈퇴하면 이 팀의 워크스페이스에 더 이상 접근할 수 없습니다.'
    : '추방된 멤버는 이 팀의 워크스페이스에 더 이상 접근할 수 없습니다.'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-campus-900/50 px-4 py-6 backdrop-blur-sm">
      <Card className="w-full max-w-lg space-y-5 rounded-[2rem] border-rose-200">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">Member Action</p>
          <h3 className="font-display text-2xl text-campus-900">{title}</h3>
          <p className="text-sm leading-6 text-campus-600">{description}</p>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          확인을 누르기 전까지는 실제 요청이 실행되지 않습니다.
        </div>

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
            disabled={isSubmitting}
            className="border-rose-200 bg-rose-500 text-white shadow-none hover:bg-rose-600 focus-visible:outline-rose-300"
          >
            {isSubmitting ? '처리 중...' : '확인'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function TeamMembersTab({
  members,
  isLeader,
  currentUserId,
  pendingMemberId,
  successMessage,
  errorMessage,
  onClearMessage,
  onConfirmMemberAction,
}: TeamMembersTabProps) {
  const [actionIntent, setActionIntent] = useState<TeamMemberActionIntent | null>(null)

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === 'leader' && b.role !== 'leader') return -1
      if (a.role !== 'leader' && b.role === 'leader') return 1
      return 0
    })
  }, [members])

  const open = actionIntent !== null
  const isSubmitting = pendingMemberId !== null && pendingMemberId === actionIntent?.member.id

  function handleCloseDialog() {
    if (isSubmitting) return
    setActionIntent(null)
  }

  return (
    <>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <h2 className="font-display text-2xl text-campus-900">팀 멤버</h2>
            <p className="text-sm text-campus-600">권한에 따라 추방 또는 자진 탈퇴만 노출됩니다.</p>
          </div>
          <span className="rounded-full border border-campus-200 bg-campus-50 px-3 py-1 text-xs font-medium text-campus-600">
            총 {members.length}명
          </span>
        </div>

        {successMessage && (
          <Card className="rounded-[24px] border-emerald-200 bg-emerald-50 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-emerald-700">{successMessage}</p>
              <Button type="button" variant="ghost" size="sm" onClick={onClearMessage} className="px-2">
                닫기
              </Button>
            </div>
          </Card>
        )}

        {errorMessage && (
          <Card className="rounded-[24px] border-rose-200 bg-rose-50 py-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-rose-600">{errorMessage}</p>
              <Button type="button" variant="ghost" size="sm" onClick={onClearMessage} className="px-2">
                닫기
              </Button>
            </div>
          </Card>
        )}

        <TeamMemberList
          members={sortedMembers}
          isLeader={isLeader}
          currentUserId={currentUserId}
          pendingMemberId={pendingMemberId}
          onActionClick={(member, action) => {
            onClearMessage()
            setActionIntent({ member, action })
          }}
        />
      </Card>

      <TeamMemberConfirmDialog
        open={open}
        action={actionIntent?.action ?? null}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        onClose={handleCloseDialog}
        onConfirm={async () => {
          if (!actionIntent) return
          await onConfirmMemberAction(actionIntent.member, actionIntent.action)
          setActionIntent(null)
        }}
      />
    </>
  )
}
