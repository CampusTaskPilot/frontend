import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createCalendarEvent,
  fetchTeamCalendarEvents,
  updateCalendarEvent,
} from '../lib/teamCalendar'
import type {
  TeamCalendarEventFormValues,
  TeamCalendarEventGroup,
  TeamCalendarEventRecord,
  TeamCalendarEventUpsertInput,
} from '../types/team'

function compareTime(value: string | null) {
  if (!value) return Number.MAX_SAFE_INTEGER
  const [hours = '23', minutes = '59'] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

function sortEvents(events: TeamCalendarEventRecord[]) {
  return [...events].sort((a, b) => {
    if (a.event_date !== b.event_date) {
      return a.event_date.localeCompare(b.event_date)
    }

    if (a.is_all_day !== b.is_all_day) {
      return a.is_all_day ? -1 : 1
    }

    const timeGap = compareTime(a.start_time) - compareTime(b.start_time)
    if (timeGap !== 0) {
      return timeGap
    }

    return a.created_at.localeCompare(b.created_at)
  })
}

function normalizeFormValues(values: TeamCalendarEventFormValues): TeamCalendarEventUpsertInput {
  const title = values.title.trim()
  const description = values.description.trim()

  if (!title) {
    throw new Error('일정 제목을 입력해 주세요.')
  }

  if (!values.event_date) {
    throw new Error('일정 날짜를 선택해 주세요.')
  }

  if (!values.is_all_day) {
    const hasStart = values.start_time.trim().length > 0
    const hasEnd = values.end_time.trim().length > 0

    if (hasStart !== hasEnd) {
      throw new Error('시간을 입력할 경우 시작 시간과 종료 시간을 모두 입력해 주세요.')
    }

    if (hasStart && hasEnd && values.end_time <= values.start_time) {
      throw new Error('종료 시간은 시작 시간보다 뒤여야 합니다.')
    }
  }

  return {
    title,
    description: description || null,
    type: values.type,
    event_date: values.event_date,
    is_all_day: values.is_all_day,
    start_time: values.is_all_day ? null : values.start_time || null,
    end_time: values.is_all_day ? null : values.end_time || null,
  }
}

export function createEmptyCalendarEventFormValues(): TeamCalendarEventFormValues {
  return {
    title: '',
    description: '',
    type: 'general',
    event_date: '',
    is_all_day: true,
    start_time: '',
    end_time: '',
  }
}

export function toCalendarEventFormValues(
  event: TeamCalendarEventRecord | null,
): TeamCalendarEventFormValues {
  if (!event) {
    return createEmptyCalendarEventFormValues()
  }

  return {
    title: event.title,
    description: event.description ?? '',
    type: event.type,
    event_date: event.event_date,
    is_all_day: event.is_all_day,
    start_time: event.start_time ? event.start_time.slice(0, 5) : '',
    end_time: event.end_time ? event.end_time.slice(0, 5) : '',
  }
}

export function useTeamCalendar(params: {
  teamId: string | null
  currentUserId: string | null
  isLeader: boolean
}) {
  const { teamId, currentUserId, isLeader } = params

  const [events, setEvents] = useState<TeamCalendarEventRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const loadEvents = useCallback(async () => {
    if (!teamId) {
      setEvents([])
      setIsLoading(false)
      setErrorMessage('팀 정보가 없어 일정을 불러올 수 없습니다.')
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const data = await fetchTeamCalendarEvents(teamId)
      setEvents(sortEvents(data))
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '일정을 불러오지 못했습니다.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  const groupedEvents = useMemo<TeamCalendarEventGroup[]>(() => {
    const groups = new Map<string, TeamCalendarEventRecord[]>()

    events.forEach((event) => {
      const current = groups.get(event.event_date) ?? []
      current.push(event)
      groups.set(event.event_date, current)
    })

    return Array.from(groups.entries()).map(([date, groupEvents]) => ({
      date,
      events: sortEvents(groupEvents),
    }))
  }, [events])

  const saveEvent = useCallback(
    async (values: TeamCalendarEventFormValues, editingEvent: TeamCalendarEventRecord | null) => {
      if (!isLeader) {
        throw new Error('팀 리더만 일정을 저장할 수 있습니다.')
      }

      if (!teamId) {
        throw new Error('팀 정보가 없어 일정을 저장할 수 없습니다.')
      }

      if (!currentUserId) {
        throw new Error('로그인 정보가 없어 일정을 저장할 수 없습니다.')
      }

      const normalized = normalizeFormValues(values)

      setIsSubmitting(true)
      setErrorMessage('')
      setFeedbackMessage('')

      try {
        const savedEvent = editingEvent
          ? await updateCalendarEvent({
              eventId: editingEvent.id,
              values: normalized,
            })
          : await createCalendarEvent({
              teamId,
              createdBy: currentUserId,
              values: normalized,
            })

        setEvents((current) => {
          const next = editingEvent
            ? current.map((event) => (event.id === savedEvent.id ? savedEvent : event))
            : [...current, savedEvent]

          return sortEvents(next)
        })
        setFeedbackMessage(editingEvent ? '일정이 수정되었습니다.' : '일정이 등록되었습니다.')
        return savedEvent
      } catch (error) {
        const message =
          error instanceof Error ? error.message : '일정을 저장하지 못했습니다.'
        setErrorMessage(message)
        throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    [currentUserId, isLeader, teamId],
  )

  return {
    events,
    groupedEvents,
    isLoading,
    errorMessage,
    feedbackMessage,
    isSubmitting,
    loadEvents,
    saveEvent,
    setErrorMessage,
    setFeedbackMessage,
  }
}
