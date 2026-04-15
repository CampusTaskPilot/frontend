import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ImagePlus, LoaderCircle, Plus, RotateCcw, Trash2, X } from 'lucide-react'
import { SkillSelector } from '../components/common/SkillSelector'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { InputField } from '../components/ui/InputField'
import { TextareaField } from '../components/ui/TextareaField'
import { useImeSafeSubmit } from '../hooks/useImeSafeSubmit'
import { useAuth } from '../features/auth/context/useAuth'
import { DeleteAccountModal } from '../features/profile/components/DeleteAccountModal'
import { ProfileAvatar } from '../features/profile/components/ProfileAvatar'
import {
  PROFILE_IMAGE_MAX_SIZE_BYTES,
  PROFILE_IMAGE_STORAGE_ENABLED,
  validateProfileImageFile,
} from '../features/profile/lib/profileImages'
import {
  fetchProfilePageData,
  requestAccountDeletion,
  saveProfilePageData,
} from '../features/profile/lib/profile'
import {
  clearProfileEditDraft,
  getProfileEditDraftKey,
  loadProfileEditDraft,
  saveProfileEditDraft,
} from '../features/profile/lib/profileEditDraft'
import {
  buildEditableProfileForm,
  profileProjectsToEditableProjects,
  profileSkillsToSelectedSkills,
} from '../features/profile/lib/profileMappers'
import type {
  EditableProfileForm,
  EditableProfileProject,
  ProfileProjectType,
  SelectedSkill,
  SkillLevel,
  SkillRecord,
} from '../features/profile/types'

const levelOptions: Array<{ value: SkillLevel; label: string }> = [
  { value: 'beginner', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
]

const projectTypeOptions: Array<{ value: ProfileProjectType; label: string }> = [
  { value: 'team', label: '팀 프로젝트' },
  { value: 'personal', label: '개인 프로젝트' },
]

const emptyForm: EditableProfileForm = {
  email: '',
  full_name: '',
  headline: '',
  bio: '',
  location: '',
  university: '',
  major: '',
  grade: '',
  current_status: '',
  desired_role: '',
  interest_areas: '',
  preferred_project_types: '',
  collaboration_style: '',
  working_style: '',
  availability: '',
  profile_image_url: '',
  github_url: '',
  blog_url: '',
  portfolio_url: '',
}

function createEmptyProject(): EditableProfileProject {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}`,
    name: '',
    summary: '',
    project_type: 'team',
    role: '',
    tech_stack: '',
    contribution_summary: '',
    start_date: '',
    end_date: '',
    is_ongoing: false,
    github_url: '',
    project_url: '',
  }
}

export function ProfileEditPage() {
  const ime = useImeSafeSubmit()
  const navigate = useNavigate()
  const location = useLocation()
  const { userId } = useParams<{ userId: string }>()
  const { user, signOut } = useAuth()
  const [form, setForm] = useState(emptyForm)
  const [allSkills, setAllSkills] = useState<SkillRecord[]>([])
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
  const [projects, setProjects] = useState<EditableProfileProject[]>([])
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  const [imageErrorMessage, setImageErrorMessage] = useState('')
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('')
  const [isInitialized, setIsInitialized] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const isForbidden = Boolean(user && userId && user.id !== userId)
  const draftKey = useMemo(() => (userId ? getProfileEditDraftKey(userId) : ''), [userId])
  const isBrowserUnloadRef = useRef(false)
  const hasInitialFormRef = useRef(false)
  const savedProfileImageUrlRef = useRef('')
  const imeInputProps = {
    onCompositionStart: ime.handleCompositionStart,
    onCompositionEnd: ime.handleCompositionEnd,
    onKeyDown: ime.preventEnterWhileComposing<HTMLInputElement>(),
  }

  const displayPreview = selectedImageFile ? imagePreviewUrl : imagePreviewUrl || form.profile_image_url
  const imageSizeLimitLabel = `${Math.round(PROFILE_IMAGE_MAX_SIZE_BYTES / 1024 / 1024)}MB`

  const markDirty = () => setIsDirty(true)
  const clearDraft = () => {
    if (draftKey) {
      clearProfileEditDraft(draftKey)
    }
    setIsDirty(false)
  }
  const updateForm = <K extends keyof EditableProfileForm>(key: K, value: EditableProfileForm[K]) => {
    markDirty()
    setForm((prev) => ({ ...prev, [key]: value }))
  }
  const updateProject = <K extends keyof EditableProfileProject>(
    projectId: string,
    key: K,
    value: EditableProfileProject[K],
  ) => {
    markDirty()
    setProjects((prev) =>
      prev.map((project) => (project.id === projectId ? { ...project, [key]: value } : project)),
    )
  }

  useEffect(() => {
    hasInitialFormRef.current = false
    setIsInitialized(false)
    setIsDirty(false)
  }, [draftKey])

  useEffect(() => {
    if (!isForbidden || !userId) return
    const timer = window.setTimeout(() => navigate(`/profile/${userId}`, { replace: true }), 1600)
    return () => window.clearTimeout(timer)
  }, [isForbidden, navigate, userId])

  useEffect(() => {
    const handleBeforeUnload = () => {
      isBrowserUnloadRef.current = true
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (!isBrowserUnloadRef.current && draftKey) clearProfileEditDraft(draftKey)
    }
  }, [draftKey, location.pathname])

  useEffect(() => {
    if (!user || !userId || user.id !== userId) {
      setIsLoading(false)
      return
    }

    let isMounted = true
    const loadProfilePage = async () => {
      setIsLoading(true)
      setErrorMessage('')
      try {
        const { profile, skills, profileSkills, profileProjects } = await fetchProfilePageData(userId)
        if (!isMounted) return
        setAllSkills(skills)
        if (!hasInitialFormRef.current) {
          const initialForm = buildEditableProfileForm({
            profile,
            fallbackEmail: user.email ?? '',
            fallbackFullName:
              typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '',
          })
          savedProfileImageUrlRef.current = initialForm.profile_image_url
          const draft = draftKey ? loadProfileEditDraft(draftKey) : null
          if (draft) {
            setForm(draft.form)
            setSelectedSkills(draft.selectedSkills)
            setProjects(draft.projects)
            setImagePreviewUrl(draft.form.profile_image_url)
            setIsDirty(true)
          } else {
            setForm(initialForm)
            setSelectedSkills(profileSkillsToSelectedSkills(profileSkills))
            setProjects(profileProjectsToEditableProjects(profileProjects))
            setImagePreviewUrl(initialForm.profile_image_url)
          }
          setImageErrorMessage('')
          setShouldRemoveImage(false)
          hasInitialFormRef.current = true
          setIsInitialized(true)
        }
      } catch (error) {
        if (isMounted) setErrorMessage(error instanceof Error ? error.message : '프로필 정보를 불러오지 못했습니다.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void loadProfilePage()
    return () => {
      isMounted = false
    }
  }, [draftKey, user, userId])

  useEffect(() => {
    if (isInitialized && isDirty && draftKey) {
      saveProfileEditDraft(draftKey, { form, selectedSkills, projects })
    }
  }, [draftKey, form, isDirty, isInitialized, projects, selectedSkills])

  useEffect(
    () => () => {
      if (imagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
    },
    [imagePreviewUrl],
  )

  const handleAddSkill = (skillId: number) => {
    if (selectedSkills.some((item) => item.skill_id === skillId)) return
    markDirty()
    setSelectedSkills((prev) => [...prev, { skill_id: skillId, level: 'beginner' }])
  }
  const handleRemoveSkill = (skillId: number) => {
    markDirty()
    setSelectedSkills((prev) => prev.filter((item) => item.skill_id !== skillId))
  }
  const handleSkillLevelChange = (skillId: number, level: SkillLevel) => {
    markDirty()
    setSelectedSkills((prev) => prev.map((item) => (item.skill_id === skillId ? { ...item, level } : item)))
  }
  const handleAddProject = () => {
    markDirty()
    setProjects((prev) => [...prev, createEmptyProject()])
  }
  const handleRemoveProject = (projectId: string) => {
    markDirty()
    setProjects((prev) => prev.filter((project) => project.id !== projectId))
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!PROFILE_IMAGE_STORAGE_ENABLED) {
      setImageErrorMessage('현재 프로필 이미지 업로드를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.')
      event.target.value = ''
      return
    }

    const validationMessage = validateProfileImageFile(file)

    if (validationMessage) {
      setImageErrorMessage(validationMessage)
      event.target.value = ''
      return
    }

    if (imagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
    markDirty()
    setSelectedImageFile(file)
    setShouldRemoveImage(false)
    setImagePreviewUrl(URL.createObjectURL(file))
    setImageErrorMessage('')
    event.target.value = ''
  }
  const handleResetImage = () => {
    if (imagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
    markDirty()
    setSelectedImageFile(null)
    setShouldRemoveImage(false)
    setImagePreviewUrl(form.profile_image_url)
    setImageErrorMessage('')
  }
  const handleRemoveImage = () => {
    if (imagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
    markDirty()
    setSelectedImageFile(null)
    setShouldRemoveImage(true)
    setImagePreviewUrl('')
    setImageErrorMessage('')
    updateForm('profile_image_url', '')
  }
  const handleProfileImageUrlChange = (value: string) => {
    if (imagePreviewUrl.startsWith('blob:')) URL.revokeObjectURL(imagePreviewUrl)
    setSelectedImageFile(null)
    setShouldRemoveImage(false)
    setImagePreviewUrl(value)
    setImageErrorMessage('')
    updateForm('profile_image_url', value)
  }

  const handleSaveProfile = async () => {
    if (!user || !user.email || !userId || user.id !== userId) return
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')
    setImageErrorMessage('')
    try {
      const result = await saveProfilePageData({
        userId,
        email: user.email,
        form,
        selectedSkills,
        projects,
        imageFile: selectedImageFile,
        removeImage: shouldRemoveImage,
        currentProfileImageUrl: savedProfileImageUrlRef.current,
      })
      if (result.savedProfile) {
        const nextForm = buildEditableProfileForm({
          profile: result.savedProfile,
          fallbackEmail: user.email,
          fallbackFullName: '',
        })
        setForm(nextForm)
        setImagePreviewUrl(nextForm.profile_image_url)
        savedProfileImageUrlRef.current = nextForm.profile_image_url
      }
      setSelectedSkills(result.savedProfileSkills.length > 0 ? result.savedProfileSkills : selectedSkills)
      setProjects(
        result.savedProfileProjects.length > 0
          ? profileProjectsToEditableProjects(result.savedProfileProjects)
          : projects.filter((project) => project.name.trim()),
      )
      setSelectedImageFile(null)
      setShouldRemoveImage(false)
      setImageErrorMessage('')
      clearDraft()
      navigate(`/profile/${userId}`)
    } catch (error) {
      setErrorMessage(error instanceof Error ? `프로필 저장에 실패했습니다. ${error.message}` : '프로필 저장에 실패했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeleting(true)
    setDeleteErrorMessage('')
    try {
      await requestAccountDeletion()
      await signOut()
      navigate('/', { replace: true })
    } catch (error) {
      setDeleteErrorMessage(error instanceof Error ? error.message : '회원 탈퇴 처리 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isForbidden && userId) {
    return (
      <section className="page-shell">
        <Card className="space-y-3 border-rose-200 bg-rose-50">
          <h1 className="font-display text-2xl text-campus-900">접근 불가</h1>
          <p className="text-sm text-rose-600">본인 프로필만 수정할 수 있어요. 프로필 페이지로 이동합니다.</p>
          <div className="flex justify-end">
            <Button variant="ghost" asChild><Link to={`/profile/${userId}`}>프로필로 돌아가기</Link></Button>
          </div>
        </Card>
      </section>
    )
  }

  if (isLoading) {
    return <section className="page-shell"><Card><p className="text-sm text-campus-600">프로필 정보를 불러오는 중입니다…</p></Card></section>
  }

  if (!userId || !user) {
    return (
      <section className="page-shell">
        <Card className="space-y-3 border-rose-200 bg-rose-50">
          <h1 className="font-display text-2xl text-campus-900">프로필 수정</h1>
          <p className="text-sm text-rose-600">접근 정보가 올바르지 않습니다. 다시 로그인해 주세요.</p>
        </Card>
      </section>
    )
  }

  return (
    <>
      <section className="page-shell">
        <Card className="page-hero space-y-4 bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,248,255,0.94))]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">Profile Setup</p>
          <h1 className="font-display text-3xl text-campus-900">지원자 평가용 프로필 편집</h1>
          <p className="max-w-3xl text-sm leading-7 text-campus-700">역할 적합도, 협업 방식, 실제 프로젝트 기여가 드러나는 정보부터 채워 주세요.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" type="button" onClick={() => { clearDraft(); navigate(`/profile/${userId}`) }}>취소</Button>
            <Button type="button" onMouseDown={ime.preventBlurOnMouseDown} onClick={() => void ime.runImeSafeAction(handleSaveProfile)} disabled={isSaving}>{isSaving ? '저장 중…' : '저장하기'}</Button>
          </div>
        </Card>

        <div className="grid gap-6 2xl:grid-cols-[360px,minmax(0,1fr)]">
          <Card className="space-y-5">
            <h2 className="font-display text-2xl text-campus-900">프로필 이미지</h2>
            <div className="flex flex-col gap-4">
              <ProfileAvatar
                src={displayPreview}
                name={form.full_name}
                email={form.email}
                alt="Profile image preview"
                className="h-32 w-32 rounded-[2rem]"
                fallbackClassName="text-4xl"
              />
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-campus-200 bg-white px-5 py-2.5 text-sm font-medium text-campus-700 transition-colors hover:bg-brand-50">
                  <ImagePlus size={16} aria-hidden="true" />
                  이미지 선택
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={!PROFILE_IMAGE_STORAGE_ENABLED || isSaving}
                  />
                </label>
                <Button variant="ghost" type="button" onClick={handleResetImage} disabled={isSaving} className="gap-2">
                  <RotateCcw size={16} aria-hidden="true" />
                  미리보기 초기화
                </Button>
                <Button variant="ghost" type="button" onClick={handleRemoveImage} disabled={isSaving} className="gap-2">
                  <X size={16} aria-hidden="true" />
                  이미지 제거
                </Button>
              </div>
              {selectedImageFile ? (
                <p className="break-all text-xs text-campus-500">선택한 파일: {selectedImageFile.name}</p>
              ) : null}
              <p className={imageErrorMessage ? 'text-xs text-rose-600' : 'text-xs text-campus-500'}>
                {imageErrorMessage || `JPG, PNG, WEBP 이미지를 ${imageSizeLimitLabel} 이하로 업로드할 수 있습니다. 저장 시 Supabase Storage에 업로드됩니다.`}
              </p>
              {isSaving && selectedImageFile ? (
                <p className="inline-flex items-center gap-2 text-xs font-medium text-brand-700">
                  <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                  이미지 업로드 및 프로필 저장 중
                </p>
              ) : null}
              <InputField
                label="프로필 이미지 URL"
                name="profile_image_url"
                type="url"
                value={form.profile_image_url}
                onChange={(event) => handleProfileImageUrlChange(event.target.value)}
                placeholder="https://example.com/profile.jpg"
                {...imeInputProps}
              />
            </div>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-2xl text-campus-900">헤더 핵심 정보</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="이메일" name="email" value={form.email} readOnly className="bg-campus-50 text-campus-500" />
              <InputField label="이름" name="full_name" value={form.full_name} onChange={(event) => updateForm('full_name', event.target.value)} {...imeInputProps} />
              <InputField label="한 줄 소개" name="headline" value={form.headline} onChange={(event) => updateForm('headline', event.target.value)} placeholder="예: 빠르게 MVP를 만드는 프론트엔드 개발자" className="md:col-span-2" {...imeInputProps} />
              <InputField label="희망 역할" name="desired_role" value={form.desired_role} onChange={(event) => updateForm('desired_role', event.target.value)} placeholder="예: Frontend Developer, PM" {...imeInputProps} />
              <InputField label="현재 상태" name="current_status" value={form.current_status} onChange={(event) => updateForm('current_status', event.target.value)} placeholder="예: 재학생, 취업 준비 중" {...imeInputProps} />
              <InputField label="지역" name="location" value={form.location} onChange={(event) => updateForm('location', event.target.value)} {...imeInputProps} />
              <InputField label="대학교" name="university" value={form.university} onChange={(event) => updateForm('university', event.target.value)} {...imeInputProps} />
              <InputField label="전공" name="major" value={form.major} onChange={(event) => updateForm('major', event.target.value)} {...imeInputProps} />
              <InputField label="학년" name="grade" value={form.grade} onChange={(event) => updateForm('grade', event.target.value)} {...imeInputProps} />
            </div>
          </Card>
        </div>

        <Card className="space-y-5">
          <h2 className="font-display text-2xl text-campus-900">자기소개와 협업 정보</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            <TextareaField label="자기소개" name="bio" value={form.bio} onChange={(event) => updateForm('bio', event.target.value)} placeholder="지원 동기, 강점, 경험을 3~5문장 정도로 정리해 주세요." />
            <TextareaField label="협업 스타일" name="collaboration_style" value={form.collaboration_style} onChange={(event) => updateForm('collaboration_style', event.target.value)} placeholder="예: 논의 내용을 문서로 정리하고 피드백을 빠르게 주고받는 편입니다." />
            <TextareaField label="일하는 방식" name="working_style" value={form.working_style} onChange={(event) => updateForm('working_style', event.target.value)} placeholder="예: 설계를 먼저 맞추고 짧은 주기로 결과물을 공유합니다." />
            <TextareaField label="활동 가능 정보" name="availability" value={form.availability} onChange={(event) => updateForm('availability', event.target.value)} placeholder="예: 평일 저녁 7시 이후, 주말 오전 참여 가능" />
            <InputField label="관심 분야" name="interest_areas" value={form.interest_areas} onChange={(event) => updateForm('interest_areas', event.target.value)} placeholder="예: AI, 생산성 툴, 교육 서비스" hint="쉼표로 구분하면 태그로 표시됩니다." {...imeInputProps} />
            <InputField label="선호 프로젝트 유형" name="preferred_project_types" value={form.preferred_project_types} onChange={(event) => updateForm('preferred_project_types', event.target.value)} placeholder="예: MVP 제작, 해커톤, SaaS" hint="쉼표로 구분하면 태그로 표시됩니다." {...imeInputProps} />
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="font-display text-2xl text-campus-900">외부 링크</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <InputField label="GitHub 주소" name="github_url" type="url" value={form.github_url} onChange={(event) => updateForm('github_url', event.target.value)} placeholder="https://github.com/username" {...imeInputProps} />
            <InputField label="블로그 주소" name="blog_url" type="url" value={form.blog_url} onChange={(event) => updateForm('blog_url', event.target.value)} placeholder="https://blog.example.com" {...imeInputProps} />
            <InputField label="포트폴리오 주소" name="portfolio_url" type="url" value={form.portfolio_url} onChange={(event) => updateForm('portfolio_url', event.target.value)} placeholder="https://portfolio.example.com" {...imeInputProps} />
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="font-display text-2xl text-campus-900">보유 스킬</h2>
          <SkillSelector skills={allSkills} selectedSkillIds={selectedSkills.map((item) => item.skill_id)} onSelectSkill={handleAddSkill} onDeselectSkill={handleRemoveSkill} showSelectedList={false} />
          <div className="space-y-3">
            {selectedSkills.length === 0 ? <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-6 text-sm text-campus-500">선택된 스킬이 없습니다.</div> : selectedSkills.map((item) => {
              const skill = allSkills.find((currentSkill) => currentSkill.id === item.skill_id)
              return (
                <div key={item.skill_id} className="flex flex-col gap-3 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0"><p className="break-words font-medium text-campus-900">{skill?.name ?? `스킬 #${item.skill_id}`}</p><p className="text-sm text-campus-500">{skill?.category ?? '분류 없음'}</p></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select value={item.level} onChange={(event) => handleSkillLevelChange(item.skill_id, event.target.value as SkillLevel)} className="rounded-full border border-campus-200 bg-white px-4 py-2 text-sm text-campus-700 outline-none transition-colors focus:border-brand-400" aria-label={`${skill?.name ?? `스킬 ${item.skill_id}`} 숙련도`}>
                      {levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <Button variant="ghost" type="button" onClick={() => handleRemoveSkill(item.skill_id)}>삭제</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><h2 className="font-display text-2xl text-campus-900">프로젝트 경험</h2><p className="mt-2 text-sm text-campus-600">프로젝트명보다 실제 역할과 기여가 보이도록 적어 주세요.</p></div>
            <Button type="button" variant="ghost" onClick={handleAddProject} className="gap-2"><Plus size={16} aria-hidden="true" />프로젝트 추가</Button>
          </div>
          {projects.length === 0 ? <div className="rounded-[1.6rem] border border-dashed border-campus-200 bg-campus-50/70 px-5 py-10"><h3 className="text-lg font-semibold text-campus-900">등록된 프로젝트가 없습니다.</h3><p className="mt-2 text-sm leading-6 text-campus-500">최소 1개 이상의 프로젝트를 입력하면 리더가 실제 수행 경험을 훨씬 빠르게 판단할 수 있습니다.</p></div> : (
            <div className="space-y-5">
              {projects.map((project, index) => (
                <div key={project.id} className="rounded-[1.7rem] border border-campus-200/80 bg-campus-50/70 p-5">
                  <div className="flex flex-col gap-3 border-b border-campus-200/70 pb-4 md:flex-row md:items-center md:justify-between">
                    <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">Project {index + 1}</p><h3 className="mt-1 text-lg font-semibold text-campus-900">{project.name.trim() || '새 프로젝트'}</h3></div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveProject(project.id)} className="gap-2 text-rose-700 hover:bg-rose-50"><Trash2 size={16} aria-hidden="true" />삭제</Button>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <InputField label="프로젝트명" name={`project-name-${project.id}`} value={project.name} onChange={(event) => updateProject(project.id, 'name', event.target.value)} placeholder="예: AI 스터디 매칭 플랫폼" {...imeInputProps} />
                    <div className="space-y-2.5 text-sm font-medium text-campus-700">
                      <label htmlFor={`project-type-${project.id}`} className="block text-[0.95rem]">프로젝트 유형</label>
                      <select id={`project-type-${project.id}`} value={project.project_type} onChange={(event) => updateProject(project.id, 'project_type', event.target.value as ProfileProjectType)} className="min-h-[3.25rem] w-full rounded-[1.15rem] border border-campus-200 bg-white/92 px-4 py-3 text-[15px] text-campus-900 outline-none transition-colors focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100">
                        {projectTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <TextareaField label="짧은 설명" name={`project-summary-${project.id}`} value={project.summary} onChange={(event) => updateProject(project.id, 'summary', event.target.value)} placeholder="프로젝트 목적과 결과를 2~4문장으로 정리해 주세요." className="md:col-span-2" rows={4} />
                    <InputField label="맡은 역할" name={`project-role-${project.id}`} value={project.role} onChange={(event) => updateProject(project.id, 'role', event.target.value)} placeholder="예: Frontend Developer, PM" {...imeInputProps} />
                    <InputField label="사용 기술" name={`project-tech-${project.id}`} value={project.tech_stack} onChange={(event) => updateProject(project.id, 'tech_stack', event.target.value)} placeholder="예: React, FastAPI, Supabase" hint="쉼표로 구분하면 태그처럼 표시됩니다." {...imeInputProps} />
                    <TextareaField label="주요 기여 내용" name={`project-contribution-${project.id}`} value={project.contribution_summary} onChange={(event) => updateProject(project.id, 'contribution_summary', event.target.value)} placeholder="예: 팀 온보딩 플로우 설계, 검색 UX 개선, API 연동 구조 정리" className="md:col-span-2" rows={4} />
                    <InputField label="시작일" name={`project-start-${project.id}`} type="date" value={project.start_date} onChange={(event) => updateProject(project.id, 'start_date', event.target.value)} />
                    <InputField label="종료일" name={`project-end-${project.id}`} type="date" value={project.end_date} onChange={(event) => updateProject(project.id, 'end_date', event.target.value)} disabled={project.is_ongoing} />
                    <div className="md:col-span-2"><label className="inline-flex items-center gap-3 rounded-full border border-campus-200 bg-white px-4 py-2.5 text-sm font-medium text-campus-700"><input type="checkbox" checked={project.is_ongoing} onChange={(event) => updateProject(project.id, 'is_ongoing', event.target.checked)} className="h-4 w-4 rounded border-campus-300 text-brand-600 focus:ring-brand-300" />현재 진행 중인 프로젝트입니다.</label></div>
                    <InputField label="GitHub 링크" name={`project-github-${project.id}`} type="url" value={project.github_url} onChange={(event) => updateProject(project.id, 'github_url', event.target.value)} placeholder="https://github.com/..." {...imeInputProps} />
                    <InputField label="결과물 링크" name={`project-url-${project.id}`} type="url" value={project.project_url} onChange={(event) => updateProject(project.id, 'project_url', event.target.value)} placeholder="https://..." {...imeInputProps} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div><h2 className="font-display text-2xl text-campus-900">변경 사항 저장</h2><p className="mt-2 text-sm text-campus-600">입력한 프로필 정보, 스킬, 프로젝트 경험을 저장합니다.</p></div>
            <Button type="button" onMouseDown={ime.preventBlurOnMouseDown} onClick={() => void ime.runImeSafeAction(handleSaveProfile)} disabled={isSaving}>{isSaving ? '저장 중…' : '저장하기'}</Button>
          </div>
          {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3"><p className="text-sm text-rose-600">{errorMessage}</p></div> : null}
          {successMessage ? <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3"><p className="text-sm text-brand-700">{successMessage}</p></div> : null}
        </Card>

        <Card className="space-y-4 border-rose-200 bg-rose-50">
          <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">주의</p><h2 className="font-display text-2xl text-campus-900">회원 탈퇴</h2><p className="text-sm leading-relaxed text-campus-600">회원 탈퇴는 되돌릴 수 없으며, 현재 프로젝트에서는 관리자 API 연동이 필요합니다.</p></div>
          <div className="flex justify-end">
            <button type="button" onClick={() => { setDeleteErrorMessage(''); setIsDeleteModalOpen(true) }} className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300">회원 탈퇴</button>
          </div>
        </Card>
      </section>

      <DeleteAccountModal isOpen={isDeleteModalOpen} email={form.email} isSubmitting={isDeleting} errorMessage={deleteErrorMessage} onClose={() => { if (!isDeleting) setIsDeleteModalOpen(false) }} onConfirm={async () => { await handleDeleteAccount() }} />
    </>
  )
}
