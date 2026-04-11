import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import type {
  TeamMemberRole,
  TeamMemberSkillTag,
  TeamMemberWithProfile,
  TeamRecord,
} from '../types/team'

interface TeamOverviewMembersProps {
  team: TeamRecord
  members: TeamMemberWithProfile[]
}

function isLeaderRole(role: TeamMemberRole) {
  return role === 'leader'
}

function displayName(member: TeamMemberWithProfile) {
  return member.profile?.full_name || member.profile?.email || member.user_id
}

function roleLabel(role: TeamMemberRole) {
  if (role === 'leader') return '리더'
  if (role === 'member') return '멤버'
  return role || '구성원'
}

function visibleSkills(skills: TeamMemberSkillTag[]) {
  return skills.slice(0, 4)
}

function MemberAvatar({ member }: { member: TeamMemberWithProfile }) {
  const profileImageUrl = member.profile?.profile_image_url ?? null
  const initial = displayName(member).trim().charAt(0).toUpperCase() || 'U'

  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={displayName(member)}
        className="h-14 w-14 shrink-0 rounded-2xl border border-white/80 object-cover"
      />
    )
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-campus-200 bg-campus-50 text-sm font-bold text-campus-700">
      {initial}
    </div>
  )
}

export function TeamOverviewMembers({ team, members }: TeamOverviewMembersProps) {
  const sortedMembers = [...members].sort((a, b) => {
    const aLeader = a.user_id === team.leader_id || isLeaderRole(a.role)
    const bLeader = b.user_id === team.leader_id || isLeaderRole(b.role)

    if (aLeader && !bLeader) return -1
    if (!aLeader && bLeader) return 1

    return displayName(a).localeCompare(displayName(b), 'ko')
  })

  return (
    <section className="space-y-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Members</p>
        <h2 className="text-2xl font-semibold tracking-tight text-campus-900">팀 멤버</h2>
        <p className="text-sm leading-6 text-campus-500">
          팀 멤버 정보를 한눈에 보기 쉽게 정리했습니다.
        </p>
      </div>

      <Card className="border-campus-200/80 bg-white/90 p-5 shadow-card">
        {sortedMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-campus-200 bg-campus-50 px-5 py-8 text-center text-sm leading-6 text-campus-500">
            아직 등록된 팀 멤버가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {sortedMembers.map((member) => {
              const leaderMember = member.user_id === team.leader_id || isLeaderRole(member.role)
              const memberSkills = visibleSkills(member.skills)
              const hiddenSkillCount = Math.max(member.skills.length - memberSkills.length, 0)

              return (
                <article
                  key={`${member.team_id}-${member.user_id}`}
                  className={cn(
                    'flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-start md:justify-between',
                    leaderMember
                      ? 'border-brand-100 bg-brand-50/40'
                      : 'border-campus-200 bg-campus-50/60',
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <MemberAvatar member={member} />

                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="min-w-0 text-base font-semibold text-campus-900">
                          <span className="line-clamp-1 break-all sm:break-words">
                            {displayName(member)}
                          </span>
                        </h3>
                        <Badge variant={leaderMember ? 'success' : 'neutral'}>{roleLabel(member.role)}</Badge>
                      </div>

                      <p className="line-clamp-1 break-all text-sm text-campus-600 sm:break-words">
                        {member.profile?.email ?? '이메일 정보 없음'}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {memberSkills.length > 0 ? (
                          <>
                            {memberSkills.map((skill) => (
                              <Badge key={`${member.id}-${skill.id}`} variant="neutral">
                                {skill.name}
                              </Badge>
                            ))}
                            {hiddenSkillCount > 0 ? <Badge variant="neutral">+{hiddenSkillCount}</Badge> : null}
                          </>
                        ) : (
                          <span className="text-sm text-campus-400">등록된 스킬이 없습니다.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center md:pl-4">
                    <Button size="sm" variant="ghost" asChild>
                      <Link to={`/profile/${member.user_id}`}>프로필 보기</Link>
                    </Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Card>
    </section>
  )
}
