import { supabase } from '../../../lib/supabase'
import {
  PROFILE_IMAGE_BUCKET,
  extractProfileImageReference,
  removeProfileImageByReference,
  uploadProfileImage,
  validateProfileImageFile,
} from './profileImages'
import type {
  EditableProfileForm,
  EditableProfileProject,
  ProfileProjectRecord,
  ProfileRecord,
  ProfileSkillRecord,
  SelectedSkill,
  SkillRecord,
} from '../types'

export async function fetchProfilePageData(userId: string) {
  const [profileResult, skillsResult, profileSkillsResult, profileProjectsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('skills').select('*').order('category').order('name'),
    supabase.from('profile_skills').select('*').eq('profile_id', userId),
    supabase.from('profile_projects').select('*').eq('profile_id', userId).order('display_order'),
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

  if (profileProjectsResult.error) {
    throw profileProjectsResult.error
  }

  return {
    profile: (profileResult.data as ProfileRecord | null) ?? null,
    skills: (skillsResult.data as SkillRecord[] | null) ?? [],
    profileSkills: (profileSkillsResult.data as ProfileSkillRecord[] | null) ?? [],
    profileProjects: (profileProjectsResult.data as ProfileProjectRecord[] | null) ?? [],
  }
}

interface SaveProfileResult {
  metadataSyncFailed: boolean
  savedProfile: ProfileRecord | null
  savedProfileSkills: ProfileSkillRecord[]
  savedProfileProjects: ProfileProjectRecord[]
}

function describeError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }
  return fallback
}

function normalizeProjectInput(projects: EditableProfileProject[]) {
  return projects
    .map((project, index) => {
      const normalizedName = project.name.trim()
      const normalizedSummary = project.summary.trim()
      const normalizedRole = project.role.trim()
      const normalizedTechStack = project.tech_stack.trim()
      const normalizedContributionSummary = project.contribution_summary.trim()
      const normalizedGithubUrl = project.github_url.trim()
      const normalizedProjectUrl = project.project_url.trim()

      const hasMeaningfulContent = Boolean(
        normalizedName ||
          normalizedSummary ||
          normalizedRole ||
          normalizedTechStack ||
          normalizedContributionSummary ||
          normalizedGithubUrl ||
          normalizedProjectUrl,
      )

      if (!hasMeaningfulContent || !normalizedName) {
        return null
      }

      return {
        name: normalizedName,
        summary: normalizedSummary || null,
        project_type: project.project_type,
        role: normalizedRole || null,
        tech_stack: normalizedTechStack || null,
        contribution_summary: normalizedContributionSummary || null,
        start_date: project.start_date || null,
        end_date: project.is_ongoing ? null : project.end_date || null,
        is_ongoing: Boolean(project.is_ongoing),
        github_url: normalizedGithubUrl || null,
        project_url: normalizedProjectUrl || null,
        display_order: index,
      }
    })
    .filter((project): project is NonNullable<typeof project> => project !== null)
}

export async function saveProfilePageData(params: {
  userId: string
  email: string
  form: EditableProfileForm
  selectedSkills: SelectedSkill[]
  projects: EditableProfileProject[]
  imageFile?: File | null
  removeImage?: boolean
  currentProfileImageUrl?: string | null
}) {
  const {
    userId,
    email,
    form,
    selectedSkills,
    projects,
    imageFile = null,
    removeImage = false,
    currentProfileImageUrl = null,
  } = params
  const normalizedSkills = Array.from(
    new Map(
      selectedSkills
        .filter((item) => Number.isFinite(item.skill_id))
        .map((item) => [item.skill_id, item]),
    ).values(),
  )
  const normalizedProjects = normalizeProjectInput(projects)

  const previousImageReference = extractProfileImageReference(currentProfileImageUrl ?? form.profile_image_url)
  const previousImagePath = previousImageReference?.path ?? null
  let nextImagePath: string | null = previousImagePath
  let uploadedImagePath: string | null = null
  let nextProfileImageUrl: string | null = removeImage ? null : form.profile_image_url || null

  if (imageFile) {
    const validationMessage = validateProfileImageFile(imageFile)

    if (validationMessage) {
      throw new Error(validationMessage)
    }

    try {
      const uploadedImage = await uploadProfileImage(userId, imageFile)
      uploadedImagePath = uploadedImage.path
      nextImagePath = uploadedImage.path
      nextProfileImageUrl = uploadedImage.publicUrl
    } catch (error) {
      throw new Error(`프로필 이미지를 업로드하지 못했습니다. ${describeError(error, '잠시 후 다시 시도해 주세요.')}`)
    }
  }

  if (removeImage && !imageFile) {
    nextImagePath = null
  }

  const profilePayload = {
    id: userId,
    email,
    full_name: form.full_name || null,
    headline: form.headline || null,
    bio: form.bio || null,
    location: form.location || null,
    university: form.university || null,
    major: form.major || null,
    grade: form.grade || null,
    current_status: form.current_status || null,
    desired_role: form.desired_role || null,
    interest_areas: form.interest_areas || null,
    preferred_project_types: form.preferred_project_types || null,
    collaboration_style: form.collaboration_style || null,
    working_style: form.working_style || null,
    availability: form.availability || null,
    profile_image_url: imageFile ? form.profile_image_url || null : nextProfileImageUrl,
    github_url: form.github_url || null,
    blog_url: form.blog_url || null,
    portfolio_url: form.portfolio_url || null,
    updated_at: new Date().toISOString(),
  }

  let savedProfile: ProfileRecord | null = null

  try {
    const { data: upsertedProfile, error: profileError } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select()
      .single()

    if (profileError) {
      throw profileError
    }

    savedProfile = (upsertedProfile as ProfileRecord | null) ?? null

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

    const { error: deleteProjectsError } = await supabase
      .from('profile_projects')
      .delete()
      .eq('profile_id', userId)

    if (deleteProjectsError) {
      throw deleteProjectsError
    }

    let savedProfileProjects: ProfileProjectRecord[] = []

    if (normalizedProjects.length > 0) {
      const payload = normalizedProjects.map((project) => ({
        profile_id: userId,
        ...project,
        updated_at: new Date().toISOString(),
      }))

      const { data: insertedProjects, error: insertProjectsError } = await supabase
        .from('profile_projects')
        .insert(payload)
        .select()
        .order('display_order')

      if (insertProjectsError) {
        throw insertProjectsError
      }

      savedProfileProjects = (insertedProjects as ProfileProjectRecord[] | null) ?? []
    }

    if (imageFile) {
      const { data: imageUpdatedProfile, error: imageUpdateError } = await supabase
        .from('profiles')
        .update({
          profile_image_url: nextProfileImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single()

      if (imageUpdateError) {
        throw imageUpdateError
      }

      savedProfile = (imageUpdatedProfile as ProfileRecord | null) ?? savedProfile
    }

    const { error: authUpdateError } = await supabase.auth.updateUser({
      data: {
        full_name: form.full_name || '',
      },
    })

    if (previousImagePath && previousImagePath !== nextImagePath) {
      await removeProfileImageByReference(previousImageReference).catch(() => undefined)
    }

    return {
      metadataSyncFailed: Boolean(authUpdateError),
      savedProfile,
      savedProfileSkills,
      savedProfileProjects,
    } satisfies SaveProfileResult
  } catch (error) {
    if (uploadedImagePath) {
      await removeProfileImageByReference(
        uploadedImagePath
          ? {
              bucket: PROFILE_IMAGE_BUCKET,
              path: uploadedImagePath,
            }
          : null,
      ).catch(() => undefined)
    }

    throw error
  }
}

export async function requestAccountDeletion() {
  throw new Error(
    '현재 프로젝트 구조에서는 브라우저에서 auth.users 삭제를 직접 수행할 수 없습니다. 추후 서버 또는 관리자 API 연동이 필요합니다.',
  )
}
