export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export interface ProfileRecord {
  id: string
  email: string
  full_name: string | null
  bio: string | null
  location: string | null
  university: string | null
  major: string | null
  grade: string | null
  profile_image_url: string | null
  github_url: string | null
  blog_url: string | null
  portfolio_url: string | null
  created_at?: string
  updated_at?: string
}

export interface SkillRecord {
  id: number
  name: string
  category: string | null
}

export interface ProfileSkillRecord {
  profile_id: string
  skill_id: number
  level: SkillLevel
}

export interface EditableProfileForm {
  email: string
  full_name: string
  bio: string
  location: string
  university: string
  major: string
  grade: string
  profile_image_url: string
  github_url: string
  blog_url: string
  portfolio_url: string
}

export interface SelectedSkill {
  skill_id: number
  level: SkillLevel
}
