export type TeamMemberRole = 'leader' | 'member' | string

export interface SkillOption {
  id: number
  name: string
  category: string | null
}

export interface TeamSkillTag {
  id: number
  name: string
}

export interface TeamRecord {
  id: string
  name: string
  summary: string
  description: string | null
  max_members: number
  category: string | null
  is_recruiting: boolean
  created_at: string
  leader_id: string
}

export interface TeamMemberRecord {
  id: string
  team_id: string
  user_id: string
  role: TeamMemberRole
  status: string
  joined_at: string
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

export type TeamTaskStatus = 'todo' | 'in_progress' | 'done'
export type TeamTaskPriority = 'low' | 'medium' | 'high'

export interface TeamTaskItem {
  id: string
  title: string
  assignee: string
  status: TeamTaskStatus
}

export interface TeamTodoRecord {
  id: string
  task_id: string
  content: string
  is_done: boolean
  position: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface TeamTaskRecord {
  id: string
  team_id: string
  title: string
  description: string | null
  status: TeamTaskStatus
  priority: TeamTaskPriority
  assignee_id: string | null
  created_by: string
  due_date: string | null
  completed_at: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface TeamTaskWithTodos extends TeamTaskRecord {
  assignee: ProfileSummary | null
  todos: TeamTodoRecord[]
}

export type TeamCalendarEventType = 'general' | 'meeting' | 'deadline' | 'presentation'

export interface TeamCalendarEventRecord {
  id: string
  team_id: string
  title: string
  description: string | null
  type: TeamCalendarEventType
  event_date: string
  start_time: string | null
  end_time: string | null
  is_all_day: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface TeamCalendarEventGroup {
  date: string
  events: TeamCalendarEventRecord[]
}

export interface TeamCalendarEventFormValues {
  title: string
  description: string
  type: TeamCalendarEventType
  event_date: string
  is_all_day: boolean
  start_time: string
  end_time: string
}

export interface TeamCalendarEventUpsertInput {
  title: string
  description: string | null
  type: TeamCalendarEventType
  event_date: string
  is_all_day: boolean
  start_time: string | null
  end_time: string | null
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
