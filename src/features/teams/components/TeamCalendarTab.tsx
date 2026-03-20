import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import {
  CalendarEventFormModal,
} from './CalendarEventFormModal'
import { CalendarEventList } from './CalendarEventList'
import { useTeamCalendar } from '../hooks/useTeamCalendar'
import type { TeamCalendarEventRecord } from '../types/team'

interface TeamCalendarTabProps {
  teamId: string
  currentUserId: string | null
  isLeader: boolean
}

export function TeamCalendarTab({
  teamId,
  currentUserId,
  isLeader,
}: TeamCalendarTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TeamCalendarEventRecord | null>(null)
  const {
    groupedEvents,
    isLoading,
    errorMessage,
    feedbackMessage,
    isSubmitting,
    loadEvents,
    saveEvent,
    setErrorMessage,
    setFeedbackMessage,
  } = useTeamCalendar({
    teamId,
    currentUserId,
    isLeader,
  })

  function handleOpenCreate() {
    setEditingEvent(null)
    setErrorMessage('')
    setFeedbackMessage('')
    setIsModalOpen(true)
  }

  function handleOpenEdit(event: TeamCalendarEventRecord) {
    setEditingEvent(event)
    setErrorMessage('')
    setFeedbackMessage('')
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    if (isSubmitting) return
    setIsModalOpen(false)
    setEditingEvent(null)
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="overflow-hidden rounded-[32px] border-campus-200 bg-gradient-to-br from-white via-campus-50 to-brand-50 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-600 ring-1 ring-inset ring-brand-100">
                Team Calendar
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <h2 className="font-display text-[28px] leading-none text-campus-900 sm:text-[32px]">
                    팀 일정
                  </h2>
                  <span className="inline-flex w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-campus-600 ring-1 ring-inset ring-campus-200">
                    {isLeader ? '리더 편집 가능' : '읽기 전용'}
                  </span>
                </div>

                <p className="max-w-2xl text-sm leading-6 text-campus-600 sm:text-[14px]">
                  날짜별로 정리된 팀 일정을 한눈에 확인하고, 중요한 회의나 마감 일정을
                  빠르게 관리할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void loadEvents()}
                disabled={isLoading}
                className="min-w-[108px]"
              >
                새로고침
              </Button>
              {isLeader && (
                <Button type="button" onClick={handleOpenCreate} className="min-w-[120px]">
                  일정 추가
                </Button>
              )}
            </div>
          </div>
        </Card>

        {!isLeader && (
          <Card className="rounded-[28px] border-campus-200 bg-campus-50 py-4">
            <p className="text-sm text-campus-600">
              이 캘린더는 읽기 전용입니다. 일정 추가와 수정은 팀 리더만 할 수 있습니다.
            </p>
          </Card>
        )}

        {feedbackMessage && (
          <Card className="rounded-[28px] border-emerald-200 bg-emerald-50 py-4">
            <p className="text-sm text-emerald-700">{feedbackMessage}</p>
          </Card>
        )}

        {errorMessage && !isModalOpen && (
          <Card className="rounded-[28px] border-rose-200 bg-rose-50 py-4">
            <p className="text-sm text-rose-600">{errorMessage}</p>
          </Card>
        )}

        {isLoading ? (
          <Card className="rounded-[28px] py-8">
            <p className="text-sm text-campus-600">현재 팀 일정을 불러오는 중입니다...</p>
          </Card>
        ) : groupedEvents.length === 0 ? (
          <Card className="rounded-[32px] border-campus-200 bg-white py-10">
            <div className="space-y-3 text-center">
              <h3 className="font-display text-2xl text-campus-900">등록된 일정이 없습니다</h3>
              <p className="text-sm text-campus-600">
                아직 팀 일정이 비어 있습니다.
                {isLeader
                  ? ' 첫 일정을 추가해서 팀 캘린더를 시작해 보세요.'
                  : ' 팀 리더가 일정을 등록하면 여기에서 확인할 수 있습니다.'}
              </p>
              {isLeader && (
                <div className="pt-2">
                  <Button type="button" onClick={handleOpenCreate}>
                    첫 일정 추가
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <CalendarEventList groups={groupedEvents} isLeader={isLeader} onEdit={handleOpenEdit} />
        )}
      </div>

      <CalendarEventFormModal
        key={`${editingEvent?.id ?? 'create'}-${isModalOpen ? 'open' : 'closed'}`}
        open={isModalOpen}
        event={editingEvent}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
        onClose={handleCloseModal}
        onSubmit={async (values) => {
          await saveEvent(values, editingEvent)
          setIsModalOpen(false)
          setEditingEvent(null)
        }}
      />
    </>
  )
}
