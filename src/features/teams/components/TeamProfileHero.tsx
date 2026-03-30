import { useEffect, useMemo, useState, type ChangeEvent, type CSSProperties } from 'react'
import { SkillSelector } from '../../../components/common/SkillSelector'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { InputField } from '../../../components/ui/InputField'
import { cn } from '../../../lib/cn'
import { fetchSkillOptions, updateTeamProfile } from '../lib/teams'
import { TEAM_IMAGE_STORAGE_ENABLED } from '../lib/teamProfileImages'
import type {
  ProfileSummary,
  SkillOption,
  TeamMemberRole,
  TeamMemberWithProfile,
  TeamRecord,
  TeamSkillTag,
} from '../types/team'

const MAX_TEAM_IMAGE_SIZE = 5 * 1024 * 1024

const summaryClampStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 3,
  overflow: 'hidden',
}

const descriptionClampStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 5,
  overflow: 'hidden',
}

const previewDescriptionClampStyle: CSSProperties = {
  display: '-webkit-box',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 2,
  overflow: 'hidden',
}

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

function isLeaderRole(role: TeamMemberRole) {
  return role === 'leader'
}

function displayName(member: TeamMemberWithProfile) {
  return member.profile?.full_name || member.profile?.email || member.user_id
}

function resolveLeaderName(profile: ProfileSummary | null, members: TeamMemberWithProfile[]) {
  return profile?.full_name || profile?.email || members[0]?.profile?.full_name || members[0]?.profile?.email || '팀 리더'
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

function createdDateLabel(createdAt: string) {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '날짜 미확인'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function teamInitial(teamName: string) {
  return teamName.trim().charAt(0).toUpperCase() || 'T'
}

function imageAlt(teamName: string) {
  return `${teamName} team cover`
}

function recruitingLabel(isRecruiting: boolean) {
  return isRecruiting ? '모집 중' : '모집 마감'
}

function sanitizedDescription(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0
    ? normalized
    : '아직 상세 설명이 없습니다. 팀의 목표, 협업 방식, 기대하는 결과물을 소개해 보세요.'
}

function sanitizedSummary(value: string | null | undefined) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0
    ? normalized
    : '팀의 방향성과 협업 스타일을 소개해 보세요.'
}

function metricValue(value: string) {
  return value.length > 0 ? value : '-'
}

function normalizeImageSrc(value: string | null | undefined) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed === 'null' || trimmed === 'undefined') return null
  return trimmed
}

function TeamCoverImageFallback({
  teamName,
  category,
  summary,
}: {
  teamName: string
  category: string | null
  summary: string | null
}) {
  return (
    <div className="absolute inset-0 bg-[linear-gradient(145deg,#eef4ff_0%,#dfeeff_48%,#f7fbff_100%)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(88,112,255,0.22),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(18,198,170,0.18),transparent_30%)]" />
      <div className="absolute left-4 top-4 h-24 w-24 rounded-full bg-brand-200/35 blur-2xl" />
      <div className="absolute bottom-4 right-4 h-24 w-24 rounded-full bg-accent-200/30 blur-2xl" />

      <div className="relative flex h-full flex-col items-center justify-center px-6 py-8 text-center">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-[1.8rem] border border-brand-200 bg-white/90 text-3xl font-semibold text-brand-700 shadow-[0_10px_30px_rgba(53,93,255,0.16)]">
          {teamInitial(teamName)}
        </div>

        <div className="mt-5 max-w-[15rem] space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
            Team Image Placeholder
          </p>
          <p className="break-words font-display text-xl font-semibold leading-tight text-campus-900">
            {teamName}
          </p>
          <p className="text-sm leading-6 text-campus-600" style={summaryClampStyle}>
            {summary?.trim() || '팀 이미지를 등록하면 이 영역에 대표 이미지가 표시됩니다.'}
          </p>
          {category && (
            <div className="pt-1">
              <span className="inline-flex rounded-full border border-brand-100 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-700">
                {category}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamCoverImageContent({
  src,
  teamName,
  category,
  summary,
  imageClassName,
}: {
  src?: string
  teamName: string
  category: string | null
  summary: string | null
  imageClassName?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(src) && !failed

  if (!showImage) {
    return <TeamCoverImageFallback teamName={teamName} category={category} summary={summary} />
  }

  return (
    <>
      {!loaded && <div className="absolute inset-0 animate-pulse bg-campus-200/70" aria-hidden="true" />}
      <img
        src={src}
        alt={imageAlt(teamName)}
        className={cn(
          'absolute inset-0 h-full w-full object-cover object-center transition duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          imageClassName,
        )}
        onLoad={() => {
          if (import.meta.env.DEV) {
            console.debug('[TeamCoverImage] load success', { src })
          }
          setLoaded(true)
        }}
        onError={() => {
          if (import.meta.env.DEV) {
            console.error('[TeamCoverImage] load failed', { src })
          }
          setFailed(true)
          setLoaded(true)
        }}
      />
    </>
  )
}

function TeamCoverImage({
  src,
  teamName,
  category,
  summary,
  className = '',
  imageClassName = '',
}: {
  src: string | null | undefined
  teamName: string
  category: string | null
  summary: string | null
  className?: string
  imageClassName?: string
}) {
  const normalizedSrc = normalizeImageSrc(src)

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <TeamCoverImageContent
        key={normalizedSrc ?? '__fallback__'}
        src={normalizedSrc ?? undefined}
        teamName={teamName}
        category={category}
        summary={summary}
        imageClassName={imageClassName}
      />
    </div>
  )
}

function MiniAvatar({ member, className = '' }: { member: TeamMemberWithProfile; className?: string }) {
  const profileImageUrl = member.profile?.profile_image_url ?? null
  const initial = displayName(member).trim().charAt(0).toUpperCase() || 'T'

  return profileImageUrl ? (
    <img
      src={profileImageUrl}
      alt={displayName(member)}
      className={`h-10 w-10 rounded-full border border-white/70 object-cover shadow-sm ${className}`}
    />
  ) : (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white/85 text-sm font-semibold text-campus-700 shadow-sm ${className}`}
    >
      {initial}
    </div>
  )
}

function MetaBlock({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="flex min-h-[120px] flex-col justify-between rounded-[1.35rem] border border-campus-200/80 bg-white/84 px-4 py-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">{label}</p>
        <p className="mt-2 break-words text-lg font-semibold leading-snug text-campus-900">{value}</p>
      </div>
      <p className="mt-3 text-xs leading-5 text-campus-500">{hint}</p>
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

  const sortedMembers = useMemo(() => {
    return [...members].sort(
      (a, b) =>
        Number(b.user_id === team.leader_id || isLeaderRole(b.role)) -
        Number(a.user_id === team.leader_id || isLeaderRole(a.role)),
    )
  }, [members, team.leader_id])

  const visibleMembers = sortedMembers.slice(0, 4)
  const currentLeaderName = resolveLeaderName(leader, sortedMembers)
  const occupancyRatio =
    team.max_members > 0 ? Math.min(100, Math.round((members.length / team.max_members) * 100)) : 0
  const displayImageUrl = selectedImageFile ? imagePreviewUrl : draft.removeImage ? '' : team.image_url ?? ''
  const currentSummary = sanitizedSummary(team.summary)
  const currentDescription = sanitizedDescription(team.description)

  useEffect(() => {
    if (!isEditing) {
      setDraft(createInitialDraft(team, skills))
      setSelectedImageFile(null)
      setImagePreviewUrl(team.image_url ?? '')
    }
  }, [isEditing, skills, team])

  useEffect(
    () => () => {
      if (imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    },
    [imagePreviewUrl],
  )

  async function ensureSkillOptions() {
    if (skillOptions.length > 0 || isLoadingSkillOptions) {
      return
    }

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

  function openEditor() {
    setErrorMessage('')
    setSuccessMessage('')
    setIsEditing(true)
    void ensureSkillOptions()
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setErrorMessage('이미지 파일만 업로드할 수 있습니다.')
      return
    }

    if (file.size > MAX_TEAM_IMAGE_SIZE) {
      setErrorMessage('팀 이미지는 5MB 이하 파일만 업로드할 수 있습니다.')
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
    if (!draft.name.trim()) return '팀 이름을 입력해 주세요.'
    if (draft.summary.trim().length < 4) return '한 줄 소개는 최소 4자 이상 입력해 주세요.'

    const parsedMaxMembers = Number.parseInt(draft.maxMembers, 10)
    if (!Number.isInteger(parsedMaxMembers) || parsedMaxMembers < Math.max(members.length, 2)) {
      return `최대 인원은 현재 인원(${members.length}명) 이상으로 설정해 주세요.`
    }

    return ''
  }

  async function handleSave() {
    if (!currentUserId) {
      setErrorMessage('로그인 정보가 없어 저장할 수 없습니다.')
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
          ? '팀 프로필과 대표 이미지가 저장되었습니다.'
          : '팀 프로필이 저장되었습니다.',
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '팀 프로필 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border border-brand-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-0 shadow-[0_24px_72px_rgba(53,93,255,0.11)]">
        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.2fr),360px]">
          <div className="min-w-0 border-b border-campus-200/70 p-5 sm:p-6 xl:border-b-0 xl:border-r xl:p-8">
            <div className="flex min-w-0 flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-600">Team Overview</p>
                <span className="rounded-full border border-campus-200 bg-white px-3 py-1 text-xs font-semibold text-campus-700">
                  {isLeader ? 'Leader Access' : 'View Only'}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start gap-2.5">
                  <h2 className="min-w-0 flex-1 break-words font-display text-[2rem] font-semibold leading-[1.05] text-campus-900 sm:text-[2.4rem]">
                    {team.name}
                  </h2>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge variant={team.is_recruiting ? 'success' : 'neutral'}>
                      {recruitingLabel(team.is_recruiting)}
                    </Badge>
                    <Badge variant={isLeader ? 'warning' : 'neutral'}>{isLeader ? '팀 리더' : '읽기 전용'}</Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Description</p>
                <div className="rounded-[1.35rem] border border-campus-200/80 bg-white/84 px-4 py-4">
                  <p className="text-sm leading-7 text-campus-700" style={summaryClampStyle}>
                    {currentSummary}
                  </p>
                  <p className="mt-3 border-t border-campus-100 pt-3 text-sm leading-7 text-campus-600" style={descriptionClampStyle}>
                    {currentDescription}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Skills</p>
                <div className="flex flex-wrap gap-2.5">
                  {skills.length > 0 ? (
                    skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="inline-flex max-w-full items-center rounded-full border border-brand-100 bg-brand-50 px-3.5 py-2 text-xs font-semibold text-brand-700"
                      >
                        <span className="truncate">{skill.name}</span>
                      </span>
                    ))
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-campus-200 bg-campus-50 px-3.5 py-2 text-xs font-medium text-campus-600">
                      기술 스택 미설정
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <MetaBlock
                  label="Members"
                  value={`${members.length}/${team.max_members || '-'}`}
                  hint="현재 참여 인원 / 최대 인원"
                />
                <MetaBlock label="Leader" value={metricValue(currentLeaderName)} hint="팀을 관리하는 리더" />
                <MetaBlock label="Category" value={metricValue(team.category || '미분류')} hint="팀이 집중하는 분야" />
                <MetaBlock label="Created" value={createdDateLabel(team.created_at)} hint="워크스페이스 시작일" />
              </div>

              <div className="rounded-[1.55rem] border border-campus-200/80 bg-white/80 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-campus-900">리더 & 멤버</p>
                    <p className="mt-1 text-xs leading-5 text-campus-500">
                      리더 정보와 참여 상태를 한 블록에서 확인할 수 있습니다.
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-campus-500">충원률 {occupancyRatio}%</span>
                </div>

                <div className="mt-4 flex items-center">
                  <div className="flex shrink-0">
                    {visibleMembers.map((member, index) => (
                      <MiniAvatar
                        key={`${member.team_id}-${member.user_id}`}
                        member={member}
                        className={index > 0 ? '-ml-3' : ''}
                      />
                    ))}
                  </div>

                  <div className="ml-4 min-w-0">
                    <p className="truncate text-sm font-semibold text-campus-900">{currentLeaderName}</p>
                    <p className="text-xs leading-5 text-campus-500">
                      {team.is_recruiting
                        ? '새로운 팀원을 받을 준비가 되어 있습니다.'
                        : '현재는 팀 구성이 안정적으로 유지되고 있습니다.'}
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

          <aside className="shrink-0 p-5 sm:p-6 xl:p-8">
            <div className="flex h-full flex-col gap-4 rounded-[1.8rem] border border-brand-100/70 bg-[linear-gradient(180deg,rgba(247,250,255,0.96)_0%,rgba(240,246,255,0.98)_100%)] p-3 shadow-[0_20px_48px_rgba(53,93,255,0.10)]">
              <div className="overflow-hidden rounded-[1.55rem] border border-brand-200/70 bg-campus-100 shadow-[0_18px_40px_rgba(15,23,42,0.10)] ring-1 ring-white/80">
                <div className="flex items-center justify-between border-b border-brand-100/70 bg-white px-4 py-3.5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600">Team Image</p>
                    <p className="mt-1 text-sm font-semibold text-campus-900">
                      {team.image_url ? '대표 이미지' : '기본 커버 표시 중'}
                    </p>
                  </div>
                  <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-semibold text-brand-700">
                    {team.image_url ? 'Image On' : 'Fallback'}
                  </span>
                </div>
                <div className="relative aspect-[5/4] min-h-[260px] w-full">
                  <TeamCoverImage
                    key={team.image_url ?? 'hero-preview'}
                    src={team.image_url}
                    teamName={team.name}
                    category={team.category}
                    summary={team.summary}
                    className="absolute inset-0"
                    imageClassName="h-full w-full"
                  />
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-campus-200/80 bg-white/92 px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                <p className="text-sm font-semibold text-campus-900">Actions</p>
                <p className="mt-1 text-xs leading-5 text-campus-500">이미지 카드 아래에서 바로 팀 관리 액션을 사용할 수 있습니다.</p>
                <div className="mt-4 flex flex-col gap-2">
                  {isLeader && (
                    <Button type="button" onClick={openEditor}>
                      프로필 편집
                    </Button>
                  )}
                  <Button type="button" variant="ghost" onClick={onOpenMembers}>
                    팀원 보기
                  </Button>
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
                  <h3 className="mt-2 font-display text-2xl text-campus-900">팀 프로필 편집</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-campus-600">
                    대표 이미지, 소개, 상세 설명, 모집 상태와 기술 스택까지 한 번에 수정할 수 있습니다.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => !isSaving && setIsEditing(false)}>
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
                        key={displayImageUrl || `editor-${draft.name || team.name}`}
                        src={displayImageUrl}
                        teamName={draft.name || team.name}
                        category={draft.category || team.category}
                        summary={draft.summary || team.summary}
                        className="absolute inset-0"
                        imageClassName="h-full w-full"
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-campus-200 bg-white px-4 py-4 text-xs leading-5 text-campus-500">
                    {selectedImageFile
                      ? `새 이미지가 선택되었습니다: ${selectedImageFile.name}`
                      : draft.removeImage
                        ? '이미지를 제거하면 서비스 기본 커버로 자동 대체됩니다.'
                        : team.image_url
                          ? '현재 업로드된 대표 이미지를 유지 중입니다.'
                          : '업로드된 이미지가 없어 기본 커버를 사용 중입니다.'}
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
                      ? '이미지가 없거나 로드에 실패하면 자동으로 기본 커버가 표시됩니다.'
                      : '현재는 기본 커버만 사용 중입니다.'}
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
                    placeholder="예: AI 협업 툴"
                    disabled={isSaving}
                  />
                  <InputField
                    label="최대 인원"
                    type="number"
                    min={Math.max(members.length, 2)}
                    value={draft.maxMembers}
                    onChange={(event) => updateDraft('maxMembers', event.target.value)}
                    endAdornment="명"
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
                      {draft.isRecruiting ? '현재 팀원 모집을 받고 있습니다.' : '현재는 모집을 닫아 둔 상태입니다.'}
                    </span>
                  </label>
                </div>

                <InputField
                  label="한 줄 소개"
                  value={draft.summary}
                  onChange={(event) => updateDraft('summary', event.target.value)}
                  placeholder="팀의 방향성과 강점을 짧고 선명하게 소개해 주세요."
                  hint="Overview 헤더에서 가장 먼저 보이는 문구입니다."
                  disabled={isSaving}
                />

                <label className="space-y-2 text-sm font-medium text-campus-700">
                  <span>상세 설명</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraft('description', event.target.value)}
                    rows={7}
                    placeholder="팀 목표, 협업 방식, 진행 중인 프로젝트와 기대하는 결과물을 자유롭게 적어 주세요."
                    className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                  />
                </label>

                <div className="rounded-[1.55rem] border border-campus-200 bg-campus-50/60 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-campus-900">미리보기</p>
                      <p className="mt-1 text-xs leading-5 text-campus-500">
                        긴 텍스트도 Overview 카드에서 안정적으로 보이도록 줄 수를 제한합니다.
                      </p>
                    </div>
                    <Badge variant={draft.isRecruiting ? 'success' : 'neutral'}>
                      {recruitingLabel(draft.isRecruiting)}
                    </Badge>
                  </div>

                  <div className="mt-4 rounded-[1.35rem] border border-campus-200 bg-white px-4 py-4">
                    <p className="break-words font-display text-xl leading-tight text-campus-900">
                      {draft.name || '팀 이름'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-campus-700" style={summaryClampStyle}>
                      {sanitizedSummary(draft.summary)}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-campus-500" style={previewDescriptionClampStyle}>
                      {sanitizedDescription(draft.description)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-campus-700">기술 스택</p>
                    <p className="mt-1 text-xs text-campus-500">
                      헤더와 메타 영역에서 팀 정체성을 보여줄 기술을 선택해 주세요.
                    </p>
                  </div>

                  {isLoadingSkillOptions ? (
                    <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-5 text-sm text-campus-600">
                      기술 스택 목록을 불러오는 중입니다...
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
                      emptySelectedMessage="대표 기술 스택을 선택해 주세요."
                    />
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-campus-200 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => !isSaving && setIsEditing(false)}
                    disabled={isSaving}
                  >
                    취소
                  </Button>
                  <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
                    {isSaving ? (selectedImageFile ? '업로드 및 저장 중...' : '저장 중...') : '저장하기'}
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
