import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { SkillSelector } from '../components/common/SkillSelector'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { InputField } from '../components/ui/InputField'
import { useAuth } from '../features/auth/context/useAuth'
import { DeleteAccountModal } from '../features/profile/components/DeleteAccountModal'
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
  profileSkillsToSelectedSkills,
} from '../features/profile/lib/profileMappers'
import type {
  EditableProfileForm,
  SelectedSkill,
  SkillLevel,
  SkillRecord,
} from '../features/profile/types'

const levelOptions: Array<{ value: SkillLevel; label: string }> = [
  { value: 'beginner', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
]

const emptyForm: EditableProfileForm = {
  email: '',
  full_name: '',
  bio: '',
  location: '',
  university: '',
  major: '',
  grade: '',
  profile_image_url: '',
  github_url: '',
  blog_url: '',
  portfolio_url: '',
}

export function ProfileEditPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userId } = useParams<{ userId: string }>()
  const { user, signOut } = useAuth()
  const [form, setForm] = useState<EditableProfileForm>(emptyForm)
  const [allSkills, setAllSkills] = useState<SkillRecord[]>([])
  const [selectedSkills, setSelectedSkills] = useState<SelectedSkill[]>([])
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
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

  function markDirty() {
    setIsDirty(true)
  }

  function clearDraft() {
    if (!draftKey) {
      return
    }

    clearProfileEditDraft(draftKey)
    setIsDirty(false)
  }

  useEffect(() => {
    hasInitialFormRef.current = false
    setIsInitialized(false)
    setIsDirty(false)
  }, [draftKey])

  useEffect(() => {
    if (!isForbidden || !userId) {
      return
    }

    const timer = window.setTimeout(() => {
      navigate(`/profile/${userId}`, { replace: true })
    }, 1600)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isForbidden, navigate, userId])

  useEffect(() => {
    function handleBeforeUnload() {
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
      if (!isBrowserUnloadRef.current && draftKey) {
        clearProfileEditDraft(draftKey)
      }
    }
  }, [draftKey, location.pathname])

  useEffect(() => {
    if (!user || !userId || user.id !== userId) {
      setIsLoading(false)
      return
    }
    const currentUser = user
    const currentUserId = userId

    let isMounted = true

    async function loadProfilePage() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const { profile, skills, profileSkills } = await fetchProfilePageData(currentUserId)

        if (!isMounted) {
          return
        }

        setAllSkills(skills)

        if (!hasInitialFormRef.current) {
          const draft = draftKey ? loadProfileEditDraft(draftKey) : null

          if (draft) {
            setForm(draft.form)
            setSelectedSkills(draft.selectedSkills)
            setImagePreviewUrl(draft.form.profile_image_url)
            setIsDirty(true)
          } else {
            setSelectedSkills(profileSkillsToSelectedSkills(profileSkills))

            const initialForm = buildEditableProfileForm({
              profile,
              fallbackEmail: currentUser.email ?? '',
              fallbackFullName:
                typeof currentUser.user_metadata?.full_name === 'string'
                  ? currentUser.user_metadata.full_name
                  : '',
            })

            setForm(initialForm)
            setImagePreviewUrl(initialForm.profile_image_url)
            setIsDirty(false)
          }

          hasInitialFormRef.current = true
          setIsInitialized(true)
        }
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(error instanceof Error ? error.message : '프로필 정보를 불러오지 못했습니다.')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadProfilePage()

    return () => {
      isMounted = false
    }
  }, [draftKey, user, userId])

  useEffect(() => {
    if (!isInitialized || !isDirty || !draftKey) {
      return
    }

    saveProfileEditDraft(draftKey, { form, selectedSkills })
  }, [draftKey, form, isDirty, isInitialized, selectedSkills])

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl)
      }
    }
  }, [imagePreviewUrl])

  const displayPreview = selectedImageFile ? imagePreviewUrl : form.profile_image_url || imagePreviewUrl

  function updateForm<K extends keyof EditableProfileForm>(key: K, value: EditableProfileForm[K]) {
    markDirty()
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleAddSkill(skillId: number) {
    if (selectedSkills.some((item) => item.skill_id === skillId)) {
      return
    }

    markDirty()
    setSelectedSkills((prev) => [...prev, { skill_id: skillId, level: 'beginner' }])
  }

  function handleRemoveSkill(skillId: number) {
    markDirty()
    setSelectedSkills((prev) => prev.filter((item) => item.skill_id !== skillId))
  }

  function handleSkillLevelChange(skillId: number, level: SkillLevel) {
    markDirty()
    setSelectedSkills((prev) =>
      prev.map((item) => (item.skill_id === skillId ? { ...item, level } : item)),
    )
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    const previewUrl = URL.createObjectURL(file)
    markDirty()
    setSelectedImageFile(file)
    setImagePreviewUrl(previewUrl)
    setSuccessMessage('')
  }

  function handleResetImage() {
    if (imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    markDirty()
    setSelectedImageFile(null)
    setImagePreviewUrl(form.profile_image_url)
  }

  function handleRemoveImage() {
    if (imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    markDirty()
    setSelectedImageFile(null)
    setImagePreviewUrl('')
    updateForm('profile_image_url', '')
  }

  function handleCancelEdit() {
    if (!userId) {
      return
    }

    clearDraft()
    navigate(`/profile/${userId}`)
  }

  async function handleSaveProfile() {
    if (!user || !user.email || !userId || user.id !== userId) {
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await saveProfilePageData({
        userId,
        email: user.email,
        form,
        selectedSkills,
      })

      if (result.savedProfile) {
        const nextForm = buildEditableProfileForm({
          profile: result.savedProfile,
          fallbackEmail: user.email,
          fallbackFullName: '',
        })

        setForm(nextForm)
        setImagePreviewUrl(nextForm.profile_image_url)
      }

      setSelectedSkills(result.savedProfileSkills.length > 0 ? result.savedProfileSkills : selectedSkills)
      setSelectedImageFile(null)
      clearDraft()
      setSuccessMessage(
        result.metadataSyncFailed
          ? '프로필은 저장되었지만 계정 이름 동기화에 실패했습니다.'
          : '프로필이 저장되었습니다.',
      )
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `프로필 저장에 실패했습니다. ${error.message}`
          : `프로필 저장에 실패했습니다. ${JSON.stringify(error)}`,
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true)
    setDeleteErrorMessage('')

    try {
      await requestAccountDeletion()
      await signOut()
      navigate('/', { replace: true })
    } catch (error) {
      setDeleteErrorMessage(
        error instanceof Error ? error.message : '회원 탈퇴 처리 중 오류가 발생했습니다.',
      )
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
            <Button variant="ghost" asChild>
              <Link to={`/profile/${userId}`}>프로필로 돌아가기</Link>
            </Button>
          </div>
        </Card>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="page-shell">
        <Card>
          <p className="text-sm text-campus-600">프로필 정보를 불러오는 중입니다...</p>
        </Card>
      </section>
    )
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
        <Card className="page-hero space-y-3 bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,248,255,0.94))]">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">계정</p>
          <h1 className="font-display text-3xl text-campus-900">프로필 수정</h1>
          <p className="max-w-2xl text-sm text-campus-700">
            기본 정보, 링크, 보유 스킬을 수정하고 저장할 수 있습니다.
          </p>
          <div>
            <Button variant="ghost" type="button" onClick={handleCancelEdit}>
              취소
            </Button>
          </div>
        </Card>

        <div className="grid items-start gap-6 2xl:grid-cols-[360px,minmax(0,1fr)]">
          <Card className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-2xl text-campus-900">프로필 이미지</h2>
              <p className="text-sm text-campus-600">저장 전에 프로필 이미지를 미리 확인하고 관리하세요.</p>
            </div>

            <div className="flex flex-col items-start gap-4">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-[2rem] border border-campus-200 bg-campus-50">
                {displayPreview ? (
                  <img src={displayPreview} alt="프로필 이미지 미리보기" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm text-campus-500">이미지 없음</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-campus-200 bg-white px-5 py-2.5 text-sm font-medium text-campus-700 transition hover:bg-brand-50">
                  이미지 선택
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
                <Button variant="ghost" type="button" onClick={handleResetImage}>
                  미리보기 초기화
                </Button>
                <Button variant="ghost" type="button" onClick={handleRemoveImage}>
                  이미지 제거
                </Button>
              </div>

              {selectedImageFile && <p className="text-sm text-campus-500">선택한 파일: {selectedImageFile.name}</p>}
            </div>
          </Card>

          <Card className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-2xl text-campus-900">기본 정보</h2>
              <p className="text-sm text-campus-600">이메일은 변경할 수 없고, 나머지 항목은 수정할 수 있습니다.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="이메일" value={form.email} readOnly className="bg-campus-50 text-campus-500" />
              <InputField
                label="이름"
                value={form.full_name}
                onChange={(event) => updateForm('full_name', event.target.value)}
              />
              <InputField
                label="자기소개"
                value={form.bio}
                onChange={(event) => updateForm('bio', event.target.value)}
                className="md:col-span-2"
              />
              <InputField
                label="지역"
                value={form.location}
                onChange={(event) => updateForm('location', event.target.value)}
              />
              <InputField
                label="대학교"
                value={form.university}
                onChange={(event) => updateForm('university', event.target.value)}
              />
              <InputField
                label="전공"
                value={form.major}
                onChange={(event) => updateForm('major', event.target.value)}
              />
              <InputField
                label="학년"
                value={form.grade}
                onChange={(event) => updateForm('grade', event.target.value)}
              />
            </div>
          </Card>
        </div>

        <Card className="space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-campus-900">링크</h2>
            <p className="text-sm text-campus-600">외부에서 확인할 수 있는 링크를 등록하세요.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <InputField
              label="GitHub 주소"
              value={form.github_url}
              onChange={(event) => updateForm('github_url', event.target.value)}
              placeholder="https://github.com/username"
            />
            <InputField
              label="블로그 주소"
              value={form.blog_url}
              onChange={(event) => updateForm('blog_url', event.target.value)}
              placeholder="https://blog.example.com"
            />
            <InputField
              label="포트폴리오 주소"
              value={form.portfolio_url}
              onChange={(event) => updateForm('portfolio_url', event.target.value)}
              placeholder="https://portfolio.example.com"
            />
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-campus-900">보유 스킬</h2>
            <p className="text-sm text-campus-600">
              카테고리와 검색어로 스킬을 찾고 숙련도와 함께 추가할 수 있습니다.
            </p>
          </div>

          <SkillSelector
            skills={allSkills}
            selectedSkillIds={selectedSkills.map((item) => item.skill_id)}
            onSelectSkill={handleAddSkill}
            onDeselectSkill={handleRemoveSkill}
            showSelectedList={false}
          />

          <div className="space-y-3">
            {selectedSkills.length === 0 ? (
              <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-6 text-sm text-campus-500">
                선택된 스킬이 없습니다.
              </div>
            ) : (
              selectedSkills.map((item) => {
                const skill = allSkills.find((currentSkill) => currentSkill.id === item.skill_id)

                return (
                  <div
                    key={item.skill_id}
                    className="flex flex-col gap-3 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium text-campus-900">{skill?.name ?? `스킬 #${item.skill_id}`}</p>
                      <p className="text-sm text-campus-500">{skill?.category ?? '분류 없음'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={item.level}
                        onChange={(event) =>
                          handleSkillLevelChange(item.skill_id, event.target.value as SkillLevel)
                        }
                        className="rounded-full border border-campus-200 bg-white px-4 py-2 text-sm text-campus-700 outline-none transition focus:border-brand-400"
                      >
                        {levelOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <Button variant="ghost" type="button" onClick={() => handleRemoveSkill(item.skill_id)}>
                        삭제
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="font-display text-2xl text-campus-900">변경 사항 저장</h2>
              <p className="text-sm text-campus-600">수정한 프로필 정보와 스킬을 저장합니다.</p>
            </div>
            <Button type="button" onClick={() => void handleSaveProfile()} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장하기'}
            </Button>
          </div>

          {errorMessage && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-600">{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3">
              <p className="text-sm text-brand-700">{successMessage}</p>
            </div>
          )}
        </Card>

        <Card className="space-y-4 border-rose-200 bg-rose-50">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-500">주의</p>
            <h2 className="font-display text-2xl text-campus-900">회원 탈퇴</h2>
            <p className="text-sm leading-relaxed text-campus-600">
              회원 탈퇴는 되돌릴 수 없으며, 현재 프로젝트에서는 관리자 API 연동이 필요합니다.
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setDeleteErrorMessage('')
                setIsDeleteModalOpen(true)
              }}
              className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-600"
            >
              회원 탈퇴
            </button>
          </div>
        </Card>
      </section>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        email={form.email}
        isSubmitting={isDeleting}
        errorMessage={deleteErrorMessage}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false)
          }
        }}
        onConfirm={async () => {
          await handleDeleteAccount()
        }}
      />
    </>
  )
}
