import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { SkillSelector } from '../../../components/common/SkillSelector'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { InputField } from '../../../components/ui/InputField'
import { cn } from '../../../lib/cn'
import { TEAM_IMAGE_STORAGE_ENABLED, validateTeamImageFile } from '../lib/teamProfileImages'
import { fetchSkillOptions, updateTeamProfile } from '../lib/teams'
import type {
  ProfileSummary,
  SkillOption,
  TeamMemberWithProfile,
  TeamRecord,
  TeamSkillTag,
} from '../types/team'

interface TeamProfileHeroProps {
  team: TeamRecord
  members: TeamMemberWithProfile[]
  leader: ProfileSummary | null
  skills: TeamSkillTag[]
  isLeader: boolean
  currentUserId: string | null
  onOpenMembers: () => void
  onTeamUpdated: (payload: { team: TeamRecord; skills: TeamSkillTag[] }) => void
}

interface TeamProfileDraft {
  name: string
  summary: string
  description: string
  category: string
  maxMembers: string
  isRecruiting: boolean
  skillIds: number[]
  removeImage: boolean
}

function createInitialDraft(team: TeamRecord, skills: TeamSkillTag[]): TeamProfileDraft {
  return {
    name: team.name,
    summary: team.summary,
    description: team.description ?? '',
    category: team.category ?? '',
    maxMembers: team.max_members > 0 ? String(team.max_members) : '',
    isRecruiting: team.is_recruiting,
    skillIds: skills.map((skill) => skill.id),
    removeImage: false,
  }
}

function formatCreatedAt(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '날짜 미정'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getLeaderName(leader: ProfileSummary | null, members: TeamMemberWithProfile[]) {
  return (
    leader?.full_name ||
    leader?.email ||
    members[0]?.profile?.full_name ||
    members[0]?.profile?.email ||
    '리더 미정'
  )
}

function getDisplayName(member: TeamMemberWithProfile) {
  return member.profile?.full_name || member.profile?.email || member.user_id
}

function normalizeSummary(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '팀이 어떤 방향으로 협업하는지 한 줄로 소개해보세요.'
}

function normalizeDescription(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '팀의 목표와 작업 방식, 진행 중인 맥락을 설명해보세요.'
}

function normalizeImageSrc(value: string | null | undefined) {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null
  return trimmed
}

function TeamCoverImage({
  src,
  teamName,
  summary,
  className = '',
}: {
  src: string | null | undefined
  teamName: string
  summary: string
  className?: string
}) {
  const normalizedSrc = normalizeImageSrc(src)

  if (!normalizedSrc) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#eef4ff_0%,#dfeeff_48%,#f7fbff_100%)] p-6 text-center',
          className,
        )}
      >
        <div>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-brand-200 bg-white text-2xl font-semibold text-brand-700">
            {teamName.trim().charAt(0).toUpperCase() || 'T'}
          </div>
          <p className="mt-4 text-lg font-semibold text-campus-900">{teamName}</p>
          <p className="mt-2 text-sm text-campus-600">{summary}</p>
        </div>
      </div>
    )
  }

  return <img src={normalizedSrc} alt={`${teamName} team cover`} className={cn('h-full w-full object-cover', className)} />
}

function MiniAvatar({ member }: { member: TeamMemberWithProfile }) {
  const profileImageUrl = member.profile?.profile_image_url ?? null
  const initial = getDisplayName(member).trim().charAt(0).toUpperCase() || 'T'

  return profileImageUrl ? (
    <img
      src={profileImageUrl}
      alt={getDisplayName(member)}
      className="h-10 w-10 rounded-full border border-white/80 object-cover shadow-sm"
    />
  ) : (
    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white text-sm font-semibold text-campus-700 shadow-sm">
      {initial}
    </div>
  )
}

export function TeamProfileHero({
  team,
  members,
  leader,
  skills,
  isLeader,
  currentUserId,
  onOpenMembers,
  onTeamUpdated,
}: TeamProfileHeroProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<TeamProfileDraft>(() => createInitialDraft(team, skills))
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([])
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(team.image_url ?? '')
  const [isLoadingSkillOptions, setIsLoadingSkillOptions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const isSummaryComposingRef = useRef(false)
  const pendingSummaryValueRef = useRef(draft.summary)

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aLeader = Number(a.user_id === team.leader_id || a.role === 'leader')
      const bLeader = Number(b.user_id === team.leader_id || b.role === 'leader')
      return bLeader - aLeader
    })
  }, [members, team.leader_id])

  const visibleMembers = sortedMembers.slice(0, 4)
  const currentLeaderName = getLeaderName(leader, sortedMembers)
  const occupancyRatio =
    team.max_members > 0 ? Math.min(100, Math.round((members.length / team.max_members) * 100)) : 0
  const displayImageUrl = selectedImageFile ? imagePreviewUrl : draft.removeImage ? '' : team.image_url ?? ''
  const summaryText = normalizeSummary(team.summary)
  const descriptionText = normalizeDescription(team.description)
  const metaItems = [
    { label: 'Members', value: `${members.length}/${team.max_members || '-'}` },
    { label: 'Leader', value: currentLeaderName },
    { label: 'Category', value: team.category?.trim() || '-' },
    { label: 'Created', value: formatCreatedAt(team.created_at) },
  ]

  useEffect(() => {
    if (!isEditing) {
      setDraft(createInitialDraft(team, skills))
      setSelectedImageFile(null)
      setImagePreviewUrl(team.image_url ?? '')
    }
  }, [isEditing, skills, team])

  useEffect(() => {
    if (!isEditing) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isEditing])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  async function ensureSkillOptions() {
    if (skillOptions.length > 0 || isLoadingSkillOptions) return

    setIsLoadingSkillOptions(true)
    try {
      setSkillOptions(await fetchSkillOptions())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '기술 스택 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoadingSkillOptions(false)
    }
  }

  function updateDraft<K extends keyof TeamProfileDraft>(key: K, value: TeamProfileDraft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  function handleSummaryChange(value: string) {
    pendingSummaryValueRef.current = value
    updateDraft('summary', value)
  }

  function handleSummaryCompositionStart() {
    isSummaryComposingRef.current = true
  }

  function handleSummaryCompositionEnd(value: string) {
    isSummaryComposingRef.current = false
    pendingSummaryValueRef.current = value
    setDraft((prev) => (prev.summary === value ? prev : { ...prev, summary: value }))
  }

  function flushSummaryComposition() {
    if (!isSummaryComposingRef.current) return
    isSummaryComposingRef.current = false
    const value = pendingSummaryValueRef.current
    setDraft((prev) => (prev.summary === value ? prev : { ...prev, summary: value }))
  }

  function openEditor() {
    setErrorMessage('')
    setSuccessMessage('')
    setIsEditing(true)
    void ensureSkillOptions()
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const validationMessage = validateTeamImageFile(file)
    if (validationMessage) {
      setErrorMessage(validationMessage)
      event.target.value = ''
      return
    }

    if (imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    setSelectedImageFile(file)
    setImagePreviewUrl(URL.createObjectURL(file))
    setDraft((prev) => ({ ...prev, removeImage: false }))
    setErrorMessage('')
  }

  function validateDraft() {
    if (!draft.name.trim()) return '팀 이름을 입력해주세요.'
    if (draft.summary.trim().length < 4) return '팀 소개는 최소 4자 이상 입력해주세요.'

    const parsedMaxMembers = Number.parseInt(draft.maxMembers, 10)
    if (!Number.isInteger(parsedMaxMembers) || parsedMaxMembers < Math.max(members.length, 2)) {
      return `최대 인원은 최소 ${Math.max(members.length, 2)}명 이상이어야 합니다.`
    }

    return ''
  }

  async function handleSave() {
    flushSummaryComposition()
    if (!currentUserId) {
      setErrorMessage('로그인 후 저장할 수 있습니다.')
      return
    }

    const validationError = validateDraft()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await updateTeamProfile({
        teamId: team.id,
        userId: currentUserId,
        name: draft.name,
        summary: draft.summary,
        description: draft.description,
        category: draft.category,
        maxMembers: Number.parseInt(draft.maxMembers, 10),
        isRecruiting: draft.isRecruiting,
        skillIds: draft.skillIds,
        imageFile: selectedImageFile,
        removeImage: draft.removeImage,
        currentImageUrl: team.image_url,
      })

      onTeamUpdated(result)
      setIsEditing(false)
      setSelectedImageFile(null)
      setImagePreviewUrl(result.team.image_url ?? '')
      setSuccessMessage(
        selectedImageFile || draft.removeImage
          ? '팀 정보와 대표 이미지가 저장되었습니다.'
          : '팀 정보가 저장되었습니다.',
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '팀 정보를 저장하지 못했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border border-campus-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-0 shadow-sm">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr),320px]">
          <div className="min-w-0 border-b border-campus-200 p-5 sm:p-6 xl:border-b-0 xl:border-r xl:p-7">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-brand-600">Team Overview</p>
                <span className="rounded-full border border-campus-200 bg-white px-3 py-1 text-xs font-semibold text-campus-700">
                  {isLeader ? 'Leader Access' : 'Member View'}
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-start gap-3">
                  <h2 className="min-w-0 flex-1 break-words font-display text-3xl font-semibold leading-tight text-campus-900 sm:text-[2.5rem]">
                    {team.name}
                  </h2>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge variant={team.is_recruiting ? 'success' : 'neutral'}>
                      {team.is_recruiting ? '모집중' : '모집 마감'}
                    </Badge>
                    <Badge variant={isLeader ? 'warning' : 'neutral'}>{isLeader ? '리더' : '멤버'}</Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="max-w-3xl text-sm font-medium leading-6 text-campus-800">{summaryText}</p>
                  <p className="max-w-3xl line-clamp-2 text-sm leading-6 text-campus-600 sm:line-clamp-3">
                    {descriptionText}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  {isLeader && (
                    <Button type="button" className="min-w-[140px]" onClick={openEditor}>
                      팀 정보 수정
                    </Button>
                  )}
                  <Button type="button" variant="ghost" className="min-w-[140px]" onClick={onOpenMembers}>
                    멤버 관리
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-campus-200 bg-white/90 px-4 py-3 text-sm text-campus-600">
                {metaItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    <span className="text-campus-400">•</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-campus-400">{item.label}</span>
                    <span className="font-medium text-campus-800">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Connected Skills</p>
                <div className="flex flex-wrap gap-2">
                  {skills.length > 0 ? (
                    skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="inline-flex max-w-full items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700"
                      >
                        <span className="truncate">{skill.name}</span>
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-campus-200 bg-campus-50 px-3 py-1.5 text-xs font-medium text-campus-600">
                      연결된 기술 스택이 없습니다
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-campus-200 bg-white/90 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-campus-900">팀 상태</p>
                    <p className="mt-1 text-xs leading-5 text-campus-500">
                      현재 인원 점유율과 리더 기준 멤버 구성을 빠르게 확인할 수 있습니다.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-campus-100 px-2.5 py-1 text-xs font-semibold text-campus-700">
                    {occupancyRatio}%
                  </span>
                </div>

                <div className="mt-4 flex items-center">
                  <div className="flex shrink-0 gap-2">
                    {visibleMembers.map((member) => (
                      <MiniAvatar key={`${member.team_id}-${member.user_id}`} member={member} />
                    ))}
                  </div>
                  <div className="ml-4 min-w-0">
                    <p className="truncate text-sm font-semibold text-campus-900">{currentLeaderName}</p>
                    <p className="text-xs leading-5 text-campus-500">
                      {team.is_recruiting ? '새로운 팀원을 모집 중입니다.' : '현재 모집은 마감된 상태입니다.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-campus-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-400 transition-[width]"
                    style={{ width: `${occupancyRatio}%` }}
                  />
                </div>
              </div>

              {successMessage && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}
            </div>
          </div>

          <aside className="p-5 sm:p-6 xl:p-6">
            <div className="flex h-full flex-col gap-4">
              <div className="overflow-hidden rounded-[1.6rem] border border-campus-200 bg-campus-100 shadow-sm">
                <div className="flex items-center justify-between border-b border-campus-200 bg-white px-4 py-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-600">Team Image</p>
                    <p className="mt-1 text-sm font-semibold text-campus-900">
                      {team.image_url ? '커스텀 커버' : '기본 커버'}
                    </p>
                  </div>
                  <span className="rounded-full border border-campus-200 bg-campus-50 px-3 py-1 text-[11px] font-semibold text-campus-700">
                    {team.image_url ? 'Active' : 'Fallback'}
                  </span>
                </div>
                <div className="relative aspect-[5/4] min-h-[240px] w-full">
                  <TeamCoverImage src={team.image_url} teamName={team.name} summary={summaryText} className="absolute inset-0" />
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-campus-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-campus-900">Quick Actions</p>
                    <p className="mt-1 text-xs leading-5 text-campus-500">자주 쓰는 운영 액션을 한 곳에서 바로 실행합니다.</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700">Control</span>
                </div>

                <div className="mt-4 flex flex-col gap-2.5">
                  {isLeader && (
                    <Button type="button" className="w-full justify-center" onClick={openEditor}>
                      팀 정보 수정
                    </Button>
                  )}
                  <Button type="button" variant="ghost" className="w-full justify-center" onClick={onOpenMembers}>
                    멤버 관리
                  </Button>
                  <button
                    type="button"
                    disabled
                    title="현재 Overview에는 팀 삭제 동작이 연결되어 있지 않습니다."
                    className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-5 py-2.5 text-sm font-medium text-rose-500 opacity-80"
                  >
                    팀 삭제
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Card>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-campus-900/60 px-4 py-6 backdrop-blur-sm">
          <Card className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[2rem] border border-campus-200 p-0 shadow-[0_30px_100px_rgba(15,23,42,0.22)]">
            <div className="border-b border-campus-200 px-6 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-brand-600">Edit Team</p>
                  <h3 className="mt-2 font-display text-2xl text-campus-900">팀 프로필 수정</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-campus-600">
                    팀 이미지, 소개, 분류, 모집 상태와 기술 스택을 한 번에 조정할 수 있습니다.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => !isSaving && setIsEditing(false)}
                >
                  닫기
                </Button>
              </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[360px,1fr]">
              <div className="border-b border-campus-200 bg-campus-50/70 p-6 xl:border-b-0 xl:border-r">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[1.75rem] border border-campus-200 bg-campus-100">
                    <div className="relative aspect-[5/4] min-h-[260px] w-full">
                      <TeamCoverImage
                        src={displayImageUrl}
                        teamName={draft.name || team.name}
                        summary={normalizeSummary(draft.summary || team.summary)}
                        className="absolute inset-0"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-campus-200 bg-white px-4 py-4 text-xs leading-5 text-campus-500">
                    {selectedImageFile
                      ? `선택한 이미지: ${selectedImageFile.name}`
                      : draft.removeImage
                        ? '현재 이미지를 제거하도록 설정했습니다.'
                        : team.image_url
                          ? '현재 대표 이미지를 유지합니다.'
                          : '아직 업로드된 대표 이미지가 없습니다.'}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-campus-200 bg-white px-4 py-2.5 text-sm font-medium text-campus-700 transition hover:bg-brand-50">
                      이미지 선택
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelectedImageFile(null)
                        setImagePreviewUrl('')
                        setDraft((prev) => ({ ...prev, removeImage: true }))
                      }}
                      disabled={isSaving}
                    >
                      이미지 제거
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSelectedImageFile(null)
                        setImagePreviewUrl(team.image_url ?? '')
                        setDraft((prev) => ({ ...prev, removeImage: false }))
                      }}
                      disabled={isSaving}
                    >
                      원래대로
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4 text-sm text-brand-700">
                    {TEAM_IMAGE_STORAGE_ENABLED
                      ? '이미지는 Supabase Storage에 업로드되며 저장 후 팀 프로필에 바로 반영됩니다.'
                      : '현재 이미지 업로드가 비활성화되어 있습니다.'}
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6 sm:p-8">
                {errorMessage && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {errorMessage}
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <InputField
                    label="팀 이름"
                    value={draft.name}
                    onChange={(event) => updateDraft('name', event.target.value)}
                    placeholder="예: Campus Makers"
                    disabled={isSaving}
                  />
                  <InputField
                    label="카테고리"
                    value={draft.category}
                    onChange={(event) => updateDraft('category', event.target.value)}
                    placeholder="예: 웹 협업"
                    disabled={isSaving}
                  />
                  <InputField
                    label="최대 인원"
                    type="number"
                    inputMode="numeric"
                    step={1}
                    value={draft.maxMembers}
                    onChange={(event) => updateDraft('maxMembers', event.target.value)}
                    disabled={isSaving}
                  />
                  <label className="space-y-2 text-sm font-medium text-campus-700">
                    <span>모집 상태</span>
                    <span className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-campus-200 bg-campus-50 px-4 text-sm text-campus-700">
                      <input
                        type="checkbox"
                        checked={draft.isRecruiting}
                        onChange={(event) => updateDraft('isRecruiting', event.target.checked)}
                        className="h-4 w-4 rounded border-campus-300 text-brand-500 focus:ring-brand-300"
                        disabled={isSaving}
                      />
                      {draft.isRecruiting ? '현재 새로운 팀원을 모집 중입니다.' : '현재 새로운 팀원을 모집하지 않습니다.'}
                    </span>
                  </label>
                </div>

                <InputField
                  label="팀 소개"
                  value={draft.summary}
                  onChange={(event) => handleSummaryChange(event.target.value)}
                  onCompositionStart={handleSummaryCompositionStart}
                  onCompositionEnd={(event) => handleSummaryCompositionEnd(event.currentTarget.value)}
                  placeholder="한 줄로 팀을 소개해주세요."
                  disabled={isSaving}
                />

                <label className="space-y-2 text-sm font-medium text-campus-700">
                  <span>상세 설명</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraft('description', event.target.value)}
                    rows={7}
                    placeholder="팀의 목표, 작업 방식, 진행 중인 내용을 소개해주세요."
                    className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                    disabled={isSaving}
                  />
                </label>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-campus-700">기술 스택</p>
                    <p className="mt-1 text-xs text-campus-500">팀에서 사용하는 기술을 연결해두면 팀 개요와 상세 편집에 함께 반영됩니다.</p>
                  </div>

                  {isLoadingSkillOptions ? (
                    <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-5 text-sm text-campus-600">
                      기술 목록을 불러오는 중입니다...
                    </div>
                  ) : (
                    <SkillSelector
                      skills={skillOptions}
                      selectedSkillIds={draft.skillIds}
                      onSelectSkill={(skillId) => {
                        if (!draft.skillIds.includes(skillId)) {
                          updateDraft('skillIds', [...draft.skillIds, skillId])
                        }
                      }}
                      onDeselectSkill={(skillId) =>
                        updateDraft(
                          'skillIds',
                          draft.skillIds.filter((currentSkillId) => currentSkillId !== skillId),
                        )
                      }
                      showSelectedList
                      emptySelectedMessage="선택된 기술 스택이 없습니다."
                    />
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-campus-200 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => !isSaving && setIsEditing(false)}
                    disabled={isSaving}
                  >
                    취소
                  </Button>
                  <Button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void handleSave()}
                    disabled={isSaving}
                  >
                    {isSaving ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
