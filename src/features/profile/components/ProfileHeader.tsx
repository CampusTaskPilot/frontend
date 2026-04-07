import { Card } from '../../../components/ui/Card'
import type { ProfileRecord } from '../types'

interface ProfileHeaderProps {
  profile: ProfileRecord | null
  fallbackName: string
  fallbackEmail: string
}

export function ProfileHeader({ profile, fallbackName, fallbackEmail }: ProfileHeaderProps) {
  const displayName = profile?.full_name?.trim() || fallbackName || '사용자'
  const displayEmail = profile?.email || fallbackEmail || '이메일 정보 없음'
  const bio = profile?.bio?.trim() || '등록된 자기소개가 없습니다.'

  return (
    <Card className="page-hero space-y-5 bg-[radial-gradient(circle_at_top_left,rgba(77,125,255,0.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,248,255,0.94))]">
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/70 bg-white shadow-sm sm:h-24 sm:w-24">
            {profile?.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={`${displayName} 프로필 이미지`}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-xs text-campus-500">이미지 없음</span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-600">프로필</p>
            <h1 className="font-display text-3xl text-campus-900 sm:text-4xl">{displayName}</h1>
            <p className="text-sm text-campus-600">{displayEmail}</p>
          </div>
        </div>
      </div>

      <p className="max-w-3xl text-sm leading-7 text-campus-700">{bio}</p>
    </Card>
  )
}

