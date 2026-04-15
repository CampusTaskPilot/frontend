import { useEffect, useState } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { TeamApplicationSummaryRecord } from '../types/team'

interface TeamApplicationCalloutProps {
  canApply: boolean
  isSubmitting: boolean
  application: TeamApplicationSummaryRecord | null
  errorMessage: string
  successMessage: string
  onSubmit: (message: string) => Promise<void>
}

function statusLabel(status: TeamApplicationSummaryRecord['status']) {
  switch (status) {
    case 'accepted':
      return '수락됨'
    case 'rejected':
      return '거절됨'
    case 'withdrawn':
      return '철회됨'
    default:
      return '대기 중'
  }
}

function statusVariant(status: TeamApplicationSummaryRecord['status']) {
  if (status === 'accepted') return 'success'
  if (status === 'rejected') return 'warning'
  return 'neutral'
}

export function TeamApplicationCallout({
  canApply,
  isSubmitting,
  application,
  errorMessage,
  successMessage,
  onSubmit,
}: TeamApplicationCalloutProps) {
  const [message, setMessage] = useState('')
  const isFreshSubmission = Boolean(successMessage) && application?.status === 'pending'

  useEffect(() => {
    if (application) {
      setMessage('')
    }
  }, [application])

  if (!canApply && !application) {
    return null
  }

  return (
    <Card className="space-y-4 border-white/80 bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.12),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-600">TEAM APPLY</p>
          <h2 className="font-display text-2xl text-campus-900">팀 참여 신청</h2>
          <p className="max-w-2xl text-sm leading-6 text-campus-600">
            공개 프로필과 신청 메시지를 기준으로 팀 리더가 지원 내용을 검토합니다.
          </p>
        </div>

        {application ? <Badge variant={statusVariant(application.status)}>{statusLabel(application.status)}</Badge> : null}
      </div>

      {application ? (
        <div className="space-y-3 rounded-[1.3rem] border border-campus-200 bg-white/85 p-4">
          <p className="text-sm font-medium text-campus-900">
            {isFreshSubmission ? '팀 신청이 완료되었습니다.' : '이미 이 팀에 신청한 기록이 있습니다.'}
          </p>
          <p className="text-sm leading-6 text-campus-600">
            신청 시각: {new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(application.applied_at))}
          </p>
          {application.applicant.application_message ? (
            <p className="text-sm leading-6 text-campus-700">{application.applicant.application_message}</p>
          ) : (
            <p className="text-sm leading-6 text-campus-500">신청 메시지는 남기지 않았습니다.</p>
          )}
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void onSubmit(message)
          }}
        >
          <div className="space-y-2">
            <label htmlFor="team-application-message" className="block text-sm font-semibold text-campus-900">
              신청 메시지
            </label>
            <textarea
              id="team-application-message"
              name="teamApplicationMessage"
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="함께 하고 싶은 이유나 맡고 싶은 역할을 적어 주세요…"
              className="min-h-[9rem] w-full rounded-[1.25rem] border border-campus-200 bg-white/92 px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100"
              autoComplete="off"
            />
            <p className="text-xs text-campus-500">메시지는 선택 입력입니다. 비워 두어도 신청할 수 있습니다.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-campus-500">신청 직후 팀 리더에게 알림이 전달됩니다.</p>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '신청 중…' : '팀 신청하기'}
            </Button>
          </div>
        </form>
      )}

      {(successMessage || errorMessage) && (
        <div
          aria-live="polite"
          className={[
            'rounded-[1.2rem] px-4 py-3 text-sm',
            errorMessage ? 'border border-rose-200 bg-rose-50 text-rose-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700',
          ].join(' ')}
        >
          {errorMessage || successMessage}
        </div>
      )}
    </Card>
  )
}
