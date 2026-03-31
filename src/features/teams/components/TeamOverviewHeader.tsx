import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { SkillSelector } from '../../../components/common/SkillSelector'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { InputField } from '../../../components/ui/InputField'
import { TeamProfileImage } from './TeamProfileImage'
import { TEAM_IMAGE_STORAGE_ENABLED, validateTeamImageFile } from '../lib/teamProfileImages'
import { fetchSkillOptions, updateTeamProfile } from '../lib/teams'
import type {
  ProfileSummary,
  SkillOption,
  TeamMemberWithProfile,
  TeamRecord,
  TeamSkillTag,
  TeamTaskItem,
} from '../types/team'

interface TeamOverviewHeaderProps {
  team: TeamRecord
  leader: ProfileSummary | null
  members: TeamMemberWithProfile[]
  skills: TeamSkillTag[]
  tasks: TeamTaskItem[]
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

const eyebrowClass = 'text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500'
const sectionGapClass = 'space-y-6'

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
  if (Number.isNaN(date.getTime())) return '-'
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

function displayName(member: TeamMemberWithProfile) {
  return member.profile?.full_name || member.profile?.email || member.user_id
}

function normalizeSummary(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : '팀의 핵심 방향과 협업 성격을 한 줄로 정리해 보세요.'
}

function normalizeDescription(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed
    ? trimmed
    : '팀의 목표, 협업 방식, 현재 집중하고 있는 주제를 적어두면 멤버들이 빠르게 맥락을 파악할 수 있습니다.'
}

function MemberFace({ member }: { member: TeamMemberWithProfile }) {
  const profileImageUrl = member.profile?.profile_image_url ?? null
  const initial = displayName(member).trim().charAt(0).toUpperCase() || 'U'

  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={displayName(member)}
        className="h-9 w-9 rounded-full border border-white/70 object-cover shadow-sm"
      />
    )
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-campus-200 bg-white text-xs font-semibold text-campus-700">
      {initial}
    </div>
  )
}

export function TeamOverviewHeader({
  team,
  leader,
  members,
  skills,
  isLeader,
  currentUserId,
  onOpenMembers,
  onTeamUpdated,
}: TeamOverviewHeaderProps) {
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
    return [...members].sort((a, b) => {
      const aLeader = Number(a.user_id === team.leader_id || a.role === 'leader')
      const bLeader = Number(b.user_id === team.leader_id || b.role === 'leader')
      if (aLeader !== bLeader) return bLeader - aLeader
      return displayName(a).localeCompare(displayName(b), 'ko')
    })
  }, [members, team.leader_id])

  const visibleMembers = sortedMembers.slice(0, 4)
  const hiddenMemberCount = Math.max(sortedMembers.length - visibleMembers.length, 0)
  const leaderName = getLeaderName(leader, sortedMembers)
  const summaryText = normalizeSummary(team.summary)
  const descriptionText = normalizeDescription(team.description)
  const previewSkills = skills.slice(0, 2)
  const remainingSkillCount = Math.max(skills.length - previewSkills.length, 0)
  const displayImageUrl = selectedImageFile ? imagePreviewUrl : draft.removeImage ? '' : team.image_url ?? ''

  useEffect(() => {
    if (!isEditing) {
      setDraft(createInitialDraft(team, skills))
      setSelectedImageFile(null)
      setImagePreviewUrl(team.image_url ?? '')
    }
  }, [isEditing, skills, team])

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
      setErrorMessage(error instanceof Error ? error.message : '기술 선택 목록을 불러오지 못했습니다.')
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
    if (!draft.name.trim()) return '팀 이름을 입력해 주세요.'
    if (draft.summary.trim().length < 4) return '팀 소개는 최소 4자 이상 입력해 주세요.'

    const parsedMaxMembers = Number.parseInt(draft.maxMembers, 10)
    if (!Number.isInteger(parsedMaxMembers) || parsedMaxMembers < Math.max(members.length, 2)) {
      return `최대 인원은 최소 ${Math.max(members.length, 2)}명 이상이어야 합니다.`
    }

    return ''
  }

  async function handleSave() {
    if (!currentUserId) {
      setErrorMessage('로그인한 사용자만 저장할 수 있습니다.')
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
          ? '팀 정보와 커버 이미지가 저장되었습니다.'
          : '팀 정보가 저장되었습니다.',
      )
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '팀 정보를 저장하지 못했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <section className="space-y-5">
        <div className="overflow-hidden rounded-[30px] border border-campus-200/80 bg-white shadow-card">
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-5">
              <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start">
                <div className="w-[112px] shrink-0 sm:w-[136px]">
                  <div className="overflow-hidden rounded-[28px] border border-campus-200 bg-white shadow-sm">
                    <TeamProfileImage
                      src={team.image_url}
                      alt={`${team.name} profile`}
                      teamName={team.name}
                      summary={summaryText}
                      category={team.category}
                      className="aspect-square w-full"
                      imageClassName="h-full w-full object-cover"
                      priority="editor"
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1 space-y-4 sm:pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-700">
                      Team Overview
                    </span>
                    <Badge variant={team.is_recruiting ? 'success' : 'neutral'}>
                      {team.is_recruiting ? '모집 중' : '모집 마감'}
                    </Badge>
                    <Badge variant={isLeader ? 'warning' : 'neutral'}>
                      {isLeader ? '리더 권한' : '멤버 보기'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-campus-900 sm:text-4xl">{team.name}</h1>
                    <p className="max-w-3xl text-base font-medium leading-7 text-campus-800">{summaryText}</p>
                    <p className="max-w-3xl text-sm leading-7 text-campus-500">{descriptionText}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 border-t border-campus-200/80 pt-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.3fr),repeat(3,minmax(0,1fr))]">
              <div className="rounded-[22px] border border-campus-200 bg-white px-4 py-4">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {visibleMembers.map((member) => (
                      <MemberFace key={`${member.team_id}-${member.user_id}`} member={member} />
                    ))}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-campus-500">Team Members</p>
                    <p className="text-base font-semibold leading-6 tracking-tight text-campus-900">{members.length}명 참여 중</p>
                    <p className="text-sm leading-5 text-campus-500">
                      {hiddenMemberCount > 0 ? `현재 참여 중인 멤버, 외 ${hiddenMemberCount}명` : '현재 참여 중인 멤버'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1 rounded-[22px] border border-campus-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-campus-500">Leader</p>
                <p className="text-base font-semibold tracking-tight text-campus-900">{leaderName}</p>
                <p className="text-sm leading-6 text-campus-500">현재 팀을 관리하는 멤버</p>
              </div>

              <div className="space-y-1 rounded-[22px] border border-campus-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-campus-500">Category</p>
                <p className="text-base font-semibold tracking-tight text-campus-900">{team.category?.trim() || '-'}</p>
                <p className="text-sm leading-6 text-campus-500">팀 성격을 나타내는 분류</p>
              </div>

              <div className="space-y-1 rounded-[22px] border border-campus-200 bg-white px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-campus-500">Tech Stack</p>
                <p className="text-base font-semibold tracking-tight text-campus-900">
                  {previewSkills.length > 0 ? previewSkills.map((skill) => skill.name).join(', ') : '연결된 기술 없음'}
                </p>
                <p className="text-sm leading-6 text-campus-500">
                  {previewSkills.length > 0
                    ? remainingSkillCount > 0
                      ? `외 ${remainingSkillCount}개 기술 연결`
                      : `${skills.length}개 기술 연결`
                    : `생성일 ${formatCreatedAt(team.created_at)}`}
                </p>
              </div>
            </div>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        {isLeader && (
          <Button
            type="button"
            data-team-edit-trigger="true"
            onClick={openEditor}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
          >
            팀 정보 수정
          </Button>
        )}

        <button type="button" onClick={onOpenMembers} className="sr-only" tabIndex={-1} aria-hidden="true">
          멤버 관리
        </button>
      </section>

      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-campus-900/60 px-4 py-6 backdrop-blur-sm">
          <Card className="flex max-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-campus-200 bg-white p-0 shadow-2xl shadow-campus-900/15">
            <div className="border-b border-campus-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className={eyebrowClass}>Edit Team</p>
                  <h3 className="text-2xl font-semibold tracking-tight text-campus-900">팀 프로필 수정</h3>
                  <p className="text-sm leading-6 text-campus-500">
                    커버 이미지, 소개, 카테고리, 모집 상태와 연결 기술을 한 번에 관리할 수 있습니다.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => !isSaving && setIsEditing(false)}>
                  닫기
                </Button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden xl:grid-cols-[360px,minmax(0,1fr)]">
              <div className="overflow-y-auto border-b border-campus-200 bg-campus-50/70 p-6 xl:border-b-0 xl:border-r">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[24px] border border-campus-200 bg-campus-100">
                    <TeamProfileImage
                      src={displayImageUrl}
                      alt={`${draft.name || team.name} preview`}
                      teamName={draft.name || team.name}
                      summary={normalizeSummary(draft.summary || team.summary)}
                      category={draft.category || team.category}
                      className="aspect-[5/4] min-h-[260px] w-full"
                      imageClassName="h-full w-full object-cover"
                      priority="editor"
                    />
                  </div>

                  <div className="rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm leading-6 text-campus-500">
                    {selectedImageFile
                      ? `선택한 이미지: ${selectedImageFile.name}`
                      : draft.removeImage
                        ? '현재 이미지를 제거하도록 설정했습니다.'
                        : team.image_url
                          ? '현재 등록된 커버 이미지를 사용 중입니다.'
                          : '아직 등록된 커버 이미지가 없습니다.'}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-campus-200 bg-white px-4 py-2.5 text-sm font-medium text-campus-700 transition hover:bg-campus-50">
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

                  <div className="rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm leading-6 text-campus-700">
                    {TEAM_IMAGE_STORAGE_ENABLED
                      ? '이미지는 Supabase Storage에 저장되며 저장 직후 팀 프로필에 반영됩니다.'
                      : '현재는 이미지 업로드 기능이 비활성화되어 있습니다.'}
                  </div>
                </div>
              </div>

              <div className={sectionGapClass + ' min-h-0 overflow-y-auto p-6'}>
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
                    placeholder="예: 디자인 시스템"
                    disabled={isSaving}
                  />
                  <InputField
                    label="최대 인원"
                    type="number"
                    min={Math.max(members.length, 2)}
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
                      {draft.isRecruiting
                        ? '현재 새로운 참여자를 받고 있습니다.'
                        : '현재는 새로운 참여자를 받지 않습니다.'}
                    </span>
                  </label>
                </div>

                <InputField
                  label="팀 소개"
                  value={draft.summary}
                  onChange={(event) => updateDraft('summary', event.target.value)}
                  placeholder="한 줄로 팀을 소개해 주세요."
                  disabled={isSaving}
                />

                <label className="space-y-2 text-sm font-medium text-campus-700">
                  <span>상세 설명</span>
                  <textarea
                    value={draft.description}
                    onChange={(event) => updateDraft('description', event.target.value)}
                    rows={7}
                    placeholder="팀의 목표, 협업 방식, 현재 진행 상황을 설명해 주세요."
                    className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                    disabled={isSaving}
                  />
                </label>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-campus-900">기술 스택</p>
                    <p className="text-xs text-campus-500">연결된 기술은 Overview와 팀 수정 화면에 함께 반영됩니다.</p>
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
                      emptySelectedMessage="선택한 기술 스택이 없습니다."
                    />
                  )}
                </div>

                <div className="flex flex-wrap justify-end gap-2 border-t border-campus-200 pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => !isSaving && setIsEditing(false)}
                    disabled={isSaving}
                  >
                    취소
                  </Button>
                  <Button type="button" onClick={() => void handleSave()} disabled={isSaving}>
                    {isSaving ? '저장 중...' : '저장'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
