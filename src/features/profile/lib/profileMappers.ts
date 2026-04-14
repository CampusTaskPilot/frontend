import type {
  EditableProfileProject,
  EditableProfileForm,
  ProfileProjectRecord,
  ProfileRecord,
  ProfileSkillRecord,
  SelectedSkill,
  SkillRecord,
} from '../types'

interface BuildEditableProfileFormParams {
  profile: ProfileRecord | null
  fallbackEmail: string
  fallbackFullName: string
}

export function buildEditableProfileForm({
  profile,
  fallbackEmail,
  fallbackFullName,
}: BuildEditableProfileFormParams): EditableProfileForm {
  return {
    email: profile?.email ?? fallbackEmail,
    full_name: profile?.full_name ?? fallbackFullName,
    headline: profile?.headline ?? '',
    bio: profile?.bio ?? '',
    location: profile?.location ?? '',
    university: profile?.university ?? '',
    major: profile?.major ?? '',
    grade: profile?.grade ?? '',
    current_status: profile?.current_status ?? '',
    desired_role: profile?.desired_role ?? '',
    interest_areas: profile?.interest_areas ?? '',
    preferred_project_types: profile?.preferred_project_types ?? '',
    collaboration_style: profile?.collaboration_style ?? '',
    working_style: profile?.working_style ?? '',
    availability: profile?.availability ?? '',
    profile_image_url: profile?.profile_image_url ?? '',
    github_url: profile?.github_url ?? '',
    blog_url: profile?.blog_url ?? '',
    portfolio_url: profile?.portfolio_url ?? '',
  }
}

export function profileSkillsToSelectedSkills(profileSkills: ProfileSkillRecord[]): SelectedSkill[] {
  return profileSkills.map((item) => ({
    skill_id: item.skill_id,
    level: item.level,
  }))
}

export function profileProjectsToEditableProjects(
  profileProjects: ProfileProjectRecord[],
): EditableProfileProject[] {
  return profileProjects.map((project) => ({
    id: project.id,
    name: project.name ?? '',
    summary: project.summary ?? '',
    project_type: project.project_type ?? 'personal',
    role: project.role ?? '',
    tech_stack: project.tech_stack ?? '',
    contribution_summary: project.contribution_summary ?? '',
    start_date: project.start_date ?? '',
    end_date: project.end_date ?? '',
    is_ongoing: Boolean(project.is_ongoing),
    github_url: project.github_url ?? '',
    project_url: project.project_url ?? '',
  }))
}

export interface ProfileSkillViewItem {
  skill_id: number
  level: ProfileSkillRecord['level']
  name: string
  category: string | null
}

export function mapProfileSkillViewItems(
  profileSkills: ProfileSkillRecord[],
  allSkills: SkillRecord[],
): ProfileSkillViewItem[] {
  return profileSkills.map((item) => {
    const skill = allSkills.find((currentSkill) => currentSkill.id === item.skill_id)

    return {
      skill_id: item.skill_id,
      level: item.level,
      name: skill?.name ?? `스킬 #${item.skill_id}`,
      category: skill?.category ?? null,
    }
  })
}
