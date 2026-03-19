export type TeamMemberRole = 'leader' | 'member' | string

export interface SkillOption {
  id: number
  name: string
  category: string | null
}

export interface TeamRecord {
  id: string
  name: string
  summary: string | null
  description: string | null
  max_members: number | null
  category: string | null
  is_recruiting: boolean | null
  created_at: string | null
}

export interface TeamMemberRecord {
  team_id: string
  user_id: string
  role: TeamMemberRole
  joined_at: string | null
}

export interface ProfileSummary {
  id: string
  full_name: string | null
  email: string | null
  profile_image_url: string | null
}

export interface TeamMemberWithProfile extends TeamMemberRecord {
  profile: ProfileSummary | null
}

export interface TeamListItem extends TeamRecord {
  current_members: number
  leader_name: string | null
  current_user_role: TeamMemberRole | null
}

export interface TeamDetailData {
  team: TeamRecord | null
  members: TeamMemberWithProfile[]
  skills: SkillOption[]
  current_user_role: TeamMemberRole | null
}

export interface TeamWorkspaceBase {
  team: TeamRecord | null
  current_user_role: TeamMemberRole | null
  leader: ProfileSummary | null
}

export type TeamTaskStatus = 'todo' | 'doing' | 'done'

export interface TeamTaskItem {
  id: string
  title: string
  assignee: string
  status: TeamTaskStatus
}

export interface TeamCalendarItem {
  id: string
  date: string
  title: string
}

export interface SidebarTeamItem {
  id: string
  name: string
  summary: string | null
}

export interface SidebarTeams {
  managedTeams: SidebarTeamItem[]
  joinedTeams: SidebarTeamItem[]
}

export type TeamStatus = 'Active' | 'Paused'

export interface TeamMember {
  id: string
  name: string
  role: string
  availability: 'Focus' | 'At capacity' | 'Out'
}

export interface TeamSummary {
  id: string
  name: string
  mission: string
  members: TeamMember[]
  status: TeamStatus
  velocity: number
  lastUpdated: string
}
