import { useEffect, useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { CalendarEventFormModal } from './CalendarEventFormModal'
import { CalendarEventList } from './CalendarEventList'
import { useTeamCalendar } from '../hooks/useTeamCalendar'
import type { TeamCalendarEventRecord } from '../types/team'

interface TeamCalendarTabProps {
  teamId: string
  currentUserId: string | null
  isLeader: boolean
}

interface CalendarDeleteIntent {
  eventIds: string[]
  title: string
  description: string
  confirmLabel: string
}

function CalendarDeleteConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel: string
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

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSubmitting, onClose, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-campus-900/50 px-4 py-6 backdrop-blur-sm">
      <Card className="w-full max-w-lg space-y-5 rounded-[2rem] border-rose-200">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">
              Calendar Delete
            </p>
            <h3 className="font-display text-2xl text-campus-900">{title}</h3>
            <p className="text-sm leading-6 text-campus-600">{description}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="shrink-0 whitespace-nowrap px-3"
          >
            닫기
          </Button>
        </div>

        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          삭제된 일정은 복구되지 않습니다. 여러 개를 한 번에 지울 때도 확인 후 진행됩니다.
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
            className="bg-rose-500 text-white shadow-none hover:bg-rose-600 focus-visible:outline-rose-300"
            onClick={() => void onConfirm()}
            disabled={isSubmitting}
          >
            {isSubmitting ? '삭제 중...' : confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  )
}

export function TeamCalendarTab({
  teamId,
  currentUserId,
  isLeader,
}: TeamCalendarTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TeamCalendarEventRecord | null>(null)
  const [calendarDeleteIntent, setCalendarDeleteIntent] = useState<CalendarDeleteIntent | null>(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])

  const {
    events,
    groupedEvents,
    isLoading,
    errorMessage,
    feedbackMessage,
    isSubmitting,
    loadEvents,
    saveEvent,
    removeEvents,
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

  function toggleEventSelection(eventId: string, checked: boolean) {
    setSelectedEventIds((current) =>
      checked ? [...new Set([...current, eventId])] : current.filter((id) => id !== eventId),
    )
  }

  function handleDeleteRequest(eventIds: string[]) {
    if (!isLeader || eventIds.length === 0) {
      return
    }

    const labels = events
      .filter((event) => eventIds.includes(event.id))
      .map((event) => event.title)
      .slice(0, 2)
    const extraCount = Math.max(eventIds.length - labels.length, 0)
    const preview =
      labels.length > 0 ? `${labels.join(', ')}${extraCount > 0 ? ` 외 ${extraCount}개` : ''}` : `${eventIds.length}개 일정`

    setErrorMessage('')
    setCalendarDeleteIntent({
      eventIds,
      title: eventIds.length === 1 ? '이 일정을 삭제할까요?' : '선택한 일정을 한 번에 삭제할까요?',
      description: `${preview} 일정이 캘린더에서 제거됩니다. 삭제 후에는 되돌릴 수 없습니다.`,
      confirmLabel: eventIds.length === 1 ? '일정 삭제' : `${eventIds.length}개 일정 삭제`,
    })
  }

  async function handleConfirmDelete() {
    const intent = calendarDeleteIntent
    if (!intent) {
      return
    }

    await removeEvents(intent.eventIds)
    setCalendarDeleteIntent(null)
    setSelectedEventIds([])
    setSelectionMode(false)
    if (editingEvent && intent.eventIds.includes(editingEvent.id)) {
      setEditingEvent(null)
      setIsModalOpen(false)
    }
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
                  날짜별로 정리된 일정을 한눈에 확인하고, 중요한 회의와 마감 일정을 <br/>빠르게 관리할 수 있습니다.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 lg:flex-nowrap">
              <Button
                type="button"
                variant="ghost"
                onClick={() => void loadEvents()}
                disabled={isLoading}
                className="min-w-[108px] whitespace-nowrap"
              >
                새로고침
              </Button>
              {isLeader && groupedEvents.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant={selectionMode ? 'subtle' : 'ghost'}
                    onClick={() => {
                      const next = !selectionMode
                      setSelectionMode(next)
                      if (!next) {
                        setSelectedEventIds([])
                      }
                    }}
                    className={
                      selectionMode
                        ? 'min-w-[132px] whitespace-nowrap border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'min-w-[132px] whitespace-nowrap'
                    }
                  >
                    {selectionMode ? '선택 모드 종료' : '일정 선택 삭제'}
                  </Button>
                  {selectionMode && selectedEventIds.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleDeleteRequest(selectedEventIds)}
                      className="min-w-[144px] whitespace-nowrap border-rose-200 text-rose-700 hover:bg-rose-50"
                    >
                      선택한 일정 삭제
                    </Button>
                  )}
                </>
              )}
              {isLeader && (
                <Button type="button" onClick={handleOpenCreate} className="min-w-[120px] whitespace-nowrap">
                  일정 추가
                </Button>
              )}
            </div>
          </div>
        </Card>

        {!isLeader && (
          <Card className="rounded-[28px] border-campus-200 bg-campus-50 py-4">
            <p className="text-sm text-campus-600">
              팀 캘린더는 읽기 전용입니다. 일정 추가와 수정, 삭제는 팀 리더만 할 수 있습니다.
            </p>
          </Card>
        )}

        {feedbackMessage && (
          <Card className="rounded-[28px] border-emerald-200 bg-emerald-50 py-4">
            <p className="text-sm text-emerald-700">{feedbackMessage}</p>
          </Card>
        )}

        {errorMessage && !isModalOpen && !calendarDeleteIntent && (
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
                  ? ' 첫 일정을 추가해서 팀 캘린더를 시작해보세요.'
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
          <CalendarEventList
            groups={groupedEvents}
            isLeader={isLeader}
            onEdit={handleOpenEdit}
            isSelectionMode={selectionMode}
            selectedEventIds={selectedEventIds}
            onSelectToggle={toggleEventSelection}
            onDelete={(event) => handleDeleteRequest([event.id])}
          />
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

      <CalendarDeleteConfirmModal
        open={calendarDeleteIntent !== null}
        title={calendarDeleteIntent?.title ?? ''}
        description={calendarDeleteIntent?.description ?? ''}
        confirmLabel={calendarDeleteIntent?.confirmLabel ?? '삭제'}
        isSubmitting={isSubmitting}
        errorMessage={calendarDeleteIntent ? errorMessage : ''}
        onClose={() => {
          if (isSubmitting) return
          setCalendarDeleteIntent(null)
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
