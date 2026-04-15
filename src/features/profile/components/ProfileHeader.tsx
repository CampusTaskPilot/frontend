import { Link } from 'react-router-dom'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import type { ProfileRecord } from '../types'
import { ProfileAvatar } from './ProfileAvatar'

interface ProfileHeaderLink {
  label: string
  href: string
}

interface ProfileHeaderProps {
  profile: ProfileRecord | null
  fallbackName: string
  fallbackEmail: string
  topSkills: string[]
  links: ProfileHeaderLink[]
  editHref?: string
}

function buildIdentityLine(profile: ProfileRecord | null) {
  const items = [profile?.university, profile?.major, profile?.grade].filter(
    (value): value is string => Boolean(value?.trim()),
  )

  return items.join(' · ')
}

export function ProfileHeader({
  profile,
  fallbackName,
  fallbackEmail,
  topSkills,
  links,
  editHref,
}: ProfileHeaderProps) {
  const displayName = profile?.full_name?.trim() || fallbackName || '사용자'
  const displayEmail = profile?.email || fallbackEmail || '이메일 정보 없음'
  const headline = profile?.headline?.trim() || profile?.bio?.trim() || '한 줄 소개가 아직 등록되지 않았습니다.'
  const identityLine = buildIdentityLine(profile)

  return (
    <div className="page-hero overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.16),transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,248,255,0.94))]">
      <div className="page-hero-inner xl:grid-cols-[minmax(0,1fr),320px]">
        <div className="space-y-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4 sm:gap-5">
              <ProfileAvatar
                src={profile?.profile_image_url}
                name={displayName}
                email={displayEmail}
                alt={`${displayName} profile image`}
                className="h-24 w-24 shrink-0 border-white/80 bg-white shadow-sm sm:h-28 sm:w-28"
                fallbackClassName="text-3xl sm:text-4xl"
              />

              <div className="min-w-0 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">
                    Candidate Profile
                  </p>
                  <div className="space-y-1">
                    <h1 className="text-balance break-words font-display text-3xl text-campus-900 sm:text-4xl">
                      {displayName}
                    </h1>
                    <p className="break-all text-sm text-campus-500">{displayEmail}</p>
                  </div>
                </div>

                <p className="max-w-3xl break-words text-base leading-7 text-campus-800">{headline}</p>

                <div className="flex flex-wrap gap-2">
                  {profile?.desired_role?.trim() ? (
                    <Badge className="bg-brand-50 text-brand-700 ring-brand-200">
                      희망 역할 · {profile.desired_role}
                    </Badge>
                  ) : (
                    <Badge>희망 역할 미등록</Badge>
                  )}
                  {profile?.current_status?.trim() ? <Badge>{profile.current_status}</Badge> : null}
                  {profile?.location?.trim() ? <Badge>{profile.location}</Badge> : null}
                </div>

                {editHref ? (
                  <div className="pt-1">
                    <Button asChild>
                      <Link to={editHref}>프로필 수정하기</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
            <div className="min-w-0 rounded-[1.4rem] border border-white/70 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">기본 정보</p>
              <div className="mt-3 space-y-2 text-sm text-campus-700">
                <p className="break-words">{identityLine || '학교 및 전공 정보가 아직 없습니다.'}</p>
                <p className="break-words">
                  {profile?.bio?.trim() || '자기소개가 아직 작성되지 않았습니다.'}
                </p>
              </div>
            </div>

            <div className="min-w-0 rounded-[1.4rem] border border-white/70 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">핵심 스택</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {topSkills.length > 0 ? (
                  topSkills.map((skill) => <Badge key={skill}>{skill}</Badge>)
                ) : (
                  <p className="text-sm text-campus-500">아직 등록된 핵심 스택이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-[1.6rem] border border-white/75 bg-white/84 p-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">검증 링크</p>
            <p className="text-sm text-campus-600">
              외부 활동과 결과물을 빠르게 확인할 수 있는 링크입니다.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {links.length > 0 ? (
              links.map((link) => (
                <Button key={link.label} variant="ghost" size="sm" asChild className="justify-start">
                  <a href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                </Button>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-campus-200 bg-campus-50/80 px-4 py-6 text-sm text-campus-500">
                등록된 외부 링크가 없습니다.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
