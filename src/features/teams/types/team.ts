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
  team_note: string | null
  image_url: string | null
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

export interface TeamMemberSkillTag {
  id: number
  name: string
  level: string | null
}

export interface TeamMemberWithProfile extends TeamMemberRecord {
  profile: ProfileSummary | null
  skills: TeamMemberSkillTag[]
}

export interface TeamListItem extends TeamRecord {
  current_members: number
  leader_name: string | null
  current_user_role: TeamMemberRole | null
}

export interface PaginatedTeamListResult {
  items: TeamListItem[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
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
  is_current_user_member: boolean
  can_manage_applications: boolean
  leader: ProfileSummary | null
  skills: TeamSkillTag[]
}

export type TeamApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'
export type TeamApplicationAnalysisStatus =
  | 'queued'
  | 'deferred'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'insufficient_data'
export type TeamApplicationAnalysisSuitability = 'high' | 'medium' | 'low' | 'insufficient_data'
export type TeamApplicationAnalysisConfidence = 'high' | 'medium' | 'low'

export interface TeamApplicationSnapshotSkill {
  name: string
  level: string | null
}

export interface TeamApplicationProjectSnapshot {
  name: string | null
  summary: string | null
  role: string | null
  tech_stack: string | null
  contribution_summary: string | null
  github_url: string | null
  project_url: string | null
}

export interface TeamApplicationApplicantSnapshot {
  user_id: string
  display_name: string
  headline: string | null
  bio: string | null
  skills: TeamApplicationSnapshotSkill[]
  roles_interests: string[]
  experience_summary: string | null
  projects: TeamApplicationProjectSnapshot[]
  portfolio_links: string[]
  timezone_or_availability: string | null
  application_message: string | null
  profile_image_url: string | null
  collaboration_style: string | null
  working_style: string | null
}

export interface TeamApplicationTeamSnapshot {
  team_id: string
  title: string
  short_description: string
  full_description: string
  desired_role: string | null
  required_skills: string[]
  preferred_skills: string[]
  availability_expectations: string | null
  tags: string[]
  leader_fit_notes: string | null
}

export interface TeamApplicationAnalysis {
  id: string
  application_id: string
  status: TeamApplicationAnalysisStatus
  trigger_source: 'on_apply' | 'on_first_view' | 'manual_retry'
  model: string | null
  provider: string | null
  prompt_version: string | null
  suitability_level: TeamApplicationAnalysisSuitability | null
  one_line_summary: string | null
  reasons: string[]
  strengths: string[]
  concerns: string[]
  follow_up_questions: string[]
  confidence: TeamApplicationAnalysisConfidence | null
  input_tokens: number | null
  output_tokens: number | null
  estimated_cost: number | null
  attempt_count: number
  queued_at: string | null
  started_at: string | null
  completed_at: string | null
  failed_at: string | null
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface TeamApplicationAnalysisSummary {
  id: string
  application_id: string
  status: TeamApplicationAnalysisStatus
  trigger_source: 'on_apply' | 'on_first_view' | 'manual_retry'
  suitability_level: TeamApplicationAnalysisSuitability | null
  one_line_summary: string | null
  confidence: TeamApplicationAnalysisConfidence | null
  attempt_count: number
  queued_at: string | null
  started_at: string | null
  completed_at: string | null
  failed_at: string | null
  last_error: string | null
  updated_at: string
}

export interface TeamApplicationAnalysisLookupRecord extends TeamApplicationAnalysisSummary {
  details_available: boolean
  reasons: string[]
  strengths: string[]
  concerns: string[]
  follow_up_questions: string[]
}

export interface TeamApplicationActivityLog {
  id: string
  application_id: string
  actor_user_id: string | null
  event_type: string
  payload: Record<string, unknown> | null
  created_at: string
}

export interface TeamApplicationApplicantSummary {
  display_name: string
  headline: string | null
  profile_image_url: string | null
  skills: string[]
  application_message: string | null
}

export interface TeamApplicationSummaryRecord {
  id: string
  team_id: string
  applicant_user_id: string
  status: TeamApplicationStatus
  applied_at: string
  reviewed_at: string | null
  reviewed_by_user_id: string | null
  review_note: string | null
  applicant: TeamApplicationApplicantSummary
  analysis: TeamApplicationAnalysisSummary | null
}

export type TeamApplicationReviewAction = 'accepted' | 'rejected'

export interface TeamApplicationMutationResult {
  ok: boolean
  action: TeamApplicationReviewAction
  application_id: string
  team_id: string
  applicant_user_id: string
  status: TeamApplicationStatus
  reviewed_at: string | null
  reviewed_by_user_id: string | null
  review_note: string | null
  message: string
}

export interface TeamApplicationRecord {
  id: string
  team_id: string
  applicant_user_id: string
  applicant_message: string | null
  status: TeamApplicationStatus
  applied_at: string
  reviewed_at: string | null
  reviewed_by_user_id: string | null
  review_note: string | null
  applicant_snapshot: TeamApplicationApplicantSnapshot
  team_snapshot: TeamApplicationTeamSnapshot
  analysis: TeamApplicationAnalysis | null
  activity_logs?: TeamApplicationActivityLog[]
}

export interface TeamDeletionResult {
  id: string
  name: string
}

export type TeamMemberRemovalAction = 'removed' | 'left'

export interface TeamMemberRemovalResponse {
  accepted: boolean
  action: TeamMemberRemovalAction
  team_id: string
  member_id: string
  removed_user_id: string
  message: string
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

export type AiTaskGenerationJobStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface AiTaskGenerationLog {
  id: string
  team_id: string
  requested_by: string
  status: AiTaskGenerationJobStatus
  created_count: number
  error_message: string | null
  started_at: string | null
  completed_at: string | null
}

export interface AiTaskGenerationStatus {
  can_trigger: boolean
  cooldown_minutes: number
  cooldown_remaining_seconds: number
  cooldown_until: string | null
  latest_log: AiTaskGenerationLog | null
  message: string | null
}

export interface AiTaskGenerationStartResponse {
  accepted: boolean
  message: string
  latest_log: AiTaskGenerationLog
  cooldown_minutes: number
  cooldown_until: string
}

export type AiTaskAssignmentStatusType =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cooldown'

export interface AiTaskAssignmentLog {
  id: string
  team_id: string
  requested_by: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  assigned_count: number
  error_message: string | null
  cooldown_until: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AiTaskAssignmentStatus {
  status: AiTaskAssignmentStatusType
  cooldown_until: string | null
  remaining_seconds: number
  error_message: string | null
  assigned_count: number
  last_run_at: string | null
  current_job_id: string | null
  latest_log: AiTaskAssignmentLog | null
}

export interface AiTaskAssignmentStartResponse {
  accepted: boolean
  message: string
  latest_log: AiTaskAssignmentLog
  status: AiTaskAssignmentStatusType
  cooldown_until: string
  remaining_seconds: number
}

export type AiTodoGenerationStatusType =
  | 'idle'
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cooldown'

export interface AiTodoGenerationLog {
  id: string
  task_id: string
  team_id: string
  requested_by: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_count: number
  error_message: string | null
  cooldown_until: string | null
  started_at: string | null
  completed_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AiTodoGenerationStatus {
  status: AiTodoGenerationStatusType
  cooldown_until: string | null
  remaining_seconds: number
  error_message: string | null
  created_count: number
  last_run_at: string | null
  current_job_id: string | null
  latest_log: AiTodoGenerationLog | null
  created_todos: TeamTodoRecord[]
}

export interface AiTodoGenerationStartResponse {
  accepted: boolean
  message: string
  latest_log: AiTodoGenerationLog
  status: AiTodoGenerationStatusType
  cooldown_until: string
  remaining_seconds: number
  created_count: number
  created_todos: TeamTodoRecord[]
}

export type TeamCalendarEventType = 'general' | 'meeting' | 'deadline' | 'presentation'

export interface MeetingActionizerTodoDraft {
  content: string
  is_done: boolean
  position: number
  created_by: string
}

export interface MeetingActionizerTaskDraft {
  client_draft_id: string
  team_id: string
  title: string
  description: string | null
  status: TeamTaskStatus
  priority: TeamTaskPriority
  assignee_id: string | null
  suggested_assignee_name: string | null
  created_by: string
  due_date: string | null
  position: number
  todos: MeetingActionizerTodoDraft[]
}

export interface MeetingActionizerCalendarEventDraft {
  client_draft_id: string
  team_id: string
  title: string
  description: string | null
  type: TeamCalendarEventType
  event_date: string
  start_time: string | null
  end_time: string | null
  is_all_day: boolean
  created_by: string
}

export interface MeetingActionizerResponse {
  summary: string
  decisions: string[]
  task_drafts: MeetingActionizerTaskDraft[]
  calendar_event_drafts: MeetingActionizerCalendarEventDraft[]
  suspicious_injection_detected: boolean
  cooldown_until: string | null
  remaining_seconds: number
}

export interface MeetingActionizerStatus {
  can_trigger: boolean
  cooldown_minutes: number
  remaining_seconds: number
  available_at: string | null
  message: string | null
}

export type ReportPeriodPreset = 'this_week' | 'last_week' | 'custom'
export type PMReportScope = 'team' | 'personal'
export type ReportTaskInclusionReason =
  | 'due_date_in_range'
  | 'task_updated_in_range'
  | 'todo_updated_in_range'

export interface PMReportTodoItem {
  id: string
  content: string
  is_done: boolean
  updated_at: string
  changed_in_period: boolean
}

export interface PMReportAssignee {
  id: string
  full_name: string | null
  email: string | null
  profile_image_url: string | null
}

export interface PMReportTaskItem {
  id: string
  title: string
  description: string | null
  status: TeamTaskStatus
  priority: TeamTaskPriority
  due_date: string | null
  updated_at: string
  assignee: PMReportAssignee | null
  inclusion_reasons: ReportTaskInclusionReason[]
  todo_total_count: number
  todo_completed_count: number
  todo_pending_count: number
  changed_todo_count_in_period: number
  progress_ratio: number
  completed_todos: PMReportTodoItem[]
  pending_todos: PMReportTodoItem[]
  changed_todos_in_period: PMReportTodoItem[]
}

export interface PMReportStatusSummary {
  done: number
  in_progress: number
  todo: number
}

export interface PMReportCalendarEventItem {
  id: string
  title: string
  type: 'general' | 'meeting' | 'deadline' | 'presentation'
  event_date: string
  start_time: string | null
  end_time: string | null
  is_all_day: boolean
}

export interface PMReportSections {
  summary: string
  completed: string
  in_progress: string
  risks: string
  next_actions: string
}

export interface PMReportStatusLog {
  id: string
  team_id: string
  requested_by: string | null
  report_scope: PMReportScope
  target_user_id: string | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  error_message: string | null
  cooldown_until: string | null
  started_at: string | null
  completed_at: string | null
}

export interface PMReportCooldownStatus {
  can_trigger: boolean
  cooldown_minutes: number
  cooldown_remaining_seconds: number
  cooldown_until: string | null
  latest_log: PMReportStatusLog | null
  message: string | null
}

export interface PMReportResponse {
  report_scope: PMReportScope
  report_label: string
  report_period_label: string
  criteria_description: string
  total_task_count: number
  total_calendar_event_count: number
  status_summary: PMReportStatusSummary
  high_progress_tasks: PMReportTaskItem[]
  schedule_risk_tasks: PMReportTaskItem[]
  tasks: PMReportTaskItem[]
  calendar_events: PMReportCalendarEventItem[]
  report_sections: PMReportSections
  report_source: 'llm' | 'fallback'
  cooldown_minutes: number
  cooldown_remaining_seconds: number
  cooldown_until: string | null
}

export type ProjectDirectionStatus = 'on_track' | 'warning' | 'risk'
export type ProjectDirectionSeverity = 'low' | 'medium' | 'high'
export type ProjectDirectionImportance = 'normal' | 'important' | 'urgent'

export interface ProjectDirectionProjectSummary {
  phase: string
  shortTermGoal: string
  keyMetrics: string[]
}

export interface ProjectDirectionDiagnosisItem {
  title: string
  description: string
  severity: ProjectDirectionSeverity
}

export interface ProjectDirectionActionItem {
  importance: ProjectDirectionImportance
  title: string
  description: string
}

export interface ProjectDirectionOverview {
  id: string
  teamId: string
  status: ProjectDirectionStatus
  headline: string
  summary: string
  projectSummary: ProjectDirectionProjectSummary
  diagnosis: ProjectDirectionDiagnosisItem[]
  actions: ProjectDirectionActionItem[]
  meetingFocus: string[]
  createdBy?: string | null
  createdAt?: string
  updatedAt?: string
  source?: 'llm' | 'fallback'
}

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
