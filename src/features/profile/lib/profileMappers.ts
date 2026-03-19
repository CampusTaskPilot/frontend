import type {
  EditableProfileForm,
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
    bio: profile?.bio ?? '',
    location: profile?.location ?? '',
    university: profile?.university ?? '',
    major: profile?.major ?? '',
    grade: profile?.grade ?? '',
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

