import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { supabase } from '../../../lib/supabase'
import {
  createTask,
  createTodo,
  deleteTask,
  fetchTaskSnapshot,
  fetchTeamTasksWorkspace,
  updateTask,
  updateTaskAssignee,
  updateTaskStatus,
  updateTodoDone,
} from '../lib/taskWorkspace'
import type {
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

function EmptyTaskState({
  isLeader,
  isCompletedView,
  onCreate,
  onRecommend,
}: {
  isLeader: boolean
  isCompletedView: boolean
  onCreate: () => void
  onRecommend: () => void
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
              <Button type="button" variant="ghost" onClick={onRecommend}>
                AI 추천 Task 받기
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

export function TeamTasksTab({ teamId, currentUserId, currentUserRole, members }: TeamTasksTabProps) {
  const [tasks, setTasks] = useState<TeamTaskWithTodos[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
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
  const [statusUpdatingTaskId, setStatusUpdatingTaskId] = useState('')
  const [assigneeUpdatingTaskId, setAssigneeUpdatingTaskId] = useState('')
  const [todoSubmittingTaskId, setTodoSubmittingTaskId] = useState('')
  const [todoUpdatingId, setTodoUpdatingId] = useState('')
  const [todoDrafts, setTodoDrafts] = useState<Record<string, string>>({})
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({})
  const [aiNotice, setAiNotice] = useState('')

  const membersById = useMemo(
    () => new Map(members.map((member) => [member.user_id, member] as const)),
    [members],
  )
  const isLeader = currentUserRole === 'leader'
  const isEditing = editingTaskId.length > 0

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
    (task: TeamTaskWithTodos) => Boolean(currentUserId) && task.assignee_id === currentUserId,
    [currentUserId],
  )

  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const result = await fetchTeamTasksWorkspace(teamId)
      setTasks(result)
      setExpandedTasks((current) => {
        const next = { ...current }
        result.forEach((task) => {
          if (!(task.id in next)) {
            next[task.id] = false
          }
        })
        return next
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '업무 데이터를 불러오지 못했습니다.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  useEffect(() => {
    const tasksChannel = supabase
      .channel(`team-tasks-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `team_id=eq.${teamId}`,
        },
        () => {
          void loadTasks()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(tasksChannel)
    }
  }, [loadTasks, teamId])

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

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

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

    setIsCreatingTask(true)
    setErrorMessage('')

    try {
      const dueDateIso = taskDueDate ? new Date(`${taskDueDate}T23:59:00`).toISOString() : null

      if (isEditing) {
        await updateTask({
          taskId: editingTaskId,
          title: trimmedTitle,
          description: taskDescription,
          priority: taskPriority,
          assigneeId: taskAssigneeId || null,
          dueDate: dueDateIso,
          status: taskStatus,
        })
      } else {
        const nextPosition = tasks.length > 0 ? Math.max(...tasks.map((task) => task.position)) + 1 : 0
        await createTask({
          teamId,
          title: trimmedTitle,
          description: taskDescription,
          priority: taskPriority,
          assigneeId: taskAssigneeId || null,
          dueDate: dueDateIso,
          createdBy: currentUserId,
          position: nextPosition,
        })
      }

      setTaskTitle('')
      setTaskDescription('')
      setTaskPriority('medium')
      setTaskAssigneeId('')
      setTaskDueDate('')
      setTaskStatus('todo')
      setEditingTaskId('')
      setShowCreateForm(false)
      await loadTasks()
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

  async function handleDeleteTask() {
    if (!isLeader || !editingTaskId) {
      return
    }

    setIsDeletingTask(true)
    setErrorMessage('')

    try {
      await deleteTask(editingTaskId)
      resetTaskForm()
      await loadTasks()
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

    setAssigneeUpdatingTaskId(taskId)
    setErrorMessage('')

    try {
      await updateTaskAssignee(taskId, assigneeId || null)
      await loadTasks()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '담당자를 변경하지 못했습니다.')
    } finally {
      setAssigneeUpdatingTaskId('')
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

    setTodoSubmittingTaskId(taskId)
    setErrorMessage('')

    try {
      const nextPosition =
        targetTask.todos.length > 0 ? Math.max(...targetTask.todos.map((todo) => todo.position)) + 1 : 0

      await createTodo({
        taskId,
        content,
        createdBy: currentUserId,
        position: nextPosition,
      })

      setTodoDrafts((current) => ({ ...current, [taskId]: '' }))
      await loadTasks()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Todo를 추가하지 못했습니다.')
    } finally {
      setTodoSubmittingTaskId('')
    }
  }

  async function handleTodoToggle(todoId: string, nextValue: boolean) {
    const ownerTask = tasks.find((task) => task.todos.some((todo) => todo.id === todoId))
    if (!ownerTask || !canManageTodos(ownerTask)) {
      setErrorMessage('Todo 체크는 이 Task의 담당자만 할 수 있습니다.')
      return
    }

    setTodoUpdatingId(todoId)
    setErrorMessage('')

    try {
      await updateTodoDone(todoId, nextValue)
      await loadTasks()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Todo 상태를 바꾸지 못했습니다.')
    } finally {
      setTodoUpdatingId('')
    }
  }

  async function handleTaskStatusChange(taskId: string, status: TeamTaskStatus) {
    try {
      const latestTask = await fetchTaskSnapshot(taskId)
      if (!latestTask || !canChangeTaskStatus({ ...latestTask, assignee: null, todos: [] })) {
        await loadTasks()
        setErrorMessage('상태 변경은 담당 미지정 Task는 모두 가능하고, 담당자가 지정되면 해당 담당자만 할 수 있습니다.')
        return
      }

      setStatusUpdatingTaskId(taskId)
      setErrorMessage('')
      await updateTaskStatus(taskId, status)
      await loadTasks()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Task 상태를 변경하지 못했습니다.')
    } finally {
      setStatusUpdatingTaskId('')
    }
  }

  function handleRecommendTasks() {
    if (!isLeader) return
    // TODO: AI task recommendation API가 연결되면 팀 컨텍스트 기준 추천 결과를 받아오도록 연결합니다.
    setAiNotice('AI Task 추천은 아직 연결 전입니다. 이후 팀 목표와 멤버 역할을 바탕으로 초안 Task를 제안하도록 붙일 수 있습니다.')
  }

  function handleRecommendTodos(taskId: string) {
    const targetTask = tasks.find((task) => task.id === taskId)
    if (!targetTask || !canManageTodos(targetTask)) return
    // TODO: AI todo recommendation API가 연결되면 taskId 문맥 기준의 세부 Todo를 생성합니다.
    const taskTitleLabel = targetTask.title || '선택한 Task'
    setAiNotice(`"${taskTitleLabel}" 기준 AI Todo 추천은 준비만 되어 있습니다. 나중에 API를 연결하면 바로 붙일 수 있게 핸들러를 분리해두었습니다.`)
  }

  function handleAutoAssignTasks() {
    if (!isLeader) return
    // TODO: AI auto assignment API가 연결되면 팀원 역할과 현재 분배량을 반영해 assignee를 추천/반영합니다.
    setAiNotice('AI 업무 자동 배분은 아직 연결 전입니다. 추후 팀원 스킬, 현재 할당량, 마감 우선순위를 기준으로 추천하도록 확장할 수 있습니다.')
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden bg-campus-grid">
        <div className="grid gap-4 xl:grid-cols-[1.5fr,0.9fr]">
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

          <div className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5">
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
                      if (showCreateForm && !isEditing) {
                        resetTaskForm()
                        return
                      }
                      resetTaskForm()
                      setShowCreateForm(true)
                    }}
                  >
                    {showCreateForm && !isEditing ? '생성 폼 닫기' : 'Task 생성'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleRecommendTasks}>
                    AI 추천 Task 받기
                  </Button>
                  <Button type="button" variant="subtle" onClick={handleAutoAssignTasks}>
                    AI 업무 자동 배분하기
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
                {aiNotice && <p className="mt-3 text-xs leading-5 text-campus-700">{aiNotice}</p>}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {isLeader && showCreateForm && (
        <Card className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-campus-900">{isEditing ? 'Task 수정' : '새 Task 만들기'}</h3>
              <p className="mt-1 text-sm text-campus-500">
                {isEditing
                  ? '기존 Task 정보를 불러와 바로 수정할 수 있습니다.'
                  : '큰 업무 단위를 먼저 만들고, 세부 Todo는 Task 안에서 이어서 추가하세요.'}
              </p>
            </div>
            <TaskMetaBadge tone="neutral">{isEditing ? '관리자 수정 모드' : 'created_by = 현재 로그인 유저'}</TaskMetaBadge>
          </div>

          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleCreateTask}>
            <label className="space-y-2 text-sm font-medium text-campus-700">
              <span>제목</span>
              <input
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="예: 발표 자료 구조 정리"
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
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
                onChange={(event) => setTaskDescription(event.target.value)}
                rows={4}
                placeholder="과제 범위, 기대 결과물, 참고할 내용을 적어두면 팀원이 빠르게 이해할 수 있습니다."
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
              />
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

            <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
              <Button type="submit" disabled={isCreatingTask}>
                {isCreatingTask ? (isEditing ? '수정 중...' : '생성 중...') : isEditing ? 'Task 수정 저장' : 'Task 생성'}
              </Button>
              {isEditing && (
                <Button type="button" variant="ghost" onClick={() => void handleDeleteTask()} disabled={isDeletingTask || isCreatingTask}>
                  {isDeletingTask ? '삭제 중...' : 'Task 삭제'}
                </Button>
              )}
              <Button type="button" variant="ghost" onClick={resetTaskForm} disabled={isCreatingTask || isDeletingTask}>
                취소
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="space-y-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="font-display text-2xl text-campus-900">업무 보드</h3>
            <p className="mt-1 text-sm text-campus-500">Active와 Completed를 나눠 집중도를 유지하고, 필요한 Task만 빠르게 찾아볼 수 있습니다.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveView('active')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                activeView === 'active'
                  ? 'bg-campus-900 text-white'
                  : 'border border-campus-200 bg-white text-campus-600 hover:bg-campus-50',
              )}
            >
              Active Tasks
            </button>
            <button
              type="button"
              onClick={() => setActiveView('completed')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition',
                activeView === 'completed'
                  ? 'bg-campus-900 text-white'
                  : 'border border-campus-200 bg-white text-campus-600 hover:bg-campus-50',
              )}
            >
              Completed Tasks
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1.4fr,0.8fr,0.8fr,auto]">
          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>검색</span>
            <input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="Task 제목, 설명, 담당자 검색"
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-campus-700">
            <span>정렬</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as TaskSortKey)}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
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
                'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm transition',
                showMineOnly
                  ? 'border-brand-200 bg-brand-50 text-brand-600'
                  : 'border-campus-200 bg-white text-campus-700',
              )}
            >
              <span>{showMineOnly ? '나에게 할당된 Task만' : '전체 Task 보기'}</span>
              <span className="text-xs">{showMineOnly ? 'ON' : 'OFF'}</span>
            </button>
          </label>

          <div className="flex items-end">
            <Button type="button" variant="ghost" className="w-full" onClick={() => void loadTasks()}>
              새로고침
            </Button>
          </div>
        </div>
      </Card>

      {errorMessage && (
        <Card className="border-rose-200 bg-rose-50">
          <p className="text-sm text-rose-600">{errorMessage}</p>
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
          onCreate={() => setShowCreateForm(true)}
          onRecommend={handleRecommendTasks}
        />
      ) : (
        <div className="space-y-4">
          {visibleTasks.map((task) => {
            const meta = progressMeta(task.todos)
            const assigneeName = displayAssigneeName(task)
            const isExpanded = expandedTasks[task.id] ?? true
            const todoDraft = todoDrafts[task.id] ?? ''
            const todoPreviewItems = task.todos.slice(0, 3)
            const hiddenTodoCount = Math.max(task.todos.length - todoPreviewItems.length, 0)
            const canEditTodos = canManageTodos(task)
            const canEditStatus = canChangeTaskStatus(task)
            const isStatusUpdating = statusUpdatingTaskId === task.id
            const isAssigneeUpdating = assigneeUpdatingTaskId === task.id
            const isTodoSubmitting = todoSubmittingTaskId === task.id

            return (
              <Card key={task.id} className="space-y-4 p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
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
                        <div className="mt-3 rounded-3xl border border-campus-200 bg-campus-50 px-4 py-3">
                          <p className="text-xs font-semibold text-campus-500">Todo 미리보기</p>
                          {todoPreviewItems.length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {todoPreviewItems.map((todo) => (
                                <div key={todo.id} className="flex items-center gap-2 text-sm text-campus-700">
                                  <span className={cn('h-2 w-2 rounded-full', todo.is_done ? 'bg-emerald-400' : 'bg-campus-300')} />
                                  <span className={cn('truncate', todo.is_done && 'text-campus-500 line-through')}>
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

                  <div className="grid min-w-full gap-3 rounded-3xl border border-campus-200 bg-campus-50 p-4 xl:min-w-[320px]">
                    <div className="grid gap-2 text-sm text-campus-700">
                      {isLeader && (
                        <div className="flex justify-start">
                          <Button type="button" size="sm" variant="ghost" onClick={() => handleStartEdit(task)}>
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
                            disabled={isAssigneeUpdating}
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
                        disabled={isStatusUpdating || !canEditStatus}
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
                    <Button type="button" size="sm" variant="ghost" onClick={() => setExpandedTasks((current) => ({ ...current, [task.id]: !isExpanded }))}>
                      {isExpanded ? '접기' : 'Todo 펼치기'}
                    </Button>
                    {canEditTodos ? (
                      <Button type="button" size="sm" variant="subtle" onClick={() => handleRecommendTodos(task.id)}>
                        AI가 추천해주는 Todo List 받기
                      </Button>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-campus-500 ring-1 ring-inset ring-campus-200">
                        Todo 조작은 담당자만 가능
                      </span>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="grid gap-4 xl:grid-cols-[1.35fr,0.85fr]">
                    <div className="space-y-3">
                      {task.todos.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-campus-200 bg-campus-50 px-4 py-5 text-sm text-campus-500">
                          아직 Todo가 없습니다. 첫 세부 작업을 추가해 Task를 실제 실행 단계로 바꿔보세요.
                        </div>
                      ) : (
                        task.todos.map((todo) => (
                          <label
                            key={todo.id}
                            className="flex items-start gap-3 rounded-3xl border border-campus-200 bg-white px-4 py-3"
                          >
                            {canEditTodos ? (
                              <input
                                type="checkbox"
                                checked={todo.is_done}
                                disabled={todoUpdatingId === todo.id}
                                onChange={(event) => void handleTodoToggle(todo.id, event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-campus-300 text-brand-500 focus:ring-brand-300"
                              />
                            ) : (
                              <span
                                className={cn(
                                  'mt-1 inline-flex h-4 w-4 rounded-full border',
                                  todo.is_done ? 'border-emerald-300 bg-emerald-100' : 'border-campus-300 bg-campus-100',
                                )}
                              />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-sm text-campus-800', todo.is_done && 'text-campus-500 line-through')}>
                                {todo.content}
                              </p>
                              <p className="mt-1 text-xs text-campus-500">추가 {formatDateTimeLabel(todo.created_at)}</p>
                            </div>
                          </label>
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
                                disabled={isTodoSubmitting || todoDraft.trim().length === 0}
                              >
                                {isTodoSubmitting ? '추가 중...' : '추가'}
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button type="button" size="sm" variant="ghost" onClick={() => handleRecommendTodos(task.id)}>
                                AI Todo 추천
                              </Button>
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
    </div>
  )
}
