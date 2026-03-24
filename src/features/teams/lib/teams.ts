import { supabase } from '../../../lib/supabase'
import type {
  TeamWorkspaceBase,
  ProfileSummary,
  SidebarTeamItem,
  SidebarTeams,
  SkillOption,
  TeamDetailData,
  TeamListItem,
  TeamMemberRecord,
  TeamMemberRole,
  TeamMemberWithProfile,
  TeamRecord,
  TeamSkillTag,
} from '../types/team'

function toTeamRecord(value: unknown): TeamRecord {
  const row = value as Record<string, unknown>

  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    summary: String(row.summary ?? ''),
    description: typeof row.description === 'string' ? row.description : null,
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
    profile_image_url:
      typeof row.profile_image_url === 'string' ? row.profile_image_url : null,
  }
}

function uniqueNumbers(values: number[]) {
  return Array.from(
    new Set(values.filter((value) => Number.isFinite(value) && value > 0)),
  )
}

function toTeamSkillTag(value: unknown): TeamSkillTag {
  const row = value as Record<string, unknown>
  return {
    id: Number(row.id ?? 0),
    name: String(row.name ?? ''),
  }
}

function uniqueSkillIds(values: number[]) {
  return Array.from(
    new Set(
      values.filter(
        (value) => Number.isFinite(value) && value > 0,
      ),
    ),
  )
}

function displayRole(role: TeamMemberRole) {
  return role
}

export async function fetchSkillOptions() {
  const { data, error } = await supabase
    .from('skills')
    .select('id,name,category')
    .order('category')
    .order('name')

  if (error) {
    throw error
  }

  return ((data ?? []) as unknown[]).map(toSkillOption)
}

export async function fetchTeamWorkspaceBase(teamId: string, userId: string | null): Promise<TeamWorkspaceBase> {
  const [teamResult, membersResult, teamSkillsResult] = await Promise.all([
    supabase
      .from('teams')
      .select('id,leader_id,name,summary,description,category,max_members,is_recruiting,created_at')
      .eq('id', teamId)
      .maybeSingle(),
    supabase
      .from('team_members')
      .select('id,team_id,user_id,role,status,joined_at')
      .eq('team_id', teamId),
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
  const currentUserRole = userId ? members.find((member) => member.user_id === userId)?.role ?? null : null
  const skillIds = uniqueSkillIds(
    ((teamSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((item) =>
      Number(item.skill_id ?? 0),
    ),
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
    const skillsResult = await supabase
      .from('skills')
      .select('id,name')
      .in('id', skillIds)
      .order('name')

    if (skillsResult.error) {
      throw skillsResult.error
    }

    skills = ((skillsResult.data ?? []) as unknown[]).map(toTeamSkillTag)
  }

  return {
    team,
    current_user_role: currentUserRole,
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

  const profilesResult =
    profileIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id,full_name,email,profile_image_url')
          .in('id', profileIds)
      : { data: [], error: null }

  if (profilesResult.error) {
    throw profilesResult.error
  }

  const profileMap = new Map<string, ProfileSummary>(
    ((profilesResult.data ?? []) as unknown[]).map((profile) => {
      const parsed = toProfileSummary(profile)
      return [parsed.id, parsed]
    }),
  )

  return members.map((member) => ({
    ...member,
    profile: profileMap.get(member.user_id) ?? null,
  }))
}

export async function fetchTeamSkills(teamId: string) {
  const teamSkillsResult = await supabase
    .from('team_skills')
    .select('skill_id')
    .eq('team_id', teamId)

  if (teamSkillsResult.error) {
    throw teamSkillsResult.error
  }

  const skillIds = uniqueSkillIds(
    ((teamSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((item) =>
      Number(item.skill_id ?? 0),
    ),
  )

  if (skillIds.length === 0) {
    return [] as SkillOption[]
  }

  const skillsResult = await supabase
    .from('skills')
    .select('id,name,category')
    .in('id', skillIds)
    .order('name')

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
    ((teamSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((item) =>
      Number(item.skill_id ?? 0),
    ),
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
}) {
  const {
    userId,
    name,
    summary,
    description,
    maxMembers,
    category,
    isRecruiting,
    skillIds,
  } = params

  const normalizedSkillIds = uniqueNumbers(skillIds)

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
    .select('id,name,summary,description,max_members,category,is_recruiting,created_at,leader_id')
    .single()

  if (teamError) {
    throw teamError
  }

  const teamId = String((createdTeam as Record<string, unknown>).id ?? '')

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

      const { error: teamSkillsError } = await supabase
        .from('team_skills')
        .insert(teamSkillsPayload)

      if (teamSkillsError) {
        throw teamSkillsError
      }
    }
  } catch (error) {
    await Promise.allSettled([
      supabase.from('team_members').delete().eq('team_id', teamId),
      supabase.from('team_skills').delete().eq('team_id', teamId),
      supabase.from('teams').delete().eq('id', teamId),
    ])

    throw error
  }

  return teamId
}

export async function fetchTeamDetail(teamId: string, userId: string | null): Promise<TeamDetailData> {
  const [teamResult, membersResult, teamSkillsResult] = await Promise.all([
    supabase
      .from('teams')
      .select('id,leader_id,name,summary,description,max_members,category,is_recruiting,created_at')
      .eq('id', teamId)
      .maybeSingle(),
    supabase
      .from('team_members')
      .select('id,team_id,user_id,role,status,joined_at')
      .eq('team_id', teamId),
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
    ((teamSkillsResult.data ?? []) as Array<Record<string, unknown>>).map((item) =>
      Number(item.skill_id ?? 0),
    ),
  )

  const [profilesResult, skillsResult] = await Promise.all([
    profileIds.length > 0
      ? supabase
          .from('profiles')
          .select('id,full_name,email,profile_image_url')
          .in('id', profileIds)
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

  const membersWithProfile: TeamMemberWithProfile[] = members.map((member) => ({
    ...member,
    profile: profileMap.get(member.user_id) ?? null,
  }))

  const currentUserRole =
    (userId ? membersWithProfile.find((member) => member.user_id === userId)?.role : null) ?? null

  const skills = ((skillsResult.data ?? []) as unknown[]).map(toSkillOption)

  return {
    team,
    members: membersWithProfile,
    skills,
    current_user_role: currentUserRole,
  }
}

export async function fetchTeamList(userId: string | null) {
  const [teamsResult, teamMembersResult] = await Promise.all([
    supabase
      .from('teams')
      .select('id,leader_id,name,summary,description,max_members,category,is_recruiting,created_at')
      .order('created_at', { ascending: false }),
    supabase.from('team_members').select('id,team_id,user_id,role,status,joined_at'),
  ])

  if (teamsResult.error) {
    throw teamsResult.error
  }

  if (teamMembersResult.error) {
    throw teamMembersResult.error
  }

  const teams = ((teamsResult.data ?? []) as unknown[]).map(toTeamRecord)
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

  const result: TeamListItem[] = teams.map((team) => {
    const leaderId = team.leader_id
    return {
      ...team,
      current_members: memberCountByTeamId.get(team.id) ?? 0,
      leader_name: leaderId ? (leaderNameById.get(leaderId) ?? null) : null,
      current_user_role: userRoleByTeamId.get(team.id) ?? null,
    }
  })

  return result
}

export async function joinTeam(teamId: string, userId: string) {
  const [teamResult, membersResult] = await Promise.all([
    supabase
      .from('teams')
      .select('id,max_members,is_recruiting')
      .eq('id', teamId)
      .maybeSingle(),
    supabase.from('team_members').select('id,team_id,user_id,role,status,joined_at').eq('team_id', teamId),
  ])

  if (teamResult.error) {
    throw teamResult.error
  }

  if (membersResult.error) {
    throw membersResult.error
  }

  if (!teamResult.data) {
    throw new Error('팀 정보를 찾을 수 없습니다.')
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
    throw new Error('현재 모집 중이 아닌 팀입니다.')
  }

  if (maxMembers !== null && members.length >= maxMembers) {
    throw new Error('팀 정원이 가득 찼습니다.')
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
  const membershipsResult = await supabase
    .from('team_members')
    .select('id,team_id,user_id,role,status,joined_at')
    .eq('user_id', userId)

  if (membershipsResult.error) {
    throw membershipsResult.error
  }

  const memberships = ((membershipsResult.data ?? []) as unknown[]).map(toTeamMemberRecord)
  const teamIds = Array.from(new Set(memberships.map((membership) => membership.team_id))).filter(Boolean)

  if (teamIds.length === 0) {
    return { managedTeams: [], joinedTeams: [] }
  }

  const teamsResult = await supabase
    .from('teams')
    .select('id,name,summary')
    .in('id', teamIds)
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

  const managedTeams: SidebarTeamItem[] = []
  const joinedTeams: SidebarTeamItem[] = []

  memberships.forEach((membership) => {
    const team = teamMap.get(membership.team_id)
    if (!team) return

    if (membership.role === 'leader') {
      managedTeams.push(team)
      return
    }

    if (membership.role === 'member') {
      joinedTeams.push(team)
    }
  })

  return { managedTeams, joinedTeams }
}
