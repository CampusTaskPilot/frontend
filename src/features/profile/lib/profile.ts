import { supabase } from '../../../lib/supabase'
import type {
  EditableProfileForm,
  ProfileRecord,
  ProfileSkillRecord,
  SelectedSkill,
  SkillRecord,
} from '../types'

export async function fetchProfilePageData(userId: string) {
  const [profileResult, skillsResult, profileSkillsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('skills').select('*').order('category').order('name'),
    supabase.from('profile_skills').select('*').eq('profile_id', userId),
  ])

  if (profileResult.error) {
    throw profileResult.error
  }

  if (skillsResult.error) {
    throw skillsResult.error
  }

  if (profileSkillsResult.error) {
    throw profileSkillsResult.error
  }

  return {
    profile: (profileResult.data as ProfileRecord | null) ?? null,
    skills: (skillsResult.data as SkillRecord[] | null) ?? [],
    profileSkills: (profileSkillsResult.data as ProfileSkillRecord[] | null) ?? [],
  }
}

interface SaveProfileResult {
  metadataSyncFailed: boolean
  savedProfile: ProfileRecord | null
  savedProfileSkills: ProfileSkillRecord[]
}

export async function saveProfilePageData(params: {
  userId: string
  email: string
  form: EditableProfileForm
  selectedSkills: SelectedSkill[]
}) {
  const { userId, email, form, selectedSkills } = params
  const normalizedSkills = Array.from(
    new Map(
      selectedSkills
        .filter((item) => Number.isFinite(item.skill_id))
        .map((item) => [item.skill_id, item]),
    ).values(),
  )

  const profilePayload = {
    id: userId,
    email,
    full_name: form.full_name || null,
    bio: form.bio || null,
    location: form.location || null,
    university: form.university || null,
    major: form.major || null,
    grade: form.grade || null,
    profile_image_url: form.profile_image_url || null,
    github_url: form.github_url || null,
    blog_url: form.blog_url || null,
    portfolio_url: form.portfolio_url || null,
    updated_at: new Date().toISOString(),
  }

  const { data: savedProfile, error: profileError } = await supabase
    .from('profiles')
    .upsert(profilePayload, { onConflict: 'id' })
    .select()
    .single()

  if (profileError) {
    throw profileError
  }

  const { error: deleteSkillsError } = await supabase
    .from('profile_skills')
    .delete()
    .eq('profile_id', userId)

  if (deleteSkillsError) {
    throw deleteSkillsError
  }

  let savedProfileSkills: ProfileSkillRecord[] = []

  if (normalizedSkills.length > 0) {
    const payload = normalizedSkills.map((item) => ({
      profile_id: userId,
      skill_id: item.skill_id,
      level: item.level,
    }))

    const { data: insertedSkills, error: insertSkillsError } = await supabase
      .from('profile_skills')
      .insert(payload)
      .select()

    if (insertSkillsError) {
      throw insertSkillsError
    }

    savedProfileSkills = (insertedSkills as ProfileSkillRecord[] | null) ?? []
  }

  const { error: authUpdateError } = await supabase.auth.updateUser({
    data: {
      full_name: form.full_name || '',
    },
  })

  return {
    metadataSyncFailed: Boolean(authUpdateError),
    savedProfile: (savedProfile as ProfileRecord | null) ?? null,
    savedProfileSkills,
  } satisfies SaveProfileResult
}

export async function requestAccountDeletion() {
  throw new Error(
    '현재 프로젝트 구조에서는 브라우저에서 auth.users 삭제를 직접 수행할 수 없습니다. 추후 서버 또는 관리자 API 연동이 필요합니다.',
  )
}
