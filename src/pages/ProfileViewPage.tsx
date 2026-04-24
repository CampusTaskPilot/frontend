import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BriefcaseBusiness,
  Clock3,
  ExternalLink,
  FolderKanban,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../features/auth/context/useAuth'
import { ProfileHeader } from '../features/profile/components/ProfileHeader'
import { ProfileProjectSection } from '../features/profile/components/ProfileProjectSection'
import { SkillList } from '../features/profile/components/SkillList'
import { fetchProfilePageData } from '../features/profile/lib/profile'
import { mapProfileSkillViewItems } from '../features/profile/lib/profileMappers'
import type {
  ProfileProjectRecord,
  ProfileRecord,
  ProfileSkillRecord,
  SkillRecord,
} from '../features/profile/types'

function splitTextTokens(value: string | null | undefined) {
  return (value ?? '')
    .split(/\r?\n|,/)
    .map((item) => item.replace(/^[\s\-•·]+/, '').trim())
    .filter(Boolean)
}

function formatDateLabel(value: string | null | undefined) {
  if (!value) {
    return '업데이트 정보 없음'
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function buildRecentActivityLabel(value: string | null | undefined) {
  if (!value) {
    return '활동 기록 없음'
  }

  const updatedAt = new Date(value)
  const diffInDays = Math.floor((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24))

  if (diffInDays <= 14) {
    return '최근 14일 내 업데이트'
  }

  if (diffInDays <= 30) {
    return '최근 30일 내 업데이트'
  }

  return `${formatDateLabel(value)} 수정`
}

function calculateProfileCompleteness(params: {
  profile: ProfileRecord | null
  skillCount: number
  projectCount: number
  linkCount: number
}) {
  const { profile, skillCount, projectCount, linkCount } = params
  const signals = [
    profile?.headline?.trim(),
    profile?.bio?.trim(),
    profile?.desired_role?.trim(),
    profile?.collaboration_style?.trim(),
    profile?.availability?.trim(),
    skillCount > 0 ? 'skills' : '',
    projectCount > 0 ? 'projects' : '',
    linkCount > 0 ? 'links' : '',
  ]

  const completedSignals = signals.filter(Boolean).length
  return Math.round((completedSignals / signals.length) * 100)
}

function ProfileDetailPanel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex h-full min-w-0 flex-col rounded-[1.35rem] border border-campus-200/80 bg-gradient-to-b from-white to-campus-50/80 p-5">
      <div className="border-b border-campus-200/70 pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-campus-500">{title}</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col pt-4">{children}</div>
    </section>
  )
}

function ExpandableTextBlock({
  title,
  content,
  emptyMessage,
}: {
  title: string
  content: string | null | undefined
  emptyMessage: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const trimmedContent = content?.trim() ?? ''

  if (!trimmedContent) {
    return (
      <ProfileDetailPanel title={title}>
        <p className="text-sm leading-6 text-campus-500">{emptyMessage}</p>
      </ProfileDetailPanel>
    )
  }

  return (
    <ProfileDetailPanel title={title}>
      <p
        className={`break-words text-sm leading-7 text-campus-700 ${
          isExpanded ? '' : 'line-clamp-4'
        }`}
      >
        {trimmedContent}
      </p>
      {trimmedContent.length > 140 ? (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="mt-4 self-start text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
          aria-expanded={isExpanded}
        >
          {isExpanded ? '접기' : '더 보기'}
        </button>
      ) : null}
    </ProfileDetailPanel>
  )
}

function TagGroup({
  title,
  values,
  emptyMessage,
}: {
  title: string
  values: string[]
  emptyMessage: string
}) {
  return (
    <ProfileDetailPanel title={title}>
      <div className="flex flex-1 flex-wrap content-start gap-2">
        {values.length > 0 ? (
          values.map((value) => <Badge key={`${title}-${value}`}>{value}</Badge>)
        ) : (
          <p className="text-sm leading-6 text-campus-500">{emptyMessage}</p>
        )}
      </div>
    </ProfileDetailPanel>
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
  const [profileProjects, setProfileProjects] = useState<ProfileProjectRecord[]>([])

  const isOwnProfile = Boolean(user && userId && user.id === userId)
  const fallbackName = userId ?? '사용자'
  const fallbackEmail = ''

  useEffect(() => {
    if (!userId) {
      setIsLoading(false)
      setErrorMessage('잘못된 프로필 경로입니다.')
      return
    }
    const currentUserId = userId

    let isMounted = true

    async function loadProfile() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const result = await fetchProfilePageData(currentUserId)

        if (!isMounted) {
          return
        }

        setProfile(result.profile)
        setSkills(result.skills)
        setProfileSkills(result.profileSkills)
        setProfileProjects(result.profileProjects)
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
  const topSkills = useMemo(
    () =>
      [...skillItems]
        .sort((left, right) => {
          const leftScore = left.level === 'advanced' ? 3 : left.level === 'intermediate' ? 2 : 1
          const rightScore = right.level === 'advanced' ? 3 : right.level === 'intermediate' ? 2 : 1

          if (leftScore !== rightScore) {
            return rightScore - leftScore
          }

          return left.name.localeCompare(right.name, 'ko')
        })
        .slice(0, 5)
        .map((item) => item.name),
    [skillItems],
  )

  const linkItems = useMemo(
    () =>
      [
        profile?.github_url?.trim()
          ? {
              label: 'GitHub',
              href: profile.github_url,
            }
          : null,
        profile?.blog_url?.trim()
          ? {
              label: '블로그',
              href: profile.blog_url,
            }
          : null,
        profile?.portfolio_url?.trim()
          ? {
              label: '포트폴리오',
              href: profile.portfolio_url,
            }
          : null,
      ].filter((item): item is { label: string; href: string } => Boolean(item)),
    [profile?.blog_url, profile?.github_url, profile?.portfolio_url],
  )

  const interestAreas = useMemo(() => splitTextTokens(profile?.interest_areas), [profile?.interest_areas])
  const preferredProjectTypes = useMemo(
    () => splitTextTokens(profile?.preferred_project_types),
    [profile?.preferred_project_types],
  )

  const projectCount = profileProjects.length
  const strongSkillCount = skillItems.filter((item) => item.level === 'advanced').length
  const teamProjectCount = profileProjects.filter((project) => project.project_type === 'team').length
  const linkCount = linkItems.length
  const profileCompleteness = calculateProfileCompleteness({
    profile,
    skillCount: skillItems.length,
    projectCount,
    linkCount,
  })
  const recentActivityLabel = buildRecentActivityLabel(profile?.updated_at)

  const summaryCards = [
    {
      title: '프로젝트 경험',
      value: `${projectCount}건`,
      description: projectCount > 0 ? '참여한 프로젝트를 확인할 수 있습니다.' : '프로젝트를 준비 중입니다.',
      icon: FolderKanban,
    },
    {
      title: '보유 스킬',
      value: `${skillItems.length}개`,
      description:
        strongSkillCount > 0 ? `대표 강점 ${strongSkillCount}개 포함` : '스킬 정보를 준비 중입니다.',
      icon: Sparkles,
    },
    {
      title: '희망 역할',
      value: profile?.desired_role?.trim() || '준비 중',
      description: profile?.current_status?.trim() || '현재 상태를 준비 중입니다.',
      icon: BriefcaseBusiness,
    },
    {
      title: '팀 협업 경험',
      value: teamProjectCount > 0 ? `${teamProjectCount}건` : '준비 중',
      description:
        teamProjectCount > 0 ? '팀으로 진행한 프로젝트가 있습니다.' : '팀 프로젝트를 준비 중입니다.',
      icon: Users,
    },
    {
      title: '외부 링크',
      value: `${linkCount}개`,
      description: linkCount > 0 ? '외부 활동과 결과물을 볼 수 있습니다.' : '링크를 준비 중입니다.',
      icon: ExternalLink,
    },
    {
      title: '최근 활동',
      value: recentActivityLabel,
      description: `마지막 프로필 업데이트: ${formatDateLabel(profile?.updated_at)}`,
      icon: Clock3,
    },
  ]

  const profileHighlights = [
    profile?.desired_role?.trim()
      ? `${profile.desired_role} 역할에 관심이 있습니다.`
      : '관심 있는 역할을 준비 중입니다.',
    projectCount > 0
      ? `총 ${projectCount}건의 프로젝트가 등록되어 있고, 팀 프로젝트는 ${teamProjectCount}건입니다.`
      : '프로젝트 이력을 준비 중입니다.',
    strongSkillCount > 0
      ? `강점으로 등록한 스킬이 ${strongSkillCount}개 있습니다.`
      : '대표 강점 스킬을 준비 중입니다.',
    linkCount > 0
      ? `GitHub, 블로그, 포트폴리오 등 외부 링크 ${linkCount}개를 확인할 수 있습니다.`
      : '외부 링크를 준비 중입니다.',
  ]

  if (isLoading) {
    return (
      <section className="page-shell">
        <Card>
          <p className="text-sm text-campus-600">프로필을 불러오는 중입니다…</p>
        </Card>
      </section>
    )
  }

  if (errorMessage) {
    return (
      <section className="page-shell">
        <Card className="space-y-3 border-rose-200 bg-rose-50">
          <h1 className="font-display text-2xl text-campus-900">프로필</h1>
          <p className="text-sm text-rose-600">{errorMessage}</p>
        </Card>
      </section>
    )
  }

  return (
    <section className="page-shell">
      <ProfileHeader
        profile={profile}
        fallbackName={fallbackName}
        fallbackEmail={fallbackEmail}
        topSkills={topSkills}
        links={linkItems}
        editHref={isOwnProfile && userId ? `/profile/${userId}/edit` : undefined}
      />

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {summaryCards.map((item) => {
          const Icon = item.icon

          return (
            <Card key={item.title} className="flex min-w-0 gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon size={20} aria-hidden="true" />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-campus-500">{item.title}</p>
                <p className="break-words text-lg font-semibold text-campus-900">{item.value}</p>
                <p className="break-words text-sm leading-6 text-campus-600">{item.description}</p>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr),320px]">
        <div className="space-y-6">
          <Card className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-2xl text-campus-900">소개와 협업 스타일</h2>
              <p className="text-sm text-campus-600">
                함께 일할 때의 관심사, 방식, 가능 시간을 정리한 영역입니다.
              </p>
            </div>

            <div className="grid auto-rows-fr gap-4 xl:grid-cols-2">
              <ExpandableTextBlock
                title="자기소개"
                content={profile?.bio}
                emptyMessage="자기소개를 준비 중입니다."
              />
              <ExpandableTextBlock
                title="협업 스타일"
                content={profile?.collaboration_style}
                emptyMessage="협업 스타일을 준비 중입니다."
              />
              <ExpandableTextBlock
                title="일하는 방식"
                content={profile?.working_style}
                emptyMessage="일하는 방식을 준비 중입니다."
              />
              <TagGroup
                title="관심 분야"
                values={interestAreas}
                emptyMessage="관심 분야를 준비 중입니다."
              />
              <TagGroup
                title="선호 프로젝트"
                values={preferredProjectTypes}
                emptyMessage="선호 프로젝트 유형을 준비 중입니다."
              />
              <ProfileDetailPanel title="활동 가능 정보">
                <p className="break-words text-sm leading-7 text-campus-500">
                  {profile?.availability?.trim() || '참여 가능 시간과 활동 정보를 준비 중입니다.'}
                </p>
              </ProfileDetailPanel>
            </div>
          </Card>

          <Card className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-2xl text-campus-900">기술과 역량</h2>
              <p className="text-sm text-campus-600">
                등록한 스킬을 카테고리와 숙련도 기준으로 확인할 수 있습니다.
              </p>
            </div>

            <SkillList items={skillItems} emptyMessage="아직 등록된 스킬이 없습니다." />
          </Card>

          <Card className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-display text-2xl text-campus-900">프로젝트 경험</h2>
              <p className="text-sm text-campus-600">
                참여한 프로젝트의 역할, 사용 기술, 주요 기여를 확인할 수 있습니다.
              </p>
            </div>

            <ProfileProjectSection projects={profileProjects} />
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="space-y-4">
            <div className="space-y-2">
              <h2 className="font-display text-xl text-campus-900">프로필 하이라이트</h2>
              <p className="text-sm text-campus-600">프로필의 주요 정보를 빠르게 모아 봅니다.</p>
            </div>

            <div className="space-y-3">
              {profileHighlights.map((signal) => (
                <div
                  key={signal}
                  className="rounded-[1.15rem] border border-campus-200/80 bg-campus-50/70 px-4 py-3"
                >
                  <p className="text-sm leading-6 text-campus-700">{signal}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-2">
              <h2 className="font-display text-xl text-campus-900">활동 정보</h2>
              <p className="text-sm text-campus-600">프로필 작성 상태와 최근 업데이트를 확인합니다.</p>
            </div>

            <div className="space-y-3 text-sm text-campus-700">
              <div className="rounded-[1.15rem] bg-campus-50/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span>프로필 완성도</span>
                  <span className="font-semibold text-campus-900">{profileCompleteness}%</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-campus-100">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-[width]"
                    style={{ width: `${profileCompleteness}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <div className="rounded-[1.15rem] bg-campus-50/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span>최근 업데이트</span>
                  <span className="text-right font-medium text-campus-900">{formatDateLabel(profile?.updated_at)}</span>
                </div>
              </div>
              <div className="rounded-[1.15rem] bg-campus-50/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span>등록 링크 여부</span>
                  <span className="font-medium text-campus-900">{linkCount > 0 ? '등록됨' : '준비 중'}</span>
                </div>
              </div>
              <div className="rounded-[1.15rem] bg-campus-50/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <span>팀 협업 경험</span>
                  <span className="font-medium text-campus-900">
                    {teamProjectCount > 0 ? `${teamProjectCount}건` : '준비 중'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {isOwnProfile && userId ? (
            <Button asChild className="w-full">
              <Link to={`/profile/${userId}/edit`}>프로필 수정하기</Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </section>
  )
}
