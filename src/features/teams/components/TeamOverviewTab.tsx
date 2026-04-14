import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  AlertCircle,
  BriefcaseBusiness,
  Crown,
  FileText,
  ImageOff,
  LoaderCircle,
  NotebookText,
  PencilLine,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Users,
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
import { Input } from '@/components/shadcn/input'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/shadcn/sheet'
import { Skeleton } from '@/components/shadcn/skeleton'
import { Textarea } from '@/components/shadcn/textarea'
import { cn } from '@/lib/utils'
import { TEAM_IMAGE_STORAGE_ENABLED, validateTeamImageFile } from '../lib/teamProfileImages'
import { updateTeamProfile } from '../lib/teams'
import type {
  ProfileSummary,
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

function makeDraft(team: TeamRecord): EditDraft {
  return {
    name: team.name,
    summary: team.summary,
    description: team.description ?? '',
    teamNote: team.team_note ?? '',
    removeImage: false,
  }
}

function splitTextBlocks(value: string) {
  const normalized = normalize(value).replace(/\r\n/g, '\n')
  if (!normalized) return []

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length > 1) return paragraphs.slice(0, 3)

  const sentences = normalized
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  if (sentences.length <= 1) return [normalized]

  const chunkSize = Math.max(1, Math.ceil(sentences.length / 3))

  return Array.from({ length: Math.ceil(sentences.length / chunkSize) }, (_, index) =>
    sentences.slice(index * chunkSize, (index + 1) * chunkSize).join(' '),
  ).slice(0, 3)
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
  const blocks = splitTextBlocks(args.description)
  const skillLine =
    args.skillNames.length > 0
      ? `${args.skillNames.slice(0, 4).join(', ')} 역량을 바탕으로 역할을 나누고, 필요한 기술은 팀 목표에 맞춰 유연하게 확장합니다.`
      : '아직 등록된 기술 스택은 많지 않지만, 팀이 해결하려는 문제에 맞춰 필요한 역량을 정리해 나가는 단계입니다.'
  const statusLine = args.isRecruiting
    ? `현재 ${numberFormatter.format(args.memberCount)}명이 함께하고 있으며 최대 ${numberFormatter.format(args.maxMembers)}명까지 합류할 수 있습니다.`
    : `현재 ${numberFormatter.format(args.memberCount)}명 규모로 운영 중이며, 기존 멤버 중심으로 작업 밀도와 완성도를 높이고 있습니다.`

  return [
    {
      eyebrow: '핵심 소개',
      title: '팀이 무엇을 만들고 있나요',
      body: blocks[0] ?? args.summary,
      icon: FileText,
    },
    {
      eyebrow: '협업 방식',
      title: '어떤 흐름으로 일하나요',
      body: blocks[1] ?? skillLine,
      icon: Target,
    },
    {
      eyebrow: '운영 상태',
      title: '지금 팀은 어떤 단계인가요',
      body: blocks[2] ?? `${statusLine} 현재 운영 리더는 ${args.leaderName}입니다.`,
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
    currentUserId,
    isDeletingTeam,
    deleteErrorMessage,
    onDeleteTeam,
    onTeamUpdated,
  } = props
  const baseDraft = useMemo(() => makeDraft(team), [team])
  const [draft, setDraft] = useState<EditDraft>(() => baseDraft)
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
    setSelectedImageFile(null)
    setPreviewImageUrl(null)
    setSaveError('')
    setSaveSuccess('')
  }, [baseDraft])

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
  const memberCount = members.length
  const occupancyLabel = `${numberFormatter.format(memberCount)}명 / 최대 ${numberFormatter.format(team.max_members)}명`
  const heroSummary = normalize(team.summary) || '팀의 목표와 작업 방향을 짧고 분명하게 소개해 주세요.'
  const description =
    normalize(team.description) || '아직 팀 상세 설명이 없습니다. 팀이 해결하려는 문제와 작업 방향을 소개해 보세요.'
  const teamNote = normalize(team.team_note)
  const editorImageUrl = draft.removeImage ? null : previewImageUrl ?? team.image_url
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
    draft.removeImage ||
    Boolean(selectedImageFile)
  const isDeleteConfirmed = deleteConfirmationName.trim() === team.name.trim()

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
    setSelectedImageFile(null)
    setSaveError('')
    setSaveSuccess('')
    setIsEditorOpen(true)
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

              {isLeader ? (
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
                    onClick={() => setIsDeleteOpen(true)}
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

            <div className="overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/78 p-3 shadow-[0_28px_72px_-42px_rgba(15,23,42,0.45)] backdrop-blur">
              <div className="relative overflow-hidden rounded-[1.35rem] border border-brand-100/70 bg-[linear-gradient(160deg,rgba(240,247,255,0.96),rgba(255,255,255,0.92))]">
                {team.image_url ? (
                  <img src={team.image_url} alt={`${team.name} 대표 이미지`} className="aspect-[16/7] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[16/7] w-full flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_52%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] px-6 text-center">
                    <div className="flex size-16 items-center justify-center rounded-3xl bg-white/90 text-brand-700 shadow-sm">
                      <ImageOff className="size-7" aria-hidden="true" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">대표 이미지가 아직 없습니다</p>
                      <p className="break-keep text-xs leading-5 text-slate-500">
                        이미지가 없어도 안정적으로 보이도록 fallback 화면을 보여줍니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <MetaCard icon={BriefcaseBusiness} label="카테고리" value={team.category ?? '미정'} />
              <MetaCard icon={Users} label="인원 현황" value={occupancyLabel} />
              <MetaCard icon={Crown} label="운영 리더" value={leaderName} />
            </div>
          </div>
        </CardContent>
      </UiCard>

      <UiCard className="rounded-[1.75rem] border-slate-200/80 shadow-[0_26px_70px_-48px_rgba(15,23,42,0.42)]">
        <CardHeader className="gap-2 pb-2">
          <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Team Story</CardTitle>
          <CardDescription className="break-keep text-sm leading-6 text-slate-500">
            현재 저장된 `summary`와 `description`을 중심으로 팀의 정체성과 운영 맥락이 자연스럽게 읽히도록 재구성했습니다.
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
              현재 연결된 `team_skills` 기반의 기술만 사용해 팀의 작업 기반을 보여줍니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {skillNames.length > 0 ? (
              <>
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
                <div className="rounded-[1.4rem] border border-slate-200/80 bg-slate-50/80 px-4 py-4">
                  <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">현재 연결된 기술 수</p>
                  <p className="mt-1 text-base font-semibold text-slate-950">
                    총 {numberFormatter.format(skillNames.length)}개 기술이 등록되어 있습니다.
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm leading-6 text-slate-500">
                아직 등록된 기술 스택이 없습니다. 데이터가 비어 있어도 레이아웃이 무너지지 않도록 안내 문구와 여백을 유지했습니다.
              </div>
            )}
          </CardContent>
        </UiCard>

        <UiCard className="rounded-[1.75rem] border-slate-200/80 shadow-[0_24px_64px_-48px_rgba(15,23,42,0.4)]">
          <CardHeader className="gap-2 pb-2">
            <CardTitle className="text-lg font-semibold tracking-[-0.03em] text-slate-950">팀 메모</CardTitle>
            <CardDescription className="break-keep text-sm leading-6 text-slate-500">
              공지나 운영 메모처럼 팀이 계속 참고할 내용을 담는 보조 정보 영역입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teamNote ? (
              <div className="rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.88))] px-4 py-4">
                <p className="whitespace-pre-wrap break-keep text-sm leading-7 text-slate-700">{teamNote}</p>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5 text-sm leading-6 text-slate-500">
                아직 등록된 팀 메모가 없습니다. 팀 운영 공지나 짧은 안내가 필요하다면 소개 편집에서 바로 추가할 수 있습니다.
              </div>
            )}
          </CardContent>
        </UiCard>
      </div>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto bg-white sm:max-w-xl">
          <SheetHeader className="text-left">
            <SheetTitle>팀 소개 편집</SheetTitle>
            <SheetDescription className="break-keep leading-6">
              현재 DB 필드 안에서 대표 이미지, 팀 이름, 한줄 소개, 상세 설명, 팀 메모만 간단하게 수정할 수 있습니다.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-2 flex flex-col gap-5 px-4 pb-2">
            {saveError ? (
              <Alert variant="destructive" className="border-rose-200 bg-rose-50/95">
                <AlertCircle aria-hidden="true" />
                <AlertTitle>저장 전에 확인해 주세요</AlertTitle>
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-4">
              <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500">미리보기</p>
              <p className="mt-2 break-keep text-lg font-semibold leading-7 text-slate-950">
                {normalize(draft.summary) || '한줄 소개가 비어 있으면 기본 안내 문구가 노출됩니다.'}
              </p>
              <p className="mt-2 break-keep text-sm leading-6 text-slate-500">
                저장 시 기존 `teams` 테이블의 이름, 소개, 설명, 이미지, 팀 메모 필드만 업데이트됩니다.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="team-overview-name" className="text-sm font-semibold text-slate-900">
                팀 이름
              </label>
              <Input
                id="team-overview-name"
                className="min-h-11 rounded-2xl"
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                maxLength={60}
                placeholder="팀 이름을 입력해 주세요"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="team-overview-summary" className="text-sm font-semibold text-slate-900">
                한줄 소개
              </label>
              <Textarea
                id="team-overview-summary"
                className="min-h-[96px] rounded-2xl leading-7"
                value={draft.summary}
                onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
                maxLength={180}
                rows={3}
                placeholder="이 팀이 어떤 목표를 가진 팀인지 짧게 소개해 주세요"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="team-overview-description" className="text-sm font-semibold text-slate-900">
                상세 설명
              </label>
              <Textarea
                id="team-overview-description"
                className="min-h-[180px] rounded-2xl leading-7"
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                rows={8}
                placeholder="팀이 해결하려는 문제, 진행 방식, 현재 방향을 조금 더 자세히 작성해 주세요"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="team-overview-note" className="text-sm font-semibold text-slate-900">
                팀 운영 메모
              </label>
              <Textarea
                id="team-overview-note"
                className="min-h-[128px] rounded-2xl leading-7"
                value={draft.teamNote}
                onChange={(event) => setDraft((current) => ({ ...current, teamNote: event.target.value }))}
                rows={5}
                placeholder="공지, 참고 메모, 운영 원칙처럼 팀 안에서 자주 공유할 내용을 적어둘 수 있습니다"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">대표 이미지</p>
                  <p className="break-keep text-sm leading-6 text-slate-500">
                    {TEAM_IMAGE_STORAGE_ENABLED
                      ? 'JPG, PNG, WEBP 형식의 이미지를 업로드할 수 있습니다.'
                      : '현재는 이미지 스토리지가 비활성화되어 있습니다.'}
                  </p>
                </div>
                <label
                  className={cn(
                    'inline-flex min-h-11 cursor-pointer items-center rounded-2xl border px-4 text-sm font-semibold transition-colors',
                    TEAM_IMAGE_STORAGE_ENABLED
                      ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
                      : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                  )}
                >
                  <Upload data-icon="inline-start" aria-hidden="true" />
                  이미지 선택
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={handleImageChange}
                    disabled={!TEAM_IMAGE_STORAGE_ENABLED}
                  />
                </label>
              </div>

              <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/80 p-4">
                {editorImageUrl ? (
                  <img
                    src={editorImageUrl}
                    alt={`${team.name} 대표 이미지 미리보기`}
                    className="aspect-[4/3] w-full rounded-[1.15rem] object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[1.15rem] border border-dashed border-slate-200 bg-white px-6 text-center text-sm leading-6 text-slate-500">
                    아직 등록된 대표 이미지가 없습니다.
                  </div>
                )}
              </div>

              {(team.image_url || selectedImageFile) && TEAM_IMAGE_STORAGE_ENABLED ? (
                <UiButton
                  type="button"
                  variant="outline"
                  className="w-fit rounded-2xl"
                  onClick={() => {
                    setSelectedImageFile(null)
                    setDraft((current) => ({ ...current, removeImage: true }))
                  }}
                >
                  이미지 제거
                </UiButton>
              ) : null}
            </div>
          </div>

          <SheetFooter className="mt-6 flex-col gap-2 sm:flex-row sm:justify-between">
            <UiButton
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={() => {
                setDraft(baseDraft)
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
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
