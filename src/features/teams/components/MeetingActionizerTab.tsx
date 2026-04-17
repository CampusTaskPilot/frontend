import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useImeSafeSubmit } from '../../../hooks/useImeSafeSubmit'
import { cn } from '../../../lib/cn'
import { CalendarEventCard } from './CalendarEventCard'
import { fetchMeetingActionizerStatus, requestMeetingActionizer } from '../lib/meetingActionizer'
import {
  fetchTeamTasksWorkspace,
  saveWorkspaceChanges,
  type WorkspaceTaskCreateInput,
  type WorkspaceTodoCreateInput,
} from '../lib/taskWorkspace'
import { createCalendarEvent } from '../lib/teamCalendar'
import type {
  MeetingActionizerCalendarEventDraft,
  MeetingActionizerResponse,
  MeetingActionizerStatus,
  MeetingActionizerTaskDraft,
  TeamCalendarEventRecord,
  TeamMemberWithProfile,
  TeamTaskPriority,
  TeamTaskStatus,
  TeamTaskWithTodos,
} from '../types/team'

interface MeetingActionizerTabProps {
  teamId: string
  requestedBy: string | null
  isLeader: boolean
  members: TeamMemberWithProfile[]
  onOpenTasks: () => void
}

function getParticipantLabel(member: TeamMemberWithProfile) {
  return member.profile?.full_name || member.profile?.email || member.user_id
}

function parseParticipantNames(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function formatDueDate(value: string | null) {
  if (!value) return '미정'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function taskStatusLabel(status: TeamTaskStatus) {
  if (status === 'in_progress') return '진행 중'
  if (status === 'done') return '완료'
  return '시작 전'
}

function priorityLabel(priority: TeamTaskPriority) {
  if (priority === 'high') return '높음'
  if (priority === 'low') return '낮음'
  return '보통'
}

function TaskMetaBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'accent' | 'danger' | 'warning'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset',
        tone === 'brand' && 'bg-brand-50 text-brand-600 ring-brand-100',
        tone === 'warning' && 'bg-amber-50 text-amber-700 ring-amber-200',
        tone === 'accent' && 'bg-emerald-50 text-emerald-700 ring-emerald-200',
        tone === 'danger' && 'bg-rose-50 text-rose-700 ring-rose-200',
        tone === 'neutral' && 'bg-campus-100 text-campus-700 ring-campus-200',
      )}
    >
      {children}
    </span>
  )
}

function formatEventTime(event: MeetingActionizerCalendarEventDraft) {
  if (event.is_all_day || !event.start_time || !event.end_time) {
    return '종일 일정'
  }

  return `${event.start_time.slice(0, 5)} ~ ${event.end_time.slice(0, 5)}`
}

function buildDraftCalendarRecord(event: MeetingActionizerCalendarEventDraft): TeamCalendarEventRecord {
  return {
    id: event.client_draft_id,
    team_id: event.team_id,
    title: event.title,
    description: event.description,
    type: event.type,
    event_date: event.event_date,
    start_time: event.start_time,
    end_time: event.end_time,
    is_all_day: event.is_all_day,
    created_by: event.created_by,
    created_at: '',
    updated_at: '',
  }
}

function toDisplayName(profileId: string | null, membersById: Map<string, TeamMemberWithProfile>) {
  if (!profileId) return '미확인'
  const member = membersById.get(profileId)
  if (!member) return profileId
  return member.profile?.full_name || member.profile?.email || member.user_id
}

function AssigneeMeta({
  task,
  membersById,
}: {
  task: MeetingActionizerTaskDraft
  membersById: Map<string, TeamMemberWithProfile>
}) {
  if (task.assignee_id) {
    return (
      <p className="text-xs text-campus-600">
        담당자 {toDisplayName(task.assignee_id, membersById)}
      </p>
    )
  }

  return (
    <p className="text-xs text-campus-600">
      담당자 미확정
      {task.suggested_assignee_name ? ` · 추천 담당자: ${task.suggested_assignee_name}` : ''}
    </p>
  )
}

export function MeetingActionizerTab({
  teamId,
  requestedBy,
  isLeader,
  members,
  onOpenTasks,
}: MeetingActionizerTabProps) {
  const ime = useImeSafeSubmit()
  const participantPlaceholder = useMemo(
    () => members.map(getParticipantLabel).join(', '),
    [members],
  )
  const membersById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member] as const)),
    [members],
  )

  const [title, setTitle] = useState('주간 회의')
  const [meetingDate, setMeetingDate] = useState('')
  const [participantInput, setParticipantInput] = useState(participantPlaceholder)
  const [rawMeetingText, setRawMeetingText] = useState('')
  const [sourceFileName, setSourceFileName] = useState('')
  const [result, setResult] = useState<MeetingActionizerResponse | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [draftApplyStatus, setDraftApplyStatus] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [cooldownUntil, setCooldownUntil] = useState<string | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [actionizerStatus, setActionizerStatus] = useState<MeetingActionizerStatus | null>(null)
  const isActiveRef = useRef(false)

  useEffect(() => {
    isActiveRef.current = true

    return () => {
      isActiveRef.current = false
    }
  }, [])

  const refreshActionizerStatus = useCallback(async (signal?: AbortSignal) => {
    if (!isActiveRef.current) return null

    const status = await fetchMeetingActionizerStatus(teamId, { signal })
    if (!isActiveRef.current || signal?.aborted) return null

    setActionizerStatus(status)
    setCooldownUntil(status.cooldown_until ?? status.available_at)
    setRemainingSeconds(status.remaining_seconds)
    return status
  }, [teamId])

  useEffect(() => {
    if (!participantInput.trim() && participantPlaceholder) {
      setParticipantInput(participantPlaceholder)
    }
  }, [participantInput, participantPlaceholder])

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    async function loadCooldownStatus() {
      try {
        await refreshActionizerStatus(controller.signal)
      } catch (error) {
        if (controller.signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
          return
        }
        if (!isMounted) return
        setActionizerStatus(null)
        setCooldownUntil(null)
        setRemainingSeconds(0)
      }
    }

    void loadCooldownStatus()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [refreshActionizerStatus])

  useEffect(() => {
    if (!cooldownUntil) return

    const timer = window.setInterval(() => {
      const next = Math.max(Math.ceil((new Date(cooldownUntil).getTime() - Date.now()) / 1000), 0)
      setRemainingSeconds(next)
      setActionizerStatus((current) =>
        current
          ? {
              ...current,
              can_trigger: next === 0 && current.status !== 'pending' && current.status !== 'running',
              remaining_seconds: next,
            }
          : current,
      )
      if (next === 0) {
        setCooldownUntil(null)
      }
    }, 1000)

    return () => window.clearInterval(timer)
  }, [cooldownUntil])

  useEffect(() => {
    if (!actionizerStatus) return
    const isServerJobRunning =
      actionizerStatus.status === 'pending' || actionizerStatus.status === 'running'
    if (!isServerJobRunning) return

    let controller: AbortController | null = null
    const timer = window.setInterval(() => {
      if (!isActiveRef.current) return

      controller?.abort()
      controller = new AbortController()
      void refreshActionizerStatus(controller.signal).catch((error) => {
        if (error instanceof Error && error.name === 'AbortError') {
          return
        }
      })
    }, 5000)

    return () => {
      window.clearInterval(timer)
      controller?.abort()
    }
  }, [actionizerStatus?.status, refreshActionizerStatus])

  const isDbRunning = actionizerStatus?.status === 'pending' || actionizerStatus?.status === 'running'
  const isDbCooldown = actionizerStatus?.status === 'cooldown' || (
    Boolean(actionizerStatus) &&
    !isDbRunning &&
    !actionizerStatus?.can_trigger &&
    remainingSeconds > 0
  )
  const isActionizerBlocked = isDbRunning || isDbCooldown

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (isAnalyzing) return
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      setRawMeetingText(text)
      setSourceFileName(file.name)
      setErrorMessage('')
      setSuccessMessage('')
    } catch {
      setErrorMessage('파일 내용을 읽지 못했습니다. 텍스트 파일인지 확인해 주세요.')
    }
  }

  function applySelectionState(nextResult: MeetingActionizerResponse) {
    setSelectedTaskIds(nextResult.task_drafts.map((task) => task.client_draft_id))
    setSelectedEventIds(nextResult.calendar_event_drafts.map((event) => event.client_draft_id))
    setDraftApplyStatus('idle')
  }

  function updateEventDraft(
    clientDraftId: string,
    updater: (event: MeetingActionizerCalendarEventDraft) => MeetingActionizerCalendarEventDraft,
  ) {
    setResult((current) => {
      if (!current) return current
      return {
        ...current,
        calendar_event_drafts: current.calendar_event_drafts.map((event) =>
          event.client_draft_id === clientDraftId ? updater(event) : event,
        ),
      }
    })
  }

  async function handleSubmit() {
    if (isAnalyzing) return

    if (!requestedBy) {
      setErrorMessage('현재 사용자 프로필을 확인할 수 없어 요청을 보낼 수 없습니다.')
      return
    }

    if (!rawMeetingText.trim()) {
      setErrorMessage('회의 텍스트를 입력하거나 텍스트 파일을 불러와 주세요.')
      return
    }

    let latestStatus: MeetingActionizerStatus | null = null
    try {
      latestStatus = await refreshActionizerStatus()
    } catch {
      latestStatus = actionizerStatus
    }

    if (
      latestStatus &&
      (!latestStatus.can_trigger ||
        latestStatus.status === 'pending' ||
        latestStatus.status === 'running' ||
        latestStatus.status === 'cooldown')
    ) {
      setErrorMessage(latestStatus.message || '이미 회의 분석이 진행 중이거나 쿨다운 중입니다.')
      return
    }

    if (remainingSeconds > 0) {
      setErrorMessage(`다시 실행까지 ${Math.ceil(remainingSeconds / 60)}분 남았습니다.`)
      return
    }

    setIsAnalyzing(true)
    setIsSubmitting(true)
    setDraftApplyStatus('idle')
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await requestMeetingActionizer({
        teamId,
        requestedBy,
        title,
        meetingDate,
        participantNames: parseParticipantNames(participantInput),
        rawMeetingText,
      })
      setResult(response)
      setCooldownUntil(response.cooldown_until)
      setRemainingSeconds(response.remaining_seconds)
      setActionizerStatus((current) => ({
        status: 'cooldown',
        can_trigger: false,
        cooldown_minutes: current?.cooldown_minutes ?? 60,
        remaining_seconds: response.remaining_seconds,
        available_at: response.cooldown_until,
        cooldown_until: response.cooldown_until,
        latest_log: current?.latest_log ?? null,
        message: null,
      }))
      applySelectionState(response)
      void refreshActionizerStatus().catch(() => undefined)
    } catch (error) {
      setResult(null)
      setSelectedTaskIds([])
      setSelectedEventIds([])
      if (
        error &&
        typeof error === 'object' &&
        'payload' in error &&
        error.payload &&
        typeof error.payload === 'object'
      ) {
        const payload = error.payload as {
          available_at?: string
          cooldown_until?: string
          remaining_seconds?: number
          status?: MeetingActionizerStatus['status']
        }
        if (payload.available_at || payload.cooldown_until) {
          setCooldownUntil(payload.cooldown_until ?? payload.available_at ?? null)
        }
        if (typeof payload.remaining_seconds === 'number') {
          setRemainingSeconds(payload.remaining_seconds)
        }
      }
      setErrorMessage(error instanceof Error ? error.message : '회의 실행화 요청에 실패했습니다.')
      void refreshActionizerStatus().catch(() => undefined)
    } finally {
      setIsAnalyzing(false)
      setIsSubmitting(false)
    }
  }

  async function handleApplySelected() {
    if (isAnalyzing) return
    if (draftApplyStatus === 'success') return
    if (!result) return
    if (!requestedBy) {
      setErrorMessage('현재 사용자 프로필을 확인할 수 없어 draft를 추가할 수 없습니다.')
      return
    }
    if (!isLeader) {
      setErrorMessage('선택한 draft 적용은 팀 리더만 가능합니다.')
      return
    }

    const selectedTasks = result.task_drafts.filter((task) => selectedTaskIds.includes(task.client_draft_id))
    const selectedEvents = result.calendar_event_drafts.filter((event) =>
      selectedEventIds.includes(event.client_draft_id),
    )

    if (selectedTasks.length === 0 && selectedEvents.length === 0) {
      setErrorMessage('추가할 Task 또는 일정 draft를 선택해 주세요.')
      return
    }

    setDraftApplyStatus('submitting')
    setErrorMessage('')
    setSuccessMessage('')

    try {
      let createdTaskCount = 0
      let createdTodoCount = 0
      let createdEventCount = 0

      if (selectedTasks.length > 0) {
        const existingTasks = await fetchTeamTasksWorkspace(teamId)
        const nextPosition =
          existingTasks.length === 0
            ? 0
            : Math.max(...existingTasks.map((task: TeamTaskWithTodos) => task.position)) + 1

        const taskCreates: WorkspaceTaskCreateInput[] = selectedTasks.map((task, index) => ({
          clientId: task.client_draft_id,
          teamId,
          title: task.title,
          description: task.description ?? '',
          priority: task.priority,
          assigneeId: task.assignee_id,
          dueDate: task.due_date,
          createdBy: requestedBy,
          position: nextPosition + index,
          status: 'todo',
        }))

        const todoCreates: WorkspaceTodoCreateInput[] = selectedTasks.flatMap((task) =>
          task.todos.map((todo) => ({
            clientId: `${task.client_draft_id}-todo-${todo.position}`,
            taskId: task.client_draft_id,
            content: todo.content,
            createdBy: requestedBy,
            position: todo.position,
            isDone: false,
          })),
        )

        const saved = await saveWorkspaceChanges({
          taskCreates,
          taskUpdates: [],
          taskDeletes: [],
          todoCreates,
          todoUpdates: [],
          todoDeletes: [],
        })

        createdTaskCount = saved.createdTasks.length
        createdTodoCount = saved.createdTodos.length
      }

      if (selectedEvents.length > 0) {
        const createdEvents = await Promise.all(
          selectedEvents.map((event) =>
            createCalendarEvent({
              teamId,
              createdBy: requestedBy,
              values: {
                title: event.title,
                description: event.description,
                type: event.type,
                event_date: event.event_date,
                is_all_day: event.is_all_day,
                start_time: event.is_all_day ? null : event.start_time,
                end_time: event.is_all_day ? null : event.end_time,
              },
            }),
          ),
        )
        createdEventCount = createdEvents.length
      }

      setSelectedTaskIds([])
      setSelectedEventIds([])
      setDraftApplyStatus('success')
      setSuccessMessage(
        `선택한 draft를 추가했습니다. Task ${createdTaskCount}개, Todo ${createdTodoCount}개, 일정 ${createdEventCount}개가 반영되었습니다.`,
      )
    } catch (error) {
      setDraftApplyStatus('idle')
      setErrorMessage(error instanceof Error ? error.message : '선택한 draft를 추가하지 못했습니다.')
    }
  }

  function toggleSelection(
    current: string[],
    value: string,
    setter: (next: string[]) => void,
  ) {
    if (isAnalyzing || draftApplyStatus === 'success') return
    setter(current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  return (
    <div className="relative space-y-4">
      {(isAnalyzing || isDbRunning) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 px-4 py-8 backdrop-blur-[3px]">
          <div className="w-full max-w-md rounded-3xl border border-brand-100 bg-white px-6 py-6 text-center shadow-xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-brand-100 border-t-brand-500 animate-spin" />
            <p className="mt-4 font-medium text-campus-900">회의 내용을 분석하고 있습니다...</p>
            <p className="mt-2 text-sm leading-6 text-campus-600">
              task / todo / 일정 초안을 생성하는 중입니다. 완료될 때까지 잠시만 기다려 주세요.
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          'space-y-4 transition-opacity',
          (isAnalyzing || isDbRunning) && 'pointer-events-none select-none opacity-60',
        )}
        aria-busy={isAnalyzing || isDbRunning}
      >
      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="font-display text-2xl text-campus-900">회의 실행화</h2>
          <p className="text-sm text-campus-600">
            회의 파일은 브라우저 로컬에서 텍스트만 추출하고, 서버에는 텍스트만 전송합니다.
          </p>
          <p className="text-xs text-campus-500">팀별 실행 제한: 1시간에 1회</p>
        </div>

        <form className="space-y-4" onSubmit={ime.createSubmitHandler(handleSubmit)} noValidate>
          <fieldset disabled={isAnalyzing || isDbRunning} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>회의 제목</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onCompositionStart={ime.handleCompositionStart}
                onCompositionEnd={ime.handleCompositionEnd}
                onKeyDown={ime.preventEnterWhileComposing()}
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                placeholder="예: 주간 회의"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>회의 날짜</span>
              <input
                type="date"
                value={meetingDate}
                onChange={(event) => setMeetingDate(event.target.value)}
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </label>
          </div>

          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>참여자 이름</span>
            <textarea
              value={participantInput}
              onChange={(event) => setParticipantInput(event.target.value)}
              onCompositionStart={ime.handleCompositionStart}
              onCompositionEnd={ime.handleCompositionEnd}
              onKeyDown={ime.preventEnterWhileComposing()}
              rows={2}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              placeholder={participantPlaceholder || '쉼표 또는 줄바꿈으로 참여자 이름을 입력해 주세요.'}
            />
          </label>

          <div className="space-y-2">
            <label className="text-sm font-medium text-campus-700">텍스트 파일 불러오기</label>
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={handleFileChange}
              className="block w-full rounded-2xl border border-dashed border-campus-300 bg-campus-50 px-4 py-3 text-sm text-campus-700"
            />
            {sourceFileName && <p className="text-xs text-campus-500">불러온 파일: {sourceFileName}</p>}
          </div>

          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>회의 텍스트</span>
            <textarea
              value={rawMeetingText}
              onChange={(event) => setRawMeetingText(event.target.value)}
              onCompositionStart={ime.handleCompositionStart}
              onCompositionEnd={ime.handleCompositionEnd}
              onKeyDown={ime.preventEnterWhileComposing()}
              rows={14}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              placeholder="회의 전문 텍스트를 붙여넣거나 위에서 텍스트 파일을 불러와 주세요."
            />
          </label>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm whitespace-pre-wrap text-rose-600">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}
          {isDbRunning && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
              회의 분석이 진행 중입니다. 완료될 때까지 다시 요청할 수 없습니다.
            </div>
          )}
          {remainingSeconds > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              다시 실행까지 {Math.ceil(remainingSeconds / 60)}분 남았습니다.
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              onMouseDown={ime.preventBlurOnMouseDown}
              disabled={isSubmitting || isActionizerBlocked || remainingSeconds > 0}
            >
              {isSubmitting ? '분석 중...' : '분석하기'}
            </Button>
          </div>
          </fieldset>
        </form>
      </Card>

      {result && result.suspicious_injection_detected && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            회의 텍스트에 분석을 방해하는 문구가 포함되어 일부 내용이 제외되었을 수 있습니다.
          </p>
        </Card>
      )}

      {result && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <h3 className="font-display text-xl text-campus-900">회의 요약</h3>
            <p className="whitespace-pre-wrap text-sm leading-6 text-campus-800">{result.summary}</p>
          </Card>

          <Card className="space-y-3">
            <h3 className="font-display text-xl text-campus-900">핵심 결정사항</h3>
            {result.decisions.length === 0 ? (
              <p className="text-sm text-campus-600">추출된 결정사항이 없습니다.</p>
            ) : (
              <ul className="space-y-2 text-sm text-campus-800">
                {result.decisions.map((decision, index) => (
                  <li key={`${decision}-${index}`} className="rounded-2xl bg-campus-50 px-4 py-3">
                    {decision}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-campus-900">추천 Task draft 목록</h3>
              <p className="text-xs text-campus-500">
                선택 {selectedTaskIds.length} / {result.task_drafts.length}
              </p>
            </div>
            {result.task_drafts.length === 0 ? (
              <p className="text-sm text-campus-600">추천된 Task draft가 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {result.task_drafts.map((task) => (
                  <Card key={task.client_draft_id} className="space-y-4 p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <TaskMetaBadge
                            tone={task.status === 'done' ? 'accent' : task.status === 'in_progress' ? 'brand' : 'neutral'}
                          >
                            {taskStatusLabel(task.status)}
                          </TaskMetaBadge>
                          <TaskMetaBadge
                            tone={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'}
                          >
                            우선순위 {priorityLabel(task.priority)}
                          </TaskMetaBadge>
                          <TaskMetaBadge tone="neutral">마감 {formatDueDate(task.due_date)}</TaskMetaBadge>
                          <TaskMetaBadge tone="neutral">Todo 0/{task.todos.length}</TaskMetaBadge>
                        </div>

                        <div>
                          <h4 className="font-display text-2xl text-campus-900">{task.title}</h4>
                          <p className="mt-2 text-sm leading-6 text-campus-600">
                            {task.description || '설명이 아직 없습니다. 간단한 목적이나 결과물을 적어두면 팀원들이 맥락을 빨리 파악할 수 있습니다.'}
                          </p>
                        </div>
                      </div>

                      <div className="grid min-w-full gap-3 rounded-3xl border border-campus-200 bg-campus-50 p-4 xl:min-w-[320px]">
                        <label className="flex items-center gap-2 text-sm font-medium text-campus-700">
                          <input
                            type="checkbox"
                            checked={selectedTaskIds.includes(task.client_draft_id)}
                            disabled={draftApplyStatus === 'success'}
                            onChange={() =>
                              toggleSelection(selectedTaskIds, task.client_draft_id, setSelectedTaskIds)
                            }
                          />
                          이 Task 추가
                        </label>
                        <AssigneeMeta task={task} membersById={membersById} />
                        <p className="text-sm text-campus-700">
                          생성자 <span className="font-medium text-campus-900">{toDisplayName(task.created_by, membersById)}</span>
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-campus-500">
                            <span>Todo 진행률</span>
                            <span>0%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white">
                            <div
                              className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-400"
                              style={{ width: '0%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-campus-200 bg-campus-50 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-campus-500">
                        <span>Task 내부 Todo List</span>
                        <span className="h-1 w-1 rounded-full bg-campus-200" />
                        <span>
                          {task.todos.length === 0
                            ? '체크리스트가 아직 없습니다.'
                            : `${task.todos.length}개의 추천 Todo가 준비되었습니다.`}
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-[1.35fr,0.85fr]">
                      <div className="space-y-3">
                        {task.todos.length === 0 ? (
                          <div className="rounded-3xl border border-dashed border-campus-200 bg-campus-50 px-4 py-5 text-sm text-campus-500">
                            아직 추천된 Todo가 없습니다.
                          </div>
                        ) : (
                          task.todos.map((todo) => (
                            <label
                              key={`${task.client_draft_id}-${todo.position}`}
                              className="flex items-start gap-3 rounded-3xl border border-campus-200 bg-white px-4 py-3"
                            >
                              <span className="mt-1 inline-flex h-4 w-4 rounded-full border border-rose-300 bg-rose-100" />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-rose-700">{todo.content}</p>
                                <p className="mt-1 text-xs text-campus-500">추가 예정 순서 {todo.position + 1}</p>
                              </div>
                            </label>
                          ))
                        )}
                      </div>

                      <div className="rounded-3xl border border-campus-200 bg-campus-50 p-4">
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-semibold text-campus-900">적용 안내</p>
                            <p className="mt-1 text-xs leading-5 text-campus-500">
                              선택 후 추가하면 이 Task와 하위 Todo가 실제 업무 탭 데이터로 저장됩니다.
                            </p>
                          </div>
                          <div className="rounded-2xl border border-campus-200 bg-white px-4 py-4 text-sm text-campus-500">
                            `assignee_id`가 비어 있으면 담당자는 미지정 상태로 저장되고, 추천 이름은 이번 단계에서 별도 매핑하지 않습니다.
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-campus-900">추천 일정 draft 목록</h3>
              <p className="text-xs text-campus-500">
                선택 {selectedEventIds.length} / {result.calendar_event_drafts.length}
              </p>
            </div>
            {result.calendar_event_drafts.length === 0 ? (
              <p className="text-sm text-campus-600">추천된 일정 draft가 없습니다.</p>
            ) : (
              <div className="space-y-5">
                {result.calendar_event_drafts.map((event) => (
                  <div key={event.client_draft_id} className="space-y-3">
                    <div className="flex justify-end">
                      <label className="flex items-center gap-2 text-sm text-campus-700">
                          <input
                            type="checkbox"
                            checked={selectedEventIds.includes(event.client_draft_id)}
                            disabled={draftApplyStatus === 'success'}
                            onChange={() =>
                              toggleSelection(selectedEventIds, event.client_draft_id, setSelectedEventIds)
                            }
                        />
                        이 일정 추가
                      </label>
                    </div>

                    <CalendarEventCard
                      event={buildDraftCalendarRecord(event)}
                      isLeader={false}
                      onEdit={() => undefined}
                    />

                    <div className="grid gap-4 rounded-3xl border border-campus-200 bg-campus-50 p-4 md:grid-cols-4">
                      <label className="space-y-2 text-sm font-medium text-campus-700">
                        <span>날짜</span>
                        <input
                          type="date"
                          value={event.event_date}
                          onChange={(e) =>
                            updateEventDraft(event.client_draft_id, (current) => ({
                              ...current,
                              event_date: e.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium text-campus-700">
                        <span>시작 시간</span>
                        <input
                          type="time"
                          value={event.start_time?.slice(0, 5) ?? ''}
                          disabled={event.is_all_day}
                          onChange={(e) =>
                            updateEventDraft(event.client_draft_id, (current) => ({
                              ...current,
                              start_time: e.target.value ? `${e.target.value}:00` : null,
                            }))
                          }
                          className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 disabled:opacity-60"
                        />
                      </label>

                      <label className="space-y-2 text-sm font-medium text-campus-700">
                        <span>종료 시간</span>
                        <input
                          type="time"
                          value={event.end_time?.slice(0, 5) ?? ''}
                          disabled={event.is_all_day}
                          onChange={(e) =>
                            updateEventDraft(event.client_draft_id, (current) => ({
                              ...current,
                              end_time: e.target.value ? `${e.target.value}:00` : null,
                            }))
                          }
                          className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 disabled:opacity-60"
                        />
                      </label>

                      <label className="flex items-center gap-2 text-sm font-medium text-campus-700 md:self-end md:pb-3">
                        <input
                          type="checkbox"
                          checked={event.is_all_day}
                          onChange={(e) =>
                            updateEventDraft(event.client_draft_id, (current) => ({
                              ...current,
                              is_all_day: e.target.checked,
                              start_time: e.target.checked ? null : current.start_time,
                              end_time: e.target.checked ? null : current.end_time,
                            }))
                          }
                        />
                        종일 일정
                      </label>
                    </div>

                    <p className="text-xs text-campus-500">
                      적용 전 날짜와 시간을 분리해서 수정할 수 있습니다. 현재 표시: {formatEventTime(event)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl text-campus-900">선택한 draft 추가</h3>
                <p className="text-sm text-campus-600">
                  선택한 Task, Todo, 추천 일정을 실제 업무/일정 데이터에 반영합니다.
                </p>
              </div>
              {draftApplyStatus === 'success' ? (
                <Button type="button" onClick={onOpenTasks}>
                  업무 탭으로 이동하기
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleApplySelected()}
                  disabled={draftApplyStatus === 'submitting' || !isLeader}
                >
                  {draftApplyStatus === 'submitting' ? '업무 반영 중...' : 'draft 추가하기'}
                </Button>
              )}
            </div>
            {!isLeader && (
              <p className="text-sm text-campus-500">초안 적용은 팀 리더만 실행할 수 있습니다.</p>
            )}
            {draftApplyStatus === 'success' && (
              <p className="text-sm text-campus-600">
                선택한 업무가 추가되었습니다. 다음 단계로 업무 탭에서 실제 상태를 확인할 수 있습니다.
              </p>
            )}
          </Card>
        </div>
      )}
      </div>
    </div>
  )
}
