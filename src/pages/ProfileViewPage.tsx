import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { useAuth } from '../features/auth/context/AuthContext'
import { ProfileHeader } from '../features/profile/components/ProfileHeader'
import { SkillList } from '../features/profile/components/SkillList'
import { fetchProfilePageData } from '../features/profile/lib/profile'
import { mapProfileSkillViewItems } from '../features/profile/lib/profileMappers'
import type { ProfileRecord, ProfileSkillRecord, SkillRecord } from '../features/profile/types'

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value?.trim()) {
    return null
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">{label}</p>
      <p className="text-sm text-campus-800">{value}</p>
    </div>
  )
}

function ExternalLink({ label, href }: { label: string; href: string | null | undefined }) {
  if (!href?.trim()) {
    return null
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-brand-600 underline-offset-2 hover:underline"
    >
      {label}
    </a>
  )
}

export function ProfileViewPage() {
  const { user } = useAuth()
  const { userId } = useParams<{ userId: string }>()
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [skills, setSkills] = useState<SkillRecord[]>([])
  const [profileSkills, setProfileSkills] = useState<ProfileSkillRecord[]>([])

  const isOwnProfile = Boolean(user && userId && user.id === userId)
  const fallbackName = userId ?? '사용자'
  const fallbackEmail = ''

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      setErrorMessage('잘못된 프로필 경로입니다.')
      return
    }

    let isMounted = true

    async function loadProfile() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const result = await fetchProfilePageData(userId)

        if (!isMounted) {
          return
        }

        setProfile(result.profile)
        setSkills(result.skills)
        setProfileSkills(result.profileSkills)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrorMessage(
          error instanceof Error ? error.message : '프로필 정보를 불러오지 못했습니다.',
        )
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [userId])

  const skillItems = useMemo(() => mapProfileSkillViewItems(profileSkills, skills), [profileSkills, skills])

  if (isLoading) {
    return (
      <section className="space-y-6">
        <Card>
          <p className="text-sm text-campus-600">프로필을 불러오는 중입니다...</p>
        </Card>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="space-y-6">
        <Card className="space-y-3 border-rose-200 bg-rose-50">
          <h1 className="font-display text-2xl text-campus-900">프로필</h1>
          <p className="text-sm text-rose-600">{errorMessage}</p>
        </Card>
      </section>
    )
  }

  return (
    <section className="space-y-6">
      <ProfileHeader profile={profile} fallbackName={fallbackName} fallbackEmail={fallbackEmail} />

      <Card className="space-y-4">
        <h2 className="font-display text-2xl text-campus-900">기본 정보</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ProfileField label="지역" value={profile?.location} />
          <ProfileField label="대학교" value={profile?.university} />
          <ProfileField label="전공" value={profile?.major} />
          <ProfileField label="학년" value={profile?.grade} />
        </div>
        {!profile?.location?.trim() &&
          !profile?.university?.trim() &&
          !profile?.major?.trim() &&
          !profile?.grade?.trim() && (
            <p className="text-sm text-campus-500">추가 정보가 없습니다.</p>
          )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-2xl text-campus-900">링크</h2>
        <div className="flex flex-wrap items-center gap-4">
          <ExternalLink label="GitHub" href={profile?.github_url} />
          <ExternalLink label="블로그" href={profile?.blog_url} />
          <ExternalLink label="포트폴리오" href={profile?.portfolio_url} />
        </div>
        {!profile?.github_url?.trim() && !profile?.blog_url?.trim() && !profile?.portfolio_url?.trim() && (
          <p className="text-sm text-campus-500">등록된 링크가 없습니다.</p>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-2xl text-campus-900">보유 스킬</h2>
        <SkillList items={skillItems} emptyMessage="등록된 스킬이 없습니다." />
      </Card>

      {isOwnProfile && userId && (
        <div className="flex justify-end">
          <Button asChild>
            <Link to={`/profile/${userId}/edit`}>수정하기</Link>
          </Button>
        </div>
      )}
    </section>
  )
}

