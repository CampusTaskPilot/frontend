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
    <Card className="space-y-4 bg-gradient-to-r from-brand-50 via-white to-accent-100">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border border-campus-200 bg-campus-50">
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
            <h1 className="font-display text-3xl text-campus-900">{displayName}</h1>
            <p className="text-sm text-campus-600">{displayEmail}</p>
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-campus-700">{bio}</p>
    </Card>
  )
}

