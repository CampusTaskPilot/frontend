import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { useId, type MouseEvent as ReactMouseEvent } from 'react'
import { Card } from '../../../components/ui/Card'
import { useImeSafeSubmit } from '../../../hooks/useImeSafeSubmit'
import { cn } from '../../../lib/cn'
import { supabase } from '../../../lib/supabase'
import {
  AiTaskGenerationApiError,
  fetchAiTaskGenerationStatus,
  startAiTaskGeneration,
} from '../lib/aiTaskGeneration'
import {
  AiTaskAssignmentApiError,
  fetchAiTaskAssignmentStatus,
  startAiTaskAssignment,
} from '../lib/aiTaskAssignment'
import {
  AiTodoGenerationApiError,
  fetchAiTodoGenerationStatus,
  fetchAiTodoGenerationStatuses,
  startAiTodoGeneration,
} from '../lib/aiTaskTodoGeneration'
import {
  fetchTaskWorkspace,
  fetchTeamTasksWorkspace,
  saveWorkspaceChanges,
  type WorkspaceTaskCreateInput,
  type WorkspaceTaskUpdateInput,
  type WorkspaceTodoCreateInput,
  type WorkspaceTodoUpdateInput,
} from '../lib/taskWorkspace'
import type {
  AiTaskAssignmentStatus,
  AiTodoGenerationStatus,
  AiTaskGenerationStatus,
  TeamMemberWithProfile,
  TeamMemberRole,
  TeamTaskPriority,
  TeamTaskStatus,
  TeamTaskWithTodos,
  TeamTodoRecord,
} from '../types/team'

interface TeamTasksTabProps {
  teamId: string
  currentUserId: string | null
  currentUserRole: TeamMemberRole | null
  members: TeamMemberWithProfile[]
}

type TaskViewKey = 'active' | 'completed'
type TaskSortKey = 'priority' | 'due_date' | 'recent'
type SaveTrigger = 'manual' | 'debounce' | 'unmount' | 'visibilitychange'

interface PendingWorkspaceChanges {
  taskCreates: Record<string, WorkspaceTaskCreateInput>
  taskUpdates: Record<string, WorkspaceTaskUpdateInput>
  taskDeletes: string[]
  todoCreates: Record<string, WorkspaceTodoCreateInput>
  todoUpdates: Record<string, WorkspaceTodoUpdateInput>
  todoDeletes: string[]
}

interface TodoDeleteIntent {
  taskId: string
  todoIds: string[]
  title: string
  description: string
  confirmLabel: string
}

interface TaskDeleteIntent {
  taskIds: string[]
  title: string
  description: string
  confirmLabel: string
}

interface TaskWorkspaceDraftSnapshot {
  draftTasks: TeamTaskWithTodos[]
  pendingChanges: PendingWorkspaceChanges
}

const emptyPendingChanges = (): PendingWorkspaceChanges => ({
  taskCreates: {},
  taskUpdates: {},
  taskDeletes: [],
  todoCreates: {},
  todoUpdates: {},
  todoDeletes: [],
})

const priorityWeight: Record<TeamTaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function formatDateLabel(value: string | null) {
  if (!value) return '미정'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '미정'
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatDateTimeLabel(value: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0)
  const minutes = Math.floor(safeSeconds / 60)
  const seconds = safeSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
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

function displayMemberName(member: TeamMemberWithProfile | null) {
  if (!member) return '미지정'
  return member.profile?.full_name || member.profile?.email || member.user_id
}

function progressMeta(todos: TeamTodoRecord[]) {
  const total = todos.length
  const completed = todos.filter((todo) => todo.is_done).length
  const ratio = total > 0 ? Math.round((completed / total) * 100) : 0
  return { total, completed, ratio }
}

function isDueToday(value: string | null) {
  if (!value) return false
  const due = new Date(value)
  if (Number.isNaN(due.getTime())) return false
  const now = new Date()
  return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth() && due.getDate() === now.getDate()
}

function isActiveTask(status: TeamTaskStatus) {
  return status === 'todo' || status === 'in_progress'
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

const stableGhostButtonClass = 'hover:bg-white active:bg-white'
const stableSubtleButtonClass = 'hover:bg-brand-50 active:bg-brand-50'
const autosaveDelayMs = 1800
const aiTodoRefreshRetryDelayMs = 700
const aiTodoRefreshRetryCount = 4
const bodyScrollLockCountKey = 'taskpilotBodyScrollLockCount'
const bodyScrollOverflowKey = 'taskpilotBodyScrollOverflow'
let modalLayerSequence = 0
const openModalLayers: number[] = []

function lockBodyScroll() {
  const currentCount = Number(document.body.dataset[bodyScrollLockCountKey] ?? '0')

  if (currentCount === 0) {
    document.body.dataset[bodyScrollOverflowKey] = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }

  document.body.dataset[bodyScrollLockCountKey] = String(currentCount + 1)
}

function unlockBodyScroll() {
  const currentCount = Number(document.body.dataset[bodyScrollLockCountKey] ?? '0')

  if (currentCount <= 1) {
    document.body.style.overflow = document.body.dataset[bodyScrollOverflowKey] ?? ''
    delete document.body.dataset[bodyScrollLockCountKey]
    delete document.body.dataset[bodyScrollOverflowKey]
    return
  }

  document.body.dataset[bodyScrollLockCountKey] = String(currentCount - 1)
}

function registerModalLayer() {
  modalLayerSequence += 1
  openModalLayers.push(modalLayerSequence)
  return modalLayerSequence
}

function unregisterModalLayer(layerId: number) {
  const nextIndex = openModalLayers.lastIndexOf(layerId)
  if (nextIndex >= 0) {
    openModalLayers.splice(nextIndex, 1)
  }
}

function isTopModalLayer(layerId: number) {
  return openModalLayers[openModalLayers.length - 1] === layerId
}

function EmptyTaskState({
  isLeader,
  isCompletedView,
  onCreate,
  onRecommend,
  recommendDisabled = false,
  recommendLabel = 'AI Task 자동 생성',
}: {
  isLeader: boolean
  isCompletedView: boolean
  onCreate: () => void
  onRecommend: () => void
  recommendDisabled?: boolean
  recommendLabel?: string
}) {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-campus-50 via-white to-brand-50">
      <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
        <div className="space-y-3">
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-inset ring-brand-100">
            {isCompletedView ? 'Completed Tasks' : 'Task Workspace'}
          </span>
          <h3 className="font-display text-2xl text-campus-900">
            {isCompletedView ? '아직 완료된 Task가 없습니다.' : '팀 업무 흐름을 첫 Task부터 정리해보세요.'}
          </h3>
          <p className="max-w-2xl text-sm leading-6 text-campus-600">
            {isCompletedView
              ? '업무를 완료 처리하면 이 탭에 모여서 기록처럼 확인할 수 있습니다.'
              : '큰 업무(Task)를 만들고 그 안에 Todo를 쌓아두면 역할 분담, 진행률, 마감 일정이 한 화면에서 정리됩니다.'}
          </p>
          {!isCompletedView && isLeader && (
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={onCreate}>
                Task 생성
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onRecommend}
                disabled={recommendDisabled}
                className={stableGhostButtonClass}
                title={recommendLabel}
                aria-label={recommendLabel}
              >
                {recommendLabel}
              </Button>
            </div>
          )}
          {!isCompletedView && !isLeader && (
            <div className="rounded-2xl border border-campus-200 bg-white/80 px-4 py-3 text-sm text-campus-600">
              관리자가 Task를 만들고 담당자를 지정하면 여기에서 Todo를 읽고 진행할 수 있습니다.
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-3xl border border-campus-200 bg-white/90 p-4">
            <p className="text-xs text-campus-500">Task 구조</p>
            <p className="mt-2 font-medium text-campus-900">기획서 초안 작성</p>
            <p className="mt-1 text-xs text-campus-500">Task 안에 Todo 체크리스트가 함께 관리됩니다.</p>
          </div>
          <div className="rounded-3xl border border-campus-200 bg-white/90 p-4">
            <p className="text-xs text-campus-500">AI 보조</p>
            <p className="mt-2 font-medium text-campus-900">추천과 자동 배분은 보조 역할</p>
            <p className="mt-1 text-xs text-campus-500">핵심은 팀이 직접 관리하고, AI는 정리를 도와주는 방향입니다.</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

function createClientId(prefix: 'task' | 'todo') {
  return `${prefix}-draft-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`
}

function hasPendingChanges(pending: PendingWorkspaceChanges) {
  return (
    Object.keys(pending.taskCreates).length > 0 ||
    Object.keys(pending.taskUpdates).length > 0 ||
    pending.taskDeletes.length > 0 ||
    Object.keys(pending.todoCreates).length > 0 ||
    Object.keys(pending.todoUpdates).length > 0 ||
    pending.todoDeletes.length > 0
  )
}

function mergeTaskUpdate(
  current: WorkspaceTaskUpdateInput | undefined,
  next: WorkspaceTaskUpdateInput,
): WorkspaceTaskUpdateInput {
  return { ...current, ...next, taskId: next.taskId }
}

function mergeTodoUpdate(
  current: WorkspaceTodoUpdateInput | undefined,
  next: WorkspaceTodoUpdateInput,
): WorkspaceTodoUpdateInput {
  return { ...current, ...next, todoId: next.todoId }
}

function ModalFrame({
  open,
  title,
  description,
  children,
  onClose,
  closeOnBackdrop = false,
  closeOnEscape = true,
}: {
  open: boolean
  title: string
  description: string
  children: ReactNode
  onClose: () => void
  closeOnBackdrop?: boolean
  closeOnEscape?: boolean
}) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const layerIdRef = useRef<number | null>(null)

  useEffect(() => {
    if (!open) return

    const layerId = registerModalLayer()
    layerIdRef.current = layerId
    lockBodyScroll()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopModalLayer(layerId)) {
        return
      }

      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      unregisterModalLayer(layerId)
      layerIdRef.current = null
      unlockBodyScroll()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [closeOnEscape, onClose, open])

  if (!open) {
    return null
  }

  const handleBackdropClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!closeOnBackdrop || event.target !== event.currentTarget) {
      return
    }

    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-campus-900/55 px-4 py-6 backdrop-blur-sm"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-2xl"
      >
        <Card className="max-h-[90vh] overflow-y-auto rounded-[2rem] border border-campus-200 p-0 shadow-2xl">
          <div className="border-b border-campus-200 px-6 py-5 sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-2">
                <h3 id={titleId} className="font-display text-2xl text-campus-900">
                  {title}
                </h3>
                <p id={descriptionId} className="text-sm leading-6 text-campus-600">
                  {description}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClose}
                aria-label="모달 닫기"
                className="shrink-0 whitespace-nowrap px-3"
              >
                닫기
              </Button>
            </div>
          </div>
          {children}
        </Card>
      </div>
    </div>
  )
}

export function TeamTasksTab({ teamId, currentUserId, currentUserRole, members }: TeamTasksTabProps) {
  const ime = useImeSafeSubmit()
  const [serverTasks, setServerTasks] = useState<TeamTaskWithTodos[]>([])
  const [draftTasks, setDraftTasks] = useState<TeamTaskWithTodos[]>([])
  const [pendingChanges, setPendingChanges] = useState<PendingWorkspaceChanges>(() => emptyPendingChanges())
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingChanges, setIsSavingChanges] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [activeView, setActiveView] = useState<TaskViewKey>('active')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sortBy, setSortBy] = useState<TaskSortKey>('priority')
  const [showMineOnly, setShowMineOnly] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskPriority, setTaskPriority] = useState<TeamTaskPriority>('medium')
  const [taskAssigneeId, setTaskAssigneeId] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskStatus, setTaskStatus] = useState<TeamTaskStatus>('todo')
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [isDeletingTask, setIsDeletingTask] = useState(false)
  const [todoDeleteIntent, setTodoDeleteIntent] = useState<TodoDeleteIntent | null>(null)
  const [taskDeleteIntent, setTaskDeleteIntent] = useState<TaskDeleteIntent | null>(null)
  const [taskSelectionMode, setTaskSelectionMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [todoSelectionTaskIds, setTodoSelectionTaskIds] = useState<Record<string, boolean>>({})
  const [selectedTodoIdsByTask, setSelectedTodoIdsByTask] = useState<Record<string, string[]>>({})
  const [todoDrafts, setTodoDrafts] = useState<Record<string, string>>({})
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({})
  const [aiNotice, setAiNotice] = useState('')
  const [aiGenerationStatus, setAiGenerationStatus] = useState<AiTaskGenerationStatus | null>(null)
  const [isAiGenerationStarting, setIsAiGenerationStarting] = useState(false)
  const [aiAssignmentStatus, setAiAssignmentStatus] = useState<AiTaskAssignmentStatus | null>(null)
  const [isAiAssignmentStarting, setIsAiAssignmentStarting] = useState(false)
  const [aiTodoStatuses, setAiTodoStatuses] = useState<Record<string, AiTodoGenerationStatus>>({})
  const [aiTodoStartingTaskId, setAiTodoStartingTaskId] = useState('')
  const activeAiGenerationLogIdRef = useRef('')
  const activeAiAssignmentJobIdRef = useRef('')
  const activeAiTodoJobIdsRef = useRef<Record<string, string>>({})
  const loadedAiTodoStatusTaskIdsRef = useRef<Set<string>>(new Set())
  const pendingChangesRef = useRef<PendingWorkspaceChanges>(emptyPendingChanges())
  const draftTasksRef = useRef<TeamTaskWithTodos[]>([])
  const serverTasksRef = useRef<TeamTaskWithTodos[]>([])
  const isSavingRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const restoredWorkspaceDraftRef = useRef(false)

  const membersById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member] as const)),
    [members],
  )
  const isLeader = currentUserRole === 'leader'
  const canManageTaskStatusByRole = currentUserRole === 'leader' || currentUserRole === 'admin'
  const workspaceDraftStorageKey = useMemo(() => `team-workspace-draft:${teamId}`, [teamId])
  const isEditing = editingTaskId.length > 0
  const isTaskModalOpen = showCreateForm
  const aiGenerationJobStatus = aiGenerationStatus?.latest_log?.status ?? null
  const isAiGenerating = aiGenerationJobStatus === 'pending' || aiGenerationJobStatus === 'running'
  const isAiCooldownActive =
    !isAiGenerating && (aiGenerationStatus?.cooldown_remaining_seconds ?? 0) > 0
  const aiTaskGenerationDisabled =
    !isLeader || !currentUserId || isAiGenerationStarting || isAiGenerating || isAiCooldownActive
  const aiAssignmentStatusValue = aiAssignmentStatus?.status ?? 'idle'
  const isAiAssigning = aiAssignmentStatusValue === 'pending' || aiAssignmentStatusValue === 'running'
  const isAiAssignmentCooldownActive =
    aiAssignmentStatusValue === 'cooldown' && (aiAssignmentStatus?.remaining_seconds ?? 0) > 0
  const aiTaskAssignmentDisabled =
    !isLeader || !currentUserId || isAiAssignmentStarting || isAiAssigning || isAiAssignmentCooldownActive
  const aiTaskButtonLabel = isAiGenerating
    ? 'AI가 추가중...'
    : isAiCooldownActive
      ? `다시 생성까지 ${formatCountdown(aiGenerationStatus?.cooldown_remaining_seconds ?? 0)}`
      : 'AI Task 자동 생성'
  const aiAssignmentButtonLabel = isAiAssigning
    ? 'AI가 업무를 배분중입니다...'
    : isAiAssignmentCooldownActive
      ? `다시 배분까지 ${formatCountdown(aiAssignmentStatus?.remaining_seconds ?? 0)}`
      : 'AI 업무 자동 배분'
  const aiTaskHelpMessage = isAiGenerating
    ? 'AI가 Task를 추가중입니다... 기존 작업은 계속 진행할 수 있어요.'
    : aiGenerationStatus?.latest_log?.status === 'failed'
        ? aiGenerationStatus.latest_log.error_message || 'AI Task 생성에 실패했어요.'
        : aiNotice

  const aiAssignmentHelpMessage = isAiAssigning
    ? 'AI가 업무를 배분중입니다... 기존 작업은 계속 진행할 수 있어요.'
    : isAiAssignmentCooldownActive
      ? `다시 배분까지 ${formatCountdown(aiAssignmentStatus?.remaining_seconds ?? 0)}`
      : aiAssignmentStatus?.latest_log?.status === 'failed'
        ? aiAssignmentStatus.latest_log.error_message || 'AI 업무 자동 배분에 실패했습니다.'
        : aiAssignmentStatus?.latest_log?.status === 'completed'
          ? aiAssignmentStatus.latest_log.assigned_count > 0
            ? `AI가 ${aiAssignmentStatus.latest_log.assigned_count}개의 Task 담당자를 배정했어요.`
            : '배정 가능한 Task를 검토했지만 업데이트할 담당자가 없었어요.'
          : ''

  const displayAssigneeName = useCallback((task: TeamTaskWithTodos) => {
    if (!task.assignee_id) return '미지정'
    const matchedMember = membersById.get(task.assignee_id) ?? null
    return (
      task.assignee?.full_name ||
      task.assignee?.email ||
      displayMemberName(matchedMember) ||
      '미지정'
    )
  }, [membersById])

  const canManageTodos = useCallback(
    (task: TeamTaskWithTodos) =>
      Boolean(currentUserId) && (isLeader || task.assignee_id === currentUserId),
    [currentUserId, isLeader],
  )

  const canChangeTaskStatus = useCallback(
    (task: TeamTaskWithTodos) =>
      Boolean(currentUserId) &&
      (task.assignee_id === currentUserId || canManageTaskStatusByRole),
    [canManageTaskStatusByRole, currentUserId],
  )

  useEffect(() => {
    pendingChangesRef.current = pendingChanges
  }, [pendingChanges])

  useEffect(() => {
    draftTasksRef.current = draftTasks
  }, [draftTasks])

  useEffect(() => {
    serverTasksRef.current = serverTasks
  }, [serverTasks])

  const isDirty = hasPendingChanges(pendingChanges)
  const tasks = draftTasks

  const clearWorkspaceDraftSnapshot = useCallback(() => {
    sessionStorage.removeItem(workspaceDraftStorageKey)
  }, [workspaceDraftStorageKey])

  const persistWorkspaceDraftSnapshot = useCallback(
    (snapshot?: TaskWorkspaceDraftSnapshot) => {
      const nextSnapshot = snapshot ?? {
        draftTasks: draftTasksRef.current,
        pendingChanges: pendingChangesRef.current,
      }

      if (!hasPendingChanges(nextSnapshot.pendingChanges)) {
        clearWorkspaceDraftSnapshot()
        return
      }

      sessionStorage.setItem(workspaceDraftStorageKey, JSON.stringify(nextSnapshot))
    },
    [clearWorkspaceDraftSnapshot, workspaceDraftStorageKey],
  )

  const loadWorkspaceDraftSnapshot = useCallback((): TaskWorkspaceDraftSnapshot | null => {
    const raw = sessionStorage.getItem(workspaceDraftStorageKey)
    if (!raw) {
      return null
    }

    try {
      const parsed = JSON.parse(raw) as Partial<TaskWorkspaceDraftSnapshot>
      if (!parsed || !Array.isArray(parsed.draftTasks) || !parsed.pendingChanges) {
        clearWorkspaceDraftSnapshot()
        return null
      }

      const normalizedPendingChanges: PendingWorkspaceChanges = {
        taskCreates: parsed.pendingChanges.taskCreates ?? {},
        taskUpdates: parsed.pendingChanges.taskUpdates ?? {},
        taskDeletes: parsed.pendingChanges.taskDeletes ?? [],
        todoCreates: parsed.pendingChanges.todoCreates ?? {},
        todoUpdates: parsed.pendingChanges.todoUpdates ?? {},
        todoDeletes: parsed.pendingChanges.todoDeletes ?? [],
      }

      if (!hasPendingChanges(normalizedPendingChanges)) {
        clearWorkspaceDraftSnapshot()
        return null
      }

      return {
        draftTasks: parsed.draftTasks as TeamTaskWithTodos[],
        pendingChanges: normalizedPendingChanges,
      }
    } catch {
      clearWorkspaceDraftSnapshot()
      return null
    }
  }, [clearWorkspaceDraftSnapshot, workspaceDraftStorageKey])

  const buildAssigneeProfile = useCallback(
    (assigneeId: string | null) => membersById.get(assigneeId ?? '')?.profile ?? null,
    [membersById],
  )

  const ensureExpandedTasks = useCallback((nextTasks: TeamTaskWithTodos[]) => {
    setExpandedTasks((current) => {
      const next = { ...current }
      nextTasks.forEach((task) => {
        if (!(task.id in next)) {
          next[task.id] = false
        }
      })
      return next
    })
  }, [])

  const queuePendingChanges = useCallback(
    (updater: (current: PendingWorkspaceChanges) => PendingWorkspaceChanges) => {
      setPendingChanges((current) => {
        const next = updater(current)
        pendingChangesRef.current = next
        persistWorkspaceDraftSnapshot({
          draftTasks: draftTasksRef.current,
          pendingChanges: next,
        })
        return next
      })
    },
    [persistWorkspaceDraftSnapshot],
  )

  const applyDraftTasks = useCallback(
    (updater: (current: TeamTaskWithTodos[]) => TeamTaskWithTodos[]) => {
      setDraftTasks((current) => {
        const next = updater(current)
        draftTasksRef.current = next
        ensureExpandedTasks(next)
        return next
      })
    },
    [ensureExpandedTasks],
  )

  const replaceTaskInList = useCallback((taskList: TeamTaskWithTodos[], nextTask: TeamTaskWithTodos) => {
    const exists = taskList.some((task) => task.id === nextTask.id)
    const merged = exists
      ? taskList.map((task) => (task.id === nextTask.id ? nextTask : task))
      : [...taskList, nextTask]

    return [...merged].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status.localeCompare(b.status)
      }
      if (a.position !== b.position) {
        return a.position - b.position
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [])

  const mergeTaskSnapshotIntoDraft = useCallback((freshTask: TeamTaskWithTodos) => {
    setServerTasks((current) => replaceTaskInList(current, freshTask))
    setDraftTasks((current) => {
      const pending = pendingChangesRef.current
      const nextTasks = current.map((task) => {
        if (task.id !== freshTask.id) {
          return task
        }

        const hasPendingTaskFields = Boolean(pending.taskCreates[task.id] || pending.taskUpdates[task.id])
        const currentTodoIds = new Set(task.todos.map((todo) => todo.id))
        const nextTodos = freshTask.todos.map((freshTodo) => {
          const existingTodo = task.todos.find((todo) => todo.id === freshTodo.id)
          if (!existingTodo) {
            return freshTodo
          }

          const hasPendingTodoFields = Boolean(pending.todoCreates[freshTodo.id] || pending.todoUpdates[freshTodo.id])
          return hasPendingTodoFields ? existingTodo : freshTodo
        })

        task.todos.forEach((todo) => {
          if (!currentTodoIds.has(todo.id)) {
            return
          }
          if (!freshTask.todos.some((freshTodo) => freshTodo.id === todo.id)) {
            nextTodos.push(todo)
          }
        })

        const mergedTask = hasPendingTaskFields
          ? {
              ...freshTask,
              title: task.title,
              description: task.description,
              priority: task.priority,
              assignee_id: task.assignee_id,
              assignee: task.assignee,
              due_date: task.due_date,
              status: task.status,
              completed_at: task.completed_at,
            }
          : freshTask

        return {
          ...mergedTask,
          todos: [...nextTodos].sort((a, b) => {
            if (a.position !== b.position) {
              return a.position - b.position
            }
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          }),
        }
      })

      ensureExpandedTasks(nextTasks)
      return nextTasks
    })
  }, [ensureExpandedTasks, replaceTaskInList])

  const mergeCreatedTodosIntoTask = useCallback((taskId: string, createdTodos: TeamTodoRecord[]) => {
    if (createdTodos.length === 0) {
      return
    }

    console.log('[AI Todo] mergeCreatedTodosIntoTask', {
      taskId,
      createdTodos,
    })

    const mergeTodos = (taskList: TeamTaskWithTodos[]) =>
      taskList.map((task) => {
        if (task.id !== taskId) {
          return task
        }

        const existingIds = new Set(task.todos.map((todo) => todo.id))
        const nextTodos = [...task.todos]
        createdTodos.forEach((todo) => {
          if (!existingIds.has(todo.id)) {
            nextTodos.push(todo)
          }
        })

        return {
          ...task,
          todos: [...nextTodos].sort((a, b) => {
            if (a.position !== b.position) {
              return a.position - b.position
            }
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          }),
        }
      })

    setServerTasks((current) => mergeTodos(current))
    setDraftTasks((current) => {
      const nextTasks = mergeTodos(current)
      ensureExpandedTasks(nextTasks)
      return nextTasks
    })
  }, [ensureExpandedTasks])

  const refreshTaskFromServerWithRetry = useCallback(async (
    taskId: string,
    options?: { minimumTodoCount?: number },
  ) => {
    for (let attempt = 0; attempt <= aiTodoRefreshRetryCount; attempt += 1) {
      const freshTask = await fetchTaskWorkspace(taskId)
      console.log('[AI Todo] refreshTaskFromServerWithRetry', {
        taskId,
        attempt,
        minimumTodoCount: options?.minimumTodoCount ?? null,
        freshTask,
      })
      if (freshTask) {
        mergeTaskSnapshotIntoDraft(freshTask)
        if (!options?.minimumTodoCount || freshTask.todos.length >= options.minimumTodoCount) {
          return
        }
      }

      if (attempt < aiTodoRefreshRetryCount) {
        await new Promise((resolve) => window.setTimeout(resolve, aiTodoRefreshRetryDelayMs))
      }
    }
  }, [mergeTaskSnapshotIntoDraft])

  const loadTasks = useCallback(async (options?: { silent?: boolean; force?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
    }
    setErrorMessage('')

    try {
      const result = await fetchTeamTasksWorkspace(teamId)
      setServerTasks(result)
      serverTasksRef.current = result
      ensureExpandedTasks(result)
      setDraftTasks((current) => {
        const restoredSnapshot =
          !options?.force && !restoredWorkspaceDraftRef.current ? loadWorkspaceDraftSnapshot() : null

        if (restoredSnapshot) {
          restoredWorkspaceDraftRef.current = true
          pendingChangesRef.current = restoredSnapshot.pendingChanges
          setPendingChanges(restoredSnapshot.pendingChanges)
          draftTasksRef.current = restoredSnapshot.draftTasks
          ensureExpandedTasks(restoredSnapshot.draftTasks)
          setSaveMessage('저장되지 않은 워크스페이스 변경사항을 복구했습니다.')
          return restoredSnapshot.draftTasks
        }

        if (!options?.force && hasPendingChanges(pendingChangesRef.current)) {
          return current
        }
        draftTasksRef.current = result
        return result
      })
      hasLoadedRef.current = true
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '업무 데이터를 불러오지 못했습니다.',
      )
    } finally {
      if (!options?.silent) {
        setIsLoading(false)
      }
    }
  }, [ensureExpandedTasks, loadWorkspaceDraftSnapshot, teamId])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  useEffect(() => {
    loadedAiTodoStatusTaskIdsRef.current = new Set()
    activeAiTodoJobIdsRef.current = {}
    restoredWorkspaceDraftRef.current = false
    setAiTodoStatuses({})
  }, [teamId])

  const flushPendingChanges = useCallback(async (trigger: SaveTrigger = 'manual') => {
    const snapshot = pendingChangesRef.current
    if (!hasPendingChanges(snapshot) || isSavingRef.current) {
      return true
    }

    isSavingRef.current = true
    setIsSavingChanges(true)
    setSaveMessage(trigger === 'manual' ? '변경사항을 저장하는 중입니다...' : '백그라운드에서 저장 중입니다...')
    setErrorMessage('')

    try {
      const result = await saveWorkspaceChanges({
        taskCreates: Object.values(snapshot.taskCreates),
        taskUpdates: Object.values(snapshot.taskUpdates),
        taskDeletes: snapshot.taskDeletes,
        todoCreates: Object.values(snapshot.todoCreates),
        todoUpdates: Object.values(snapshot.todoUpdates),
        todoDeletes: snapshot.todoDeletes,
      })

      const createdTaskMap = new Map(result.createdTasks.map((entry) => [entry.clientId, entry.task] as const))
      const updatedTaskMap = new Map(result.updatedTasks.map((task) => [task.id, task] as const))
      const createdTodoMap = new Map(result.createdTodos.map((entry) => [entry.clientId, entry.todo] as const))
      const updatedTodoMap = new Map(result.updatedTodos.map((todo) => [todo.id, todo] as const))

      let nextServerSnapshot: TeamTaskWithTodos[] = []
      setDraftTasks((current) => {
        const nextTasks = current
          .filter((task) => !result.deletedTaskIds.includes(task.id))
          .map((task) => {
            const createdTask = createdTaskMap.get(task.id)
            const updatedTask = updatedTaskMap.get(task.id)
            const baseTask: TeamTaskWithTodos = createdTask
              ? { ...createdTask, assignee: buildAssigneeProfile(createdTask.assignee_id), todos: task.todos }
              : updatedTask
                ? { ...task, ...updatedTask, assignee: buildAssigneeProfile(updatedTask.assignee_id) }
                : task

            const nextTodos = baseTask.todos.map((todo) => {
              const createdTodo = createdTodoMap.get(todo.id)
              if (createdTodo) {
                return createdTodo
              }

              const updatedTodo = updatedTodoMap.get(todo.id)
              return updatedTodo ? { ...todo, ...updatedTodo } : todo
            })

            return {
              ...baseTask,
              todos: nextTodos
                .filter((todo) => !result.deletedTodoIds.includes(todo.id))
                .sort((a, b) => a.position - b.position),
            }
          })

        nextServerSnapshot = nextTasks
        draftTasksRef.current = nextTasks
        ensureExpandedTasks(nextTasks)
        return nextTasks
      })
      setServerTasks(nextServerSnapshot)
      serverTasksRef.current = nextServerSnapshot

      const cleared = emptyPendingChanges()
      pendingChangesRef.current = cleared
      setPendingChanges(cleared)
      clearWorkspaceDraftSnapshot()
      setSaveMessage('모든 변경사항이 저장되었습니다.')
      return true
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '변경사항을 저장하지 못했습니다.')
      setSaveMessage('')
      return false
    } finally {
      isSavingRef.current = false
      setIsSavingChanges(false)
    }
  }, [buildAssigneeProfile, clearWorkspaceDraftSnapshot, ensureExpandedTasks])

  useEffect(() => {
    if (!isDirty || isSavingChanges) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void flushPendingChanges('debounce')
    }, autosaveDelayMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [flushPendingChanges, isDirty, isSavingChanges])

  useEffect(() => {
    if (!isDirty && !isSavingChanges) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      persistWorkspaceDraftSnapshot()
      void flushPendingChanges('unmount')
      event.preventDefault()
      event.returnValue = ''
    }

    const handlePageHide = () => {
      persistWorkspaceDraftSnapshot()
      void flushPendingChanges('unmount')
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistWorkspaceDraftSnapshot()
        void flushPendingChanges('visibilitychange')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handlePageHide)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handlePageHide)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [flushPendingChanges, isDirty, isSavingChanges, persistWorkspaceDraftSnapshot])

  useEffect(() => {
    return () => {
      if (hasPendingChanges(pendingChangesRef.current)) {
        persistWorkspaceDraftSnapshot()
        void flushPendingChanges('unmount')
      }
    }
  }, [flushPendingChanges, persistWorkspaceDraftSnapshot])

  const syncAiGenerationStatus = useCallback((nextStatus: AiTaskGenerationStatus) => {
    setAiGenerationStatus(nextStatus)
    const latestLog = nextStatus.latest_log
    if (latestLog && (latestLog.status === 'pending' || latestLog.status === 'running')) {
      activeAiGenerationLogIdRef.current = latestLog.id
    }
  }, [])

  const syncAiAssignmentStatus = useCallback((nextStatus: AiTaskAssignmentStatus) => {
    setAiAssignmentStatus(nextStatus)
    if (nextStatus.current_job_id) {
      activeAiAssignmentJobIdRef.current = nextStatus.current_job_id
      return
    }

    const latestLog = nextStatus.latest_log
    if (latestLog && (latestLog.status === 'pending' || latestLog.status === 'running')) {
      activeAiAssignmentJobIdRef.current = latestLog.id
    }
  }, [])

  const syncAiTodoStatus = useCallback((taskId: string, nextStatus: AiTodoGenerationStatus) => {
    console.log('[AI Todo] syncAiTodoStatus', { taskId, nextStatus })
    setAiTodoStatuses((current) => ({ ...current, [taskId]: nextStatus }))
    if (nextStatus.current_job_id) {
      activeAiTodoJobIdsRef.current = { ...activeAiTodoJobIdsRef.current, [taskId]: nextStatus.current_job_id }
      return
    }

    const latestLog = nextStatus.latest_log
    if (latestLog && (latestLog.status === 'pending' || latestLog.status === 'running')) {
      activeAiTodoJobIdsRef.current = { ...activeAiTodoJobIdsRef.current, [taskId]: latestLog.id }
    }
  }, [])

  const mergeAiTodoStatuses = useCallback((incomingStatuses: Record<string, AiTodoGenerationStatus>) => {
    setAiTodoStatuses((current) => {
      const nextStatuses = { ...current }

      Object.entries(incomingStatuses).forEach(([taskId, incomingStatus]) => {
        const currentStatus = current[taskId]
        const hasActiveLocalJob =
          currentStatus &&
          (currentStatus.status === 'pending' || currentStatus.status === 'running') &&
          Boolean(activeAiTodoJobIdsRef.current[taskId])

        const incomingIsOlderOrIdle =
          incomingStatus.status === 'idle' ||
          incomingStatus.status === 'cooldown' ||
          (!incomingStatus.current_job_id &&
            incomingStatus.latest_log?.id !== activeAiTodoJobIdsRef.current[taskId])

        if (hasActiveLocalJob && incomingIsOlderOrIdle) {
          console.log('[AI Todo] ignore stale batch status', {
            taskId,
            currentStatus,
            incomingStatus,
          })
          return
        }

        nextStatuses[taskId] = incomingStatus
      })

      return nextStatuses
    })
  }, [])

  const loadAiStatus = useCallback(async () => {
    try {
      const result = await fetchAiTaskGenerationStatus(teamId)
      syncAiGenerationStatus(result)
    } catch (error) {
      setAiNotice(error instanceof Error ? error.message : 'AI Task 상태를 불러오지 못했습니다.')
    }
  }, [syncAiGenerationStatus, teamId])

  const loadAiAssignmentStatus = useCallback(async () => {
    try {
      const result = await fetchAiTaskAssignmentStatus(teamId)
      syncAiAssignmentStatus(result)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'AI 업무 자동 배분 상태를 불러오지 못했습니다.')
    }
  }, [syncAiAssignmentStatus, teamId])

  const loadAiTodoStatus = useCallback(async (taskId: string) => {
    console.log('[AI Todo] requesting single status', { taskId })
    try {
      const result = await fetchAiTodoGenerationStatus(taskId)
      console.log('[AI Todo] single status payload', { taskId, result })
      syncAiTodoStatus(taskId, result)
    } catch (error) {
      console.error('[AI Todo] single status error', { taskId, error })
      throw error
    }
  }, [syncAiTodoStatus])

  const loadAiTodoStatuses = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) {
      return
    }

    const statuses = await fetchAiTodoGenerationStatuses(teamId, taskIds)
    console.log('[AI Todo] batch status payload', { teamId, taskIds, statuses })
    const nextActiveJobs = { ...activeAiTodoJobIdsRef.current }

    Object.entries(statuses).forEach(([taskId, status]) => {
      if (status.current_job_id) {
        nextActiveJobs[taskId] = status.current_job_id
      } else if (status.latest_log?.status === 'pending' || status.latest_log?.status === 'running') {
        nextActiveJobs[taskId] = status.latest_log.id
      }
    })

    activeAiTodoJobIdsRef.current = nextActiveJobs
    mergeAiTodoStatuses(statuses)
    taskIds.forEach((taskId) => loadedAiTodoStatusTaskIdsRef.current.add(taskId))
  }, [mergeAiTodoStatuses, teamId])

  useEffect(() => {
    void loadAiStatus()
  }, [loadAiStatus])

  useEffect(() => {
    void loadAiAssignmentStatus()
  }, [loadAiAssignmentStatus])

  const persistedTaskIds = useMemo(
    () => tasks.map((task) => task.id).filter((taskId) => !taskId.startsWith('task-draft-')),
    [tasks],
  )

  const persistedTaskIdsKey = useMemo(() => [...persistedTaskIds].sort().join('|'), [persistedTaskIds])
  const runningAiTodoTaskIds = useMemo(
    () =>
      Object.entries(aiTodoStatuses)
        .filter(([, status]) => status.status === 'pending' || status.status === 'running')
        .map(([taskId]) => taskId)
        .sort(),
    [aiTodoStatuses],
  )
  const runningAiTodoTaskIdsKey = useMemo(() => runningAiTodoTaskIds.join('|'), [runningAiTodoTaskIds])

  useEffect(() => {
    if (!isLeader || persistedTaskIds.length === 0) return

    const missingTaskIds = persistedTaskIds.filter(
      (taskId) => !loadedAiTodoStatusTaskIdsRef.current.has(taskId),
    )
    if (missingTaskIds.length === 0) {
      return
    }

    let cancelled = false

    void (async () => {
      try {
        await loadAiTodoStatuses(missingTaskIds)
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : 'AI Todo 상태를 불러오지 못했습니다.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isLeader, loadAiTodoStatuses, persistedTaskIds, persistedTaskIdsKey])

  useEffect(() => {
    if (!isAiGenerating) return

    const interval = window.setInterval(() => {
      void loadAiStatus()
    }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [isAiGenerating, loadAiStatus])

  useEffect(() => {
    if (!isAiAssigning) return

    const interval = window.setInterval(() => {
      void loadAiAssignmentStatus()
    }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [isAiAssigning, loadAiAssignmentStatus])

  useEffect(() => {
    console.log('[AI Todo] polling candidates', {
      runningTaskIds: runningAiTodoTaskIds,
    })

    if (runningAiTodoTaskIds.length === 0) return

    const interval = window.setInterval(() => {
      console.log('[AI Todo] polling tick', { runningTaskIds: runningAiTodoTaskIds })
      void Promise.allSettled(runningAiTodoTaskIds.map((taskId) => loadAiTodoStatus(taskId)))
    }, 3000)

    return () => {
      window.clearInterval(interval)
    }
  }, [loadAiTodoStatus, runningAiTodoTaskIds, runningAiTodoTaskIdsKey])

  useEffect(() => {
    if (!aiGenerationStatus?.cooldown_until) return

    const interval = window.setInterval(() => {
      setAiGenerationStatus((current) => {
        if (!current?.cooldown_until) return current
        const remainingSeconds = Math.max(
          Math.ceil((new Date(current.cooldown_until).getTime() - Date.now()) / 1000),
          0,
        )
        if (remainingSeconds === current.cooldown_remaining_seconds) {
          return current
        }

        return {
          ...current,
          cooldown_remaining_seconds: remainingSeconds,
        }
      })
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [aiGenerationStatus?.cooldown_until])

  useEffect(() => {
    if (!aiAssignmentStatus?.cooldown_until) return

    const interval = window.setInterval(() => {
      setAiAssignmentStatus((current) => {
        if (!current?.cooldown_until) return current
        const remainingSeconds = Math.max(
          Math.ceil((new Date(current.cooldown_until).getTime() - Date.now()) / 1000),
          0,
        )
        const nextStatus =
          current.status === 'pending' || current.status === 'running'
            ? current.status
            : remainingSeconds > 0
              ? 'cooldown'
              : current.latest_log?.status === 'failed'
                ? 'failed'
                : current.latest_log?.status === 'completed'
                  ? 'completed'
                  : 'idle'

        if (remainingSeconds === current.remaining_seconds && nextStatus === current.status) {
          return current
        }

        return {
          ...current,
          status: nextStatus,
          remaining_seconds: remainingSeconds,
        }
      })
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [aiAssignmentStatus?.cooldown_until])

  useEffect(() => {
    const hasCooldown = Object.values(aiTodoStatuses).some((status) => Boolean(status.cooldown_until))
    if (!hasCooldown) return

    const interval = window.setInterval(() => {
      setAiTodoStatuses((current) => {
        let changed = false
        const nextEntries = Object.entries(current).map(([taskId, status]) => {
          if (!status.cooldown_until) return [taskId, status] as const

          const remainingSeconds = Math.max(
            Math.ceil((new Date(status.cooldown_until).getTime() - Date.now()) / 1000),
            0,
          )
          const nextStatus =
            status.status === 'pending' || status.status === 'running'
              ? status.status
              : remainingSeconds > 0
                ? 'cooldown'
                : status.latest_log?.status === 'failed'
                  ? 'failed'
                  : status.latest_log?.status === 'completed'
                    ? 'completed'
                    : 'idle'

          if (remainingSeconds === status.remaining_seconds && nextStatus === status.status) {
            return [taskId, status] as const
          }

          changed = true
          return [
            taskId,
            {
              ...status,
              status: nextStatus,
              remaining_seconds: remainingSeconds,
            },
          ] as const
        })

        if (!changed) return current
        return Object.fromEntries(nextEntries)
      })
    }, 1000)

    return () => {
      window.clearInterval(interval)
    }
  }, [aiTodoStatuses])

  useEffect(() => {
    const latestLog = aiGenerationStatus?.latest_log
    if (!latestLog) return
    if (latestLog.id !== activeAiGenerationLogIdRef.current) return

    if (latestLog.status === 'completed') {
      activeAiGenerationLogIdRef.current = ''
      setAiNotice(
        latestLog.created_count > 0
          ? `AI가 ${latestLog.created_count}개의 Task를 추가했어요.`
          : 'AI가 중복을 제외한 결과를 검토했지만 새로 추가할 Task는 없었어요.',
      )
      void loadTasks({ silent: true })
      return
    }

    if (latestLog.status === 'failed') {
      activeAiGenerationLogIdRef.current = ''
      setErrorMessage(latestLog.error_message || 'AI Task 생성에 실패했습니다.')
    }
  }, [aiGenerationStatus, loadTasks])

  useEffect(() => {
    const latestLog = aiAssignmentStatus?.latest_log
    if (!latestLog) return
    if (latestLog.id !== activeAiAssignmentJobIdRef.current) return

    if (latestLog.status === 'completed') {
      activeAiAssignmentJobIdRef.current = ''
      if (latestLog.assigned_count > 0) {
        void loadTasks({ silent: true })
      }
      return
    }

    if (latestLog.status === 'failed') {
      activeAiAssignmentJobIdRef.current = ''
      setErrorMessage(latestLog.error_message || 'AI 업무 자동 배분에 실패했습니다.')
    }
  }, [aiAssignmentStatus, loadTasks])

  useEffect(() => {
    const finishedTaskIds: string[] = []
    let latestError = ''
    let latestNotice = ''

    Object.entries(aiTodoStatuses).forEach(([taskId, status]) => {
      const latestLog = status.latest_log
      if (!latestLog) return
      if (latestLog.id !== activeAiTodoJobIdsRef.current[taskId]) return

      if (latestLog.status === 'completed') {
        console.log('[AI Todo] completed status detected', {
          taskId,
          status,
          currentTask: tasks.find((task) => task.id === taskId) ?? null,
        })
        finishedTaskIds.push(taskId)
        if (latestLog.created_count > 0) {
          if (status.created_todos.length > 0) {
            mergeCreatedTodosIntoTask(taskId, status.created_todos)
          }
          latestNotice = `AI가 "${tasks.find((task) => task.id === taskId)?.title ?? '선택한 Task'}"에 ${latestLog.created_count}개의 Todo를 추가했어요.`
        } else {
          latestNotice = 'AI가 중복을 제외하고 검토했지만 새로 추가할 Todo가 없었어요.'
        }
      }

      if (latestLog.status === 'failed') {
        finishedTaskIds.push(taskId)
        latestError = latestLog.error_message || 'AI Todo 생성에 실패했습니다.'
      }
    })

    if (finishedTaskIds.length === 0) return

    const nextActiveJobs = { ...activeAiTodoJobIdsRef.current }
    finishedTaskIds.forEach((taskId) => {
      delete nextActiveJobs[taskId]
    })
    activeAiTodoJobIdsRef.current = nextActiveJobs

    if (latestNotice) {
      setAiNotice(latestNotice)
    }
    if (latestError) {
      setErrorMessage(latestError)
    }
    const completedTasks = finishedTaskIds
      .map((taskId) => ({
        taskId,
        createdCount: aiTodoStatuses[taskId]?.latest_log?.created_count ?? 0,
      }))
      .filter((item) => item.createdCount > 0)
    if (completedTasks.length > 0) {
      if (!hasPendingChanges(pendingChangesRef.current) && !isSavingRef.current) {
        void loadTasks({ silent: true, force: true })
      } else {
        void Promise.allSettled(
          completedTasks.map(({ taskId, createdCount }) => {
            const currentTodoCount = tasks.find((task) => task.id === taskId)?.todos.length ?? 0
            return refreshTaskFromServerWithRetry(taskId, {
              minimumTodoCount: currentTodoCount + createdCount,
            })
          }),
        )
      }
    }
  }, [aiTodoStatuses, loadTasks, mergeCreatedTodosIntoTask, refreshTaskFromServerWithRetry, tasks])

  useEffect(() => {
    const scheduleSilentReload = () => {
      if (hasPendingChanges(pendingChangesRef.current) || isSavingRef.current || !hasLoadedRef.current) {
        return
      }
      void loadTasks({ silent: true })
    }

    const syncTaskFromTodoChange = (payload: { new?: { task_id?: string }; old?: { task_id?: string } }) => {
      const taskId = payload.new?.task_id ?? payload.old?.task_id
      if (!taskId) {
        return
      }
      void refreshTaskFromServerWithRetry(taskId)
    }

    const tasksChannel = supabase
      .channel(`team-workspace-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `team_id=eq.${teamId}`,
        },
        scheduleSilentReload,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
        },
        syncTaskFromTodoChange,
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(tasksChannel)
    }
  }, [loadTasks, refreshTaskFromServerWithRetry, teamId])

  const summary = useMemo(() => {
    const activeTasks = tasks.filter((task) => isActiveTask(task.status))
    const completedTasks = tasks.filter((task) => task.status === 'done')
    const dueToday = tasks.filter((task) => isDueToday(task.due_date)).length
    const assignedToMe = currentUserId
      ? activeTasks.filter((task) => task.assignee_id === currentUserId).length
      : 0

    return [
      { label: '진행 중 Task', value: isLoading ? '...' : `${activeTasks.length}`, description: '현재 실행 중인 업무' },
      { label: '완료된 Task', value: isLoading ? '...' : `${completedTasks.length}`, description: '기록으로 남겨진 완료 업무' },
      { label: '오늘 마감', value: isLoading ? '...' : `${dueToday}`, description: '오늘 확인이 필요한 일정' },
      { label: '내 할당 업무', value: isLoading ? '...' : `${assignedToMe}`, description: '내가 맡은 active task' },
    ]
  }, [currentUserId, isLoading, tasks])

  const visibleTasks = useMemo(() => {
    const filtered = tasks
      .filter((task) => (activeView === 'active' ? task.status !== 'done' : task.status === 'done'))
      .filter((task) => (!showMineOnly || !currentUserId ? true : task.assignee_id === currentUserId))
      .filter((task) => {
        const keyword = searchKeyword.trim().toLowerCase()
        if (!keyword) return true
        const assigneeName = displayAssigneeName(task).toLowerCase()
        return (
          task.title.toLowerCase().includes(keyword) ||
          (task.description ?? '').toLowerCase().includes(keyword) ||
          assigneeName.includes(keyword)
        )
      })

    return [...filtered].sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }

      if (sortBy === 'due_date') {
        const aValue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER
        const bValue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER
        return aValue - bValue
      }

      const priorityGap = priorityWeight[a.priority] - priorityWeight[b.priority]
      if (priorityGap !== 0) return priorityGap
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    })
  }, [activeView, currentUserId, displayAssigneeName, searchKeyword, showMineOnly, sortBy, tasks])

  async function handleCreateTask() {
    if (!isLeader) {
      setErrorMessage('Task 생성은 팀 관리자만 할 수 있습니다.')
      return
    }

    if (!currentUserId) {
      setErrorMessage('로그인한 사용자 정보가 없어 Task를 생성할 수 없습니다.')
      return
    }

    const trimmedTitle = taskTitle.trim()
    if (!trimmedTitle) {
      setErrorMessage('Task 제목을 입력해주세요.')
      return
    }

    if (trimmedTitle.length > 15) {
      setErrorMessage('Task 제목은 15글자 이내로 입력해주세요.')
      return
    }

    if (taskDescription.trim().length > 100) {
      setErrorMessage('Task 설명은 100글자 이내로 입력해주세요.')
      return
    }

    setIsCreatingTask(true)
    setErrorMessage('')

    try {
      const dueDateIso = taskDueDate ? new Date(`${taskDueDate}T23:59:00`).toISOString() : null
      const nextAssigneeId = taskAssigneeId || null

      if (isEditing) {
        applyDraftTasks((current) =>
          current.map((task) =>
            task.id === editingTaskId
              ? {
                  ...task,
                  title: trimmedTitle,
                  description: taskDescription.trim() || null,
                  priority: taskPriority,
                  assignee_id: nextAssigneeId,
                  assignee: buildAssigneeProfile(nextAssigneeId),
                  due_date: dueDateIso,
                  status: taskStatus,
                  completed_at: taskStatus === 'done' ? task.completed_at ?? new Date().toISOString() : null,
                }
              : task,
          ),
        )

        queuePendingChanges((current) => {
          if (current.taskCreates[editingTaskId]) {
            return {
              ...current,
              taskCreates: {
                ...current.taskCreates,
                [editingTaskId]: {
                  ...current.taskCreates[editingTaskId],
                  title: trimmedTitle,
                  description: taskDescription,
                  priority: taskPriority,
                  assigneeId: nextAssigneeId,
                  dueDate: dueDateIso,
                  status: taskStatus,
                },
              },
            }
          }

          return {
            ...current,
            taskUpdates: {
              ...current.taskUpdates,
              [editingTaskId]: mergeTaskUpdate(current.taskUpdates[editingTaskId], {
                taskId: editingTaskId,
                title: trimmedTitle,
                description: taskDescription,
                priority: taskPriority,
                assigneeId: nextAssigneeId,
                dueDate: dueDateIso,
                status: taskStatus,
              }),
            },
          }
        })
      } else {
        const nextPosition = tasks.length > 0 ? Math.max(...tasks.map((task) => task.position)) + 1 : 0
        const clientId = createClientId('task')
        const now = new Date().toISOString()
        const nextTask: TeamTaskWithTodos = {
          id: clientId,
          team_id: teamId,
          title: trimmedTitle,
          description: taskDescription.trim() || null,
          status: taskStatus,
          priority: taskPriority,
          assignee_id: nextAssigneeId,
          assignee: buildAssigneeProfile(nextAssigneeId),
          created_by: currentUserId,
          due_date: dueDateIso,
          completed_at: taskStatus === 'done' ? now : null,
          position: nextPosition,
          created_at: now,
          updated_at: now,
          todos: [],
        }

        applyDraftTasks((current) => replaceTaskInList(current, nextTask))
        queuePendingChanges((current) => ({
          ...current,
          taskCreates: {
            ...current.taskCreates,
            [clientId]: {
              clientId,
              teamId,
              title: trimmedTitle,
              description: taskDescription,
              priority: taskPriority,
              assigneeId: nextAssigneeId,
              dueDate: dueDateIso,
              createdBy: currentUserId,
              position: nextPosition,
              status: taskStatus,
            },
          },
        }))
      }

      resetTaskForm()
      setSaveMessage('변경사항이 로컬에 반영되었습니다. 잠시 후 자동 저장됩니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : isEditing ? 'Task를 수정하지 못했습니다.' : 'Task를 생성하지 못했습니다.')
    } finally {
      setIsCreatingTask(false)
    }
  }

  function handleStartEdit(task: TeamTaskWithTodos) {
    if (!isLeader) return
    setEditingTaskId(task.id)
    setTaskTitle(task.title)
    setTaskDescription(task.description ?? '')
    setTaskPriority(task.priority)
    setTaskAssigneeId(task.assignee_id ?? '')
    setTaskDueDate(task.due_date ? new Date(task.due_date).toISOString().slice(0, 10) : '')
    setTaskStatus(task.status)
    setShowCreateForm(true)
    setErrorMessage('')
  }

  function closeTaskModal() {
    if (isCreatingTask || isDeletingTask) {
      return
    }

    resetTaskForm()
  }

  function toggleTaskSelection(taskId: string, checked: boolean) {
    setSelectedTaskIds((current) =>
      checked ? [...new Set([...current, taskId])] : current.filter((id) => id !== taskId),
    )
  }

  function toggleTodoSelectionMode(taskId: string) {
    const isActive = todoSelectionTaskIds[taskId] ?? false
    setTodoSelectionTaskIds((current) => ({ ...current, [taskId]: !isActive }))
    if (isActive) {
      setSelectedTodoIdsByTask((current) => {
        const next = { ...current }
        delete next[taskId]
        return next
      })
    }
  }

  function toggleTodoSelection(taskId: string, todoId: string, checked: boolean) {
    setSelectedTodoIdsByTask((current) => {
      const selectedIds = current[taskId] ?? []
      return {
        ...current,
        [taskId]: checked
          ? [...new Set([...selectedIds, todoId])]
          : selectedIds.filter((id) => id !== todoId),
      }
    })
  }

  function resetTaskForm() {
    setEditingTaskId('')
    setTaskTitle('')
    setTaskDescription('')
    setTaskPriority('medium')
    setTaskAssigneeId('')
    setTaskDueDate('')
    setTaskStatus('todo')
    setShowCreateForm(false)
  }

  function applyTaskDelete(taskIds: string[]) {
    applyDraftTasks((current) => current.filter((task) => !taskIds.includes(task.id)))
    queuePendingChanges((current) => {
      const nextTaskCreates = { ...current.taskCreates }
      const nextTaskUpdates = { ...current.taskUpdates }
      const nextTodoCreates = { ...current.todoCreates }
      const nextTodoUpdates = { ...current.todoUpdates }
      const nextTodoDeletes = [...current.todoDeletes]

      taskIds.forEach((taskId) => {
        const taskToDelete = tasks.find((task) => task.id === taskId) ?? null

        delete nextTaskCreates[taskId]
        delete nextTaskUpdates[taskId]

        Object.entries(nextTodoCreates).forEach(([todoId, todo]) => {
          if (todo.taskId === taskId) {
            delete nextTodoCreates[todoId]
          }
        })

        taskToDelete?.todos.forEach((todo) => {
          delete nextTodoUpdates[todo.id]
          if (!current.todoCreates[todo.id]) {
            nextTodoDeletes.push(todo.id)
          }
        })
      })

      return {
        taskCreates: nextTaskCreates,
        taskUpdates: nextTaskUpdates,
        taskDeletes: [
          ...new Set([
            ...current.taskDeletes,
            ...taskIds.filter((taskId) => !current.taskCreates[taskId]),
          ]),
        ],
        todoCreates: nextTodoCreates,
        todoUpdates: nextTodoUpdates,
        todoDeletes: [...new Set(nextTodoDeletes)],
      }
    })
  }

  function handleDeleteTaskRequest(taskIds: string[]) {
    if (!isLeader || taskIds.length === 0) {
      return
    }

    const taskLabels = tasks
      .filter((task) => taskIds.includes(task.id))
      .map((task) => task.title)
      .slice(0, 2)
    const extraCount = Math.max(taskIds.length - taskLabels.length, 0)
    const titlePreview =
      taskLabels.length > 0
        ? `${taskLabels.join(', ')}${extraCount > 0 ? ` 외 ${extraCount}개` : ''}`
        : `${taskIds.length}개 Task`

    setTaskDeleteIntent({
      taskIds,
      title: taskIds.length === 1 ? '이 Task를 삭제할까요?' : '선택한 Task를 한 번에 삭제할까요?',
      description: `${titlePreview}가 보드에서 제거됩니다.`,
      confirmLabel: taskIds.length === 1 ? 'Task 삭제' : `${taskIds.length}개 Task 삭제`,
    })
  }

  async function handleConfirmTaskDelete() {
    const intent = taskDeleteIntent
    if (!isLeader || !intent || intent.taskIds.length === 0) {
      return
    }

    setIsDeletingTask(true)
    setErrorMessage('')

    try {
      applyTaskDelete(intent.taskIds)
      setSelectedTaskIds([])
      setTaskSelectionMode(false)
      setTaskDeleteIntent(null)
      if (editingTaskId && intent.taskIds.includes(editingTaskId)) {
        resetTaskForm()
      }
      setSaveMessage(
        intent.taskIds.length === 1
          ? 'Task 삭제가 로컬에 반영되었습니다. 저장 시 서버에도 반영됩니다.'
          : `${intent.taskIds.length}개의 Task 삭제가 로컬에 반영되었습니다.`,
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Task를 삭제하지 못했습니다.')
    } finally {
      setIsDeletingTask(false)
    }
  }

  async function handleAssigneeChange(taskId: string, assigneeId: string) {
    if (!isLeader) {
      setErrorMessage('담당자 수정은 팀 관리자만 할 수 있습니다.')
      return
    }

    setErrorMessage('')

    try {
      const nextAssigneeId = assigneeId || null
      applyDraftTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                assignee_id: nextAssigneeId,
                assignee: buildAssigneeProfile(nextAssigneeId),
              }
            : task,
        ),
      )
      queuePendingChanges((current) => {
        if (current.taskCreates[taskId]) {
          return {
            ...current,
            taskCreates: {
              ...current.taskCreates,
              [taskId]: {
                ...current.taskCreates[taskId],
                assigneeId: nextAssigneeId,
              },
            },
          }
        }

        return {
          ...current,
          taskUpdates: {
            ...current.taskUpdates,
            [taskId]: mergeTaskUpdate(current.taskUpdates[taskId], {
              taskId,
              assigneeId: nextAssigneeId,
            }),
          },
        }
      })
      setSaveMessage('담당자 변경이 로컬에 반영되었습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '담당자를 변경하지 못했습니다.')
    }
  }

  async function handleTodoCreate(taskId: string) {
    const targetTask = tasks.find((task) => task.id === taskId)
    if (!targetTask) return

    if (!canManageTodos(targetTask)) {
      setErrorMessage('Todo 추가는 이 Task의 담당자만 할 수 있습니다.')
      return
    }

    if (!currentUserId) {
      setErrorMessage('로그인한 사용자 정보가 없어 Todo를 추가할 수 없습니다.')
      return
    }

    const content = (todoDrafts[taskId] ?? '').trim()
    if (!content) return

    setErrorMessage('')

    try {
      const nextPosition =
        targetTask.todos.length > 0 ? Math.max(...targetTask.todos.map((todo) => todo.position)) + 1 : 0
      const clientId = createClientId('todo')
      const now = new Date().toISOString()
      const nextTodo: TeamTodoRecord = {
        id: clientId,
        task_id: taskId,
        content,
        is_done: false,
        position: nextPosition,
        created_by: currentUserId,
        created_at: now,
        updated_at: now,
      }

      applyDraftTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                todos: [...task.todos, nextTodo].sort((a, b) => a.position - b.position),
              }
            : task,
        ),
      )
      queuePendingChanges((current) => ({
        ...current,
        todoCreates: {
          ...current.todoCreates,
          [clientId]: {
            clientId,
            taskId,
            content,
            createdBy: currentUserId,
            position: nextPosition,
            isDone: false,
          },
        },
      }))

      setTodoDrafts((current) => ({ ...current, [taskId]: '' }))
      setSaveMessage('Todo가 로컬에 추가되었습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Todo를 추가하지 못했습니다.')
    }
  }

  async function handleTodoToggle(todoId: string, nextValue: boolean) {
    const ownerTask = tasks.find((task) => task.todos.some((todo) => todo.id === todoId))
    if (!ownerTask || !canManageTodos(ownerTask)) {
      setErrorMessage('Todo 체크는 이 Task의 담당자만 할 수 있습니다.')
      return
    }

    setErrorMessage('')

    try {
      applyDraftTasks((current) =>
        current.map((task) =>
          task.id === ownerTask.id
            ? {
                ...task,
                todos: task.todos.map((todo) =>
                  todo.id === todoId
                    ? {
                        ...todo,
                        is_done: nextValue,
                      }
                    : todo,
                ),
              }
            : task,
        ),
      )
      queuePendingChanges((current) => {
        if (current.todoCreates[todoId]) {
          return {
            ...current,
            todoCreates: {
              ...current.todoCreates,
              [todoId]: {
                ...current.todoCreates[todoId],
                isDone: nextValue,
              },
            },
          }
        }

        return {
          ...current,
          todoUpdates: {
            ...current.todoUpdates,
            [todoId]: mergeTodoUpdate(current.todoUpdates[todoId], {
              todoId,
              isDone: nextValue,
            }),
          },
        }
      })
      setSaveMessage('Todo 상태가 로컬에 반영되었습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Todo 상태를 바꾸지 못했습니다.')
    }
  }

  function handleTodoDeleteRequest(task: TeamTaskWithTodos, todo: TeamTodoRecord) {
    if (!canManageTodos(task)) {
      setErrorMessage('Todo 삭제는 이 Task의 담당자만 할 수 있습니다.')
      return
    }

    setTodoDeleteIntent({
      taskId: task.id,
      todoIds: [todo.id],
      title: '이 Todo를 삭제할까요?',
      description: `"${todo.content}" 항목이 체크리스트에서 제거됩니다. 삭제된 Todo는 복구되지 않습니다.`,
      confirmLabel: 'Todo 삭제',
    })
  }

  function handleSelectedTodosDeleteRequest(task: TeamTaskWithTodos) {
    if (!canManageTodos(task)) {
      setErrorMessage('Todo 선택 삭제는 이 Task의 담당자만 할 수 있습니다.')
      return
    }

    const selectedTodoIds = selectedTodoIdsByTask[task.id] ?? []
    if (selectedTodoIds.length === 0) {
      return
    }

    setTodoDeleteIntent({
      taskId: task.id,
      todoIds: selectedTodoIds,
      title: '선택한 Todo를 삭제할까요?',
      description: `${selectedTodoIds.length}개의 Todo가 체크리스트에서 제거됩니다. 잘못 만든 항목을 한 번에 정리할 때 쓰는 삭제입니다.`,
      confirmLabel: `${selectedTodoIds.length}개 삭제`,
    })
  }

  async function handleConfirmTodoDelete() {
    const intent = todoDeleteIntent
    if (!intent) {
      return
    }

    const ownerTask = tasks.find((task) => task.id === intent.taskId)
    if (!ownerTask || !canManageTodos(ownerTask)) {
      setTodoDeleteIntent(null)
      setErrorMessage('Todo 삭제는 이 Task의 담당자만 할 수 있습니다.')
      return
    }

    setErrorMessage('')

    try {
      const deleteTargetIds = new Set(intent.todoIds)
      const deletedCount = intent.todoIds.length

      applyDraftTasks((current) =>
        current.map((task) =>
          task.id === ownerTask.id
            ? {
                ...task,
                todos: task.todos.filter((todo) => !deleteTargetIds.has(todo.id)),
              }
            : task,
        ),
      )
      queuePendingChanges((current) => {
        const nextTodoCreates = { ...current.todoCreates }
        const nextTodoUpdates = { ...current.todoUpdates }
        const nextTodoDeletes = [...current.todoDeletes]

        intent.todoIds.forEach((todoId) => {
          if (current.todoCreates[todoId]) {
            delete nextTodoCreates[todoId]
          } else {
            nextTodoDeletes.push(todoId)
          }

          delete nextTodoUpdates[todoId]
        })

        return {
          ...current,
          todoCreates: nextTodoCreates,
          todoUpdates: nextTodoUpdates,
          todoDeletes: [...new Set(nextTodoDeletes)],
        }
      })

      setSelectedTodoIdsByTask((current) => {
        const next = { ...current }
        delete next[ownerTask.id]
        return next
      })
      setTodoSelectionTaskIds((current) => ({ ...current, [ownerTask.id]: false }))
      setTodoDeleteIntent(null)
      setSaveMessage(
        deletedCount === 1
          ? 'Todo가 로컬에서 제거되었습니다.'
          : `선택한 Todo ${deletedCount}개가 로컬에서 제거되었습니다.`,
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Todo를 삭제하지 못했습니다.')
    }
  }

  async function handleTaskStatusChange(taskId: string, status: TeamTaskStatus) {
    try {
      const latestTask = tasks.find((task) => task.id === taskId)
      if (!latestTask || !canChangeTaskStatus(latestTask)) {
        setErrorMessage('상태 변경은 담당자 또는 팀 관리자만 할 수 있습니다.')
        return
      }

      setErrorMessage('')
      const completedAt = status === 'done' ? latestTask.completed_at ?? new Date().toISOString() : null
      applyDraftTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status,
                completed_at: completedAt,
              }
            : task,
        ),
      )
      queuePendingChanges((current) => {
        if (current.taskCreates[taskId]) {
          return {
            ...current,
            taskCreates: {
              ...current.taskCreates,
              [taskId]: {
                ...current.taskCreates[taskId],
                status,
              },
            },
          }
        }

        return {
          ...current,
          taskUpdates: {
            ...current.taskUpdates,
            [taskId]: mergeTaskUpdate(current.taskUpdates[taskId], {
              taskId,
              status,
            }),
          },
        }
      })
      setSaveMessage('Task 상태가 로컬에 반영되었습니다.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Task 상태를 변경하지 못했습니다.')
    }
  }

  function handleRecommendTasks() {
    if (!isLeader || !currentUserId || aiTaskGenerationDisabled) return

    setIsAiGenerationStarting(true)
    setErrorMessage('')

    void (async () => {
      try {
        const result = await startAiTaskGeneration({
          teamId,
          requesterProfileId: currentUserId,
        })

        activeAiGenerationLogIdRef.current = result.latest_log.id
        setAiNotice('AI가 Task를 추가중입니다... 기존 작업은 계속 진행할 수 있어요.')
        syncAiGenerationStatus({
          can_trigger: false,
          cooldown_minutes: result.cooldown_minutes,
          cooldown_remaining_seconds: Math.max(
            Math.ceil((new Date(result.cooldown_until).getTime() - Date.now()) / 1000),
            0,
          ),
          cooldown_until: result.cooldown_until,
          latest_log: result.latest_log,
          message: result.message,
        })
      } catch (error) {
        if (error instanceof AiTaskGenerationApiError && error.payload) {
          syncAiGenerationStatus({
            can_trigger: error.payload.can_trigger ?? false,
            cooldown_minutes: error.payload.cooldown_minutes ?? 10,
            cooldown_remaining_seconds: error.payload.cooldown_remaining_seconds ?? 0,
            cooldown_until: error.payload.cooldown_until ?? null,
            latest_log: error.payload.latest_log ?? null,
            message: error.payload.message ?? error.message,
          })
        }

        setErrorMessage(error instanceof Error ? error.message : 'AI Task 생성을 시작하지 못했습니다.')
      } finally {
        setIsAiGenerationStarting(false)
      }
    })()
    return
    // TODO: AI task recommendation API가 연결되면 팀 컨텍스트 기준 추천 결과를 받아오도록 연결합니다.
    setAiNotice('AI Task 추천은 아직 연결 전입니다. 이후 팀 목표와 멤버 역할을 바탕으로 초안 Task를 제안하도록 붙일 수 있습니다.')
  }

  function handleRecommendTodos(taskId: string) {
    const targetTask = tasks.find((task) => task.id === taskId)
    const taskStatus = aiTodoStatuses[taskId]
    const isBusy =
      aiTodoStartingTaskId === taskId ||
      taskStatus?.status === 'pending' ||
      taskStatus?.status === 'running' ||
      (taskStatus?.status === 'cooldown' && (taskStatus.remaining_seconds ?? 0) > 0)

    if (!targetTask || !isLeader || !currentUserId || isBusy) return

    void (async () => {
      setAiTodoStartingTaskId(taskId)
      setErrorMessage('')

      try {
        const result = await startAiTodoGeneration({
          taskId,
          requesterProfileId: currentUserId,
        })
        console.log('[AI Todo] start payload', { taskId, result })

        const nextActiveJobIds = { ...activeAiTodoJobIdsRef.current }
        delete nextActiveJobIds[taskId]
        activeAiTodoJobIdsRef.current = nextActiveJobIds

        syncAiTodoStatus(taskId, {
          status: result.status,
          cooldown_until: result.cooldown_until,
          remaining_seconds: result.remaining_seconds,
          error_message: null,
          created_count: result.created_count,
          last_run_at: result.latest_log.started_at,
          current_job_id: null,
          latest_log: result.latest_log,
          created_todos: result.created_todos,
        })

        if (result.created_todos.length > 0) {
          mergeCreatedTodosIntoTask(taskId, result.created_todos)
          setAiNotice(`AI가 "${targetTask.title}"에 ${result.created_todos.length}개의 Todo를 추가했어요.`)
        } else {
          setAiNotice('AI가 중복을 제외하고 검토했지만 새로 추가할 Todo가 없었어요.')
        }
      } catch (error) {
        console.error('[AI Todo] start error payload', { taskId, error })
        const nextActiveJobIds = { ...activeAiTodoJobIdsRef.current }
        delete nextActiveJobIds[taskId]
        activeAiTodoJobIdsRef.current = nextActiveJobIds
        if (error instanceof AiTodoGenerationApiError && error.payload) {
          syncAiTodoStatus(taskId, {
            status: error.payload.status ?? 'failed',
            cooldown_until: error.payload.cooldown_until ?? null,
            remaining_seconds: error.payload.remaining_seconds ?? 0,
            error_message: error.payload.error_message ?? error.message,
            created_count: error.payload.created_count ?? 0,
            last_run_at: error.payload.last_run_at ?? null,
            current_job_id: error.payload.current_job_id ?? null,
            latest_log: error.payload.latest_log ?? null,
            created_todos: error.payload.created_todos ?? [],
          })
        }

        setErrorMessage(error instanceof Error ? error.message : 'AI Todo 생성을 시작하지 못했습니다.')
      } finally {
        setAiTodoStartingTaskId('')
      }
    })()
  }

  function handleRunAiTaskAssignment() {
    if (!isLeader || !currentUserId || aiTaskAssignmentDisabled) return

    void (async () => {
      setIsAiAssignmentStarting(true)
      setErrorMessage('')

      try {
        const result = await startAiTaskAssignment({
          teamId,
          requesterProfileId: currentUserId,
        })

        activeAiAssignmentJobIdRef.current = result.latest_log.id
        syncAiAssignmentStatus({
          status: result.status,
          cooldown_until: result.cooldown_until,
          remaining_seconds: result.remaining_seconds,
          error_message: null,
          assigned_count: result.latest_log.assigned_count,
          last_run_at: result.latest_log.started_at,
          current_job_id: result.latest_log.id,
          latest_log: result.latest_log,
        })
      } catch (error) {
        if (error instanceof AiTaskAssignmentApiError && error.payload) {
          syncAiAssignmentStatus({
            status: error.payload.status ?? 'failed',
            cooldown_until: error.payload.cooldown_until ?? null,
            remaining_seconds: error.payload.remaining_seconds ?? 0,
            error_message: error.payload.error_message ?? error.message,
            assigned_count: error.payload.assigned_count ?? 0,
            last_run_at: error.payload.last_run_at ?? null,
            current_job_id: error.payload.current_job_id ?? null,
            latest_log: error.payload.latest_log ?? null,
          })
        }

        setErrorMessage(error instanceof Error ? error.message : 'AI 업무 자동 배분을 시작하지 못했습니다.')
      } finally {
        setIsAiAssignmentStarting(false)
      }
    })()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card className="overflow-hidden bg-campus-grid">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr),minmax(280px,0.95fr)]">
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-600 ring-1 ring-inset ring-brand-100">
                Team Tasks
              </span>
              <h2 className="font-display text-3xl text-campus-900">업무 흐름을 Task 중심으로<br></br>정리해보세요.</h2>
              <p className="max-w-2xl text-sm leading-6 text-campus-600">
                큰 업무(Task) 안에 Todo를 묶어두고, 담당자와 마감일, 진행률까지 한 번에 확인할 수 있는 팀 협업 보드입니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {summary.map((card) => (
                <div key={card.label} className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs text-campus-500">{card.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-campus-900">{card.value}</p>
                  <p className="mt-1 text-xs text-campus-500">{card.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/90 p-5">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-campus-900">빠른 액션</p>
                <p className="mt-1 text-xs leading-5 text-campus-500">
                  AI는 추천과 배분을 보조하고, 실제 업무 구조는 팀이 직접 관리하는 흐름으로 설계했습니다.
                </p>
              </div>
              {isLeader ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      if (isTaskModalOpen && !isEditing) {
                        closeTaskModal()
                        return
                      }
                      resetTaskForm()
                      setShowCreateForm(true)
                    }}
                  >
                    {isTaskModalOpen && !isEditing ? '생성 폼 닫기' : 'Task 생성'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRecommendTasks}
                    disabled={aiTaskGenerationDisabled}
                    className={stableGhostButtonClass}
                  >
                    {aiTaskButtonLabel}
                  </Button>
                  <Button type="button" variant="subtle" className={stableSubtleButtonClass} onClick={handleRunAiTaskAssignment} disabled={aiTaskAssignmentDisabled}>
                    {aiAssignmentButtonLabel}
                  </Button>
                </div>
              ) : (
                <div className="rounded-3xl border border-campus-200 bg-campus-50 p-4 text-sm text-campus-600">
                  이 영역은 관리자용입니다. Task 생성과 팀 단위 AI 추천은 팀 리더가 관리합니다.
                </div>
              )}
              <div className="rounded-3xl border border-brand-100 bg-brand-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-brand-600">AI PM 보조</p>
                    <p className="mt-1 text-xs leading-5 text-campus-600">
                      추천 Task와 자동 배분은 팀워크를 보조하는 기능입니다.
                    </p>
                  </div>
                  <TaskMetaBadge tone="brand">Beta</TaskMetaBadge>
                </div>
                {aiTaskHelpMessage && (
                  <p className="mt-3 text-xs leading-5 text-campus-700">{aiTaskHelpMessage}</p>
                )}
                {aiAssignmentHelpMessage && (
                  <p className="mt-2 text-xs leading-5 text-campus-700">{aiAssignmentHelpMessage}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {isLeader && (
        <ModalFrame
          open={isTaskModalOpen}
          title={isEditing ? 'Task 수정' : '새 Task 만들기'}
          description={
            isEditing
              ? ''
              : '큰 업무 단위를 먼저 만들고, 세부 Todo는 Task 내부에서 이어서 정리하세요.'
          }
          onClose={closeTaskModal}
          closeOnEscape={!isCreatingTask && !isDeletingTask}
        >
          <form
            className="grid gap-4 px-6 py-6 sm:px-8 lg:grid-cols-2"
            onSubmit={ime.createSubmitHandler(handleCreateTask)}
            noValidate
          >
            <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
              <TaskMetaBadge tone="neutral">{isEditing ? '관리자 수정 모드' : '새 Task 초안'}</TaskMetaBadge>
              <p className="text-xs text-campus-500">
                {isEditing ? 'ESC로 닫을 수 있으며, 저장 중에는 닫을 수 없습니다.' : '생성 후 Todo를 이어서 추가할 수 있습니다.'}
              </p>
            </div>

            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>제목</span>
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value.slice(0, 15))}
                onCompositionStart={ime.handleCompositionStart}
                onCompositionEnd={ime.handleCompositionEnd}
                onKeyDown={ime.preventEnterWhileComposing()}
                maxLength={15}
                placeholder="예: 발표 자료 구조 정리"
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
              <p className="text-xs text-campus-500">{taskTitle.length}/15</p>
            </label>

            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>담당자</span>
              <select
                value={taskAssigneeId}
                onChange={(event) => setTaskAssigneeId(event.target.value)}
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              >
                <option value="">미지정</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {displayMemberName(member)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-campus-700 lg:col-span-2">
              <span>설명</span>
              <textarea
                value={taskDescription}
                onChange={(event) => setTaskDescription(event.target.value.slice(0, 100))}
                onCompositionStart={ime.handleCompositionStart}
                onCompositionEnd={ime.handleCompositionEnd}
                onKeyDown={ime.preventEnterWhileComposing()}
                maxLength={100}
                rows={4}
                placeholder="과제 범위, 기대 결과물, 참고할 내용을 적어두면 팀원이 빠르게 이해할 수 있습니다."
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
              <p className="text-xs text-campus-500">{taskDescription.length}/100</p>
            </label>

            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>우선순위</span>
              <select
                value={taskPriority}
                onChange={(event) => setTaskPriority(event.target.value as TeamTaskPriority)}
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              >
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>마감일</span>
              <input
                type="date"
                value={taskDueDate}
                onChange={(event) => setTaskDueDate(event.target.value)}
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
            </label>

            {isEditing && (
              <label className="space-y-2 text-sm font-medium text-campus-700 lg:col-span-2">
                <span>상태</span>
                <select
                  value={taskStatus}
                  onChange={(event) => setTaskStatus(event.target.value as TeamTaskStatus)}
                  className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                >
                  <option value="todo">시작 전</option>
                  <option value="in_progress">진행 중</option>
                  <option value="done">완료</option>
                </select>
              </label>
            )}

            {errorMessage && isTaskModalOpen && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 lg:col-span-2">
                {errorMessage}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end lg:col-span-2">
              <Button
                type="button"
                variant="ghost"
                className={stableGhostButtonClass}
                onMouseDown={ime.preventBlurOnMouseDown}
                onClick={closeTaskModal}
                disabled={isCreatingTask || isDeletingTask}
              >
                취소
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="ghost"
                  className="border-rose-200 text-rose-600 hover:bg-rose-50 focus-visible:outline-rose-300"
                  onMouseDown={ime.preventBlurOnMouseDown}
                  onClick={() => handleDeleteTaskRequest([editingTaskId])}
                  disabled={isDeletingTask || isCreatingTask}
                >
                  {isDeletingTask ? '삭제 중...' : 'Task 삭제'}
                </Button>
              )}
              <Button type="submit" onMouseDown={ime.preventBlurOnMouseDown} disabled={isCreatingTask}>
                {isCreatingTask ? (isEditing ? '수정 중...' : '생성 중...') : isEditing ? 'Task 수정 저장' : 'Task 생성'}
              </Button>
            </div>
          </form>
        </ModalFrame>
      )}

      <Card className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:justify-between xl:gap-6">
          <div className="xl:self-start">
            <h3 className="font-display text-2xl text-campus-900">업무 보드</h3>
            <p className="mt-1 text-sm text-campus-500">Active와 Completed를 나눠 집중도를 유지하고, 필요한 Task만 빠르게 찾아볼 수 있습니다.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-campus-100 px-3 py-1 text-xs font-medium text-campus-700 ring-1 ring-inset ring-campus-200">
                Active는 진행 중인 업무 중심
              </span>
              <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-100">
                Completed는 완료 기록 보관
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:items-end xl:self-end">
            {isLeader && visibleTasks.length > 0 && (
              <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-campus-200 bg-campus-50/80 px-3 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant={taskSelectionMode ? 'subtle' : 'ghost'}
                  className={taskSelectionMode ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100' : stableGhostButtonClass}
                  onClick={() => {
                    const nextValue = !taskSelectionMode
                    setTaskSelectionMode(nextValue)
                    if (!nextValue) {
                      setSelectedTaskIds([])
                    }
                  }}
                >
                  {taskSelectionMode ? '선택 모드 종료' : 'Task 선택 삭제'}
                </Button>
                {taskSelectionMode && (
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-campus-600 ring-1 ring-inset ring-campus-200">
                    {selectedTaskIds.length === 0 ? '삭제할 Task를 선택하세요' : `${selectedTaskIds.length}개 선택됨`}
                  </span>
                )}
                {taskSelectionMode && selectedTaskIds.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="border-rose-200 text-rose-700 hover:bg-rose-50"
                    onClick={() => handleDeleteTaskRequest(selectedTaskIds)}
                  >
                    선택한 Task 삭제
                  </Button>
                )}
              </div>
            )}
            <div className="inline-flex w-full flex-wrap items-center gap-1 rounded-2xl border border-campus-200 bg-white p-1 shadow-sm xl:w-auto">
              <button
                type="button"
                onClick={() => setActiveView('active')}
                className={cn(
                  'flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition xl:flex-none',
                  activeView === 'active'
                    ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-inset ring-brand-100'
                    : 'text-campus-600 hover:bg-campus-50',
                )}
              >
                Active Tasks
              </button>
              <button
                type="button"
                onClick={() => setActiveView('completed')}
                className={cn(
                  'flex-1 rounded-2xl px-4 py-2.5 text-sm font-semibold transition xl:flex-none',
                  activeView === 'completed'
                    ? 'bg-brand-50 text-brand-700 shadow-sm ring-1 ring-inset ring-brand-100'
                    : 'text-campus-600 hover:bg-campus-50',
                )}
              >
                Completed Tasks
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr),minmax(0,0.8fr),minmax(0,0.8fr),auto,auto]">
          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>검색</span>
            <input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Task 제목, 설명, 담당자 검색"
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>정렬</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as TaskSortKey)}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400"
            >
              <option value="priority">우선순위 순</option>
              <option value="due_date">마감일 순</option>
              <option value="recent">최근 생성 순</option>
            </select>
          </label>

          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>할당 보기</span>
            <button
              type="button"
              onClick={() => setShowMineOnly((current) => !current)}
              className={cn(
                'flex w-full items-center justify-between rounded-2xl border bg-white px-4 py-3 text-sm transition',
                showMineOnly
                  ? 'border-brand-300 text-brand-600'
                  : 'border-campus-200 text-campus-700',
              )}
            >
              <span>{showMineOnly ? '할당된 Task만' : '전체 Task 보기'}</span>
              <span className="text-xs">{showMineOnly ? 'ON' : 'OFF'}</span>
            </button>
          </label>

          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              className={cn('w-full', stableGhostButtonClass)}
              onClick={() => void loadTasks()}
              disabled={isDirty || isSavingChanges}
            >
              새로고침
            </Button>
          </div>

          <div className="flex items-end gap-2">
            <Button
              type="button"
              onClick={() => void flushPendingChanges('manual')}
              disabled={isSavingChanges || !isDirty}
            >
              {isSavingChanges ? '저장 중...' : isDirty ? '지금 저장' : '자동 저장 완료'}
            </Button>
          </div>
        </div>
      </Card>

      {saveMessage && (
        <Card className="border-brand-100 bg-brand-50">
          <p className="text-sm text-brand-700">{saveMessage}</p>
        </Card>
      )}

      {errorMessage && !isTaskModalOpen && !todoDeleteIntent && (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-600">{errorMessage}</p>
        </Card>
      )}

      {isAiGenerating && (
        <Card className="border-brand-100 bg-brand-50">
          <p className="text-sm font-semibold text-brand-700">AI가 Task를 추가중입니다...</p>
          <p className="mt-1 text-sm text-campus-600">기존 작업은 계속 진행할 수 있어요.</p>
        </Card>
      )}

      {isAiAssigning && (
        <Card className="border-brand-100 bg-brand-50">
          <p className="text-sm font-semibold text-brand-700">AI가 업무를 배분중입니다...</p>
          <p className="mt-1 text-sm text-campus-600">기존 작업은 계속 진행할 수 있어요.</p>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <p className="text-sm text-campus-600">업무 탭을 불러오는 중입니다...</p>
        </Card>
      ) : visibleTasks.length === 0 ? (
        <EmptyTaskState
          isLeader={isLeader}
          isCompletedView={activeView === 'completed'}
          onCreate={() => {
            resetTaskForm()
            setShowCreateForm(true)
          }}
          onRecommend={handleRecommendTasks}
          recommendDisabled={aiTaskGenerationDisabled}
          recommendLabel={aiTaskButtonLabel}
        />
      ) : (
        <div className="mx-auto flex max-w-4xl flex-col gap-4">
          {visibleTasks.map((task) => {
            const meta = progressMeta(task.todos)
            const assigneeName = displayAssigneeName(task)
            const isExpanded = expandedTasks[task.id] ?? true
            const todoDraft = todoDrafts[task.id] ?? ''
            const todoPreviewItems = task.todos.slice(0, 3)
            const hiddenTodoCount = Math.max(task.todos.length - todoPreviewItems.length, 0)
            const canEditTodos = canManageTodos(task)
            const canEditStatus = canChangeTaskStatus(task)
            const isTodoSelectionMode = todoSelectionTaskIds[task.id] ?? false
            const selectedTodoIds = selectedTodoIdsByTask[task.id] ?? []
            const isTaskSelected = selectedTaskIds.includes(task.id)
            const aiTodoStatus = aiTodoStatuses[task.id] ?? null
            const aiTodoStatusValue = aiTodoStatus?.status ?? 'idle'
            const isAiTodoGenerating = aiTodoStatusValue === 'pending' || aiTodoStatusValue === 'running'
            const isAiTodoCooldownActive =
              aiTodoStatusValue === 'cooldown' && (aiTodoStatus?.remaining_seconds ?? 0) > 0
            const aiTodoDisabled =
              !isLeader || !currentUserId || aiTodoStartingTaskId === task.id || isAiTodoGenerating || isAiTodoCooldownActive
            const aiTodoButtonLabel = aiTodoStartingTaskId === task.id || isAiTodoGenerating
              ? 'AI가 Todo 생성중...'
              : isAiTodoCooldownActive
                ? `다시 생성까지 ${formatCountdown(aiTodoStatus?.remaining_seconds ?? 0)}`
                : 'AI Todo 생성'
            const aiTodoHelpMessage = isAiTodoGenerating
              ? 'AI가 이 Task의 세부 Todo를 정리하고 있어요.'
              : isAiTodoCooldownActive
                ? `${formatCountdown(aiTodoStatus?.remaining_seconds ?? 0)} 후 다시 생성할 수 있어요.`
                : aiTodoStatus?.latest_log?.status === 'failed'
                  ? aiTodoStatus.latest_log.error_message || 'AI Todo 생성에 실패했습니다.'
                  : aiTodoStatus?.latest_log?.status === 'completed'
                    ? aiTodoStatus.latest_log.created_count > 0
                      ? `최근 실행으로 ${aiTodoStatus.latest_log.created_count}개의 Todo가 추가됐어요.`
                      : '최근 실행에서는 새로 추가할 Todo가 없었어요.'
                    : '관리자만 실행할 수 있으며, 같은 Task에는 5분 쿨타임이 적용됩니다.'

            return (
              <Card
                key={task.id}
                className={cn('space-y-4 p-5', isTaskSelected && 'border-rose-200 ring-1 ring-rose-100')}
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),minmax(280px,320px)] xl:items-start">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {isLeader && taskSelectionMode && (
                        <label className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700">
                          <input
                            type="checkbox"
                            checked={isTaskSelected}
                            onChange={(event) => toggleTaskSelection(task.id, event.target.checked)}
                            className="h-4 w-4 rounded border-rose-300 text-rose-500 focus:ring-rose-200"
                          />
                          선택
                        </label>
                      )}
                      <TaskMetaBadge tone={task.status === 'done' ? 'accent' : task.status === 'in_progress' ? 'brand' : 'neutral'}>
                        {taskStatusLabel(task.status)}
                      </TaskMetaBadge>
                      <TaskMetaBadge tone={task.priority === 'high' ? 'danger' : task.priority === 'medium' ? 'warning' : 'neutral'}>
                        우선순위 {priorityLabel(task.priority)}
                      </TaskMetaBadge>
                      <TaskMetaBadge tone={isDueToday(task.due_date) ? 'danger' : 'neutral'}>
                        마감 {formatDateLabel(task.due_date)}
                      </TaskMetaBadge>
                      <TaskMetaBadge tone="neutral">Todo {meta.completed}/{meta.total}</TaskMetaBadge>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-display text-2xl text-campus-900">{task.title}</h4>
                        {task.completed_at && <span className="text-xs text-campus-500">완료 시각 {formatDateTimeLabel(task.completed_at)}</span>}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-campus-600">
                        {task.description || '설명이 아직 없습니다. 간단한 목적이나 결과물을 적어두면 팀원들이 맥락을 빨리 파악할 수 있습니다.'}
                      </p>
                      {!isExpanded && (
                        <div className="mt-3 rounded-3xl border border-campus-200 bg-campus-50 px-4 py-3 transition-colors hover:border-rose-200/80 hover:bg-rose-50/40">
                          <p className="text-xs font-semibold text-campus-500">Todo 미리보기</p>
                          {todoPreviewItems.length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {todoPreviewItems.map((todo) => (
                                <div
                                  key={todo.id}
                                  className={cn(
                                    'flex items-center gap-2 rounded-2xl px-2.5 py-1.5 text-sm transition-colors',
                                    todo.is_done
                                      ? 'text-campus-700'
                                      : 'border border-rose-200/80 bg-rose-50/80 text-rose-700 hover:border-rose-300/80 hover:bg-rose-100/70',
                                  )}
                                >
                                  <span className={cn('h-2 w-2 rounded-full', todo.is_done ? 'bg-emerald-400' : 'bg-rose-400')} />
                                  <span className={cn('line-clamp-1', !todo.is_done && 'text-rose-700', todo.is_done && 'text-campus-500 line-through')}>
                                    {todo.content}
                                  </span>
                                </div>
                              ))}
                              {hiddenTodoCount > 0 && (
                                <p className="text-xs text-campus-500">+ {hiddenTodoCount}개 더</p>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm text-campus-500">아직 등록된 Todo가 없습니다.</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-3xl border border-campus-200 bg-campus-50 p-4">
                    <div className="grid gap-2 text-sm text-campus-700">
                      {isLeader && (
                        <div className="flex justify-start">
                          <Button type="button" size="sm" variant="ghost" className={stableGhostButtonClass} onClick={() => handleStartEdit(task)}>
                            수정
                          </Button>
                        </div>
                      )}
                      {isLeader ? (
                        <label className="space-y-2 text-sm font-medium text-campus-700">
                          <span>담당자</span>
                          <select
                            value={task.assignee_id ?? ''}
                            onChange={(event) => void handleAssigneeChange(task.id, event.target.value)}
                            disabled={isSavingChanges}
                            className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 disabled:opacity-60"
                          >
                            <option value="">미지정</option>
                            {members.map((member) => (
                              <option key={member.user_id} value={member.user_id}>
                                {displayMemberName(member)}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <p>
                          담당자 <span className="font-medium text-campus-900">{assigneeName}</span>
                        </p>
                      )}
                      <p>
                        생성일 <span className="font-medium text-campus-900">{formatDateLabel(task.created_at)}</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-campus-500">
                        <span>Todo 진행률</span>
                        <span>{meta.ratio}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-all"
                          style={{ width: `${meta.ratio}%` }}
                        />
                      </div>
                    </div>

                    <label className="space-y-2 text-sm font-medium text-campus-700">
                      <span>상태 변경</span>
                      <select
                        value={task.status}
                        onChange={(event) => void handleTaskStatusChange(task.id, event.target.value as TeamTaskStatus)}
                        disabled={isSavingChanges || !canEditStatus}
                        className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200 disabled:opacity-60"
                      >
                        <option value="todo">시작 전</option>
                        <option value="in_progress">진행 중</option>
                        <option value="done">완료</option>
                      </select>
                    </label>
                    {!canEditStatus && (
                      <p className="text-xs text-campus-500">담당자가 지정된 Task는 해당 담당자만 상태를 변경할 수 있습니다.</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-campus-200 bg-campus-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-campus-500">
                    <span>Task 내부 Todo List</span>
                    <span className="h-1 w-1 rounded-full bg-campus-200" />
                    <span>{meta.total === 0 ? '체크리스트를 추가해 세부 작업을 나눠보세요.' : `${meta.completed}개 완료됨`}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="ghost" className={stableGhostButtonClass} onClick={() => setExpandedTasks((current) => ({ ...current, [task.id]: !isExpanded }))}>
                      {isExpanded ? '접기' : 'Todo 펼치기'}
                    </Button>
                    {canEditTodos && task.todos.length > 0 && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className={isTodoSelectionMode ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : stableGhostButtonClass}
                          onClick={() => toggleTodoSelectionMode(task.id)}
                          disabled={isSavingChanges}
                        >
                          {isTodoSelectionMode ? 'Todo 선택 취소' : 'Todo 선택 삭제'}
                        </Button>
                        {isTodoSelectionMode && selectedTodoIds.length > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="border-rose-200 text-rose-700 hover:bg-rose-50"
                            onClick={() => handleSelectedTodosDeleteRequest(task)}
                            disabled={isSavingChanges}
                            aria-label={`선택한 Todo ${selectedTodoIds.length}개 삭제`}
                          >
                            선택한 Todo 삭제
                          </Button>
                        )}
                      </>
                    )}
                    {isLeader ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="subtle"
                        className={stableSubtleButtonClass}
                        onClick={() => handleRecommendTodos(task.id)}
                        disabled={aiTodoDisabled}
                      >
                        {aiTodoButtonLabel}
                      </Button>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-campus-500 ring-1 ring-inset ring-campus-200">
                        AI Todo 생성은 관리자만 가능
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-campus-500">{aiTodoHelpMessage}</p>
                  {isTodoSelectionMode && canEditTodos && (
                    <p className="text-xs text-rose-600">
                      삭제할 Todo만 선택한 뒤 `선택한 Todo 삭제`를 눌러 잘못 만든 항목을 한 번에 지울 수 있습니다.
                    </p>
                  )}
                </div>

                {isExpanded && (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr),minmax(280px,0.8fr)]">
                    <div className="space-y-3">
                      {task.todos.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-campus-200 bg-campus-50 px-4 py-5 text-sm text-campus-500">
                          아직 Todo가 없습니다. 첫 세부 작업을 추가해 Task를 실제 실행 단계로 바꿔보세요.
                        </div>
                      ) : (
                        task.todos.map((todo) => (
                          <div
                            key={todo.id}
                            className="group flex items-start gap-3 rounded-3xl border border-campus-200 bg-white px-4 py-3 transition-colors hover:border-campus-300"
                          >
                            {canEditTodos && isTodoSelectionMode ? (
                              <input
                                type="checkbox"
                                checked={selectedTodoIds.includes(todo.id)}
                                disabled={isSavingChanges}
                                onChange={(event) => toggleTodoSelection(task.id, todo.id, event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-rose-300 text-rose-500 focus:ring-rose-200"
                                aria-label={`${todo.content} 삭제 선택`}
                              />
                            ) : canEditTodos ? (
                              <input
                                type="checkbox"
                                checked={todo.is_done}
                                disabled={isSavingChanges}
                                onChange={(event) => void handleTodoToggle(todo.id, event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-campus-300 text-brand-500 focus:ring-brand-300"
                              />
                            ) : (
                              <span
                                className={cn(
                                  'mt-1 inline-flex h-4 w-4 rounded-full border',
                                  todo.is_done ? 'border-emerald-300 bg-emerald-100' : 'border-rose-300 bg-rose-100',
                                )}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-sm text-campus-800', !todo.is_done && 'text-rose-700', todo.is_done && 'text-campus-500 line-through')}>
                                {todo.content}
                              </p>
                              <p className="mt-1 text-xs text-campus-500">추가 {formatDateTimeLabel(todo.created_at)}</p>
                            </div>
                            {canEditTodos && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="shrink-0 border-transparent px-2.5 text-campus-500 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                                onClick={() => handleTodoDeleteRequest(task, todo)}
                                disabled={isSavingChanges || isTodoSelectionMode}
                                aria-label={`${todo.content} 삭제`}
                                title="Todo 삭제"
                              >
                                삭제
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="rounded-3xl border border-campus-200 bg-campus-50 p-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-campus-900">Todo 빠른 추가</p>
                          <p className="mt-1 text-xs leading-5 text-campus-500">Task를 세부 단계로 나눠 팀원들이 바로 체크할 수 있게 만드세요.</p>
                        </div>
                        {canEditTodos ? (
                          <>
                            <div className="flex gap-2">
                              <input
                                value={todoDraft}
                                onChange={(event) =>
                                  setTodoDrafts((current) => ({ ...current, [task.id]: event.target.value }))
                                }
                                placeholder="예: 발표 슬라이드 구조 1차 확정하기"
                                className="min-w-0 flex-1 rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                              />
                              <Button
                                type="button"
                                size="sm"
                                className="self-stretch px-4"
                                onClick={() => void handleTodoCreate(task.id)}
                                disabled={isSavingChanges || todoDraft.trim().length === 0}
                              >
                                {isSavingChanges ? '저장 중...' : '추가'}
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {isLeader && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className={stableGhostButtonClass}
                                  onClick={() => handleRecommendTodos(task.id)}
                                  disabled={aiTodoDisabled}
                                >
                                  {aiTodoButtonLabel}
                                </Button>
                              )}
                              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs text-campus-500 ring-1 ring-inset ring-campus-200">
                                담당자만 체크와 추가가 가능합니다.
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="rounded-2xl border border-campus-200 bg-white px-4 py-4 text-sm text-campus-500">
                            이 Task의 Todo는 담당자만 추가하거나 완료 처리할 수 있습니다.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <ModalFrame
        open={taskDeleteIntent !== null}
        title={taskDeleteIntent?.title ?? ''}
        description={taskDeleteIntent?.description ?? ''}
        onClose={() => {
          if (isDeletingTask) {
            return
          }
          setTaskDeleteIntent(null)
        }}
        closeOnBackdrop={!isDeletingTask}
        closeOnEscape={!isDeletingTask}
      >
        <div className="space-y-5 px-6 py-6 sm:px-8">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Task 삭제는 연결된 Todo까지 함께 제거합니다. 이 작업은 되돌릴 수 없습니다.
          </div>
          {errorMessage && taskDeleteIntent && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {errorMessage}
            </div>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className={stableGhostButtonClass}
              onClick={() => setTaskDeleteIntent(null)}
              disabled={isDeletingTask}
            >
              취소
            </Button>
            <Button
              type="button"
              className="bg-rose-500 text-white shadow-none hover:bg-rose-600 focus-visible:outline-rose-300"
              onClick={() => void handleConfirmTaskDelete()}
              disabled={isDeletingTask}
            >
              {isDeletingTask ? '삭제 중...' : taskDeleteIntent?.confirmLabel ?? '삭제'}
            </Button>
          </div>
        </div>
      </ModalFrame>

      <ModalFrame
        open={todoDeleteIntent !== null}
        title={todoDeleteIntent?.title ?? ''}
        description={todoDeleteIntent?.description ?? ''}
        onClose={() => {
          if (isSavingChanges) {
            return
          }
          setTodoDeleteIntent(null)
        }}
        closeOnBackdrop={!isSavingChanges}
        closeOnEscape={!isSavingChanges}
      >
        <div className="space-y-5 px-6 py-6 sm:px-8">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            삭제는 되돌릴 수 없습니다.
          </div>
          {errorMessage && todoDeleteIntent && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
              {errorMessage}
            </div>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              className={stableGhostButtonClass}
              onClick={() => setTodoDeleteIntent(null)}
              disabled={isSavingChanges}
            >
              취소
            </Button>
            <Button
              type="button"
              className="bg-rose-500 text-white shadow-none hover:bg-rose-600 focus-visible:outline-rose-300"
              onClick={() => void handleConfirmTodoDelete()}
              disabled={isSavingChanges}
            >
              {todoDeleteIntent?.confirmLabel ?? '삭제'}
            </Button>
          </div>
        </div>
      </ModalFrame>
    </div>
  )
}

