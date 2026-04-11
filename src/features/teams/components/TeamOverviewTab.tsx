import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { TEAM_IMAGE_STORAGE_ENABLED, validateTeamImageFile } from '../lib/teamProfileImages'
import { fetchTeamOverviewLinks, updateTeamOverviewCustomization } from '../lib/teams'
import type {
  ProfileSummary,
  TeamMemberWithProfile,
  TeamOverviewLayoutVariant,
  TeamOverviewLinkIconKey,
  TeamOverviewLinkRecord,
  TeamOverviewSectionKey,
  TeamOverviewThemeKey,
  TeamRecord,
  TeamSkillTag,
  TeamTaskItem,
} from '../types/team'

interface TeamOverviewTabProps {
  team: TeamRecord
  leader: ProfileSummary | null
  members: TeamMemberWithProfile[]
  skills: TeamSkillTag[]
  tasks: TeamTaskItem[]
  isLoading: boolean
  errorMessage: string
  isLeader: boolean
  currentUserId: string | null
  isDeletingTeam: boolean
  deleteErrorMessage: string
  onOpenMembers: () => void
  onDeleteTeam: () => Promise<void>
  onTeamUpdated: (payload: { team: TeamRecord; skills: TeamSkillTag[] }) => void
}

type EditorTabKey = 'design' | 'sections' | 'links'

interface OverviewEditorDraft {
  themeKey: TeamOverviewThemeKey
  layoutVariant: TeamOverviewLayoutVariant
  emoji: string
  heroSubheadline: string
  heroTags: string[]
  aboutTitle: string
  goalTitle: string
  goalBody: string
  recruitingTitle: string
  recruitingBody: string
  recruitingHighlights: string[]
  workStyleTitle: string
  workStyleBody: string
  workStyleItems: string[]
  rulesTitle: string
  rulesBody: string
  rulesItems: string[]
  linksTitle: string
  sectionOrder: TeamOverviewSectionKey[]
  showAbout: boolean
  showGoal: boolean
  showRecruiting: boolean
  showWorkStyle: boolean
  showRules: boolean
  showLinks: boolean
  removeBanner: boolean
}

interface OverviewLinkDraft {
  id?: string
  label: string
  url: string
  iconKey: TeamOverviewLinkIconKey
}

interface ThemeDefinition {
  key: TeamOverviewThemeKey
  label: string
  description: string
  shellClassName: string
  heroOverlayClassName: string
  badgeClassName: string
  cardClassName: string
  chipClassName: string
  accentClassName: string
}

const OVERVIEW_SECTION_LABELS: Record<TeamOverviewSectionKey, string> = {
  about: '팀 소개',
  goal: '현재 목표',
  recruiting: '모집',
  work_style: '협업 방식',
  rules: '팀 규칙',
  links: '링크',
}

const OVERVIEW_ICON_LABELS: Record<TeamOverviewLinkIconKey, string> = {
  github: 'GitHub',
  notion: 'Notion',
  figma: 'Figma',
  docs: 'Docs',
  demo: 'Demo',
  link: 'Link',
}

const OVERVIEW_THEMES: ThemeDefinition[] = [
  {
    key: 'sunset',
    label: 'Sunset',
    description: '따뜻한 코랄과 샌드 톤',
    shellClassName: 'bg-[linear-gradient(180deg,#fff8f2_0%,#fffdf9_40%,#ffffff_100%)]',
    heroOverlayClassName: 'bg-[linear-gradient(180deg,rgba(122,45,32,0.08)_0%,rgba(122,45,32,0.18)_38%,rgba(50,23,16,0.72)_100%)]',
    badgeClassName: 'border-white/30 bg-white/14 text-white',
    cardClassName: 'border-[#f2d6c8] bg-white/92',
    chipClassName: 'border-[#f3c8b5] bg-[#fff1e9] text-[#914f35]',
    accentClassName: 'from-[#f97360] via-[#f8a15e] to-[#f0c27a]',
  },
  {
    key: 'ocean',
    label: 'Ocean',
    description: '청록과 안개빛 블루',
    shellClassName: 'bg-[linear-gradient(180deg,#f2fbfc_0%,#f8fcff_42%,#ffffff_100%)]',
    heroOverlayClassName: 'bg-[linear-gradient(180deg,rgba(17,70,91,0.10)_0%,rgba(17,70,91,0.20)_40%,rgba(7,28,39,0.78)_100%)]',
    badgeClassName: 'border-white/30 bg-white/12 text-white',
    cardClassName: 'border-[#cfe8ec] bg-white/92',
    chipClassName: 'border-[#b8dde4] bg-[#ebf8fa] text-[#23677b]',
    accentClassName: 'from-[#138a9e] via-[#45a7c5] to-[#78c6d4]',
  },
  {
    key: 'forest',
    label: 'Forest',
    description: '세이지와 우드 톤',
    shellClassName: 'bg-[linear-gradient(180deg,#f6fbf7_0%,#fafcf8_42%,#ffffff_100%)]',
    heroOverlayClassName: 'bg-[linear-gradient(180deg,rgba(32,62,42,0.10)_0%,rgba(32,62,42,0.24)_42%,rgba(20,31,23,0.78)_100%)]',
    badgeClassName: 'border-white/30 bg-white/12 text-white',
    cardClassName: 'border-[#d7e5d9] bg-white/92',
    chipClassName: 'border-[#c6dbc8] bg-[#eef7ef] text-[#355f3f]',
    accentClassName: 'from-[#3d7c57] via-[#6b9f64] to-[#a6ba76]',
  },
  {
    key: 'midnight',
    label: 'Midnight',
    description: '네이비와 아이보리 대비',
    shellClassName: 'bg-[linear-gradient(180deg,#f3f6fb_0%,#f9fbff_42%,#ffffff_100%)]',
    heroOverlayClassName: 'bg-[linear-gradient(180deg,rgba(22,34,60,0.10)_0%,rgba(22,34,60,0.28)_42%,rgba(10,18,34,0.82)_100%)]',
    badgeClassName: 'border-white/20 bg-white/10 text-white',
    cardClassName: 'border-[#d8deef] bg-white/94',
    chipClassName: 'border-[#c9d3ea] bg-[#edf2fc] text-[#314872]',
    accentClassName: 'from-[#283a6a] via-[#4c5e8f] to-[#8394bf]',
  },
]

const EDITOR_TABS: Array<{ key: EditorTabKey; label: string; description: string }> = [
  { key: 'design', label: '디자인', description: '배너, 테마, Hero 표현' },
  { key: 'sections', label: '섹션', description: '노출 여부, 제목, 본문, 순서' },
  { key: 'links', label: '링크', description: '외부 링크 추가와 정렬' },
]

const SECTION_ORDER_DEFAULT: TeamOverviewSectionKey[] = ['about', 'goal', 'recruiting', 'work_style', 'rules', 'links']
const LINK_ICON_OPTIONS: TeamOverviewLinkIconKey[] = ['github', 'notion', 'figma', 'docs', 'demo', 'link']
const LAYOUT_VARIANTS: Array<{ key: TeamOverviewLayoutVariant; label: string; description: string }> = [
  { key: 'immersive', label: 'Immersive', description: '배너 비중이 크고 시선이 넓게 퍼집니다.' },
  { key: 'balanced', label: 'Balanced', description: 'Hero와 섹션의 균형이 가장 좋습니다.' },
  { key: 'compact', label: 'Compact', description: '정보를 빠르게 훑기 쉬운 밀도입니다.' },
]

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function uniqueTextList(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items
  }

  const nextItems = [...items]
  const [item] = nextItems.splice(index, 1)
  nextItems.splice(nextIndex, 0, item)
  return nextItems
}

function isSafeExternalUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function createInitialDraft(team: TeamRecord): OverviewEditorDraft {
  return {
    themeKey: team.overview_theme_key ?? 'sunset',
    layoutVariant: team.overview_layout_variant ?? 'balanced',
    emoji: normalizeText(team.overview_emoji),
    heroSubheadline: normalizeText(team.overview_hero_subheadline),
    heroTags: uniqueTextList(team.overview_hero_tags),
    aboutTitle: normalizeText(team.overview_about_title) || '팀 소개',
    goalTitle: normalizeText(team.overview_goal_title) || '현재 목표',
    goalBody: normalizeText(team.overview_goal_body),
    recruitingTitle: normalizeText(team.overview_recruiting_title) || '모집',
    recruitingBody: normalizeText(team.overview_recruiting_body),
    recruitingHighlights: uniqueTextList(team.overview_recruiting_highlights),
    workStyleTitle: normalizeText(team.overview_work_style_title) || '협업 방식',
    workStyleBody: normalizeText(team.overview_work_style_body),
    workStyleItems: uniqueTextList(team.overview_work_style_items),
    rulesTitle: normalizeText(team.overview_rules_title) || '팀 규칙',
    rulesBody: normalizeText(team.overview_rules_body),
    rulesItems: uniqueTextList(team.overview_rules_items),
    linksTitle: normalizeText(team.overview_links_title) || '링크 모음',
    sectionOrder: team.overview_section_order.length > 0 ? [...team.overview_section_order] : [...SECTION_ORDER_DEFAULT],
    showAbout: team.overview_show_about,
    showGoal: team.overview_show_goal,
    showRecruiting: team.overview_show_recruiting,
    showWorkStyle: team.overview_show_work_style,
    showRules: team.overview_show_rules,
    showLinks: team.overview_show_links,
    removeBanner: false,
  }
}

function createLinkDrafts(links: TeamOverviewLinkRecord[]): OverviewLinkDraft[] {
  return links.map((link) => ({
    id: link.id,
    label: link.label,
    url: link.url,
    iconKey: link.icon_key,
  }))
}

function resolveTheme(themeKey: TeamOverviewThemeKey | null | undefined) {
  return OVERVIEW_THEMES.find((theme) => theme.key === themeKey) ?? OVERVIEW_THEMES[0]
}

function getHeroSubtitle(team: TeamRecord, draft?: OverviewEditorDraft) {
  const draftValue = draft ? normalizeText(draft.heroSubheadline) : ''
  return draftValue || normalizeText(team.overview_hero_subheadline) || team.summary
}

function getHeroBanner(team: TeamRecord, draft?: OverviewEditorDraft, bannerPreviewUrl?: string) {
  if (draft?.removeBanner) {
    return team.image_url ?? ''
  }
  return bannerPreviewUrl || team.overview_banner_url || team.image_url || ''
}

function OverviewSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-[22rem] rounded-[32px] bg-campus-100" />
      <div className="grid gap-5 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-48 rounded-[28px] bg-campus-50" />
        ))}
      </div>
    </div>
  )
}

function SectionCard({
  title,
  body,
  items,
  theme,
  placeholder,
}: {
  title: string
  body?: string
  items?: string[]
  theme: ThemeDefinition
  placeholder?: string
}) {
  return (
    <Card className={cn('space-y-4 rounded-[28px] shadow-card', theme.cardClassName)}>
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Section</p>
        <h3 className="text-2xl font-semibold tracking-tight text-campus-900">{title}</h3>
      </div>
      {body ? <p className="text-sm leading-7 text-campus-600">{body}</p> : null}
      {!body && placeholder ? (
        <p className="rounded-2xl border border-dashed border-campus-200 px-4 py-3 text-sm leading-6 text-campus-400">{placeholder}</p>
      ) : null}
      {items && items.length > 0 ? (
        <ul className="space-y-2.5">
          {items.map((item, index) => (
            <li key={`${item}-${index}`} className="rounded-2xl border border-campus-200/70 bg-white/80 px-4 py-3 text-sm text-campus-700">
              {item}
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  )
}

function ListEditor({
  label,
  items,
  placeholder,
  onChange,
}: {
  label: string
  items: string[]
  placeholder: string
  onChange: (items: string[]) => void
}) {
  const [pendingValue, setPendingValue] = useState('')

  function addItem() {
    const nextValue = pendingValue.trim()
    if (!nextValue) {
      return
    }

    onChange(uniqueTextList([...items, nextValue]))
    setPendingValue('')
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-campus-800">{label}</p>
        <p className="text-xs text-campus-500">문자열 배열로만 저장되며 HTML은 해석되지 않습니다.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={pendingValue}
          onChange={(event) => setPendingValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addItem()
            }
          }}
          placeholder={placeholder}
          className="min-h-[3rem] flex-1 rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
        <Button type="button" variant="ghost" onClick={addItem}>
          추가
        </Button>
      </div>
      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={`${item}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-campus-200 bg-white px-4 py-3">
              <p className="min-w-0 flex-1 truncate text-sm text-campus-700">{item}</p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => onChange(moveItem(items, index, -1))}>
                  위로
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => onChange(moveItem(items, index, 1))}>
                  아래로
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => onChange(items.filter((_, currentIndex) => currentIndex !== index))}>
                  삭제
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-campus-200 px-4 py-3 text-sm text-campus-400">아직 추가된 항목이 없습니다.</div>
        )}
      </div>
    </div>
  )
}

function TeamDeleteConfirmModal({
  open,
  teamName,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}: {
  open: boolean
  teamName: string
  isSubmitting: boolean
  errorMessage: string
  onClose: () => void
  onConfirm: () => Promise<void>
}) {
  const titleId = useId()
  const descriptionId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [confirmationName, setConfirmationName] = useState('')
  const isMatched = confirmationName.trim() === teamName.trim()

  useEffect(() => {
    if (!open) return
    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    }, 0)
    return () => window.clearTimeout(focusTimer)
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-campus-900/60 px-4 py-6 backdrop-blur-sm" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !isSubmitting) onClose()
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-lg">
        <Card className="space-y-5 rounded-[32px] border-rose-300 bg-white p-6 shadow-2xl">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-600">Danger Zone</p>
            <h3 id={titleId} className="text-2xl font-semibold tracking-tight text-campus-900">팀을 삭제하시겠습니까?</h3>
            <p id={descriptionId} className="text-sm leading-6 text-campus-600">팀과 연결된 워크스페이스 데이터는 되돌릴 수 없습니다. 확인을 위해 팀 이름을 한 번 더 입력해 주세요.</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            확인 문자열: <span className="font-semibold">{teamName}</span>
          </div>
          <label className="block space-y-2 text-sm font-medium text-campus-700">
            <span>팀 이름 확인</span>
            <input
              ref={inputRef}
              value={confirmationName}
              onChange={(event) => setConfirmationName(event.target.value)}
              placeholder={teamName}
              disabled={isSubmitting}
              className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-base text-campus-900 outline-none transition focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
            />
          </label>
          {errorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{errorMessage}</div> : null}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>취소</Button>
            <Button type="button" disabled={!isMatched || isSubmitting} className="bg-rose-500 text-white shadow-none hover:bg-rose-600" onClick={() => void onConfirm()}>
              {isSubmitting ? '삭제 중...' : '팀 삭제'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function TeamOverviewTab({
  team,
  leader: _leader,
  members: _members,
  skills,
  isLoading,
  errorMessage,
  isLeader,
  currentUserId,
  isDeletingTeam,
  deleteErrorMessage,
  onOpenMembers,
  onDeleteTeam,
  onTeamUpdated,
}: TeamOverviewTabProps) {
  const [links, setLinks] = useState<TeamOverviewLinkRecord[]>([])
  const [draft, setDraft] = useState<OverviewEditorDraft>(() => createInitialDraft(team))
  const [draftLinks, setDraftLinks] = useState<OverviewLinkDraft[]>([])
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('')
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null)
  const [isLoadingLinks, setIsLoadingLinks] = useState(true)
  const [linksErrorMessage, setLinksErrorMessage] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTabKey>('design')
  const [saveErrorMessage, setSaveErrorMessage] = useState('')
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  const theme = resolveTheme(draft.themeKey)
  const heroBannerUrl = getHeroBanner(team, draft, bannerPreviewUrl)
  const heroSubtitle = getHeroSubtitle(team, draft)
  const heroTags = draft.heroTags.length > 0 ? draft.heroTags : team.overview_hero_tags
  const layoutGridClassName =
    draft.layoutVariant === 'immersive'
      ? 'grid gap-5 md:grid-cols-2 2xl:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]'
      : draft.layoutVariant === 'compact'
        ? 'grid gap-4 md:grid-cols-2'
        : 'grid gap-5 md:grid-cols-2'

  useEffect(() => {
    let isMounted = true

    async function loadLinks() {
      setIsLoadingLinks(true)
      setLinksErrorMessage('')

      try {
        const result = await fetchTeamOverviewLinks(team.id)
        if (!isMounted) return
        setLinks(result)
        if (!isEditorOpen) {
          setDraftLinks(createLinkDrafts(result))
        }
      } catch (error) {
        if (!isMounted) return
        setLinksErrorMessage(error instanceof Error ? error.message : '링크를 불러오지 못했습니다.')
      } finally {
        if (isMounted) {
          setIsLoadingLinks(false)
        }
      }
    }

    void loadLinks()

    return () => {
      isMounted = false
    }
  }, [team.id, isEditorOpen])

  useEffect(() => {
    if (!isEditorOpen) {
      setDraft(createInitialDraft(team))
      setDraftLinks(createLinkDrafts(links))
      setSelectedBannerFile(null)
      setBannerPreviewUrl('')
      setSaveErrorMessage('')
    }
  }, [isEditorOpen, links, team])

  useEffect(() => {
    if (!saveSuccessMessage) return
    const timer = window.setTimeout(() => setSaveSuccessMessage(''), 3200)
    return () => window.clearTimeout(timer)
  }, [saveSuccessMessage])

  useEffect(() => {
    return () => {
      if (bannerPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(bannerPreviewUrl)
      }
    }
  }, [bannerPreviewUrl])

  const sectionViewModels = draft.sectionOrder.map((sectionKey) => {
    if (sectionKey === 'about') {
      const body = normalizeText(team.description)
      return { key: sectionKey, title: draft.aboutTitle || '팀 소개', body, items: [] as string[], visible: draft.showAbout, contentExists: Boolean(body) }
    }
    if (sectionKey === 'goal') {
      return { key: sectionKey, title: draft.goalTitle || '현재 목표', body: draft.goalBody, items: [] as string[], visible: draft.showGoal, contentExists: Boolean(draft.goalBody) }
    }
    if (sectionKey === 'recruiting') {
      return { key: sectionKey, title: draft.recruitingTitle || '모집', body: draft.recruitingBody, items: draft.recruitingHighlights, visible: draft.showRecruiting, contentExists: Boolean(draft.recruitingBody) || draft.recruitingHighlights.length > 0 }
    }
    if (sectionKey === 'work_style') {
      return { key: sectionKey, title: draft.workStyleTitle || '협업 방식', body: draft.workStyleBody, items: draft.workStyleItems, visible: draft.showWorkStyle, contentExists: Boolean(draft.workStyleBody) || draft.workStyleItems.length > 0 }
    }
    if (sectionKey === 'rules') {
      return { key: sectionKey, title: draft.rulesTitle || '팀 규칙', body: draft.rulesBody, items: draft.rulesItems, visible: draft.showRules, contentExists: Boolean(draft.rulesBody) || draft.rulesItems.length > 0 }
    }
    return { key: sectionKey, title: draft.linksTitle || '링크 모음', body: '', items: [] as string[], visible: draft.showLinks, contentExists: draftLinks.length > 0 }
  })

  const visibleSections = sectionViewModels.filter((section) => section.visible && (section.contentExists || isLeader))

  function updateDraft<K extends keyof OverviewEditorDraft>(key: K, value: OverviewEditorDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateLink(index: number, patch: Partial<OverviewLinkDraft>) {
    setDraftLinks((current) => current.map((link, currentIndex) => (currentIndex === index ? { ...link, ...patch } : link)))
  }

  function handleBannerChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const validationMessage = validateTeamImageFile(file)
    if (validationMessage) {
      setSaveErrorMessage(validationMessage)
      event.target.value = ''
      return
    }

    if (bannerPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(bannerPreviewUrl)
    }

    setSelectedBannerFile(file)
    setBannerPreviewUrl(URL.createObjectURL(file))
    setDraft((current) => ({ ...current, removeBanner: false }))
    setSaveErrorMessage('')
  }

  async function handleSaveOverview() {
    if (!currentUserId) {
      setSaveErrorMessage('로그인한 사용자만 개요를 수정할 수 있습니다.')
      return
    }

    if (!draft.aboutTitle.trim()) {
      setSaveErrorMessage('팀 소개 제목을 입력해 주세요.')
      return
    }

    setIsSaving(true)
    setSaveErrorMessage('')
    setSaveSuccessMessage('')

    try {
      const result = await updateTeamOverviewCustomization({
        teamId: team.id,
        userId: currentUserId,
        overviewThemeKey: draft.themeKey,
        overviewLayoutVariant: draft.layoutVariant,
        overviewEmoji: draft.emoji,
        overviewHeroSubheadline: draft.heroSubheadline,
        overviewBannerFile: selectedBannerFile,
        removeOverviewBanner: draft.removeBanner,
        currentOverviewBannerUrl: team.overview_banner_url,
        overviewHeroTags: draft.heroTags,
        overviewAboutTitle: draft.aboutTitle,
        overviewGoalTitle: draft.goalTitle,
        overviewGoalBody: draft.goalBody,
        overviewRecruitingTitle: draft.recruitingTitle,
        overviewRecruitingBody: draft.recruitingBody,
        overviewRecruitingHighlights: draft.recruitingHighlights,
        overviewWorkStyleTitle: draft.workStyleTitle,
        overviewWorkStyleBody: draft.workStyleBody,
        overviewWorkStyleItems: draft.workStyleItems,
        overviewRulesTitle: draft.rulesTitle,
        overviewRulesBody: draft.rulesBody,
        overviewRulesItems: draft.rulesItems,
        overviewLinksTitle: draft.linksTitle,
        overviewSectionOrder: draft.sectionOrder,
        showOverviewAbout: draft.showAbout,
        showOverviewGoal: draft.showGoal,
        showOverviewRecruiting: draft.showRecruiting,
        showOverviewWorkStyle: draft.showWorkStyle,
        showOverviewRules: draft.showRules,
        showOverviewLinks: draft.showLinks,
        links: draftLinks.map((link) => ({ id: link.id, label: link.label, url: link.url, icon_key: link.iconKey })),
      })

      setLinks(result.links)
      onTeamUpdated({ team: result.team, skills })
      setIsEditorOpen(false)
      setSaveSuccessMessage('팀 개요가 저장되었습니다.')
    } catch (error) {
      setSaveErrorMessage(error instanceof Error ? error.message : '팀 개요를 저장하지 못했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <OverviewSkeleton />
  }

  if (errorMessage) {
    return (
      <Card className="rounded-[28px] border-rose-200 bg-rose-50/90 p-5 shadow-none">
        <p className="text-sm leading-6 text-rose-700">{errorMessage}</p>
      </Card>
    )
  }

  return (
    <>
      <div className={cn('space-y-6 rounded-[32px]', theme.shellClassName)}>
        {saveSuccessMessage ? (
          <div className="sticky top-4 z-20 ml-auto w-full max-w-sm rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-card">
            {saveSuccessMessage}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[34px] border border-campus-200/70 bg-white shadow-card">
          <div className="relative min-h-[24rem]">
            {heroBannerUrl ? <img src={heroBannerUrl} alt={`${team.name} banner`} className="absolute inset-0 h-full w-full object-cover" /> : <div className={cn('absolute inset-0 bg-gradient-to-br', theme.accentClassName)} />}
            <div className={cn('absolute inset-0', theme.heroOverlayClassName)} />
            <div className="relative flex min-h-[24rem] flex-col justify-between gap-10 px-6 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                  <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.22em]', theme.badgeClassName)}>TEAM OVERVIEW</span>
                  {team.is_recruiting ? <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', theme.badgeClassName)}>모집중</span> : null}
                  {team.category ? <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', theme.badgeClassName)}>{team.category}</span> : null}
                </div>
                {isLeader ? (
                  <Button type="button" className="border-white/10 bg-white text-campus-900 shadow-none hover:bg-campus-50" onClick={() => {
                    setDraft(createInitialDraft(team))
                    setDraftLinks(createLinkDrafts(links))
                    setActiveEditorTab('design')
                    setIsEditorOpen(true)
                    setSaveErrorMessage('')
                  }}>
                    개요 커스터마이징
                  </Button>
                ) : null}
              </div>
              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-5xl sm:text-6xl">{normalizeText(draft.emoji) || normalizeText(team.overview_emoji) || '🚀'}</p>
                  <div className="space-y-3">
                    <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">{team.name}</h1>
                    <p className="max-w-2xl text-base leading-7 text-white/88 sm:text-lg">{heroSubtitle}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {heroTags.length > 0 ? heroTags.map((tag) => (
                    <span key={tag} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', theme.badgeClassName)}>{tag}</span>
                  )) : isLeader ? <span className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', theme.badgeClassName)}>태그를 추가해 Hero를 꾸며보세요</span> : null}
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className={layoutGridClassName}>
          {visibleSections.map((section) =>
            section.key === 'links' ? (
              <Card key={section.key} className={cn('space-y-4 rounded-[28px] shadow-card md:col-span-2', theme.cardClassName)}>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Links</p>
                  <h3 className="text-2xl font-semibold tracking-tight text-campus-900">{section.title}</h3>
                </div>
                {isLoadingLinks ? <div className="rounded-2xl border border-campus-200 bg-white/70 px-4 py-4 text-sm text-campus-500">링크를 불러오는 중입니다...</div> : null}
                {linksErrorMessage ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-600">{linksErrorMessage}</div> : null}
                {!isLoadingLinks && !linksErrorMessage ? (
                  links.filter((link) => isSafeExternalUrl(link.url)).length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {links.filter((link) => isSafeExternalUrl(link.url)).map((link) => (
                        <a key={link.id} href={link.url} target="_blank" rel="noreferrer noopener" className="group rounded-[24px] border border-campus-200 bg-white/90 px-4 py-4 transition hover:-translate-y-0.5 hover:border-campus-300">
                          <div className="flex items-center justify-between gap-4">
                            <div className="space-y-1">
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">{OVERVIEW_ICON_LABELS[link.icon_key]}</p>
                              <p className="text-base font-semibold text-campus-900">{link.label}</p>
                            </div>
                            <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', theme.chipClassName)}>열기</span>
                          </div>
                          <p className="mt-3 truncate text-sm text-campus-500">{link.url}</p>
                        </a>
                      ))}
                    </div>
                  ) : isLeader ? (
                    <div className="rounded-2xl border border-dashed border-campus-200 px-4 py-4 text-sm text-campus-400">저장된 링크가 없습니다. 편집 패널의 링크 탭에서 추가해 보세요.</div>
                  ) : null
                ) : null}
              </Card>
            ) : (
              <SectionCard
                key={section.key}
                title={section.title}
                body={section.body}
                items={section.items}
                theme={theme}
                placeholder={isLeader ? `${OVERVIEW_SECTION_LABELS[section.key]} 내용을 추가하면 여기 표시됩니다.` : undefined}
              />
            ),
          )}
        </div>

        {isLeader ? (
          <Card className={cn('space-y-5 rounded-[28px] shadow-card', theme.cardClassName)}>
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Workspace Actions</p>
              <h2 className="text-2xl font-semibold tracking-tight text-campus-900">빠른 이동</h2>
              <p className="text-sm leading-6 text-campus-500">멤버 관리와 팀 운영 액션을 이곳에서 바로 처리할 수 있습니다.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" className={cn('bg-gradient-to-r text-white shadow-none', theme.accentClassName)} onClick={() => {
                setDraft(createInitialDraft(team))
                setDraftLinks(createLinkDrafts(links))
                setActiveEditorTab('design')
                setIsEditorOpen(true)
              }}>
                개요 커스터마이징
              </Button>
              <Button type="button" variant="ghost" onClick={onOpenMembers}>멤버 관리 보기</Button>
              <Button type="button" variant="ghost" onClick={() => setIsDeleteModalOpen(true)} disabled={isDeletingTeam}>{isDeletingTeam ? '삭제 중...' : '팀 삭제'}</Button>
            </div>
            {deleteErrorMessage && !isDeleteModalOpen ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{deleteErrorMessage}</div> : null}
          </Card>
        ) : null}
      </div>

      {isEditorOpen ? (
        <div className="fixed inset-0 z-50 bg-campus-900/60 backdrop-blur-sm" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !isSaving) {
            setIsEditorOpen(false)
          }
        }}>
          <div className="ml-auto flex h-full w-full max-w-[1280px] flex-col bg-white shadow-2xl">
            <div className="border-b border-campus-200 px-5 py-4 sm:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Overview Editor</p>
                  <h3 className="text-2xl font-semibold tracking-tight text-campus-900">안전한 블록형 팀 개요 커스터마이징</h3>
                  <p className="max-w-2xl text-sm leading-6 text-campus-500">배너, 섹션, 링크를 구조화된 입력으로만 편집하고 오른쪽에서 실시간으로 미리볼 수 있습니다.</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => !isSaving && setIsEditorOpen(false)}>닫기</Button>
                  <Button type="button" onClick={() => void handleSaveOverview()} disabled={isSaving}>{isSaving ? '저장 중...' : '저장'}</Button>
                </div>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,0.95fr),minmax(420px,0.85fr)]">
              <div className="flex min-h-0 flex-col border-b border-campus-200 xl:border-b-0 xl:border-r">
                <div className="flex gap-2 overflow-x-auto border-b border-campus-200 px-5 py-4 sm:px-6">
                  {EDITOR_TABS.map((tab) => (
                    <button key={tab.key} type="button" onClick={() => setActiveEditorTab(tab.key)} className={cn('rounded-full px-4 py-2 text-sm font-medium transition', activeEditorTab === tab.key ? 'bg-campus-900 text-white' : 'border border-campus-200 bg-white text-campus-600 hover:bg-campus-50')}>
                      {tab.label}
                    </button>
                  ))}
                </div>
                <div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
                  {saveErrorMessage ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{saveErrorMessage}</div> : null}
                  {activeEditorTab === 'design' ? (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-campus-700">Theme</label>
                          <div className="grid gap-2">
                            {OVERVIEW_THEMES.map((themeOption) => (
                              <button key={themeOption.key} type="button" className={cn('rounded-[22px] border px-4 py-3 text-left transition', draft.themeKey === themeOption.key ? 'border-campus-900 bg-campus-900 text-white' : 'border-campus-200 bg-white text-campus-700 hover:border-campus-300')} onClick={() => updateDraft('themeKey', themeOption.key)}>
                                <p className="text-sm font-semibold">{themeOption.label}</p>
                                <p className={cn('mt-1 text-xs', draft.themeKey === themeOption.key ? 'text-white/75' : 'text-campus-500')}>{themeOption.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-campus-700">Layout</label>
                          <div className="grid gap-2">
                            {LAYOUT_VARIANTS.map((variant) => (
                              <button key={variant.key} type="button" className={cn('rounded-[22px] border px-4 py-3 text-left transition', draft.layoutVariant === variant.key ? 'border-campus-900 bg-campus-900 text-white' : 'border-campus-200 bg-white text-campus-700 hover:border-campus-300')} onClick={() => updateDraft('layoutVariant', variant.key)}>
                                <p className="text-sm font-semibold">{variant.label}</p>
                                <p className={cn('mt-1 text-xs', draft.layoutVariant === variant.key ? 'text-white/75' : 'text-campus-500')}>{variant.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-campus-700">Emoji</span>
                          <input value={draft.emoji} onChange={(event) => updateDraft('emoji', event.target.value)} placeholder="예: 🚀" className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-medium text-campus-700">Hero 서브카피</span>
                          <input value={draft.heroSubheadline} onChange={(event) => updateDraft('heroSubheadline', event.target.value)} placeholder="팀의 방향성과 분위기를 한 문장으로 소개하세요" className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                        </label>
                      </div>
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-campus-800">배너 이미지</p>
                          <p className="text-xs text-campus-500">기존 팀 이미지 업로드 플로우를 재사용합니다.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-campus-200 bg-white px-4 py-2.5 text-sm font-medium text-campus-700 transition hover:bg-campus-50">
                            배너 선택
                            <input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                          </label>
                          <Button type="button" variant="ghost" onClick={() => {
                            setSelectedBannerFile(null)
                            setBannerPreviewUrl('')
                            updateDraft('removeBanner', true)
                          }}>배너 제거</Button>
                          <Button type="button" variant="ghost" onClick={() => {
                            setSelectedBannerFile(null)
                            setBannerPreviewUrl('')
                            updateDraft('removeBanner', false)
                          }}>되돌리기</Button>
                        </div>
                        <div className="rounded-2xl border border-campus-200 bg-campus-50 px-4 py-3 text-sm text-campus-600">
                          {selectedBannerFile
                            ? `선택된 파일: ${selectedBannerFile.name}`
                            : draft.removeBanner
                              ? '저장 시 Overview 배너를 제거하고 팀 대표 이미지를 fallback으로 사용합니다.'
                              : team.overview_banner_url
                                ? '현재 저장된 Overview 배너를 사용 중입니다.'
                                : team.image_url
                                  ? 'Overview 전용 배너가 없어서 팀 대표 이미지를 fallback으로 사용합니다.'
                                  : TEAM_IMAGE_STORAGE_ENABLED
                                    ? '배너를 올리면 Hero 카드에 즉시 반영됩니다.'
                                    : '스토리지 업로드가 비활성화되어 있습니다.'}
                        </div>
                      </div>
                      <ListEditor label="Hero 태그" items={draft.heroTags} placeholder="예: 실험 중심, 주 2회 스프린트, 리모트" onChange={(items) => updateDraft('heroTags', items)} />
                    </div>
                  ) : null}
                  {activeEditorTab === 'sections' ? (
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-campus-800">섹션 순서</p>
                          <p className="text-xs text-campus-500">Overview에 표시되는 카드 순서를 조정합니다.</p>
                        </div>
                        <div className="space-y-2">
                          {draft.sectionOrder.map((sectionKey, index) => (
                            <div key={sectionKey} className="flex items-center justify-between gap-3 rounded-2xl border border-campus-200 bg-white px-4 py-3">
                              <p className="text-sm font-medium text-campus-700">{OVERVIEW_SECTION_LABELS[sectionKey]}</p>
                              <div className="flex gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => updateDraft('sectionOrder', moveItem(draft.sectionOrder, index, -1))}>위로</Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => updateDraft('sectionOrder', moveItem(draft.sectionOrder, index, 1))}>아래로</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="space-y-4 rounded-[28px] border border-campus-200 bg-campus-50/60 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-semibold text-campus-900">팀 소개</p>
                            <label className="inline-flex items-center gap-2 rounded-full border border-campus-200 bg-white px-4 py-2 text-sm text-campus-700">
                              <input type="checkbox" checked={draft.showAbout} onChange={(event) => updateDraft('showAbout', event.target.checked)} className="h-4 w-4 rounded border-campus-300" />
                              표시
                            </label>
                          </div>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-campus-700">팀 소개 제목</span>
                            <input value={draft.aboutTitle} onChange={(event) => updateDraft('aboutTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                          </label>
                          <p className="text-xs text-campus-500">본문은 기존 `teams.description` 값을 그대로 사용합니다.</p>
                        </div>

                        <div className="space-y-4 rounded-[28px] border border-campus-200 bg-campus-50/60 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-semibold text-campus-900">현재 목표</p>
                            <label className="inline-flex items-center gap-2 rounded-full border border-campus-200 bg-white px-4 py-2 text-sm text-campus-700">
                              <input type="checkbox" checked={draft.showGoal} onChange={(event) => updateDraft('showGoal', event.target.checked)} className="h-4 w-4 rounded border-campus-300" />
                              표시
                            </label>
                          </div>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-campus-700">현재 목표 제목</span>
                            <input value={draft.goalTitle} onChange={(event) => updateDraft('goalTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-campus-700">현재 목표 본문</span>
                            <textarea rows={4} value={draft.goalBody} onChange={(event) => updateDraft('goalBody', event.target.value)} className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                          </label>
                        </div>

                        <div className="space-y-4 rounded-[28px] border border-campus-200 bg-campus-50/60 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-semibold text-campus-900">모집</p>
                            <label className="inline-flex items-center gap-2 rounded-full border border-campus-200 bg-white px-4 py-2 text-sm text-campus-700">
                              <input type="checkbox" checked={draft.showRecruiting} onChange={(event) => updateDraft('showRecruiting', event.target.checked)} className="h-4 w-4 rounded border-campus-300" />
                              표시
                            </label>
                          </div>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-campus-700">모집 제목</span>
                            <input value={draft.recruitingTitle} onChange={(event) => updateDraft('recruitingTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-campus-700">모집 본문</span>
                            <textarea rows={4} value={draft.recruitingBody} onChange={(event) => updateDraft('recruitingBody', event.target.value)} className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                          </label>
                          <ListEditor label="모집 하이라이트" items={draft.recruitingHighlights} placeholder="예: 프론트엔드 경험, 프로토타이핑 선호" onChange={(items) => updateDraft('recruitingHighlights', items)} />
                        </div>

                        <div className="space-y-4 rounded-[28px] border border-campus-200 bg-campus-50/60 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-semibold text-campus-900">협업 방식</p>
                            <label className="inline-flex items-center gap-2 rounded-full border border-campus-200 bg-white px-4 py-2 text-sm text-campus-700">
                              <input type="checkbox" checked={draft.showWorkStyle} onChange={(event) => updateDraft('showWorkStyle', event.target.checked)} className="h-4 w-4 rounded border-campus-300" />
                              표시
                            </label>
                          </div>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-campus-700">협업 방식 제목</span>
                            <input value={draft.workStyleTitle} onChange={(event) => updateDraft('workStyleTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-campus-700">협업 방식 본문</span>
                            <textarea rows={4} value={draft.workStyleBody} onChange={(event) => updateDraft('workStyleBody', event.target.value)} className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                          </label>
                          <ListEditor label="협업 방식 리스트" items={draft.workStyleItems} placeholder="예: 매주 화요일 리뷰, 일일 텍스트 스탠드업" onChange={(items) => updateDraft('workStyleItems', items)} />
                        </div>

                        <div className="space-y-4 rounded-[28px] border border-campus-200 bg-campus-50/60 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-semibold text-campus-900">팀 규칙</p>
                            <label className="inline-flex items-center gap-2 rounded-full border border-campus-200 bg-white px-4 py-2 text-sm text-campus-700">
                              <input type="checkbox" checked={draft.showRules} onChange={(event) => updateDraft('showRules', event.target.checked)} className="h-4 w-4 rounded border-campus-300" />
                              표시
                            </label>
                          </div>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-campus-700">팀 규칙 제목</span>
                            <input value={draft.rulesTitle} onChange={(event) => updateDraft('rulesTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-campus-700">팀 규칙 본문</span>
                            <textarea rows={4} value={draft.rulesBody} onChange={(event) => updateDraft('rulesBody', event.target.value)} className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                          </label>
                          <ListEditor label="팀 규칙 리스트" items={draft.rulesItems} placeholder="예: 결정은 문서로 남기기" onChange={(items) => updateDraft('rulesItems', items)} />
                        </div>

                        <div className="space-y-4 rounded-[28px] border border-campus-200 bg-campus-50/60 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-lg font-semibold text-campus-900">링크</p>
                            <label className="inline-flex items-center gap-2 rounded-full border border-campus-200 bg-white px-4 py-2 text-sm text-campus-700">
                              <input type="checkbox" checked={draft.showLinks} onChange={(event) => updateDraft('showLinks', event.target.checked)} className="h-4 w-4 rounded border-campus-300" />
                              표시
                            </label>
                          </div>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-campus-700">링크 섹션 제목</span>
                            <input value={draft.linksTitle} onChange={(event) => updateDraft('linksTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {activeEditorTab === 'links' ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-campus-800">링크 목록</p>
                          <p className="text-xs text-campus-500">http/https 링크만 허용되며 새 탭으로 열립니다.</p>
                        </div>
                        <Button type="button" variant="ghost" onClick={() => setDraftLinks((current) => [...current, { label: '', url: '', iconKey: 'link' }])}>링크 추가</Button>
                      </div>
                      <div className="space-y-3">
                        {draftLinks.length > 0 ? draftLinks.map((link, index) => (
                          <div key={`${link.id ?? 'new'}-${index}`} className="space-y-4 rounded-[28px] border border-campus-200 bg-campus-50/60 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-campus-800">링크 {index + 1}</p>
                              <div className="flex gap-2">
                                <Button type="button" size="sm" variant="ghost" onClick={() => setDraftLinks(moveItem(draftLinks, index, -1))}>위로</Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setDraftLinks(moveItem(draftLinks, index, 1))}>아래로</Button>
                                <Button type="button" size="sm" variant="ghost" onClick={() => setDraftLinks(draftLinks.filter((_, currentIndex) => currentIndex !== index))}>삭제</Button>
                              </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <label className="space-y-2">
                                <span className="text-sm font-medium text-campus-700">이름</span>
                                <input value={link.label} onChange={(event) => updateLink(index, { label: event.target.value })} placeholder="예: GitHub Repository" className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                              </label>
                              <label className="space-y-2">
                                <span className="text-sm font-medium text-campus-700">아이콘 타입</span>
                                <select value={link.iconKey} onChange={(event) => updateLink(index, { iconKey: event.target.value as TeamOverviewLinkIconKey })} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100">
                                  {LINK_ICON_OPTIONS.map((iconKey) => <option key={iconKey} value={iconKey}>{OVERVIEW_ICON_LABELS[iconKey]}</option>)}
                                </select>
                              </label>
                            </div>
                            <label className="block space-y-2">
                              <span className="text-sm font-medium text-campus-700">URL</span>
                              <input value={link.url} onChange={(event) => updateLink(index, { url: event.target.value })} placeholder="https://" className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-900 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                              {link.url.trim() && !isSafeExternalUrl(link.url) ? <p className="text-xs text-rose-500">저장 전 http/https 형식인지 확인해 주세요.</p> : null}
                            </label>
                          </div>
                        )) : <div className="rounded-[28px] border border-dashed border-campus-200 px-4 py-5 text-sm text-campus-400">아직 추가된 링크가 없습니다.</div>}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto bg-campus-50/60 p-5 sm:p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Preview</p>
                      <h4 className="text-xl font-semibold tracking-tight text-campus-900">저장 전 미리보기</h4>
                    </div>
                    <Badge variant="neutral">{LAYOUT_VARIANTS.find((variant) => variant.key === draft.layoutVariant)?.label}</Badge>
                  </div>
                  <div className="rounded-[32px] border border-campus-200 bg-white p-3 shadow-card sm:p-4">
                    <div className="space-y-5">
                      <section className="overflow-hidden rounded-[28px] border border-campus-200 bg-white shadow-card">
                        <div className="relative min-h-[18rem]">
                          {heroBannerUrl ? <img src={heroBannerUrl} alt={`${team.name} preview banner`} className="absolute inset-0 h-full w-full object-cover" /> : <div className={cn('absolute inset-0 bg-gradient-to-br', theme.accentClassName)} />}
                          <div className={cn('absolute inset-0', theme.heroOverlayClassName)} />
                          <div className="relative space-y-4 px-5 py-5 sm:px-6 sm:py-6">
                            <div className="flex flex-wrap gap-2">
                              {(draft.heroTags.length > 0 ? draft.heroTags : ['태그 미리보기']).map((tag) => <span key={tag} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', theme.badgeClassName)}>{tag}</span>)}
                            </div>
                            <div className="space-y-3 pt-10">
                              <p className="text-4xl">{draft.emoji || '🚀'}</p>
                              <h5 className="text-3xl font-semibold tracking-tight text-white">{team.name}</h5>
                              <p className="max-w-xl text-sm leading-6 text-white/85">{heroSubtitle}</p>
                            </div>
                          </div>
                        </div>
                      </section>
                      <div className={layoutGridClassName}>
                        {sectionViewModels.filter((section) => section.visible).map((section) =>
                          section.key === 'links' ? (
                            <Card key={section.key} className={cn('space-y-4 rounded-[26px] shadow-card md:col-span-2', theme.cardClassName)}>
                              <h5 className="text-xl font-semibold tracking-tight text-campus-900">{section.title}</h5>
                              <div className="grid gap-3">
                                {draftLinks.length > 0 ? draftLinks.map((link, index) => (
                                  <div key={`${link.label}-${index}`} className="rounded-2xl border border-campus-200 bg-white px-4 py-3">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">{OVERVIEW_ICON_LABELS[link.iconKey]}</p>
                                    <p className="mt-1 text-sm font-semibold text-campus-900">{link.label || '링크 이름'}</p>
                                    <p className="mt-1 truncate text-xs text-campus-500">{link.url || 'https://'}</p>
                                  </div>
                                )) : <p className="rounded-2xl border border-dashed border-campus-200 px-4 py-3 text-sm text-campus-400">링크를 추가하면 미리보기에 표시됩니다.</p>}
                              </div>
                            </Card>
                          ) : (
                            <SectionCard key={section.key} title={section.title} body={section.body} items={section.items} theme={theme} placeholder={`${OVERVIEW_SECTION_LABELS[section.key]} 내용을 입력하면 여기에 보입니다.`} />
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <TeamDeleteConfirmModal
        key={`${team.id}-${String(isDeleteModalOpen)}`}
        open={isDeleteModalOpen}
        teamName={team.name}
        isSubmitting={isDeletingTeam}
        errorMessage={deleteErrorMessage}
        onClose={() => {
          if (!isDeletingTeam) {
            setIsDeleteModalOpen(false)
          }
        }}
        onConfirm={async () => {
          await onDeleteTeam()
        }}
      />
    </>
  )
}
