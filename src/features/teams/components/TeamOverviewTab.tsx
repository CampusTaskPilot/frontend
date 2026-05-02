import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  BriefcaseBusiness,
  Crown,
  FileText,
  ImageOff,
  ImagePlus,
  LoaderCircle,
  NotebookText,
  PencilLine,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/shadcn/alert-dialog'
import { Badge as UiBadge } from '@/components/shadcn/badge'
import { Button as UiButton } from '@/components/shadcn/button'
import { Card as UiCard, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shadcn/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/shadcn/dialog'
import { Input } from '@/components/shadcn/input'
import { Separator } from '@/components/shadcn/separator'
import { Skeleton } from '@/components/shadcn/skeleton'
import { Textarea } from '@/components/shadcn/textarea'
import { SkillSelector } from '@/components/common/SkillSelector'
import { cn } from '@/lib/utils'
import { TeamProfileImage } from './TeamProfileImage'
import { TEAM_IMAGE_MAX_SIZE_BYTES, TEAM_IMAGE_STORAGE_ENABLED, validateTeamImageFile } from '../lib/teamProfileImages'
import {
  buildTeamStoryDescription,
  splitTeamStoryDescription,
  type TeamStoryField,
} from '../lib/teamStoryDescription'
import { TEAM_SUMMARY_MAX_LENGTH, TEAM_SUMMARY_LENGTH_MESSAGE, fetchSkillOptions, updateTeamProfile } from '../lib/teams'
import type {
  ProfileSummary,
  SkillOption,
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
  canManageTeamProfile: boolean
  currentUserId: string | null
  isDeletingTeam: boolean
  deleteErrorMessage: string
  onDeleteTeam: () => Promise<void>
  onTeamUpdated: (payload: { team: TeamRecord; skills: TeamSkillTag[] }) => void
}

type EditDraft = {
  name: string
  summary: string
  description: string
  teamNote: string
  removeImage: boolean
}

type StorySection = {
  eyebrow: string
  title: string
  body: string
  icon: LucideIcon
}

const numberFormatter = new Intl.NumberFormat('ko-KR')

function normalize(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function normalizeSkillIds(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value)))).sort((a, b) => a - b)
}

function areSameSkillIds(left: number[], right: number[]) {
  const normalizedLeft = normalizeSkillIds(left)
  const normalizedRight = normalizeSkillIds(right)

  return normalizedLeft.length === normalizedRight.length && normalizedLeft.every((value, index) => value === normalizedRight[index])
}

function makeDraft(team: TeamRecord): EditDraft {
  return {
    name: team.name,
    summary: team.summary,
    description: team.description ?? '',
    teamNote: team.team_note ?? '',
    removeImage: false,
  }
}

function joinCopy(...parts: Array<string | null | undefined>) {
  const seen = new Set<string>()

  return parts
    .map((part) => normalize(part))
    .filter((part) => {
      if (!part) return false
      const key = part.replace(/\s+/g, ' ')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .join(' ')
}

function buildStorySections(args: {
  summary: string
  description: string
  leaderName: string
  skillNames: string[]
  memberCount: number
  maxMembers: number
  isRecruiting: boolean
}) {
  const story = splitTeamStoryDescription(args.description)
  const skillLine =
    args.skillNames.length > 0
      ? `${args.skillNames.slice(0, 4).join(', ')}를 중심으로 역할을 나누고, 필요한 기술은 팀의 목표와 단계에 맞춰 유연하게 확장하고 있습니다.`
      : '아직 공개된 기술은 많지 않지만, 팀이 풀고 있는 문제와 필요한 역할을 기준으로 협업 범위를 차근차근 정리하고 있습니다.'
  const statusLine = args.isRecruiting
    ? `현재 ${numberFormatter.format(args.memberCount)}명이 함께하고 있으며 최대 ${numberFormatter.format(args.maxMembers)}명까지 합류할 수 있습니다.`
    : `현재 ${numberFormatter.format(args.memberCount)}명 규모로 운영 중이며, 기존 멤버 중심으로 작업 밀도와 완성도를 높이고 있습니다.`

  return [
    {
      eyebrow: '팀의 방향',
      title: '무엇을 목표로 움직이고 있나요',
      body: story.direction || args.summary,
      icon: FileText,
    },
    {
      eyebrow: '협업 방식',
      title: '어떤 방식으로 실행하고 있나요',
      body: story.workflow || skillLine,
      icon: Target,
    },
    {
      eyebrow: '운영 현황',
      title: '지금 팀은 어떤 상태인가요',
      body: joinCopy(story.operation, statusLine, `현재 운영 리더는 ${args.leaderName}입니다.`),
      icon: NotebookText,
    },
  ] satisfies StorySection[]
}

function OverviewSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-[28rem] rounded-[2rem]" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Skeleton className="h-[24rem] rounded-[1.75rem]" />
        <Skeleton className="h-[24rem] rounded-[1.75rem]" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-[1.75rem]" />
        <Skeleton className="h-72 rounded-[1.75rem]" />
      </div>
    </div>
  )
}

function MetaCard({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex min-h-[4.75rem] min-w-0 items-center gap-3 rounded-[1.35rem] border border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.45)]">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="whitespace-nowrap text-[11px] font-semibold tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-1 break-keep text-sm font-semibold leading-5 text-slate-950">{value}</p>
      </div>
    </div>
  )
}

function StoryCard({ section }: { section: StorySection }) {
  const Icon = section.icon

  return (
    <section className="flex h-full flex-col rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.88))] p-5 shadow-[0_18px_42px_-34px_rgba(15,23,42,0.42)]">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="whitespace-nowrap text-[11px] font-semibold tracking-[0.16em] text-slate-500">
            {section.eyebrow}
          </p>
          <h3 className="mt-1 break-keep text-base font-semibold leading-6 text-slate-950">{section.title}</h3>
        </div>
      </div>
      <p className="mt-4 break-keep text-sm leading-7 text-slate-600">{section.body}</p>
    </section>
  )
}

export function TeamOverviewTab(props: TeamOverviewTabProps) {
  const {
    team,
    leader,
    members,
    skills,
    isLoading,
    errorMessage,
    isLeader,
    canManageTeamProfile,
    currentUserId,
    isDeletingTeam,
    deleteErrorMessage,
    onDeleteTeam,
    onTeamUpdated,
  } = props
  const baseDraft = useMemo(() => makeDraft(team), [team])
  const [draft, setDraft] = useState<EditDraft>(() => baseDraft)
  const [allSkillOptions, setAllSkillOptions] = useState<SkillOption[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>(() =>
    normalizeSkillIds(skills.map((skill) => skill.id)),
  )
  const [isLoadingSkillOptions, setIsLoadingSkillOptions] = useState(false)
  const [skillOptionsMessage, setSkillOptionsMessage] = useState('')
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteConfirmationName, setDeleteConfirmationName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => {
    setDraft(baseDraft)
    setSelectedSkillIds(normalizeSkillIds(skills.map((skill) => skill.id)))
    setSelectedImageFile(null)
    setPreviewImageUrl(null)
    setSaveError('')
    setSaveSuccess('')
  }, [baseDraft, skills])

  useEffect(() => {
    if (!isEditorOpen || allSkillOptions.length > 0) return

    let isMounted = true

    async function loadSkillOptions() {
      setIsLoadingSkillOptions(true)
      setSkillOptionsMessage('')

      try {
        const options = await fetchSkillOptions()
        if (!isMounted) return
        setAllSkillOptions(options)
      } catch {
        if (!isMounted) return
        setAllSkillOptions([])
        setSkillOptionsMessage('기술 목록을 지금은 불러오지 못했어요. 기존 기술은 유지한 채 다시 저장할 수 있습니다.')
      } finally {
        if (isMounted) {
          setIsLoadingSkillOptions(false)
        }
      }
    }

    void loadSkillOptions()

    return () => {
      isMounted = false
    }
  }, [allSkillOptions.length, isEditorOpen])

  useEffect(() => {
    if (!selectedImageFile) {
      setPreviewImageUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedImageFile)
    setPreviewImageUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedImageFile])

  useEffect(() => {
    if (!isDeleteOpen) {
      setDeleteConfirmationName('')
    }
  }, [isDeleteOpen])

  const leaderName = normalize(leader?.full_name) || normalize(leader?.email) || '팀 리더'
  const skillNames = useMemo(() => Array.from(new Set(skills.map((skill) => skill.name))).sort(), [skills])
  const currentSkillIds = useMemo(() => normalizeSkillIds(skills.map((skill) => skill.id)), [skills])
  const editorSkillOptions = useMemo(() => {
    const optionById = new Map<number, SkillOption>()

    allSkillOptions.forEach((skill) => {
      optionById.set(skill.id, skill)
    })
    skills.forEach((skill) => {
      if (!optionById.has(skill.id)) {
        optionById.set(skill.id, { ...skill, category: null })
      }
    })

    return Array.from(optionById.values()).sort((left, right) => left.name.localeCompare(right.name, 'ko-KR'))
  }, [allSkillOptions, skills])
  const memberCount = members.length
  const occupancyLabel = `${numberFormatter.format(memberCount)}명 / 최대 ${numberFormatter.format(team.max_members)}명`
  const heroSummary = normalize(team.summary) || '팀의 목표와 작업 방향을 짧고 분명하게 소개해 주세요.'
  const description =
    normalize(team.description) || '아직 팀 상세 설명이 없습니다. 팀이 해결하려는 문제와 작업 방향을 소개해 보세요.'
  const teamNote = normalize(team.team_note)
  const editorImageUrl = draft.removeImage ? null : previewImageUrl ?? team.image_url
  const editorPreviewName = normalize(draft.name) || team.name || '새 팀'
  const imageSizeLimitLabel = `${Math.round(TEAM_IMAGE_MAX_SIZE_BYTES / 1024 / 1024)}MB 이하`
  const storyDraft = useMemo(() => splitTeamStoryDescription(draft.description), [draft.description])
  const overviewSections = useMemo(
    () =>
      buildStorySections({
        summary: heroSummary,
        description,
        leaderName,
        skillNames,
        memberCount,
        maxMembers: team.max_members,
        isRecruiting: team.is_recruiting,
      }),
    [description, heroSummary, leaderName, memberCount, skillNames, team.is_recruiting, team.max_members],
  )
  const isDirty =
    draft.name !== team.name ||
    draft.summary !== team.summary ||
    draft.description !== (team.description ?? '') ||
    draft.teamNote !== (team.team_note ?? '') ||
    !areSameSkillIds(selectedSkillIds, currentSkillIds) ||
    draft.removeImage ||
    Boolean(selectedImageFile)
  const isDeleteConfirmed = deleteConfirmationName.trim() === team.name.trim()

  const updateStoryDraft = (field: TeamStoryField, value: string) => {
    const nextStory = {
      ...storyDraft,
      [field]: value,
    }

    setDraft((current) => ({
      ...current,
      description: buildTeamStoryDescription(nextStory),
    }))
  }

  useEffect(() => {
    if (!isEditorOpen || !isDirty) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, isEditorOpen])

  const openEditor = () => {
    setDraft(baseDraft)
    setSelectedSkillIds(currentSkillIds)
    setSelectedImageFile(null)
    setSaveError('')
    setSaveSuccess('')
    setIsEditorOpen(true)
  }

  const addSkill = (skillId: number) => {
    setSelectedSkillIds((current) => {
      if (current.includes(skillId)) return current
      return normalizeSkillIds([...current, skillId])
    })
    setSaveError('')
  }

  const removeSkill = (skillId: number) => {
    setSelectedSkillIds((current) => current.filter((id) => id !== skillId))
    setSaveError('')
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    const validationMessage = validateTeamImageFile(file)
    if (validationMessage) {
      setSaveError(validationMessage)
      return
    }

    setSaveError('')
    setSelectedImageFile(file)
    setDraft((current) => ({ ...current, removeImage: false }))
  }

  const handleSave = async () => {
    if (!currentUserId) {
      setSaveError('로그인 후에만 팀 소개를 수정할 수 있습니다.')
      return
    }

    if (draft.summary.trim().length > TEAM_SUMMARY_MAX_LENGTH) {
      setSaveError(TEAM_SUMMARY_LENGTH_MESSAGE)
      return
    }

    setIsSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      const result = await updateTeamProfile({
        teamId: team.id,
        userId: currentUserId,
        name: draft.name,
        summary: draft.summary,
        description: draft.description,
        teamNote: draft.teamNote,
        category: team.category ?? '',
        maxMembers: team.max_members,
        isRecruiting: team.is_recruiting,
        imageFile: selectedImageFile,
        removeImage: draft.removeImage,
        currentImageUrl: team.image_url,
        skillIds: selectedSkillIds,
      })

      setDraft(makeDraft(result.team))
      setSelectedImageFile(null)
      setSaveSuccess('팀 소개 정보가 저장되었습니다.')
      setIsEditorOpen(false)
      onTeamUpdated(result)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '팀 소개 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <OverviewSkeleton />
  }

  return (
    <div className="flex flex-col gap-6">
      {errorMessage ? (
        <Alert variant="destructive" className="border-rose-200 bg-rose-50/95">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>Overview 정보를 불러오지 못했습니다</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {saveSuccess ? (
        <Alert className="border-emerald-200 bg-emerald-50/95 text-emerald-900" aria-live="polite">
          <Sparkles aria-hidden="true" />
          <AlertTitle>저장이 완료되었습니다</AlertTitle>
          <AlertDescription className="text-emerald-800">{saveSuccess}</AlertDescription>
        </Alert>
      ) : null}

      {deleteErrorMessage ? (
        <Alert variant="destructive" className="border-rose-200 bg-rose-50/95">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>팀 삭제를 완료하지 못했습니다</AlertTitle>
          <AlertDescription>{deleteErrorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <UiCard className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(245,249,255,0.98),rgba(255,255,255,0.97)_52%,rgba(245,248,252,0.98))] shadow-[0_34px_90px_-48px_rgba(15,23,42,0.38)]">
        <CardContent className="relative px-0 py-0">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-20 top-0 size-72 rounded-full bg-brand-200/35 blur-3xl" />
            <div className="absolute right-[-4rem] top-10 size-64 rounded-full bg-sky-200/35 blur-3xl" />
            <div className="absolute bottom-[-6rem] left-1/3 h-44 w-80 rounded-full bg-cyan-100/35 blur-3xl" />
          </div>

          <div className="relative z-10 flex flex-col gap-6 px-5 py-5 lg:px-7 lg:py-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-wrap items-center gap-2.5">
                <UiBadge
                  variant="outline"
                  className="h-8 rounded-full border-brand-200/90 bg-white/80 px-3.5 text-[0.74rem] font-semibold text-brand-700"
                >
                  팀 소개
                </UiBadge>
                <UiBadge
                  className={cn(
                    'h-8 rounded-full border px-3.5 text-[0.74rem] font-semibold',
                    team.is_recruiting
                      ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
                      : 'border-amber-200 bg-amber-100 text-amber-800',
                  )}
                >
                  {team.is_recruiting ? '모집 중' : '모집 마감'}
                </UiBadge>
                {isLeader ? (
                  <UiBadge
                    variant="outline"
                    className="h-8 rounded-full border-slate-200 bg-slate-100/90 px-3.5 text-[0.74rem] font-semibold text-slate-700"
                  >
                    <Crown aria-hidden="true" />
                    리더 관리 가능
                  </UiBadge>
                ) : null}
              </div>

              {canManageTeamProfile ? (
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <UiButton
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-11 rounded-2xl px-5"
                    onClick={openEditor}
                  >
                    <PencilLine data-icon="inline-start" aria-hidden="true" />
                    소개 편집
                  </UiButton>
                  <UiButton
                    type="button"
                    variant="outline"
                    size="lg"
                    className="min-h-11 rounded-2xl border-rose-200 bg-rose-50/90 px-5 text-rose-700 hover:bg-rose-100 hover:text-rose-700"
                    disabled={!isLeader}
                    onClick={() => {
                      if (isLeader) {
                        setIsDeleteOpen(true)
                      }
                    }}
                  >
                    <Trash2 data-icon="inline-start" aria-hidden="true" />
                    팀 삭제
                  </UiButton>
                </div>
              ) : null}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.24em] text-brand-600">TEAM OVERVIEW</p>
              <h1 className="mt-3 max-w-4xl break-keep text-[2rem] font-semibold leading-[1.16] tracking-[-0.05em] text-slate-950 sm:text-[2.45rem] lg:text-[2.8rem]">
                {team.name}
              </h1>
              <p className="mt-4 max-w-3xl break-keep text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                {heroSummary}
              </p>
            </div>

            <div className="mx-auto w-full max-w-3xl">
              <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/78 p-3 shadow-[0_28px_72px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
                <div className="relative mx-auto max-w-xl overflow-hidden rounded-[1.35rem] border border-brand-100/70 bg-[linear-gradient(160deg,rgba(240,247,255,0.96),rgba(255,255,255,0.92))]">
                  {team.image_url ? (
                    <img src={team.image_url} alt={`${team.name} 대표 이미지`} className="aspect-[16/6] w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[16/6] w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_52%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-6 text-center">
                      <div className="flex size-14 items-center justify-center rounded-3xl bg-white/90 text-brand-700 shadow-sm">
                        <ImageOff className="size-6" aria-hidden="true" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">대표 이미지가 아직 없습니다</p>
                        <p className="break-keep text-xs leading-5 text-slate-500">
                         팀을 더 잘 표현할 수 있도록 이미지를 추가해보세요.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mx-auto grid w-full max-w-5xl gap-3 sm:grid-cols-3">
              <MetaCard icon={BriefcaseBusiness} label="카테고리" value={team.category ?? '미정'} />
              <MetaCard icon={Users} label="인원 현황" value={occupancyLabel} />
              <MetaCard icon={Crown} label="운영 리더" value={leaderName} />
            </div>
          </div>
        </CardContent>
      </UiCard>

      <UiCard className="rounded-[1.75rem] border-slate-200/80 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.42)]">
        <CardHeader className="gap-2 pb-2">
          <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-slate-950">팀 소개</CardTitle>
          <CardDescription className="break-keep text-sm leading-6 text-slate-500">
            팀 소개와 상세 설명을 바탕으로, 이 팀이 어디를 향해 움직이고 있는지 한눈에 읽히도록 정리했습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {overviewSections.map((section) => (
              <StoryCard key={section.title} section={section} />
            ))}
          </div>
        </CardContent>
      </UiCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <UiCard className="rounded-[1.75rem] border-slate-200/80 shadow-[0_24px_64px_-48px_rgba(15,23,42,0.4)]">
          <CardHeader className="gap-2 pb-2">
            <CardTitle className="text-lg font-semibold tracking-[-0.03em] text-slate-950">기술 스택</CardTitle>
            <CardDescription className="break-keep text-sm leading-6 text-slate-500">
              팀이 실제로 활용 중인 기술과 협업 기반을 한곳에서 확인할 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {skillNames.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {skillNames.map((skill) => (
                  <UiBadge
                    key={skill}
                    variant="secondary"
                    className="h-9 rounded-full bg-brand-50 px-3.5 text-[0.8rem] font-medium text-brand-700"
                  >
                    {skill}
                  </UiBadge>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm leading-6 text-slate-500">
                아직 등록된 기술이 없습니다. 팀에서 주로 사용하는 도구나 기술을 추가하면 팀의 성격을 더 분명하게 보여줄 수 있습니다.
              </div>
            )}
          </CardContent>
        </UiCard>

        <UiCard className="rounded-[1.75rem] border-slate-200/80 shadow-[0_24px_64px_-48px_rgba(15,23,42,0.4)]">
          <CardHeader className="gap-2 pb-2">
            <CardTitle className="text-lg font-semibold tracking-[-0.03em] text-slate-950">팀 메모</CardTitle>
            <CardDescription className="break-keep text-sm leading-6 text-slate-500">
              운영 원칙, 공지, 합류 전 참고사항처럼 팀에서 계속 공유할 내용을 정리하는 공간입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamNote ? (
              <div className="rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.88))] px-4 py-4">
                <p className="whitespace-pre-wrap break-keep text-sm leading-7 text-slate-700">{teamNote}</p>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm leading-6 text-slate-500">
                아직 공유된 운영 메모가 없습니다. 공지나 협업 원칙이 있다면 팀 소개 편집에서 바로 추가할 수 있습니다.
              </div>
            )}
          </CardContent>
        </UiCard>
      </div>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-w-6xl bg-slate-50 p-0">
          <DialogHeader className="border-b border-slate-200/80 bg-white px-5 py-4 pr-14 text-left sm:px-6">
            <DialogTitle>팀 소개 편집</DialogTitle>
            <DialogDescription className="break-keep">
              팀 생성 폼과 같은 기준으로 기본 정보, 기술, 소개, 이미지를 다시 정리합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
            {saveError ? (
              <Alert variant="destructive" className="border-rose-200 bg-rose-50/95">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>저장 전에 확인해 주세요</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] xl:items-start">
            <UiCard className="rounded-[1.75rem] border-slate-200/80 bg-white shadow-[0_24px_64px_-52px_rgba(15,23,42,0.36)]">
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-slate-950">기본 정보</CardTitle>
                  <UiBadge className="h-7 rounded-full px-3">필수</UiBadge>
                </div>
                <CardDescription className="leading-6">
                  팀 목록과 overview 상단에서 가장 먼저 보이는 정보입니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="team-overview-name" className="text-sm font-semibold text-slate-900">
                    팀 이름
                  </label>
                  <Input
                    id="team-overview-name"
                    className="h-12 rounded-2xl px-4 text-sm"
                    value={draft.name}
                    onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                    maxLength={60}
                    placeholder="예: AI 스터디 팀"
                    autoComplete="off"
                  />
                  <p className="text-xs text-slate-500">팀 목록에서 가장 먼저 보여질 이름이에요.</p>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <label htmlFor="team-overview-summary" className="text-sm font-semibold text-slate-900">
                    한 줄 소개
                  </label>
                  <Input
                    id="team-overview-summary"
                    className="h-12 rounded-2xl px-4 text-sm"
                    value={draft.summary}
                    onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                    maxLength={TEAM_SUMMARY_MAX_LENGTH}
                    placeholder="무엇을 함께 만들고 싶은지 한 줄로 적어주세요."
                    autoComplete="off"
                  />
                  <p className="text-xs text-slate-500">
                    짧아도 괜찮아요. {draft.summary.trim().length}/{TEAM_SUMMARY_MAX_LENGTH}자
                  </p>
                </div>
              </CardContent>
            </UiCard>

            <UiCard className="rounded-[1.75rem] border-slate-200/80 bg-white shadow-[0_24px_64px_-52px_rgba(15,23,42,0.36)]">
              <CardHeader className="gap-1.5">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-slate-950">기술 스택</CardTitle>
                  <UiBadge variant="outline" className="rounded-full px-2.5 text-[11px]">
                    선택
                  </UiBadge>
                </div>
                <CardDescription className="leading-5">
                  팀에서 사용하는 기술이나 앞으로 필요한 역량을 추가해 주세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {skillOptionsMessage ? (
                  <Alert className="border-amber-200 bg-amber-50/95 text-amber-900">
                    <AlertCircle aria-hidden="true" />
                    <AlertTitle>기술 목록을 불러오지 못했습니다</AlertTitle>
                    <AlertDescription className="text-amber-800">{skillOptionsMessage}</AlertDescription>
                  </Alert>
                ) : null}

                {isLoadingSkillOptions && editorSkillOptions.length === 0 ? (
                  <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                    기술 목록을 불러오는 중이에요...
                  </div>
                ) : (
                  <SkillSelector
                    skills={editorSkillOptions}
                    selectedSkillIds={selectedSkillIds}
                    onSelectSkill={addSkill}
                    onDeselectSkill={removeSkill}
                    showSelectedList
                    emptySelectedMessage="아직 선택한 기술이 없습니다. 팀에서 주로 사용하는 도구나 기술을 추가해 주세요."
                  />
                )}
              </CardContent>
            </UiCard>

            <UiCard className="rounded-[1.75rem] border-slate-200/80 bg-white shadow-[0_24px_64px_-52px_rgba(15,23,42,0.36)]">
              <CardHeader className="gap-1.5">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-slate-950">팀 소개</CardTitle>
                  <UiBadge variant="outline" className="rounded-full px-2.5 text-[11px]">
                    선택
                  </UiBadge>
                </div>
                <CardDescription className="leading-5">
                  어떤 팀인지, 어떻게 운영할지, 어떤 내용을 멤버와 공유할지 편하게 적어 주세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <label htmlFor="team-overview-direction" className="text-sm font-semibold text-slate-900">
                    팀의 방향
                  </label>
                  <Textarea
                    id="team-overview-direction"
                    className="min-h-[116px] rounded-[1.35rem] px-4 py-3 text-sm leading-7"
                    value={storyDraft.direction}
                    onChange={(event) => updateStoryDraft('direction', event.target.value)}
                    rows={4}
                    placeholder="무엇을 만들고 싶은지, 어떤 문제를 해결하려는지 적어주세요."
                  />
                  <p className="text-xs text-slate-500">overview의 ‘무엇을 목표로 움직이고 있나요’ 카드에 반영돼요.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="team-overview-workflow" className="text-sm font-semibold text-slate-900">
                    협업 방식
                  </label>
                  <Textarea
                    id="team-overview-workflow"
                    className="min-h-[116px] rounded-[1.35rem] px-4 py-3 text-sm leading-7"
                    value={storyDraft.workflow}
                    onChange={(event) => updateStoryDraft('workflow', event.target.value)}
                    rows={4}
                    placeholder="어떤 방식으로 회의하고, 업무를 나누고, 결과를 공유할지 적어주세요."
                  />
                  <p className="text-xs text-slate-500">overview의 ‘어떤 방식으로 실행하고 있나요’ 카드에 반영돼요.</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="team-overview-operation" className="text-sm font-semibold text-slate-900">
                    운영 현황
                  </label>
                  <Textarea
                    id="team-overview-operation"
                    className="min-h-[116px] rounded-[1.35rem] px-4 py-3 text-sm leading-7"
                    value={storyDraft.operation}
                    onChange={(event) => updateStoryDraft('operation', event.target.value)}
                    rows={4}
                    placeholder="현재 팀 단계, 모집 상황, 리더가 공유하고 싶은 운영 맥락을 적어주세요."
                  />
                  <p className="text-xs text-slate-500">입력한 내용 뒤에 현재 인원과 운영 리더 정보가 함께 표시돼요.</p>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <label htmlFor="team-overview-note" className="text-sm font-semibold text-slate-900">
                    팀 운영 메모
                  </label>
                  <Textarea
                    id="team-overview-note"
                    className="min-h-[128px] rounded-[1.35rem] px-4 py-3 text-sm leading-7"
                    value={draft.teamNote}
                    onChange={(event) => setDraft((current) => ({ ...current, teamNote: event.target.value }))}
                    rows={5}
                    placeholder="공지, 참고 메모, 운영 원칙처럼 팀 안에서 자주 공유할 내용을 적어둘 수 있습니다."
                  />
                  <p className="text-xs text-slate-500">팀원에게 계속 보여줄 안내가 있다면 여기에 남겨 주세요.</p>
                </div>
              </CardContent>
            </UiCard>

            <UiCard className="rounded-[1.75rem] border-slate-200/80 bg-white shadow-[0_24px_64px_-52px_rgba(15,23,42,0.36)]">
              <CardHeader className="gap-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-slate-950">팀 이미지</CardTitle>
                  <UiBadge variant="outline" className="rounded-full px-2.5 text-[11px]">
                    선택
                  </UiBadge>
                </div>
                <CardDescription className="leading-6">
                  overview와 팀 생성 폼에서 사용하는 대표 이미지 비율에 맞춰 미리 확인할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.88))] p-2.5">
                  <TeamProfileImage
                    src={editorImageUrl}
                    alt={`${editorPreviewName} 팀 이미지 미리보기`}
                    teamName={editorPreviewName}
                    className="aspect-[16/7] w-full rounded-[1rem]"
                    priority="editor"
                  />
                </div>

                <label
                  className={cn(
                    'flex min-h-[136px] cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border border-dashed px-5 py-5 text-center transition-colors',
                    TEAM_IMAGE_STORAGE_ENABLED
                      ? 'border-slate-300 bg-slate-50/70 hover:border-brand-300 hover:bg-brand-50/60'
                      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                  )}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleImageChange}
                    disabled={!TEAM_IMAGE_STORAGE_ENABLED}
                  />
                  <div className="flex size-12 items-center justify-center rounded-[1.25rem] bg-white text-brand-700 shadow-sm">
                    {selectedImageFile ? <ImagePlus aria-hidden="true" /> : <UploadCloud aria-hidden="true" />}
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-950">
                    {TEAM_IMAGE_STORAGE_ENABLED ? '클릭해서 이미지 업로드' : '이미지 업로드를 사용할 수 없음'}
                  </p>
                  <p className="mt-1.5 max-w-[18rem] text-sm leading-5 text-slate-500">
                    {TEAM_IMAGE_STORAGE_ENABLED
                      ? `JPG, PNG, WEBP 파일을 ${imageSizeLimitLabel}까지 업로드할 수 있어요.`
                      : '스토리지 설정이 준비되면 이곳에서 팀 이미지를 연결할 수 있어요.'}
                  </p>
                  {selectedImageFile ? (
                    <p className="mt-3 text-xs text-slate-500">선택한 파일: {selectedImageFile.name}</p>
                  ) : null}
                </label>

                <p className="text-xs text-slate-500">이미지를 선택하지 않으면 기존 이미지나 기본 팀 이미지가 표시돼요.</p>

                <div className="flex flex-wrap gap-2">
                  {selectedImageFile ? (
                    <UiButton
                      type="button"
                      variant="outline"
                      className="rounded-2xl"
                      onClick={() => {
                        setSelectedImageFile(null)
                        setDraft((current) => ({ ...current, removeImage: false }))
                        setSaveError('')
                      }}
                    >
                      <X data-icon="inline-start" aria-hidden="true" />
                      이미지 선택 해제
                    </UiButton>
                  ) : null}
                  {team.image_url && TEAM_IMAGE_STORAGE_ENABLED ? (
                    <UiButton
                      type="button"
                      variant="outline"
                      className="rounded-2xl border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => {
                        setSelectedImageFile(null)
                        setDraft((current) => ({ ...current, removeImage: true }))
                      }}
                    >
                      이미지 제거
                    </UiButton>
                  ) : null}
                </div>
              </CardContent>
            </UiCard>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200/80 bg-white px-5 py-4 sm:justify-between sm:px-6">
            <UiButton
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                setDraft(baseDraft)
                setSelectedSkillIds(currentSkillIds)
                setSelectedImageFile(null)
                setSaveError('')
                setSaveSuccess('')
              }}
              disabled={isSaving}
            >
              초기화
            </UiButton>
            <UiButton type="button" className="rounded-2xl" onClick={handleSave} disabled={isSaving || !isDirty}>
              {isSaving ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
              저장하기
            </UiButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>팀을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription className="break-keep leading-6">
              팀 삭제는 되돌릴 수 없습니다. 확인을 위해 아래 입력칸에 <br/> 팀 이름
              <span className="mx-1 font-semibold text-foreground">{team.name}</span>
              을 정확히 입력해 주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <label htmlFor="team-delete-confirmation" className="mb-2 block text-sm font-semibold text-slate-900">
              팀 이름 확인
            </label>
            <Input
              id="team-delete-confirmation"
              value={deleteConfirmationName}
              onChange={(event) => setDeleteConfirmationName(event.target.value)}
              placeholder={team.name}
              className="min-h-11 rounded-2xl"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingTeam}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void onDeleteTeam()
              }}
              disabled={isDeletingTeam || !isDeleteConfirmed}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {isDeletingTeam ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
              팀 삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
