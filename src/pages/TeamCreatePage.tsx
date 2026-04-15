import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  AlertCircle,
  ImagePlus,
  LoaderCircle,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SkillSelector } from '../components/common/SkillSelector'
import { Card as SurfaceCard } from '../components/ui/Card'
import { useImeSafeSubmit } from '../hooks/useImeSafeSubmit'
import { useAuth } from '../features/auth/context/useAuth'
import { TeamProfileImage } from '../features/teams/components/TeamProfileImage'
import {
  TEAM_IMAGE_MAX_SIZE_BYTES,
  TEAM_IMAGE_STORAGE_ENABLED,
  validateTeamImageFile,
} from '../features/teams/lib/teamProfileImages'
import {
  buildTeamStoryDescription,
  splitTeamStoryDescription,
  type TeamStoryField,
} from '../features/teams/lib/teamStoryDescription'
import {
  createTeamWithRelations,
  fetchSkillOptions,
  getTeamCreationErrorMessage,
  TEAM_SUMMARY_MAX_LENGTH,
} from '../features/teams/lib/teams'
import type { SkillOption } from '../features/teams/types/team'
import { Alert, AlertDescription, AlertTitle } from '@/components/shadcn/alert'
import { Badge } from '@/components/shadcn/badge'
import { Button } from '@/components/shadcn/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shadcn/card'
import { Checkbox } from '@/components/shadcn/checkbox'
import { Input } from '@/components/shadcn/input'
import { Label } from '@/components/shadcn/label'
import { Separator } from '@/components/shadcn/separator'
import { Textarea } from '@/components/shadcn/textarea'
import { cn } from '@/lib/utils'

interface TeamCreateFormState {
  name: string
  summary: string
  description: string
  maxMembers: string
  category: string
  isRecruiting: boolean
}

type TeamCreateFieldName = 'name' | 'summary' | 'maxMembers' | 'image'
type TeamCreateFieldErrors = Partial<Record<TeamCreateFieldName, string>>

const DEFAULT_MAX_MEMBERS = 5

const initialForm: TeamCreateFormState = {
  name: '',
  summary: '',
  description: '',
  maxMembers: '5',
  category: '',
  isRecruiting: true,
}

const fieldIds: Record<TeamCreateFieldName, string> = {
  name: 'team-create-name',
  summary: 'team-create-summary',
  maxMembers: 'team-create-max-members',
  image: 'team-create-image-input',
}

function resolveMaxMembers(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isInteger(parsed) && parsed >= 2 ? parsed : DEFAULT_MAX_MEMBERS
}

function buildValidationErrors(form: TeamCreateFormState, imageFile: File | null): TeamCreateFieldErrors {
  const nextErrors: TeamCreateFieldErrors = {}

  if (!form.name.trim()) {
    nextErrors.name = '팀 이름은 필수예요.'
  }

  if (!form.summary.trim()) {
    nextErrors.summary = '한 줄 소개를 입력해 주세요.'
  } else if (form.summary.trim().length > TEAM_SUMMARY_MAX_LENGTH) {
    nextErrors.summary = `한 줄 소개는 ${TEAM_SUMMARY_MAX_LENGTH}자 이내로 입력해 주세요.`
  }

  if (form.maxMembers.trim()) {
    const parsed = Number.parseInt(form.maxMembers, 10)

    if (!Number.isInteger(parsed) || parsed < 2) {
      nextErrors.maxMembers = '팀 인원은 2명 이상으로 설정해 주세요.'
    }
  }

  if (imageFile) {
    const imageValidationMessage = validateTeamImageFile(imageFile)

    if (imageValidationMessage) {
      nextErrors.image = imageValidationMessage
    }
  }

  return nextErrors
}

function focusFirstInvalidField(errors: TeamCreateFieldErrors) {
  const firstKey = (['name', 'summary', 'maxMembers', 'image'] as TeamCreateFieldName[]).find((key) => errors[key])

  if (!firstKey) return

  document.getElementById(fieldIds[firstKey])?.focus()
}

export function TeamCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const ime = useImeSafeSubmit()
  const formRef = useRef<HTMLFormElement | null>(null)
  const [form, setForm] = useState<TeamCreateFormState>(initialForm)
  const [skills, setSkills] = useState<SkillOption[]>([])
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [optionsMessage, setOptionsMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [fieldErrors, setFieldErrors] = useState<TeamCreateFieldErrors>({})

  const imageSizeLimitLabel = `${Math.round(TEAM_IMAGE_MAX_SIZE_BYTES / 1024 / 1024)}MB 이하`
  const previewName = form.name.trim() || '새 팀'
  const storyDraft = splitTeamStoryDescription(form.description)

  useEffect(() => {
    let isMounted = true

    async function loadOptions() {
      setIsLoadingOptions(true)
      setOptionsMessage('')

      const [skillsResult] = await Promise.allSettled([fetchSkillOptions()])

      if (!isMounted) return

      if (skillsResult.status === 'fulfilled') {
        setSkills(skillsResult.value)
      } else {
        setSkills([])
      }

      const messages: string[] = []

      if (skillsResult.status === 'rejected') {
        messages.push('기술 목록을 지금은 불러오지 못했어요. 팀을 먼저 만든 뒤 나중에 다시 추가해도 괜찮아요.')
      }

      setOptionsMessage(messages.join(' '))
      setIsLoadingOptions(false)
    }

    void loadOptions()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedImageFile) {
      setPreviewImageUrl(null)
      return
    }

    const objectUrl = URL.createObjectURL(selectedImageFile)
    setPreviewImageUrl(objectUrl)

    return () => URL.revokeObjectURL(objectUrl)
  }, [selectedImageFile])

  function clearFieldError(field: TeamCreateFieldName) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      return { ...prev, [field]: undefined }
    })
  }

  function updateForm<K extends keyof TeamCreateFormState>(key: K, value: TeamCreateFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrorMessage('')

    if (key === 'name') clearFieldError('name')
    if (key === 'summary') clearFieldError('summary')
    if (key === 'maxMembers') clearFieldError('maxMembers')
  }

  function updateStoryForm(field: TeamStoryField, value: string) {
    const nextStory = {
      ...storyDraft,
      [field]: value,
    }

    updateForm('description', buildTeamStoryDescription(nextStory))
  }

  function addSkill(skillId: number) {
    if (selectedSkills.includes(skillId)) return

    setSelectedSkills((prev) => [...prev, skillId])
    setErrorMessage('')
  }

  function removeSkill(skillId: number) {
    setSelectedSkills((prev) => prev.filter((id) => id !== skillId))
  }

  function readFormSnapshot(): TeamCreateFormState {
    const formElement = formRef.current

    if (!formElement) {
      return form
    }

    const nameInput = formElement.elements.namedItem('teamName') as HTMLInputElement | null
    const summaryInput = formElement.elements.namedItem('teamSummary') as HTMLInputElement | null
    const directionInput = formElement.elements.namedItem('teamStoryDirection') as HTMLTextAreaElement | null
    const workflowInput = formElement.elements.namedItem('teamStoryWorkflow') as HTMLTextAreaElement | null
    const operationInput = formElement.elements.namedItem('teamStoryOperation') as HTMLTextAreaElement | null
    const maxMembersInput = formElement.elements.namedItem('teamMaxMembers') as HTMLInputElement | null
    const categoryInput = formElement.elements.namedItem('teamCategory') as HTMLInputElement | null
    const recruitingInput = document.getElementById('team-create-is-recruiting') as HTMLButtonElement | HTMLInputElement | null
    const fallbackStory = splitTeamStoryDescription(form.description)
    const description = buildTeamStoryDescription({
      direction: directionInput?.value ?? fallbackStory.direction,
      workflow: workflowInput?.value ?? fallbackStory.workflow,
      operation: operationInput?.value ?? fallbackStory.operation,
    })

    return {
      name: nameInput?.value ?? form.name,
      summary: summaryInput?.value ?? form.summary,
      description,
      maxMembers: maxMembersInput?.value ?? form.maxMembers,
      category: categoryInput?.value ?? form.category,
      isRecruiting:
        recruitingInput instanceof HTMLInputElement
          ? recruitingInput.checked
          : recruitingInput?.getAttribute('data-state') === 'checked'
            ? true
            : form.isRecruiting,
    }
  }

  function handleImageSelection(file: File | null) {
    if (!file) return

    if (!TEAM_IMAGE_STORAGE_ENABLED) {
      const storageDisabledMessage = '현재는 팀 이미지 업로드를 사용할 수 없어요. 잠시 후 다시 시도해 주세요.'
      setFieldErrors((prev) => ({ ...prev, image: storageDisabledMessage }))
      setErrorMessage(storageDisabledMessage)
      return
    }

    const validationMessage = validateTeamImageFile(file)

    if (validationMessage) {
      setFieldErrors((prev) => ({ ...prev, image: validationMessage }))
      setErrorMessage(validationMessage)
      return
    }

    setSelectedImageFile(file)
    setErrorMessage('')
    clearFieldError('image')
  }

  function handleImageInputChange(event: ChangeEvent<HTMLInputElement>) {
    handleImageSelection(event.target.files?.[0] ?? null)
    event.target.value = ''
  }

  function handleImageDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    setIsDraggingImage(false)
    handleImageSelection(event.dataTransfer.files?.[0] ?? null)
  }

  async function handleSubmit() {
    if (!user) {
      setErrorMessage('로그인 후 팀을 만들 수 있어요.')
      return
    }

    const nextForm = readFormSnapshot()
    setForm(nextForm)

    const validationErrors = buildValidationErrors(nextForm, selectedImageFile)

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setErrorMessage('필수 항목과 입력 형식을 다시 확인해 주세요.')
      focusFirstInvalidField(validationErrors)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const teamId = await createTeamWithRelations({
        userId: user.id,
        name: nextForm.name,
        summary: nextForm.summary,
        description: nextForm.description,
        maxMembers: resolveMaxMembers(nextForm.maxMembers),
        category: nextForm.category,
        isRecruiting: nextForm.isRecruiting,
        skillIds: selectedSkills,
        imageFile: selectedImageFile,
      })

      navigate(`/teams/${teamId}`, { replace: true })
    } catch (error: unknown) {
      setErrorMessage(getTeamCreationErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  const imeInputProps = {
    onCompositionStart: ime.handleCompositionStart,
    onCompositionEnd: ime.handleCompositionEnd,
    onKeyDown: ime.preventEnterWhileComposing<HTMLInputElement>(),
  }

  const imeTextareaProps = {
    onCompositionStart: ime.handleCompositionStart,
    onCompositionEnd: ime.handleCompositionEnd,
    onKeyDown: ime.preventEnterWhileComposing<HTMLTextAreaElement>(),
  }

  return (
    <section className="page-shell">
      <SurfaceCard className="page-hero overflow-hidden border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.2),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(244,248,255,0.94))] px-0 py-0">
        <div className="page-hero-inner items-start gap-5">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="h-8 rounded-full border-brand-200 bg-white/90 px-3 text-brand-700">
                TEAM SETUP
              </Badge>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-balance font-display text-3xl leading-[1.12] text-campus-900 sm:text-4xl">
                팀 방향을 또렷하게 정리하고
                <br />
                바로 팀 페이지로 이어가 보세요.
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-campus-700 sm:text-base">
                팀 이름과 소개를 먼저 정리하면 팀 목록과 상세 페이지에서 훨씬 자연스럽게 보여요.
                필요한 정보만 차근차근 입력하고, 이미지는 아래에서 편하게 추가하면 됩니다.
              </p>
            </div>
          </div>
        </div>
      </SurfaceCard>

      <Card className="rounded-[1.5rem] border-brand-200/80 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,255,255,0.96))] shadow-[0_20px_50px_-42px_rgba(15,23,42,0.32)]">
        <CardContent className="flex gap-4 px-5 py-5 sm:px-6">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
            <Sparkles aria-hidden="true" className="size-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-base font-semibold tracking-[-0.02em] text-slate-950">
              팀 설명이 구체적일수록 AI 기능도 더 잘 작동해요.
            </h2>
            <p className="break-keep text-sm leading-6 text-slate-600">
              한 줄 소개, 상세 설명, 기술 스택이 잘 정리되어 있으면 AI가 팀의 문맥을 더 정확하게 이해해서 추천, 생성, 배분 같은 기능을 더 알맞게 도와줄 수 있어요.
            </p>
          </div>
        </CardContent>
      </Card>

      {optionsMessage ? (
        <Alert className="border-campus-200 bg-white/90 text-campus-900" aria-live="polite">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>일부 옵션 정보를 아직 불러오지 못했어요</AlertTitle>
          <AlertDescription>{optionsMessage}</AlertDescription>
        </Alert>
      ) : null}

      <form ref={formRef} className="flex flex-col gap-6" onSubmit={ime.createSubmitHandler(handleSubmit)} noValidate>
        <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.4)]">
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-slate-950">기본 정보</CardTitle>
              <Badge className="h-7 rounded-full px-3">필수</Badge>
            </div>
            <CardDescription className="leading-6">
              팀 목록에서 가장 먼저 보이는 정보예요. 팀 이름과 한 줄 소개를 먼저 정리해 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor={fieldIds.name} className="text-sm font-semibold text-slate-900">
                팀 이름
              </Label>
              <Input
                id={fieldIds.name}
                name="teamName"
                autoComplete="off"
                placeholder="예: AI 스터디 팀"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                aria-invalid={Boolean(fieldErrors.name)}
                className="h-12 rounded-2xl px-4 text-sm"
                {...imeInputProps}
              />
              <p className={cn('text-xs', fieldErrors.name ? 'text-rose-600' : 'text-slate-500')}>
                {fieldErrors.name ?? '팀 목록에서 가장 먼저 보여질 이름이에요.'}
              </p>
            </div>

            <Separator />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),220px]">
              <div className="flex flex-col gap-2">
                <Label htmlFor={fieldIds.summary} className="text-sm font-semibold text-slate-900">
                  한 줄 소개
                </Label>
                <Input
                  id={fieldIds.summary}
                  name="teamSummary"
                  autoComplete="off"
                  placeholder="무엇을 함께 만들고 싶은지 한 줄로 적어주세요."
                  value={form.summary}
                  onChange={(event) => updateForm('summary', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.summary)}
                  maxLength={TEAM_SUMMARY_MAX_LENGTH}
                  className="h-12 rounded-2xl px-4 text-sm"
                  {...imeInputProps}
                />
                <p className={cn('text-xs', fieldErrors.summary ? 'text-rose-600' : 'text-slate-500')}>
                  {fieldErrors.summary ?? `짧아도 괜찮아요. ${form.summary.trim().length}/${TEAM_SUMMARY_MAX_LENGTH}자`}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="team-create-category" className="text-sm font-semibold text-slate-900">
                    카테고리
                  </Label>
                  <Badge variant="outline" className="rounded-full px-2.5 text-[11px]">
                    선택
                  </Badge>
                </div>
                <Input
                  id="team-create-category"
                  name="teamCategory"
                  autoComplete="off"
                  placeholder="예: AI, 웹, 모바일"
                  value={form.category}
                  onChange={(event) => updateForm('category', event.target.value)}
                  className="h-12 rounded-2xl px-4 text-sm"
                  {...imeInputProps}
                />
                <p className="text-xs text-slate-500">
                  팀 분야를 적어두면 관심 있는 사람이 더 쉽게 팀을 찾을 수 있어요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.36)]">
          <CardHeader className="gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-slate-950">팀 소개</CardTitle>
              <Badge variant="outline" className="rounded-full px-2.5 text-[11px]">
                선택
              </Badge>
            </div>
            <CardDescription className="leading-5">
              overview에 그대로 연결되는 방향, 협업 방식, 운영 현황을 나눠서 적어 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label htmlFor="team-create-story-direction" className="text-sm font-semibold text-slate-900">
                팀의 방향
              </Label>
              <Textarea
                id="team-create-story-direction"
                name="teamStoryDirection"
                autoComplete="off"
                placeholder="무엇을 만들고 싶은지, 어떤 문제를 해결하려는지 적어주세요."
                value={storyDraft.direction}
                onChange={(event) => updateStoryForm('direction', event.target.value)}
                className="min-h-[116px] rounded-[1.35rem] px-4 py-3 text-sm leading-7"
                rows={4}
                {...imeTextareaProps}
              />
              <p className="text-xs text-slate-500">overview의 ‘무엇을 목표로 움직이고 있나요’ 카드에 반영돼요.</p>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Label htmlFor="team-create-story-workflow" className="text-sm font-semibold text-slate-900">
                협업 방식
              </Label>
              <Textarea
                id="team-create-story-workflow"
                name="teamStoryWorkflow"
                autoComplete="off"
                placeholder="어떤 방식으로 회의하고, 업무를 나누고, 결과를 공유할지 적어주세요."
                value={storyDraft.workflow}
                onChange={(event) => updateStoryForm('workflow', event.target.value)}
                className="min-h-[116px] rounded-[1.35rem] px-4 py-3 text-sm leading-7"
                rows={4}
                {...imeTextareaProps}
              />
              <p className="text-xs text-slate-500">overview의 ‘어떤 방식으로 실행하고 있나요’ 카드에 반영돼요.</p>
            </div>

            <Separator />

            <div className="flex flex-col gap-2">
              <Label htmlFor="team-create-story-operation" className="text-sm font-semibold text-slate-900">
                운영 현황
              </Label>
              <Textarea
                id="team-create-story-operation"
                name="teamStoryOperation"
                autoComplete="off"
                placeholder="현재 팀 단계, 모집 상황, 리더가 공유하고 싶은 운영 맥락을 적어주세요."
                value={storyDraft.operation}
                onChange={(event) => updateStoryForm('operation', event.target.value)}
                className="min-h-[116px] rounded-[1.35rem] px-4 py-3 text-sm leading-7"
                rows={4}
                {...imeTextareaProps}
              />
              <p className="text-xs text-slate-500">입력한 내용 뒤에 현재 인원과 운영 리더 정보가 함께 표시돼요.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card className="h-full rounded-[1.75rem] border-slate-200/80 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.36)]">
          <CardHeader className="gap-1.5">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                기술 및 모집 정보
              </CardTitle>
              <Badge variant="outline" className="rounded-full px-2.5 text-[11px]">
                선택
              </Badge>
            </div>
            <CardDescription className="leading-5">
              팀 인원과 필요한 기술을 함께 정리해 보세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 items-start gap-4">
              <div className="flex flex-col gap-[0.3125rem]">
                <div className="flex items-center gap-2">
                  <Label htmlFor={fieldIds.maxMembers} className="text-sm font-semibold text-slate-900">
                    팀 인원
                  </Label>
                  <Badge variant="outline" className="rounded-full px-2.5 text-[11px]">
                    선택
                  </Badge>
                </div>
                <Input
                  id={fieldIds.maxMembers}
                  name="teamMaxMembers"
                  type="number"
                  min={2}
                  step={1}
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.maxMembers}
                  onChange={(event) => updateForm('maxMembers', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.maxMembers)}
                  className="h-12 w-full rounded-2xl px-4 text-sm"
                />
                <p className={cn('px-1 text-[11px] leading-4', fieldErrors.maxMembers ? 'text-rose-600' : 'text-slate-500')}>
                  {fieldErrors.maxMembers ?? '비워두면 기본 인원으로 설정돼요.'}
                </p>
              </div>

              <div className="flex flex-col gap-[0.3125rem]">
                <div className="flex items-center gap-2 opacity-0" aria-hidden="true">
                  <span className="text-sm font-semibold">모집 상태</span>
                  <Badge variant="outline" className="rounded-full px-2.5 text-[11px]">
                    선택
                  </Badge>
                </div>
                <div className="flex h-12 w-full items-center rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="team-create-is-recruiting"
                      checked={form.isRecruiting}
                      onCheckedChange={(checked) => updateForm('isRecruiting', Boolean(checked))}
                      className="shrink-0"
                    />
                    <div className="min-w-0">
                      <Label htmlFor="team-create-is-recruiting" className="text-sm font-semibold leading-none text-slate-900">
                        현재 모집 중으로 표시하기
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {isLoadingOptions ? (
              <div className="rounded-[1.35rem] border border-slate-200/80 bg-slate-50/70 px-4 py-5 text-sm text-slate-500">
                기술 목록을 불러오는 중이에요...
              </div>
            ) : (
              <SkillSelector
                skills={skills}
                selectedSkillIds={selectedSkills}
                onSelectSkill={addSkill}
                onDeselectSkill={removeSkill}
                showSelectedList
                emptySelectedMessage="아직 선택한 기술이 없어요. 비워둔 채로 팀을 먼저 만들어도 괜찮아요."
              />
            )}
          </CardContent>
          </Card>

          <Card className="h-full rounded-[1.75rem] border-slate-200/80 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.36)]">
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-semibold tracking-[-0.03em] text-slate-950">팀 이미지</CardTitle>
                <Badge variant="outline" className="rounded-full px-2.5 text-[11px]">
                  선택
                </Badge>
              </div>
              <CardDescription className="leading-6">
                기술 및 모집 정보와 함께 대표 이미지를 확인할 수 있어요.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.88))] p-2.5">
                <TeamProfileImage
                  src={previewImageUrl}
                  alt={`${previewName} 팀 이미지 미리보기`}
                  teamName={previewName}
                  className="aspect-[16/7] w-full rounded-[1rem]"
                  priority="editor"
                />
              </div>

              <label
                className={cn(
                  'flex min-h-[116px] cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border border-dashed px-5 py-4 text-center transition-colors',
                  TEAM_IMAGE_STORAGE_ENABLED
                    ? 'border-slate-300 bg-slate-50/70 hover:border-brand-300 hover:bg-brand-50/60'
                    : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400',
                  isDraggingImage && TEAM_IMAGE_STORAGE_ENABLED ? 'border-brand-400 bg-brand-50' : '',
                  fieldErrors.image ? 'border-rose-300 bg-rose-50/80' : '',
                )}
                onDragEnter={(event) => {
                  event.preventDefault()
                  if (TEAM_IMAGE_STORAGE_ENABLED) {
                    setIsDraggingImage(true)
                  }
                }}
                onDragLeave={(event) => {
                  event.preventDefault()
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                  setIsDraggingImage(false)
                }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleImageDrop}
              >
                <input
                  id={fieldIds.image}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleImageInputChange}
                  disabled={!TEAM_IMAGE_STORAGE_ENABLED}
                />
                <div className="flex size-11 items-center justify-center rounded-[1.25rem] bg-white text-brand-700 shadow-sm">
                  {selectedImageFile ? <ImagePlus aria-hidden="true" /> : <UploadCloud aria-hidden="true" />}
                </div>
                <p className="mt-2.5 text-sm font-semibold text-slate-950">
                  {TEAM_IMAGE_STORAGE_ENABLED ? '클릭하거나 이미지를 놓아 업로드' : '이미지 업로드를 사용할 수 없음'}
                </p>
                <p className="mt-1.5 max-w-[18rem] text-sm leading-5 text-slate-500">
                  {TEAM_IMAGE_STORAGE_ENABLED
                    ? `JPG, PNG, WEBP 파일을 ${imageSizeLimitLabel}까지 업로드할 수 있어요.`
                    : '스토리지 설정이 준비되면 이곳에서 팀 이미지를 연결할 수 있어요.'}
                </p>
                {selectedImageFile ? (
                  <p className="mt-2.5 text-xs text-slate-500">선택한 파일: {selectedImageFile.name}</p>
                ) : null}
              </label>

              <p className={cn('text-xs', fieldErrors.image ? 'text-rose-600' : 'text-slate-500')}>
                {fieldErrors.image ?? '이미지를 선택하지 않으면 기본 팀 이미지가 표시돼요.'}
              </p>

              {selectedImageFile ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-2xl"
                  onClick={() => {
                    setSelectedImageFile(null)
                    clearFieldError('image')
                  }}
                >
                  <X data-icon="inline-start" aria-hidden="true" />
                  이미지 선택 해제
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {errorMessage ? (
          <Alert variant="destructive" className="border-rose-200 bg-rose-50/90" aria-live="polite">
            <AlertCircle aria-hidden="true" />
            <AlertTitle>팀을 생성하지 못했어요</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Card className="rounded-[1.75rem] border-slate-200/80 shadow-[0_24px_64px_-52px_rgba(15,23,42,0.32)]">
          <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-950">팀 이름과 소개를 먼저 정리해 주세요.</p>
              <p className="text-sm leading-6 text-slate-500">
                필수 정보만 입력해도 팀을 만들 수 있고, 세부 내용은 나중에 더 다듬어도 괜찮아요.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:items-end">
              <Button
                type="submit"
                size="lg"
                className="min-w-[220px] rounded-2xl"
                onMouseDown={ime.preventBlurOnMouseDown}
                disabled={isSubmitting}
              >
                {isSubmitting ? <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden="true" /> : null}
                {isSubmitting ? '팀 생성 중...' : '팀 만들기'}
              </Button>
              <p className="text-xs text-slate-500">팀 이미지는 없어도 바로 팀을 생성할 수 있어요.</p>
            </div>
          </CardContent>
        </Card>
      </form>
    </section>
  )
}
