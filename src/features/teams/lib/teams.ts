import { supabase } from '../../../lib/supabase'
import {
  extractTeamImagePath,
  removeTeamImageByPath,
  uploadTeamImage,
  validateTeamImageFile,
} from './teamProfileImages'
import type {
  PaginatedTeamListResult,
  ProfileSummary,
  SidebarTeamItem,
  SidebarTeams,
  SkillOption,
  TeamDetailData,
  TeamDeletionResult,
  TeamListItem,
  TeamMember,
  TeamMemberRecord,
  TeamMemberRole,
  TeamMemberSkillTag,
  TeamMemberWithProfile,
  TeamRecord,
  TeamSummary,
  TeamSkillTag,
  TeamWorkspaceBase,
} from '../types/team'

export const TEAM_CREATION_LIMIT = 3
export const TEAM_CREATION_LIMIT_MESSAGE = '팀은 최대 3개까지 생성할 수 있습니다.'
const teamsUpdatedEvent = 'taskpilot:teams-updated'

const TEAM_SELECT_COLUMNS =
  'id,leader_id,name,summary,description,team_note,image_url,category,max_members,is_recruiting,created_at'

function toTeamRecord(value: unknown): TeamRecord {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    summary: String(row.summary ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
    team_note: typeof row.team_note === 'string' ? row.team_note : null,
    image_url: typeof row.image_url === 'string' ? row.image_url : null,
    max_members: typeof row.max_members === 'number' ? row.max_members : 0,
    category: typeof row.category === 'string' ? row.category : null,
    is_recruiting: typeof row.is_recruiting === 'boolean' ? row.is_recruiting : false,
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    leader_id: String(row.leader_id ?? ''),
  }
}

function toTeamMemberRecord(value: unknown): TeamMemberRecord {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    team_id: String(row.team_id ?? ''),
    user_id: String(row.user_id ?? ''),
    role: String(row.role ?? 'member'),
    status: String(row.status ?? ''),
    joined_at: typeof row.joined_at === 'string' ? row.joined_at : '',
  }
}

function toSkillOption(value: unknown): SkillOption {
  const row = value as Record<string, unknown>

  return {
    id: Number(row.id ?? 0),
    name: String(row.name ?? ''),
    category: typeof row.category === 'string' ? row.category : null,
  }
}

function toProfileSummary(value: unknown): ProfileSummary {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    full_name: typeof row.full_name === 'string' ? row.full_name : null,
    email: typeof row.email === 'string' ? row.email : null,
    profile_image_url: typeof row.profile_image_url === 'string' ? row.profile_image_url : null,
  }
}

function toTeamSkillTag(value: unknown): TeamSkillTag {
  const row = value as Record<string, unknown>

  return {
    id: Number(row.id ?? 0),
    name: String(row.name ?? ''),
  }
}

function toTeamMemberSkillTag(value: unknown, skillNameById: Map<number, string>): {
  profile_id: string
  skill: TeamMemberSkillTag | null
} {
  const row = value as Record<string, unknown>
  const profileId = String(row.profile_id ?? '')
  const skillId = Number(row.skill_id ?? 0)
  const skillName = skillNameById.get(skillId) ?? ''

  return {
    profile_id: profileId,
    skill:
      profileId && skillId > 0 && skillName
        ? {
            id: skillId,
            name: skillName,
            level: typeof row.level === 'string' ? row.level : null,
          }
        : null,
  }
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)))
}

function uniqueSkillIds(values: number[]) {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0)))
}

function displayRole(role: TeamMemberRole) {
  return role
}

function normalizeOptionalText(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function toManagementTeamStatus(isRecruiting: boolean) {
  return isRecruiting ? 'Active' : 'Paused'
}

function toManagementAvailability(role: string): TeamMember['availability'] {
  return role === 'leader' ? 'Focus' : 'At capacity'
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

function getErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string') {
      return code
    }
  }

  return ''
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') {
      return message
    }
  }

  return ''
}

export function isTeamCreationLimitError(error: unknown) {
  const code = getErrorCode(error)
  const message = getErrorMessage(error).toLowerCase()

  if (message.includes(TEAM_CREATION_LIMIT_MESSAGE.toLowerCase())) {
    return true
  }

  return (
    code === '42501' &&
    (message.includes('row-level security') || message.includes('violates row-level security policy')) &&
    message.includes('teams')
  )
}

export function getTeamCreationErrorMessage(error: unknown) {
  if (isTeamCreationLimitError(error)) {
    return TEAM_CREATION_LIMIT_MESSAGE
  }

  return describeError(error, '팀 생성에 실패했습니다.')
}

export async function fetchLeaderTeamCount(userId: string) {
  const { count, error } = await supabase
    .from('teams')
    .select('id', { count: 'exact', head: true })
    .eq('leader_id', userId)

  if (error) {
    throw error
  }

  return count ?? 0
}

async function fetchTeamsByMembershipRole(userId: string, role: TeamMemberRole): Promise<SidebarTeamItem[]> {
  const membershipsResult = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('role', role)
    .eq('status', 'active')
    .order('joined_at', { ascending: false })

  if (membershipsResult.error) {
    throw membershipsResult.error
  }

  const orderedTeamIds = ((membershipsResult.data ?? []) as Array<Record<string, unknown>>)
    .map((membership) => String(membership.team_id ?? ''))
    .filter(Boolean)

  if (orderedTeamIds.length === 0) {
    return []
  }

  const teamsResult = await supabase
    .from('teams')
    .select('id,name,summary')
    .in('id', orderedTeamIds)
    .order('created_at', { ascending: false })

  if (teamsResult.error) {
    throw teamsResult.error
  }

  const teamMap = new Map<string, SidebarTeamItem>(
    ((teamsResult.data ?? []) as Array<Record<string, unknown>>).map((team) => [
      String(team.id ?? ''),
      {
        id: String(team.id ?? ''),
        name: String(team.name ?? ''),
        summary: typeof team.summary === 'string' ? team.summary : null,
      },
    ]),
  )

  return orderedTeamIds.map((teamId) => teamMap.get(teamId)).filter((team): team is SidebarTeamItem => Boolean(team))
}

export async function fetchSkillOptions() {
  const { data, error } = await supabase.from('skills').select('id,name,category').order('category').order('name')

  if (error) {
    throw error
  }

  return ((data ?? []) as unknown[]).map(toSkillOption)
}

export async function fetchTeamCategoryOptions() {
  const { data, error } = await supabase
    .from('teams')
    .select('category')
    .not('category', 'is', null)
    .order('category')

  if (error) {
    throw error
  }

  return Array.from(
    new Set(
      ((data ?? []) as Array<Record<string, unknown>>)
        .map((item) => (typeof item.category === 'string' ? item.category.trim() : ''))
        .filter(Boolean),
    ),
  )
}

export async function fetchTeamWorkspaceBase(teamId: string, userId: string | null): Promise<TeamWorkspaceBase> {
  const [teamResult, membersResult, teamSkillsResult] = await Promise.all([
    supabase.from('teams').select(TEAM_SELECT_COLUMNS).eq('id', teamId).maybeSingle(),
    supabase.from('team_members').select('id,team_id,user_id,role,status,joined_at').eq('team_id', teamId),
    supabase.from('team_skills').select('skill_id').eq('team_id', teamId),
  ])

  if (teamResult.error) {
    throw teamResult.error
  }

  if (membersResult.error) {
    throw membersResult.error
  }

  if (teamSkillsResult.error) {
    throw teamSkillsResult.error
  }

  const team = teamResult.data ? toTeamRecord(teamResult.data) : null
  const members = ((membersResult.data ?? []) as unknown[]).map(toTeamMemberRecord)
  const activeMembers = members.filter((member) => member.status === 'active')
  const currentUserMembership = userId ? activeMembers.find((member) => member.user_id === userId) ?? null : null
  const currentUserRole = currentUserMembership?.role ?? null
  const skillIds = uniqueSkillIds(
    ((teamSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => Number(item.skill_id ?? 0)),
  )

  let leader: ProfileSummary | null = null
  let skills: TeamSkillTag[] = []

  if (team?.leader_id) {
    const leaderProfileResult = await supabase
      .from('profiles')
      .select('id,full_name,email,profile_image_url')
      .eq('id', team.leader_id)
      .maybeSingle()

    if (leaderProfileResult.error) {
      throw leaderProfileResult.error
    }

    if (leaderProfileResult.data) {
      leader = toProfileSummary(leaderProfileResult.data)
    }
  }

  if (skillIds.length > 0) {
    const skillsResult = await supabase.from('skills').select('id,name').in('id', skillIds).order('name')

    if (skillsResult.error) {
      throw skillsResult.error
    }

    skills = ((skillsResult.data ?? []) as unknown[]).map(toTeamSkillTag)
  }

  return {
    team,
    current_user_role: currentUserRole,
    is_current_user_member: Boolean(currentUserMembership),
    can_manage_applications: Boolean(currentUserMembership && currentUserRole === 'leader') || team?.leader_id === userId,
    leader,
    skills,
  }
}

export async function fetchTeamMembers(teamId: string) {
  const membersResult = await supabase
    .from('team_members')
    .select('id,team_id,user_id,role,status,joined_at')
    .eq('team_id', teamId)

  if (membersResult.error) {
    throw membersResult.error
  }

  const members = ((membersResult.data ?? []) as unknown[]).map(toTeamMemberRecord)
  const profileIds = Array.from(new Set(members.map((member) => member.user_id))).filter(Boolean)

  const [profilesResult, profileSkillsResult] = await Promise.all([
    profileIds.length > 0
      ? supabase.from('profiles').select('id,full_name,email,profile_image_url').in('id', profileIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length > 0
      ? supabase.from('profile_skills').select('profile_id,skill_id,level').in('profile_id', profileIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (profilesResult.error) {
    throw profilesResult.error
  }

  if (profileSkillsResult.error) {
    throw profileSkillsResult.error
  }

  const memberSkillIds = uniqueSkillIds(
    ((profileSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => Number(item.skill_id ?? 0)),
  )

  const memberSkillsResult =
    memberSkillIds.length > 0
      ? await supabase.from('skills').select('id,name').in('id', memberSkillIds).order('name')
      : { data: [], error: null }

  if (memberSkillsResult.error) {
    throw memberSkillsResult.error
  }

  const profileMap = new Map<string, ProfileSummary>(
    ((profilesResult.data ?? []) as unknown[]).map((profile) => {
      const parsed = toProfileSummary(profile)
      return [parsed.id, parsed]
    }),
  )

  const skillNameById = new Map<number, string>(
    ((memberSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((skill) => [
      Number(skill.id ?? 0),
      String(skill.name ?? ''),
    ]),
  )

  const skillsByProfileId = new Map<string, TeamMemberSkillTag[]>()
  ;((profileSkillsResult.data ?? []) as unknown[]).forEach((item) => {
    const parsed = toTeamMemberSkillTag(item, skillNameById)
    if (!parsed.skill) return
    const current = skillsByProfileId.get(parsed.profile_id) ?? []
    current.push(parsed.skill)
    skillsByProfileId.set(parsed.profile_id, current)
  })

  return members.map((member) => ({
    ...member,
    profile: profileMap.get(member.user_id) ?? null,
    skills: skillsByProfileId.get(member.user_id) ?? [],
  }))
}

export async function fetchTeamSkills(teamId: string) {
  const teamSkillsResult = await supabase.from('team_skills').select('skill_id').eq('team_id', teamId)

  if (teamSkillsResult.error) {
    throw teamSkillsResult.error
  }

  const skillIds = uniqueSkillIds(
    ((teamSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => Number(item.skill_id ?? 0)),
  )

  if (skillIds.length === 0) {
    return [] as SkillOption[]
  }

  const skillsResult = await supabase.from('skills').select('id,name,category').in('id', skillIds).order('name')

  if (skillsResult.error) {
    throw skillsResult.error
  }

  return ((skillsResult.data ?? []) as unknown[]).map(toSkillOption)
}

export async function fetchTeamSkillTags(teamId: string): Promise<TeamSkillTag[]> {
  const teamSkillsResult = await supabase.from('team_skills').select('skill_id').eq('team_id', teamId)

  if (teamSkillsResult.error) {
    throw teamSkillsResult.error
  }

  const skillIds = uniqueSkillIds(
    ((teamSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => Number(item.skill_id ?? 0)),
  )

  if (skillIds.length === 0) {
    return []
  }

  const skillsResult = await supabase.from('skills').select('id,name').in('id', skillIds).order('name')

  if (skillsResult.error) {
    throw skillsResult.error
  }

  return ((skillsResult.data ?? []) as unknown[]).map(toTeamSkillTag)
}

export async function createTeamWithRelations(params: {
  userId: string
  name: string
  summary: string
  description: string
  maxMembers: number
  category: string
  isRecruiting: boolean
  skillIds: number[]
  imageFile?: File | null
}) {
  const { userId, name, summary, description, maxMembers, category, isRecruiting, skillIds, imageFile = null } = params
  const normalizedSkillIds = uniqueNumbers(skillIds)
  const leaderTeamCount = await fetchLeaderTeamCount(userId)

  if (leaderTeamCount >= TEAM_CREATION_LIMIT) {
    throw new Error(TEAM_CREATION_LIMIT_MESSAGE)
  }

  if (imageFile) {
    const imageValidationMessage = validateTeamImageFile(imageFile)

    if (imageValidationMessage) {
      throw new Error(imageValidationMessage)
    }
  }

  const teamPayload = {
    leader_id: userId,
    name: name.trim(),
    summary: summary.trim(),
    description: description.trim() || null,
    max_members: maxMembers,
    category: category.trim() || null,
    is_recruiting: isRecruiting,
  }

  const { data: createdTeam, error: teamError } = await supabase
    .from('teams')
    .insert(teamPayload)
    .select(TEAM_SELECT_COLUMNS)
    .single()

  if (teamError) {
    throw teamError
  }

  const teamId = String((createdTeam as Record<string, unknown>).id ?? '')
  let uploadedImagePath: string | null = null

  try {
    const { error: leaderInsertError } = await supabase.from('team_members').insert({
      team_id: teamId,
      user_id: userId,
      role: 'leader',
    })

    if (leaderInsertError) {
      throw leaderInsertError
    }

    if (normalizedSkillIds.length > 0) {
      const teamSkillsPayload = normalizedSkillIds.map((skillId) => ({
        team_id: teamId,
        skill_id: skillId,
      }))

      const { error: teamSkillsError } = await supabase.from('team_skills').insert(teamSkillsPayload)

      if (teamSkillsError) {
        throw teamSkillsError
      }
    }

    if (imageFile) {
      try {
        const uploadedImage = await uploadTeamImage(teamId, imageFile)
        uploadedImagePath = uploadedImage.path

        const { error: imageUpdateError } = await supabase
          .from('teams')
          .update({ image_url: uploadedImage.publicUrl })
          .eq('id', teamId)

        if (imageUpdateError) {
          throw imageUpdateError
        }
      } catch (error) {
        throw new Error(`팀 대표 이미지를 업로드하지 못했습니다. ${describeError(error, '잠시 후 다시 시도해 주세요.')}`)
      }
    }
  } catch (error) {
    if (uploadedImagePath) {
      await removeTeamImageByPath(uploadedImagePath).catch(() => undefined)
    }

    await Promise.allSettled([
      supabase.from('team_members').delete().eq('team_id', teamId),
      supabase.from('team_skills').delete().eq('team_id', teamId),
      supabase.from('teams').delete().eq('id', teamId),
    ])

    throw error
  }

  notifyTeamsUpdated()
  return teamId
}

export async function fetchTeamDetail(teamId: string, userId: string | null): Promise<TeamDetailData> {
  const [teamResult, membersResult, teamSkillsResult] = await Promise.all([
    supabase.from('teams').select(TEAM_SELECT_COLUMNS).eq('id', teamId).maybeSingle(),
    supabase.from('team_members').select('id,team_id,user_id,role,status,joined_at').eq('team_id', teamId),
    supabase.from('team_skills').select('team_id,skill_id').eq('team_id', teamId),
  ])

  if (teamResult.error) {
    throw teamResult.error
  }

  if (membersResult.error) {
    throw membersResult.error
  }

  if (teamSkillsResult.error) {
    throw teamSkillsResult.error
  }

  const team = teamResult.data ? toTeamRecord(teamResult.data) : null
  const members = ((membersResult.data ?? []) as unknown[]).map(toTeamMemberRecord)
  const profileIds = Array.from(new Set(members.map((member) => member.user_id))).filter(Boolean)
  const skillIds = uniqueNumbers(
    ((teamSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => Number(item.skill_id ?? 0)),
  )

  const [profilesResult, skillsResult] = await Promise.all([
    profileIds.length > 0
      ? supabase.from('profiles').select('id,full_name,email,profile_image_url').in('id', profileIds)
      : Promise.resolve({ data: [], error: null }),
    skillIds.length > 0
      ? supabase.from('skills').select('id,name,category').in('id', skillIds).order('name')
      : Promise.resolve({ data: [], error: null }),
  ])

  if (profilesResult.error) {
    throw profilesResult.error
  }

  if (skillsResult.error) {
    throw skillsResult.error
  }

  const profileMap = new Map<string, ProfileSummary>(
    ((profilesResult.data ?? []) as unknown[]).map((profile) => {
      const parsed = toProfileSummary(profile)
      return [parsed.id, parsed]
    }),
  )

  const profileSkillsResult =
    profileIds.length > 0
      ? await supabase.from('profile_skills').select('profile_id,skill_id,level').in('profile_id', profileIds)
      : { data: [], error: null }

  if (profileSkillsResult.error) {
    throw profileSkillsResult.error
  }

  const memberSkillIds = uniqueSkillIds(
    ((profileSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((item) => Number(item.skill_id ?? 0)),
  )

  const memberSkillsResult =
    memberSkillIds.length > 0
      ? await supabase.from('skills').select('id,name').in('id', memberSkillIds).order('name')
      : { data: [], error: null }

  if (memberSkillsResult.error) {
    throw memberSkillsResult.error
  }

  const memberSkillNameById = new Map<number, string>(
    ((memberSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((skill) => [
      Number(skill.id ?? 0),
      String(skill.name ?? ''),
    ]),
  )

  const skillsByProfileId = new Map<string, TeamMemberSkillTag[]>()
  ;((profileSkillsResult.data ?? []) as unknown[]).forEach((item) => {
    const parsed = toTeamMemberSkillTag(item, memberSkillNameById)
    if (!parsed.skill) return
    const current = skillsByProfileId.get(parsed.profile_id) ?? []
    current.push(parsed.skill)
    skillsByProfileId.set(parsed.profile_id, current)
  })

  const membersWithProfile: TeamMemberWithProfile[] = members.map((member) => ({
    ...member,
    profile: profileMap.get(member.user_id) ?? null,
    skills: skillsByProfileId.get(member.user_id) ?? [],
  }))

  const currentUserRole =
    (userId ? membersWithProfile.find((member) => member.user_id === userId)?.role : null) ?? null

  return {
    team,
    members: membersWithProfile,
    skills: ((skillsResult.data ?? []) as unknown[]).map(toSkillOption),
    current_user_role: currentUserRole,
  }
}

export async function fetchTeamList(params: {
  userId: string | null
  search?: string
  category?: string
  recruiting?: boolean | null
  page?: number
  pageSize?: number
}): Promise<PaginatedTeamListResult> {
  const { userId, search = '', category = '', recruiting = null, page = 1, pageSize = 10 } = params
  const normalizedSearch = search.trim()
  const normalizedCategory = category.trim()
  const safePage = Math.max(1, page)
  const safePageSize = Math.max(1, pageSize)
  const rangeFrom = (safePage - 1) * safePageSize
  const rangeTo = rangeFrom + safePageSize - 1

  let teamsQuery = supabase
    .from('teams')
    .select(TEAM_SELECT_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo)

  if (normalizedSearch) {
    teamsQuery = teamsQuery.ilike('name', `%${normalizedSearch}%`)
  }

  if (normalizedCategory) {
    teamsQuery = teamsQuery.eq('category', normalizedCategory)
  }

  if (typeof recruiting === 'boolean') {
    teamsQuery = teamsQuery.eq('is_recruiting', recruiting)
  }

  const teamsResult = await teamsQuery

  if (teamsResult.error) {
    throw teamsResult.error
  }

  const teams = ((teamsResult.data ?? []) as unknown[]).map(toTeamRecord)
  const totalCount = teamsResult.count ?? 0
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / safePageSize) : 0
  const teamIds = teams.map((team) => team.id)

  if (teamIds.length === 0) {
    return {
      items: [],
      totalCount,
      page: safePage,
      pageSize: safePageSize,
      totalPages,
    }
  }

  const teamMembersResult = await supabase
    .from('team_members')
    .select('id,team_id,user_id,role,status,joined_at')
    .in('team_id', teamIds)
    .eq('status', 'active')

  if (teamMembersResult.error) {
    throw teamMembersResult.error
  }

  const allMembers = ((teamMembersResult.data ?? []) as unknown[]).map(toTeamMemberRecord)
  const memberCountByTeamId = new Map<string, number>()
  const userRoleByTeamId = new Map<string, TeamMemberRole>()

  allMembers.forEach((member) => {
    memberCountByTeamId.set(member.team_id, (memberCountByTeamId.get(member.team_id) ?? 0) + 1)

    if (userId && member.user_id === userId) {
      userRoleByTeamId.set(member.team_id, member.role)
    }
  })

  const leaderIds = Array.from(new Set(teams.map((team) => team.leader_id).filter(Boolean)))
  const profilesResult =
    leaderIds.length > 0
      ? await supabase.from('profiles').select('id,full_name,email').in('id', leaderIds)
      : { data: [], error: null }

  if (profilesResult.error) {
    throw profilesResult.error
  }

  const leaderNameById = new Map<string, string | null>(
    ((profilesResult.data ?? []) as Array<Record<string, unknown>>).map((profile) => [
      String(profile.id ?? ''),
      typeof profile.full_name === 'string'
        ? profile.full_name
        : typeof profile.email === 'string'
          ? profile.email
          : null,
    ]),
  )

  const result: TeamListItem[] = teams.map((team) => ({
    ...team,
    current_members: memberCountByTeamId.get(team.id) ?? 0,
    leader_name: team.leader_id ? (leaderNameById.get(team.leader_id) ?? null) : null,
    current_user_role: userRoleByTeamId.get(team.id) ?? null,
  }))

  return {
    items: result,
    totalCount,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  }
}

export async function joinTeam(teamId: string, userId: string) {
  const [teamResult, membersResult] = await Promise.all([
    supabase.from('teams').select('id,max_members,is_recruiting').eq('id', teamId).maybeSingle(),
    supabase.from('team_members').select('id,team_id,user_id,role,status,joined_at').eq('team_id', teamId),
  ])

  if (teamResult.error) {
    throw teamResult.error
  }

  if (membersResult.error) {
    throw membersResult.error
  }

  if (!teamResult.data) {
    throw new Error('???李얠쓣 ???놁뒿?덈떎.')
  }

  const team = teamResult.data as Record<string, unknown>
  const isRecruiting = Boolean(team.is_recruiting)
  const maxMembers = typeof team.max_members === 'number' ? team.max_members : null
  const members = ((membersResult.data ?? []) as unknown[]).map(toTeamMemberRecord)
  const alreadyJoined = members.some((member) => member.user_id === userId)

  if (alreadyJoined) {
    return
  }

  if (!isRecruiting) {
    throw new Error('?꾩옱 紐⑥쭛???ロ엺 ??낅땲??')
  }

  if (maxMembers !== null && members.length >= maxMembers) {
    throw new Error('理쒕? ?몄썝???꾨떖????낅땲??')
  }

  const { error } = await supabase.from('team_members').insert({
    team_id: teamId,
    user_id: userId,
    role: displayRole('member'),
  })

  if (error) {
    throw error
  }
}

export async function fetchSidebarTeams(userId: string): Promise<SidebarTeams> {
  const [managedTeams, joinedTeams] = await Promise.all([
    fetchTeamsByMembershipRole(userId, 'leader'),
    fetchTeamsByMembershipRole(userId, 'member'),
  ])

  return { managedTeams, joinedTeams }
}

export async function deleteTeam(teamId: string): Promise<TeamDeletionResult> {
  const { data, error } = await supabase.from('teams').delete().eq('id', teamId).select('id,name').maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('팀을 삭제할 수 없습니다. 권한을 확인하거나 잠시 후 다시 시도해 주세요.')
  }

  const deletedTeam = data as Record<string, unknown>
  notifyTeamsUpdated()

  return {
    id: String(deletedTeam.id ?? ''),
    name: String(deletedTeam.name ?? ''),
  }
}

export async function fetchManagedTeamSummaries(userId: string): Promise<TeamSummary[]> {
  const membershipsResult = await supabase
    .from('team_members')
    .select('team_id')
    .eq('user_id', userId)
    .eq('role', 'leader')
    .eq('status', 'active')
    .order('joined_at', { ascending: false })

  if (membershipsResult.error) {
    throw membershipsResult.error
  }

  const orderedTeamIds = ((membershipsResult.data ?? []) as Array<Record<string, unknown>>)
    .map((membership) => String(membership.team_id ?? ''))
    .filter(Boolean)

  if (orderedTeamIds.length === 0) {
    return []
  }

  const [teamsResult, membersResult] = await Promise.all([
    supabase
      .from('teams')
      .select('id,name,summary,is_recruiting,created_at')
      .in('id', orderedTeamIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('team_members')
      .select('id,team_id,user_id,role,status,joined_at')
      .in('team_id', orderedTeamIds)
      .eq('status', 'active'),
  ])

  if (teamsResult.error) {
    throw teamsResult.error
  }

  if (membersResult.error) {
    throw membersResult.error
  }

  const members = ((membersResult.data ?? []) as unknown[]).map(toTeamMemberRecord)
  const profileIds = Array.from(new Set(members.map((member) => member.user_id))).filter(Boolean)
  const profilesResult =
    profileIds.length > 0
      ? await supabase.from('profiles').select('id,full_name,email').in('id', profileIds)
      : { data: [], error: null }

  if (profilesResult.error) {
    throw profilesResult.error
  }

  const nameByProfileId = new Map<string, string>(
    ((profilesResult.data ?? []) as Array<Record<string, unknown>>).map((profile) => [
      String(profile.id ?? ''),
      typeof profile.full_name === 'string'
        ? profile.full_name
        : typeof profile.email === 'string'
          ? profile.email
          : '멤버',
    ]),
  )

  const membersByTeamId = new Map<string, TeamMember[]>()
  members.forEach((member) => {
    const teamMembers = membersByTeamId.get(member.team_id) ?? []
    teamMembers.push({
      id: member.id,
      name: nameByProfileId.get(member.user_id) ?? '멤버',
      role: member.role,
      availability: toManagementAvailability(member.role),
    })
    membersByTeamId.set(member.team_id, teamMembers)
  })

  const teamSummaryById = new Map<string, TeamSummary>(
    ((teamsResult.data ?? []) as Array<Record<string, unknown>>).map((team) => {
      const teamId = String(team.id ?? '')
      return [
        teamId,
        {
          id: teamId,
          name: String(team.name ?? ''),
          mission: typeof team.summary === 'string' ? team.summary : '팀 소개가 아직 없습니다.',
          members: membersByTeamId.get(teamId) ?? [],
          status: toManagementTeamStatus(Boolean(team.is_recruiting)),
          velocity: membersByTeamId.get(teamId)?.length ?? 0,
          lastUpdated: typeof team.created_at === 'string' ? team.created_at : new Date().toISOString(),
        },
      ]
    }),
  )

  return orderedTeamIds
    .map((teamId) => teamSummaryById.get(teamId))
    .filter((team): team is TeamSummary => Boolean(team))
}

export function notifyTeamsUpdated() {
  window.dispatchEvent(new CustomEvent(teamsUpdatedEvent))
}

export function subscribeTeamsUpdated(listener: () => void) {
  window.addEventListener(teamsUpdatedEvent, listener)
  return () => {
    window.removeEventListener(teamsUpdatedEvent, listener)
  }
}

export async function updateTeamProfile(params: {
  teamId: string
  userId: string
  name: string
  summary: string
  description: string
  teamNote?: string
  category: string
  maxMembers: number
  isRecruiting: boolean
  skillIds?: number[]
  imageFile?: File | null
  removeImage?: boolean
  currentImageUrl?: string | null
}) {
  const {
    teamId,
    userId,
    name,
    summary,
    description,
    teamNote,
    category,
    maxMembers,
    isRecruiting,
    skillIds,
    imageFile,
    removeImage = false,
    currentImageUrl = null,
  } = params

  const shouldUpdateSkills = Array.isArray(skillIds)
  const normalizedSkillIds = shouldUpdateSkills ? uniqueSkillIds(skillIds) : []

  const [teamAccessResult, membershipResult] = await Promise.all([
    supabase.from('teams').select(TEAM_SELECT_COLUMNS).eq('id', teamId).maybeSingle(),
    supabase.from('team_members').select('role').eq('team_id', teamId).eq('user_id', userId).maybeSingle(),
  ])

  if (teamAccessResult.error) {
    throw teamAccessResult.error
  }

  if (membershipResult.error) {
    throw membershipResult.error
  }

  if (!teamAccessResult.data) {
    throw new Error('The team could not be found.')
  }

  const leaderId = String((teamAccessResult.data as Record<string, unknown>).leader_id ?? '')
  const membershipRole = typeof membershipResult.data?.role === 'string' ? membershipResult.data.role : null
  const isLeaderById = leaderId === userId
  const isLeaderByMembership = membershipRole === 'leader'

  if (!isLeaderById && !isLeaderByMembership) {
    throw new Error('Only the team leader can edit this profile.')
  }

  const teamPayload = {
    name: name.trim(),
    summary: summary.trim(),
    description: normalizeOptionalText(description),
    ...(teamNote !== undefined ? { team_note: normalizeOptionalText(teamNote) } : {}),
    category: normalizeOptionalText(category),
    max_members: maxMembers,
    is_recruiting: isRecruiting,
    image_url: currentImageUrl,
  }

  const previousImagePath = extractTeamImagePath(currentImageUrl)
  let nextImagePath: string | null = previousImagePath
  let uploadedImagePath: string | null = null

  if (imageFile) {
    try {
      const uploadedImage = await uploadTeamImage(teamId, imageFile)
      uploadedImagePath = uploadedImage.path
      nextImagePath = uploadedImage.path
      teamPayload.image_url = uploadedImage.publicUrl
    } catch (error) {
      throw new Error('Failed to upload the team image: ' + describeError(error, 'Storage policy rejected the upload.'))
    }
  }

  if (removeImage) {
    nextImagePath = null
    teamPayload.image_url = null
  }

  const { data: updatedTeam, error: teamError } = await supabase
    .from('teams')
    .update(teamPayload)
    .eq('id', teamId)
    .select(TEAM_SELECT_COLUMNS)
    .maybeSingle()

  if (teamError) {
    if (uploadedImagePath) {
      await removeTeamImageByPath(uploadedImagePath).catch(() => undefined)
    }
    throw new Error('Failed to update the team profile: ' + describeError(teamError, 'The update was rejected by RLS.'))
  }

  if (!updatedTeam) {
    if (uploadedImagePath) {
      await removeTeamImageByPath(uploadedImagePath).catch(() => undefined)
    }
    throw new Error('Only the team leader can edit this profile.')
  }

  if (shouldUpdateSkills) {
    const { error: deleteTeamSkillsError } = await supabase.from('team_skills').delete().eq('team_id', teamId)

    if (deleteTeamSkillsError) {
      throw deleteTeamSkillsError
    }

    if (normalizedSkillIds.length > 0) {
      const payload = normalizedSkillIds.map((skillId) => ({
        team_id: teamId,
        skill_id: skillId,
      }))

      const { error: insertTeamSkillsError } = await supabase.from('team_skills').insert(payload)

      if (insertTeamSkillsError) {
        throw insertTeamSkillsError
      }
    }
  }

  if (previousImagePath && previousImagePath !== nextImagePath) {
    await removeTeamImageByPath(previousImagePath).catch(() => undefined)
  }

  return {
    team: toTeamRecord(updatedTeam),
    skills: await fetchTeamSkillTags(teamId),
  }
}


