export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

export interface ProfileRecord {
  id: string
  email: string
  full_name: string | null
  headline: string | null
  bio: string | null
  location: string | null
  university: string | null
  major: string | null
  grade: string | null
  current_status: string | null
  desired_role: string | null
  interest_areas: string | null
  preferred_project_types: string | null
  collaboration_style: string | null
  working_style: string | null
  availability: string | null
  profile_image_url: string | null
  github_url: string | null
  blog_url: string | null
  portfolio_url: string | null
  created_at?: string
  updated_at?: string
}

export type ProfileProjectType = 'personal' | 'team'

export interface ProfileProjectRecord {
  id: string
  profile_id: string
  name: string
  summary: string | null
  project_type: ProfileProjectType
  role: string | null
  tech_stack: string | null
  contribution_summary: string | null
  start_date: string | null
  end_date: string | null
  is_ongoing: boolean
  github_url: string | null
  project_url: string | null
  display_order: number
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
  headline: string
  bio: string
  location: string
  university: string
  major: string
  grade: string
  current_status: string
  desired_role: string
  interest_areas: string
  preferred_project_types: string
  collaboration_style: string
  working_style: string
  availability: string
  profile_image_url: string
  github_url: string
  blog_url: string
  portfolio_url: string
}

export interface EditableProfileProject {
  id: string
  name: string
  summary: string
  project_type: ProfileProjectType
  role: string
  tech_stack: string
  contribution_summary: string
  start_date: string
  end_date: string
  is_ongoing: boolean
  github_url: string
  project_url: string
}

export interface SelectedSkill {
  skill_id: number
  level: SkillLevel
}
