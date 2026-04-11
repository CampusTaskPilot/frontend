import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SkillSelector } from '../components/common/SkillSelector'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { InputField } from '../components/ui/InputField'
import { useImeSafeSubmit } from '../hooks/useImeSafeSubmit'
import { useAuth } from '../features/auth/context/useAuth'
import { fetchSkillOptions, createTeamWithRelations } from '../features/teams/lib/teams'
import type { SkillOption } from '../features/teams/types/team'

interface TeamCreateFormState {
  name: string
  summary: string
  description: string
  maxMembers: string
  category: string
  isRecruiting: boolean
}

const initialForm: TeamCreateFormState = {
  name: '',
  summary: '',
  description: '',
  maxMembers: '5',
  category: '',
  isRecruiting: true,
}

const SUMMARY_MIN_LENGTH = 10

export function TeamCreatePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const ime = useImeSafeSubmit()
  const [form, setForm] = useState<TeamCreateFormState>(initialForm)
  const [skills, setSkills] = useState<SkillOption[]>([])
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])
  const [isLoadingSkills, setIsLoadingSkills] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadSkills() {
      setIsLoadingSkills(true)

      try {
        const result = await fetchSkillOptions()
        if (!isMounted) return
        setSkills(result)
      } catch (error) {
        if (!isMounted) return
        setErrorMessage(error instanceof Error ? error.message : '스킬 목록을 불러오지 못했습니다.')
      } finally {
        if (isMounted) {
          setIsLoadingSkills(false)
        }
      }
    }

    void loadSkills()

    return () => {
      isMounted = false
    }
  }, [])

  function updateForm<K extends keyof TeamCreateFormState>(key: K, value: TeamCreateFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function addSkill(skillId: number) {
    if (selectedSkills.includes(skillId)) {
      return
    }

    setSelectedSkills((prev) => [...prev, skillId])
  }

  function removeSkill(skillId: number) {
    setSelectedSkills((prev) => prev.filter((id) => id !== skillId))
  }

  function validateForm() {
    if (!form.name.trim()) {
      return '팀명은 필수입니다.'
    }

    if (form.summary.trim().length < SUMMARY_MIN_LENGTH) {
      return `한 줄 소개는 최소 ${SUMMARY_MIN_LENGTH}자 이상 입력해 주세요.`
    }

    const parsedMaxMembers = Number(form.maxMembers)
    if (!Number.isInteger(parsedMaxMembers) || parsedMaxMembers < 2) {
      return '최대 인원은 2명 이상이어야 합니다.'
    }

    return ''
  }

  async function handleSubmit() {
    if (!user) {
      setErrorMessage('로그인 후 팀을 생성할 수 있습니다.')
      return
    }

    const validationError = validateForm()
    if (validationError) {
      setErrorMessage(validationError)
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const teamId = await createTeamWithRelations({
        userId: user.id,
        name: form.name,
        summary: form.summary,
        description: form.description,
        maxMembers: Number.parseInt(form.maxMembers, 10),
        category: form.category,
        isRecruiting: form.isRecruiting,
        skillIds: selectedSkills,
      })

      navigate(`/teams/${teamId}`, { replace: true })
    } catch (error: unknown) {
  console.error('팀 생성 오류:', error)

  let message = '팀 생성에 실패했습니다.'

  if (error instanceof Error) {
    message = error.message
  } else if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: unknown }).message === 'string'
  ) {
    message = (error as { message: string }).message
  } else if (typeof error === 'string') {
    message = error
  }

  setErrorMessage(message)
} finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="page-shell">
      <Card className="page-hero space-y-3 bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,248,255,0.94))]">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">팀</p>
        <h1 className="font-display text-3xl text-campus-900">팀 생성하기</h1>
        <p className="text-sm text-campus-700">
          기본 정보와 모집 정보를 입력하고 기술 스택을 설정해 팀을 시작하세요.
        </p>
      </Card>

      <form className="space-y-6" onSubmit={ime.createSubmitHandler(handleSubmit)} noValidate>
        <Card className="space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-campus-900">기본 정보</h2>
            <p className="text-sm text-campus-600">팀 소개와 상세 설명을 입력하세요.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="팀명"
              value={form.name}
              onChange={(event) => updateForm('name', event.target.value)}
              onCompositionStart={ime.handleCompositionStart}
              onCompositionEnd={ime.handleCompositionEnd}
              onKeyDown={ime.preventEnterWhileComposing()}
              placeholder="예: AI 스터디 팀"
              required
            />
            <InputField
              label="카테고리"
              value={form.category}
              onChange={(event) => updateForm('category', event.target.value)}
              onCompositionStart={ime.handleCompositionStart}
              onCompositionEnd={ime.handleCompositionEnd}
              onKeyDown={ime.preventEnterWhileComposing()}
              placeholder="예: AI, 웹, 모바일"
            />
            <InputField
              label="한 줄 소개"
              value={form.summary}
              onChange={(event) => updateForm('summary', event.target.value)}
              onCompositionStart={ime.handleCompositionStart}
              onCompositionEnd={ime.handleCompositionEnd}
              onKeyDown={ime.preventEnterWhileComposing()}
              hint={`최소 ${SUMMARY_MIN_LENGTH}자`}
              className="md:col-span-2"
            />
            <label className="space-y-2 text-sm font-medium text-campus-700 md:col-span-2">
              <span>상세 설명</span>
              <textarea
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                onCompositionStart={ime.handleCompositionStart}
                onCompositionEnd={ime.handleCompositionEnd}
                onKeyDown={ime.preventEnterWhileComposing()}
                rows={6}
                className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
                placeholder="팀의 목표, 진행 방식, 원하는 팀원을 적어주세요."
              />
            </label>
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-campus-900">모집 정보</h2>
            <p className="text-sm text-campus-600">정원과 모집 상태를 설정하세요.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <InputField
              label="최대 인원"
              type="number"
              min={2}
              value={form.maxMembers}
              onChange={(event) => updateForm('maxMembers', event.target.value)}
            />
            <label className="flex h-full items-end">
              <span className="flex w-full items-center gap-3 rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3 text-sm text-campus-700">
                <input
                  type="checkbox"
                  checked={form.isRecruiting}
                  onChange={(event) => updateForm('isRecruiting', event.target.checked)}
                  className="h-4 w-4 rounded border-campus-300 text-brand-500 focus:ring-brand-300"
                />
                현재 모집 중
              </span>
            </label>
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="space-y-2">
            <h2 className="font-display text-2xl text-campus-900">기술 스택</h2>
            <p className="text-sm text-campus-600">기존 스킬 테이블에서 팀 기술을 선택하세요.</p>
          </div>
          {isLoadingSkills ? (
            <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-5 text-sm text-campus-600">
              스킬 목록을 불러오는 중입니다...
            </div>
          ) : (
            <SkillSelector
              skills={skills}
              selectedSkillIds={selectedSkills}
              onSelectSkill={addSkill}
              onDeselectSkill={removeSkill}
              showSelectedList
              emptySelectedMessage="선택된 기술 스택이 없습니다."
            />
          )}
        </Card>

        {errorMessage && (
          <Card className="border-rose-200 bg-rose-50">
            <p className="text-sm text-rose-600">{errorMessage}</p>
          </Card>
        )}

        <div className="flex justify-end">
          <Button type="submit" onMouseDown={ime.preventBlurOnMouseDown} disabled={isSubmitting}>
            {isSubmitting ? '팀 생성 중...' : '팀 생성 완료'}
          </Button>
        </div>
      </form>
    </section>
  )
}

