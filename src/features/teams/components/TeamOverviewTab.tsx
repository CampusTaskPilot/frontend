import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { Badge } from '../../../components/ui/Badge'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { cn } from '../../../lib/cn'
import { TEAM_IMAGE_STORAGE_ENABLED, validateTeamImageFile } from '../lib/teamProfileImages'
import { fetchTeamOverviewLinks, updateTeamOverviewCustomization } from '../lib/teams'
import type { ProfileSummary, TeamMemberWithProfile, TeamOverviewLinkIconKey, TeamOverviewLinkRecord, TeamOverviewSectionKey, TeamOverviewThemeKey, TeamRecord, TeamSkillTag, TeamTaskItem } from '../types/team'

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
type Draft = {
  themeKey: TeamOverviewThemeKey
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
type LinkDraft = { id?: string; label: string; url: string; iconKey: TeamOverviewLinkIconKey }
type ThemeDef = { key: TeamOverviewThemeKey; label: string; shell: string; overlay: string; card: string; badge: string; accent: string }

const KR = { intro: '\uD300 \uC18C\uAC1C', goal: '\uD604\uC7AC \uBAA9\uD45C', recruiting: '\uBAA8\uC9D1', workStyle: '\uC791\uC5C5 \uBC29\uC2DD', rules: '\uD300 \uADDC\uCE59', teamIntro: '\uD300 \uD55C\uC904\uC18C\uAC1C', show: '\uD45C\uC2DC', editor: 'Overview Editor', customize: '\uAC1C\uC694 \uCEE4\uC2A4\uD130\uB9C8\uC774\uC988', design: '\uB514\uC790\uC778', sections: '\uC139\uC158', links: '\uB9C1\uD06C', members: '\uBA64\uBC84', delete: '\uC0AD\uC81C', save: '\uC800\uC7A5' } as const
const HERO_EMOJI_OPTIONS = ['\u{1F680}', '\u{1F525}', '\u2728', '\u{1F4A1}', '\u{1F3AF}', '\u{1F91D}', '\u{1F6E0}\uFE0F', '\u{1F331}', '\u{1F4DA}', '\u{1F3A8}', '\u{1F4BB}', '\u{1F3C3}']
const LINK_ICON_OPTIONS: TeamOverviewLinkIconKey[] = ['github', 'notion', 'figma', 'docs', 'demo', 'link']
const OVERVIEW_ICON_LABELS: Record<TeamOverviewLinkIconKey, string> = { github: 'GitHub', notion: 'Notion', figma: 'Figma', docs: 'Docs', demo: 'Demo', link: 'Link' }
const THEMES: ThemeDef[] = [
  { key: 'sunset', label: 'Sunset', shell: 'bg-[linear-gradient(180deg,#fff8f2_0%,#fffdf9_40%,#ffffff_100%)]', overlay: 'bg-[linear-gradient(180deg,rgba(122,45,32,0.08)_0%,rgba(122,45,32,0.18)_38%,rgba(50,23,16,0.72)_100%)]', card: 'border-[#f2d6c8] bg-white/92', badge: 'border-white/30 bg-white/14 text-white', accent: 'from-[#f97360] via-[#f8a15e] to-[#f0c27a]' },
  { key: 'ocean', label: 'Ocean', shell: 'bg-[linear-gradient(180deg,#f2fbfc_0%,#f8fcff_42%,#ffffff_100%)]', overlay: 'bg-[linear-gradient(180deg,rgba(17,70,91,0.10)_0%,rgba(17,70,91,0.20)_40%,rgba(7,28,39,0.78)_100%)]', card: 'border-[#cfe8ec] bg-white/92', badge: 'border-white/30 bg-white/12 text-white', accent: 'from-[#138a9e] via-[#45a7c5] to-[#78c6d4]' },
  { key: 'forest', label: 'Forest', shell: 'bg-[linear-gradient(180deg,#f4fbf5_0%,#fbfdf9_42%,#ffffff_100%)]', overlay: 'bg-[linear-gradient(180deg,rgba(26,92,63,0.10)_0%,rgba(26,92,63,0.24)_40%,rgba(14,37,27,0.78)_100%)]', card: 'border-[#d7eadc] bg-white/92', badge: 'border-white/30 bg-white/12 text-white', accent: 'from-[#1f8f5f] via-[#45a172] to-[#83c58f]' },
  { key: 'midnight', label: 'Midnight', shell: 'bg-[linear-gradient(180deg,#f5f7fb_0%,#fafbfe_42%,#ffffff_100%)]', overlay: 'bg-[linear-gradient(180deg,rgba(41,54,92,0.12)_0%,rgba(41,54,92,0.28)_38%,rgba(16,22,39,0.82)_100%)]', card: 'border-[#d8deef] bg-white/92', badge: 'border-white/30 bg-white/12 text-white', accent: 'from-[#415a9a] via-[#5f77b8] to-[#8ea2d8]' },
]
const TABS: Array<{ key: EditorTabKey; label: string }> = [{ key: 'design', label: KR.design }, { key: 'sections', label: KR.sections }, { key: 'links', label: KR.links }]
const ORDER: TeamOverviewSectionKey[] = ['about', 'goal', 'recruiting', 'work_style', 'rules', 'links']
const normalize = (value: string | null | undefined) => value?.trim() ?? ''
const unique = (values: string[]) => Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
const layoutClass = (variant: TeamRecord['overview_layout_variant']) => variant === 'immersive' ? 'grid gap-5 md:grid-cols-2 2xl:grid-cols-[minmax(0,1.2fr),minmax(0,0.8fr)]' : variant === 'compact' ? 'grid gap-4 md:grid-cols-2' : 'grid gap-5 md:grid-cols-2'
const themeOf = (key: TeamOverviewThemeKey | null | undefined) => THEMES.find((theme) => theme.key === key) ?? THEMES[0]
const isSafeExternalUrl = (value: string) => { try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:' } catch { return false } }

function makeDraft(team: TeamRecord): Draft {
  return { themeKey: team.overview_theme_key ?? 'sunset', emoji: normalize(team.overview_emoji), heroSubheadline: normalize(team.overview_hero_subheadline), heroTags: unique(team.overview_hero_tags), aboutTitle: normalize(team.overview_about_title) || KR.intro, goalTitle: normalize(team.overview_goal_title) || KR.goal, goalBody: normalize(team.overview_goal_body), recruitingTitle: normalize(team.overview_recruiting_title) || KR.recruiting, recruitingBody: normalize(team.overview_recruiting_body), recruitingHighlights: unique(team.overview_recruiting_highlights), workStyleTitle: normalize(team.overview_work_style_title) || KR.workStyle, workStyleBody: normalize(team.overview_work_style_body), workStyleItems: unique(team.overview_work_style_items), rulesTitle: normalize(team.overview_rules_title) || KR.rules, rulesBody: normalize(team.overview_rules_body), rulesItems: unique(team.overview_rules_items), linksTitle: normalize(team.overview_links_title) || KR.links, sectionOrder: team.overview_section_order.length > 0 ? [...team.overview_section_order] : [...ORDER], showAbout: team.overview_show_about, showGoal: team.overview_show_goal, showRecruiting: team.overview_show_recruiting, showWorkStyle: team.overview_show_work_style, showRules: team.overview_show_rules, showLinks: team.overview_show_links, removeBanner: false }
}

function ListBlock({ label, items, onChange }: { label: string; items: string[]; onChange: (value: string[]) => void }) {
  const [value, setValue] = useState('')
  return <div className="space-y-2"><p className="text-sm font-medium text-campus-700">{label}</p><div className="flex gap-2"><input value={value} onChange={(event) => setValue(event.target.value)} className="min-h-[3rem] flex-1 rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /><Button type="button" variant="ghost" onClick={() => { const next = value.trim(); if (!next) return; onChange(unique([...items, next])); setValue('') }}>+</Button></div><div className="space-y-2">{items.map((item, index) => <div key={`${item}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm text-campus-700"><span>{item}</span><button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} className="text-xs font-medium text-campus-500 hover:text-campus-700">\uC0AD\uC81C</button></div>)}</div></div>
}

function SectionEditor({ title, checked, onCheckedChange, children }: { title: string; checked: boolean; onCheckedChange: (value: boolean) => void; children: ReactNode }) {
  return <div className="space-y-4 rounded-[28px] border border-campus-200 bg-campus-50/60 p-5"><div className="flex items-center justify-between gap-3"><p className="text-lg font-semibold text-campus-900">{title}</p><label className="inline-flex items-center gap-2 rounded-full border border-campus-200 bg-white px-4 py-2 text-sm text-campus-700"><input type="checkbox" checked={checked} onChange={(event) => onCheckedChange(event.target.checked)} className="h-4 w-4 rounded border-campus-300" />{KR.show}</label></div>{children}</div>
}

function SectionCard({ eyebrow, title, body, items, theme }: { eyebrow: string; title: string; body: string; items?: string[]; theme: Pick<ThemeDef, 'card' | 'badge'> }) {
  const visibleItems = items?.filter(Boolean) ?? []
  return <Card className={cn('space-y-4 rounded-[28px] shadow-card', theme.card)}><div className="space-y-2"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">{eyebrow}</p><h3 className="text-2xl font-semibold tracking-tight text-campus-900">{title}</h3></div>{body ? <p className="whitespace-pre-wrap text-sm leading-7 text-campus-700">{body}</p> : null}{visibleItems.length > 0 ? <div className="flex flex-wrap gap-2">{visibleItems.map((item) => <span key={item} className={cn('rounded-full border border-campus-200 px-3 py-1.5 text-sm font-medium text-campus-700', theme.badge)}>{item}</span>)}</div> : null}</Card>
}

function TeamDeleteConfirmModal({ open, teamName, isSubmitting, errorMessage, onClose, onConfirm }: { open: boolean; teamName: string; isSubmitting: boolean; errorMessage: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  if (!open) return null
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-campus-900/60 px-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose() }}><Card className="w-full max-w-md space-y-4 rounded-[28px] border border-campus-200 bg-white shadow-2xl"><div className="space-y-2"><p className="text-lg font-semibold text-campus-900">\uD300 \uC0AD\uC81C</p><p className="text-sm leading-6 text-campus-600"><strong className="text-campus-900">{teamName}</strong> \uD300\uC744 \uC0AD\uC81C\uD558\uBA74 \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.</p></div>{errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}<div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>\uCDE8\uC18C</Button><Button type="button" className="border-rose-600 bg-rose-600 text-white hover:bg-rose-700" onClick={() => void onConfirm()} disabled={isSubmitting}>{isSubmitting ? '\uC0AD\uC81C \uC911...' : '\uC0AD\uC81C'}</Button></div></Card></div>
}

export function TeamOverviewTab({ team, leader: _leader, members: _members, skills, tasks: _tasks, isLoading, errorMessage, isLeader, currentUserId, isDeletingTeam, deleteErrorMessage, onOpenMembers, onDeleteTeam, onTeamUpdated }: TeamOverviewTabProps) {
  const [links, setLinks] = useState<TeamOverviewLinkRecord[]>([])
  const [draftLinks, setDraftLinks] = useState<LinkDraft[]>([])
  const [draft, setDraft] = useState<Draft>(() => makeDraft(team))
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState('')
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [activeEditorTab, setActiveEditorTab] = useState<EditorTabKey>('design')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [linksError, setLinksError] = useState('')
  const [loadingLinks, setLoadingLinks] = useState(true)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const emojiRef = useRef<HTMLDivElement | null>(null)
  const theme = themeOf(draft.themeKey)
  const bannerUrl = draft.removeBanner ? (team.image_url ?? '') : (bannerPreviewUrl || team.overview_banner_url || team.image_url || '')
  const heroSubtitle = normalize(draft.heroSubheadline) || normalize(team.overview_hero_subheadline) || team.summary
  const heroTags = draft.heroTags.length > 0 ? draft.heroTags : team.overview_hero_tags
  const emojiOptions = Array.from(new Set([normalize(draft.emoji), ...HERO_EMOJI_OPTIONS].filter(Boolean)))

  useEffect(() => {
    setDraft(makeDraft(team))
    setBannerPreviewUrl('')
    setSelectedBannerFile(null)
    setEmojiOpen(false)
  }, [team])

  useEffect(() => {
    let mounted = true
    setLoadingLinks(true)
    fetchTeamOverviewLinks(team.id).then((result) => {
      if (!mounted) return
      setLinks(result)
      setDraftLinks(result.map((link) => ({ id: link.id, label: link.label, url: link.url, iconKey: link.icon_key })))
      setLinksError('')
    }).catch((error) => {
      if (!mounted) return
      setLinksError(error instanceof Error ? error.message : 'link load failed')
    }).finally(() => {
      if (mounted) setLoadingLinks(false)
    })
    return () => { mounted = false }
  }, [team.id])

  useEffect(() => {
    if (!emojiOpen) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!emojiRef.current?.contains(event.target as Node)) setEmojiOpen(false)
    }
    window.addEventListener('pointerdown', handlePointerDown)
    return () => window.removeEventListener('pointerdown', handlePointerDown)
  }, [emojiOpen])

  useEffect(() => {
    if (!saveSuccess) return
    const timer = window.setTimeout(() => setSaveSuccess(''), 3200)
    return () => window.clearTimeout(timer)
  }, [saveSuccess])

  useEffect(() => {
    if (!bannerPreviewUrl) return
    return () => URL.revokeObjectURL(bannerPreviewUrl)
  }, [bannerPreviewUrl])

  const updateDraft = <Key extends keyof Draft>(key: Key, value: Draft[Key]) => setDraft((current) => ({ ...current, [key]: value }))
  const updateLink = (index: number, patch: Partial<LinkDraft>) => setDraftLinks((current) => current.map((link, currentIndex) => currentIndex === index ? { ...link, ...patch } : link))

  const openEditor = () => {
    setDraft(makeDraft(team))
    setDraftLinks(links.map((link) => ({ id: link.id, label: link.label, url: link.url, iconKey: link.icon_key })))
    setBannerPreviewUrl('')
    setSelectedBannerFile(null)
    setSaveError('')
    setEmojiOpen(false)
    setActiveEditorTab('design')
    setIsEditorOpen(true)
  }

  const handleBannerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const validationError = validateTeamImageFile(file)
    if (validationError) {
      setSaveError(validationError)
      return
    }
    setBannerPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
    setSelectedBannerFile(file)
    updateDraft('removeBanner', false)
    setSaveError('')
  }

  async function save() {
    if (!currentUserId) return setSaveError('login required')
    setIsSaving(true)
    setSaveError('')
    try {
      const result = await updateTeamOverviewCustomization({ teamId: team.id, userId: currentUserId, overviewThemeKey: draft.themeKey, overviewLayoutVariant: team.overview_layout_variant ?? 'balanced', overviewEmoji: draft.emoji, overviewHeroSubheadline: draft.heroSubheadline, overviewBannerFile: selectedBannerFile, removeOverviewBanner: draft.removeBanner, currentOverviewBannerUrl: team.overview_banner_url, overviewHeroTags: draft.heroTags, overviewAboutTitle: draft.aboutTitle, overviewGoalTitle: draft.goalTitle, overviewGoalBody: draft.goalBody, overviewRecruitingTitle: draft.recruitingTitle, overviewRecruitingBody: draft.recruitingBody, overviewRecruitingHighlights: draft.recruitingHighlights, overviewWorkStyleTitle: draft.workStyleTitle, overviewWorkStyleBody: draft.workStyleBody, overviewWorkStyleItems: draft.workStyleItems, overviewRulesTitle: draft.rulesTitle, overviewRulesBody: draft.rulesBody, overviewRulesItems: draft.rulesItems, overviewLinksTitle: draft.linksTitle, overviewSectionOrder: draft.sectionOrder, showOverviewAbout: draft.showAbout, showOverviewGoal: draft.showGoal, showOverviewRecruiting: draft.showRecruiting, showOverviewWorkStyle: draft.showWorkStyle, showOverviewRules: draft.showRules, showOverviewLinks: draft.showLinks, links: draftLinks.map((link) => ({ id: link.id, label: link.label.trim(), url: link.url.trim(), icon_key: link.iconKey })) })
      setLinks(result.links)
      onTeamUpdated({ team: result.team, skills })
      setIsEditorOpen(false)
      setSaveSuccess('saved')
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'save failed')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <Card><p className="text-sm text-campus-600">loading...</p></Card>
  if (errorMessage) return <Card className="border-rose-200 bg-rose-50"><p className="text-sm text-rose-600">{errorMessage}</p></Card>

  return (
    <>
      <div className={cn('space-y-6 rounded-[32px]', theme.shell)}>
        {saveSuccess ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">saved</div> : null}
        <section className="overflow-hidden rounded-[34px] border border-campus-200/70 bg-white shadow-card">
          <div className="relative min-h-[24rem]">
            {bannerUrl ? <img src={bannerUrl} alt={`${team.name} banner`} className="absolute inset-0 h-full w-full object-cover" /> : <div className={cn('absolute inset-0 bg-gradient-to-br', theme.accent)} />}
            <div className={cn('absolute inset-0', theme.overlay)} />
            <div className="relative flex min-h-[24rem] flex-col justify-between gap-8 px-6 py-6 sm:px-8 sm:py-8">
              <div className="flex items-start justify-between gap-4"><span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', theme.badge)}>TEAM OVERVIEW</span>{isLeader ? <Button type="button" className="border-white/10 bg-white text-campus-900 shadow-none hover:bg-campus-50" onClick={openEditor}>{KR.customize}</Button> : null}</div>
              <div className="space-y-3"><p className="text-5xl">{draft.emoji || '\u{1F680}'}</p><h1 className="text-4xl font-semibold text-white sm:text-5xl">{team.name}</h1><p className="max-w-2xl text-base leading-7 text-white/88">{heroSubtitle}</p>{heroTags.length > 0 ? <div className="flex flex-wrap gap-2">{heroTags.map((tag) => <span key={tag} className={cn('rounded-full border px-3 py-1.5 text-sm font-medium', theme.badge)}>{tag}</span>)}</div> : null}</div>
            </div>
          </div>
        </section>
        <div className={layoutClass(team.overview_layout_variant)}>
          {draft.showAbout ? <SectionCard eyebrow={KR.intro} title={draft.aboutTitle} body={team.description ?? ''} theme={theme} /> : null}
          {draft.showGoal ? <SectionCard eyebrow={KR.goal} title={draft.goalTitle} body={draft.goalBody} theme={theme} /> : null}
          {draft.showRecruiting ? <SectionCard eyebrow={KR.recruiting} title={draft.recruitingTitle} body={draft.recruitingBody} items={draft.recruitingHighlights} theme={theme} /> : null}
          {draft.showWorkStyle ? <SectionCard eyebrow={KR.workStyle} title={draft.workStyleTitle} body={draft.workStyleBody} items={draft.workStyleItems} theme={theme} /> : null}
          {draft.showRules ? <SectionCard eyebrow={KR.rules} title={draft.rulesTitle} body={draft.rulesBody} items={draft.rulesItems} theme={theme} /> : null}
          {draft.showLinks ? <Card className={cn('space-y-4 rounded-[28px] shadow-card md:col-span-2', theme.card)}><div className="space-y-2"><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">Links</p><h3 className="text-2xl font-semibold tracking-tight text-campus-900">{draft.linksTitle}</h3></div>{loadingLinks ? <p className="text-sm text-campus-500">loading links...</p> : null}{linksError ? <p className="text-sm text-rose-600">{linksError}</p> : null}<div className="grid gap-3">{links.filter((link) => isSafeExternalUrl(link.url)).map((link) => <a key={link.id} href={link.url} target="_blank" rel="noreferrer noopener" className="block rounded-[24px] border border-campus-200 bg-white/90 px-4 py-4"><div className="flex items-center justify-between gap-4"><div className="space-y-1"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-campus-500">{OVERVIEW_ICON_LABELS[link.icon_key]}</p><p className="text-base font-semibold text-campus-900">{link.label}</p></div><Badge variant="neutral">Open</Badge></div></a>)}</div></Card> : null}
        </div>
        {isLeader ? <Card className={cn('space-y-4 rounded-[28px] shadow-card', theme.card)}><div className="flex flex-col gap-3 sm:flex-row"><Button type="button" className={cn('bg-gradient-to-r text-white shadow-none', theme.accent)} onClick={openEditor}>{KR.customize}</Button><Button type="button" variant="ghost" onClick={onOpenMembers}>{KR.members}</Button><Button type="button" variant="ghost" onClick={() => setDeleteOpen(true)} disabled={isDeletingTeam}>{isDeletingTeam ? '...' : KR.delete}</Button></div>{deleteErrorMessage ? <p className="text-sm text-rose-600">{deleteErrorMessage}</p> : null}</Card> : null}
      </div>
      {isEditorOpen ? <div className="fixed inset-0 z-50 bg-campus-900/60 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) setIsEditorOpen(false) }}><div className="ml-auto flex h-full w-full max-w-[1180px] flex-col bg-white shadow-2xl"><div className="border-b border-campus-200 px-5 py-4 sm:px-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-campus-500">{KR.editor}</p></div><div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => setIsEditorOpen(false)}>close</Button><Button type="button" onClick={() => void save()} disabled={isSaving}>{isSaving ? '...' : KR.save}</Button></div></div></div><div className="grid min-h-0 flex-1 xl:grid-cols-[minmax(0,0.95fr),minmax(420px,0.85fr)]"><div className="flex min-h-0 flex-col border-r border-campus-200"><div className="border-b border-campus-200 px-5 py-4 sm:px-6"><div className="flex gap-2 overflow-x-auto">{TABS.map((tab) => <button key={tab.key} type="button" onClick={() => setActiveEditorTab(tab.key)} className={cn('box-border inline-flex h-11 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full border px-4 text-sm font-medium leading-none transition', activeEditorTab === tab.key ? 'border-campus-900 bg-campus-900 text-white shadow-[0_10px_24px_rgba(26,34,51,0.12)]' : 'border-campus-200 bg-white text-campus-600 hover:bg-campus-50')}>{tab.label}</button>)}</div></div><div className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">{saveError ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">{saveError}</div> : null}
        {activeEditorTab === 'design' ? <div className="space-y-6"><div className="grid gap-2 md:grid-cols-2">{THEMES.map((themeOption) => <button key={themeOption.key} type="button" onClick={() => updateDraft('themeKey', themeOption.key)} className={cn('rounded-[22px] border px-4 py-3 text-left transition', draft.themeKey === themeOption.key ? 'border-campus-900 bg-campus-900 text-white' : 'border-campus-200 bg-white text-campus-700 hover:border-campus-300')}>{themeOption.label}</button>)}</div><div className="grid gap-4 md:grid-cols-2"><div ref={emojiRef} className="relative space-y-2"><span className="text-sm font-medium text-campus-700">Emoji</span><button type="button" onClick={() => setEmojiOpen((current) => !current)} className="flex min-h-[3rem] w-full items-center justify-between rounded-2xl border border-campus-200 bg-white px-4 py-3 text-left text-sm text-campus-900"><span className="flex items-center gap-3"><span className="text-2xl">{draft.emoji || '\u{1F680}'}</span><span>{draft.emoji ? '\uC120\uD0DD\uB428' : '\uC774\uBAA8\uC9C0 \uC120\uD0DD'}</span></span></button>{emojiOpen ? <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-[24px] border border-campus-200 bg-white p-3 shadow-card"><div className="grid grid-cols-4 gap-2 sm:grid-cols-6">{emojiOptions.map((emojiOption) => <button key={emojiOption} type="button" onClick={() => { updateDraft('emoji', emojiOption); setEmojiOpen(false) }} className={cn('flex h-11 items-center justify-center rounded-2xl border text-2xl transition', draft.emoji === emojiOption ? 'border-campus-900 bg-campus-900 text-white' : 'border-campus-200 bg-campus-50 hover:border-campus-300 hover:bg-white')}>{emojiOption}</button>)}</div></div> : null}</div><label className="space-y-2"><span className="text-sm font-medium text-campus-700">{KR.teamIntro}</span><input value={draft.heroSubheadline} onChange={(event) => updateDraft('heroSubheadline', event.target.value)} placeholder="\uD300\uC744 \uD55C\uC904\uB85C \uC18C\uAC1C\uD558\uB294 \uBB38\uAD6C\uB97C \uC785\uB825\uD574 \uC8FC\uC138\uC694" className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /></label></div><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-campus-200 bg-white px-4 py-2.5 text-sm font-medium text-campus-700">banner<input type="file" accept="image/*" className="hidden" onChange={handleBannerChange} /></label><Button type="button" variant="ghost" onClick={() => { setSelectedBannerFile(null); setBannerPreviewUrl(''); updateDraft('removeBanner', true) }}>remove</Button><Button type="button" variant="ghost" onClick={() => { setSelectedBannerFile(null); setBannerPreviewUrl(''); updateDraft('removeBanner', false) }}>reset</Button></div>{TEAM_IMAGE_STORAGE_ENABLED ? null : <p className="text-xs text-campus-500">storage disabled</p>}<ListBlock label="Hero tags" items={draft.heroTags} onChange={(items) => updateDraft('heroTags', items)} /></div> : null}
        {activeEditorTab === 'sections' ? <div className="space-y-6"><SectionEditor title={KR.intro} checked={draft.showAbout} onCheckedChange={(value) => updateDraft('showAbout', value)}><input value={draft.aboutTitle} onChange={(event) => updateDraft('aboutTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /></SectionEditor><SectionEditor title={KR.goal} checked={draft.showGoal} onCheckedChange={(value) => updateDraft('showGoal', value)}><input value={draft.goalTitle} onChange={(event) => updateDraft('goalTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /><textarea rows={4} value={draft.goalBody} onChange={(event) => updateDraft('goalBody', event.target.value)} className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /></SectionEditor><SectionEditor title={KR.recruiting} checked={draft.showRecruiting} onCheckedChange={(value) => updateDraft('showRecruiting', value)}><input value={draft.recruitingTitle} onChange={(event) => updateDraft('recruitingTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /><textarea rows={4} value={draft.recruitingBody} onChange={(event) => updateDraft('recruitingBody', event.target.value)} className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /><ListBlock label="Recruiting highlights" items={draft.recruitingHighlights} onChange={(items) => updateDraft('recruitingHighlights', items)} /></SectionEditor><SectionEditor title={KR.workStyle} checked={draft.showWorkStyle} onCheckedChange={(value) => updateDraft('showWorkStyle', value)}><input value={draft.workStyleTitle} onChange={(event) => updateDraft('workStyleTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /><textarea rows={4} value={draft.workStyleBody} onChange={(event) => updateDraft('workStyleBody', event.target.value)} className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /><ListBlock label="Work style list" items={draft.workStyleItems} onChange={(items) => updateDraft('workStyleItems', items)} /></SectionEditor><SectionEditor title={KR.rules} checked={draft.showRules} onCheckedChange={(value) => updateDraft('showRules', value)}><input value={draft.rulesTitle} onChange={(event) => updateDraft('rulesTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /><textarea rows={4} value={draft.rulesBody} onChange={(event) => updateDraft('rulesBody', event.target.value)} className="w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /><ListBlock label="Rules list" items={draft.rulesItems} onChange={(items) => updateDraft('rulesItems', items)} /></SectionEditor><SectionEditor title={KR.links} checked={draft.showLinks} onCheckedChange={(value) => updateDraft('showLinks', value)}><input value={draft.linksTitle} onChange={(event) => updateDraft('linksTitle', event.target.value)} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /></SectionEditor></div> : null}
        {activeEditorTab === 'links' ? <div className="space-y-5"><div className="flex items-center justify-between gap-4"><p className="text-sm font-medium text-campus-800">Links</p><Button type="button" variant="ghost" onClick={() => setDraftLinks((current) => [...current, { label: '', url: '', iconKey: 'link' }])}>+</Button></div><div className="space-y-3">{draftLinks.map((link, index) => <div key={`${link.id ?? 'new'}-${index}`} className="space-y-3 rounded-[28px] border border-campus-200 bg-campus-50/60 p-5"><div className="flex gap-2"><input value={link.label} onChange={(event) => updateLink(index, { label: event.target.value })} className="min-h-[3rem] flex-1 rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /><select value={link.iconKey} onChange={(event) => updateLink(index, { iconKey: event.target.value as TeamOverviewLinkIconKey })} className="min-h-[3rem] rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm">{LINK_ICON_OPTIONS.map((iconKey) => <option key={iconKey} value={iconKey}>{OVERVIEW_ICON_LABELS[iconKey]}</option>)}</select></div><input value={link.url} onChange={(event) => updateLink(index, { url: event.target.value })} className="min-h-[3rem] w-full rounded-2xl border border-campus-200 bg-white px-4 py-3 text-sm" /></div>)}</div></div> : null}</div></div><div className="min-h-0 overflow-y-auto bg-campus-50/60 p-5 sm:p-6"><Card className={cn('space-y-4 rounded-[28px] shadow-card', theme.card)}><h4 className="text-xl font-semibold tracking-tight text-campus-900">Preview</h4><p className="text-4xl">{draft.emoji || '\u{1F680}'}</p><p className="text-sm text-campus-600">{heroSubtitle}</p><div className="flex flex-wrap gap-2">{heroTags.map((tag) => <span key={tag} className="rounded-full border border-campus-200 px-3 py-1 text-xs text-campus-700">{tag}</span>)}</div></Card></div></div></div></div> : null}
      <TeamDeleteConfirmModal open={deleteOpen} teamName={team.name} isSubmitting={isDeletingTeam} errorMessage={deleteErrorMessage} onClose={() => setDeleteOpen(false)} onConfirm={onDeleteTeam} />
    </>
  )
}
