import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import type { TeamMemberRole, TeamMemberWithProfile, TeamRecord } from '../types/team'

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

function MemberAvatar({ member }: { member: TeamMemberWithProfile }) {
  const profileImageUrl = member.profile?.profile_image_url ?? null
  const initial = displayName(member).trim().charAt(0).toUpperCase() || 'U'

  if (profileImageUrl) {
    return (
      <img
        src={profileImageUrl}
        alt={displayName(member)}
        className="h-14 w-14 rounded-2xl border border-white/80 object-cover shadow-sm"
      />
    )
  }

  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-campus-200 bg-campus-50 text-base font-bold text-campus-700">
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
          리더를 우선으로 배치하고, 각 멤버의 역할과 상태를 같은 기준으로 보여주도록 정돈했습니다.
        </p>
      </div>

      <Card className="border-campus-200/80 bg-white/90 p-5 shadow-card">
        {sortedMembers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-campus-200 bg-campus-50 px-5 py-6 text-sm leading-6 text-campus-500">
            아직 팀에 등록된 멤버가 없습니다.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedMembers.map((member) => {
              const leaderMember = member.user_id === team.leader_id || isLeaderRole(member.role)

              return (
                <article
                  key={`${member.team_id}-${member.user_id}`}
                  className={cn(
                    'rounded-2xl border p-4 transition duration-200 hover:-translate-y-0.5',
                    leaderMember
                      ? 'border-brand-100 bg-[linear-gradient(180deg,#fbfdff_0%,#eef4ff_100%)]'
                      : 'border-campus-200 bg-campus-50/60',
                  )}
                >
                  <div className="flex items-start gap-4">
                    <MemberAvatar member={member} />

                    <div className="min-w-0 flex-1 space-y-4">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="line-clamp-1 text-lg font-semibold tracking-tight text-campus-900">
                            {displayName(member)}
                          </h3>
                          {leaderMember && (
                            <span className="inline-flex items-center rounded-full bg-campus-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                              Leader
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-2 text-sm text-campus-500">{member.profile?.email ?? member.user_id}</p>
                      </div>
                    </div>
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
