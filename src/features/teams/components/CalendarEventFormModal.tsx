import { useState } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useImeSafeSubmit } from '../../../hooks/useImeSafeSubmit'
import { cn } from '../../../lib/cn'
import {
  createEmptyCalendarEventFormValues,
  toCalendarEventFormValues,
} from '../hooks/useTeamCalendar'
import type {
  TeamCalendarEventFormValues,
  TeamCalendarEventRecord,
  TeamCalendarEventType,
} from '../types/team'

const eventTypeOptions: Array<{ value: TeamCalendarEventType; label: string }> = [
  { value: 'general', label: '일반' },
  { value: 'meeting', label: '회의' },
  { value: 'deadline', label: '마감' },
  { value: 'presentation', label: '발표' },
]

interface CalendarEventFormModalProps {
  open: boolean
  event: TeamCalendarEventRecord | null
  isSubmitting: boolean
  errorMessage: string
  onClose: () => void
  onSubmit: (values: TeamCalendarEventFormValues) => Promise<void>
}

export function CalendarEventFormModal({
  open,
  event,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: CalendarEventFormModalProps) {
  const [values, setValues] = useState<TeamCalendarEventFormValues>(
    () => (open ? toCalendarEventFormValues(event) : createEmptyCalendarEventFormValues()),
  )
  const ime = useImeSafeSubmit()

  if (!open) {
    return null
  }

  async function handleSubmit() {
    await onSubmit(values)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-campus-900/50 px-4 py-6 backdrop-blur-sm">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] p-0 shadow-2xl">
        <div className="border-b border-campus-200 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-campus-500">
                Team Calendar
              </p>
              <h3 className="font-display text-2xl text-campus-900">
                {event ? '일정 수정' : '일정 추가'}
              </h3>
              <p className="text-sm text-campus-600">
                팀 일정에 바로 반영되는 정보를 입력해 주세요.
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={ime.preventBlurOnMouseDown}
              onClick={onClose}
              disabled={isSubmitting}
            >
              닫기
            </Button>
          </div>
        </div>

        <form className="space-y-5 px-6 py-6 sm:px-8" onSubmit={ime.createSubmitHandler(handleSubmit)} noValidate>
          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>제목</span>
            <input
              value={values.title}
              onChange={(eventObject) =>
                setValues((current) => ({ ...current, title: eventObject.target.value }))
              }
              onCompositionStart={ime.handleCompositionStart}
              onCompositionEnd={ime.handleCompositionEnd}
              onKeyDown={ime.preventEnterWhileComposing()}
              placeholder="예: 주간 스탠드업"
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              disabled={isSubmitting}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>설명</span>
            <textarea
              value={values.description}
              onChange={(eventObject) =>
                setValues((current) => ({ ...current, description: eventObject.target.value }))
              }
              onCompositionStart={ime.handleCompositionStart}
              onCompositionEnd={ime.handleCompositionEnd}
              onKeyDown={ime.preventEnterWhileComposing()}
              placeholder="없으면 비워도 괜찮습니다."
              rows={4}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              disabled={isSubmitting}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>유형</span>
              <select
                value={values.type}
                onChange={(eventObject) =>
                  setValues((current) => ({
                    ...current,
                    type: eventObject.target.value as TeamCalendarEventType,
                  }))
                }
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                disabled={isSubmitting}
              >
                {eventTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>날짜</span>
              <input
                type="date"
                value={values.event_date}
                onChange={(eventObject) =>
                  setValues((current) => ({ ...current, event_date: eventObject.target.value }))
                }
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                disabled={isSubmitting}
              />
            </label>
          </div>

          <div className="space-y-3 rounded-3xl border border-campus-200 bg-campus-50 px-4 py-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-campus-800">
              <input
                type="checkbox"
                checked={values.is_all_day}
                onChange={(eventObject) =>
                  setValues((current) => ({
                    ...current,
                    is_all_day: eventObject.target.checked,
                    start_time: eventObject.target.checked ? '' : current.start_time,
                    end_time: eventObject.target.checked ? '' : current.end_time,
                  }))
                }
                className="h-4 w-4 rounded border-campus-300 text-brand-500 focus:ring-brand-300"
                disabled={isSubmitting}
              />
              종일 일정
            </label>

            <div
              className={cn(
                'grid gap-4 sm:grid-cols-2',
                values.is_all_day && 'pointer-events-none opacity-50',
              )}
            >
              <label className="space-y-2 text-sm font-medium text-campus-700">
                <span>시작 시간</span>
                <input
                  type="time"
                  value={values.start_time}
                  onChange={(eventObject) =>
                    setValues((current) => ({ ...current, start_time: eventObject.target.value }))
                  }
                  className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  disabled={isSubmitting || values.is_all_day}
                />
              </label>

              <label className="space-y-2 text-sm font-medium text-campus-700">
                <span>종료 시간</span>
                <input
                  type="time"
                  value={values.end_time}
                  onChange={(eventObject) =>
                    setValues((current) => ({ ...current, end_time: eventObject.target.value }))
                  }
                  className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  disabled={isSubmitting || values.is_all_day}
                />
              </label>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onMouseDown={ime.preventBlurOnMouseDown}
              onClick={onClose}
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" onMouseDown={ime.preventBlurOnMouseDown} disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : event ? '수정 저장' : '일정 저장'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
