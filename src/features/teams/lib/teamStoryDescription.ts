export type TeamStoryField = 'direction' | 'workflow' | 'operation'

export type TeamStoryDraft = Record<TeamStoryField, string>

const STORY_SECTIONS: Array<{ key: TeamStoryField; title: string }> = [
  { key: 'direction', title: '팀의 방향' },
  { key: 'workflow', title: '협업 방식' },
  { key: 'operation', title: '운영 현황' },
]

function normalize(value: string | null | undefined) {
  return value?.trim() ?? ''
}

function splitFallbackText(value: string) {
  const normalized = normalize(value).replace(/\r\n/g, '\n')
  if (!normalized) return []

  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length > 1) return paragraphs.slice(0, STORY_SECTIONS.length)

  const sentences = normalized
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  if (sentences.length <= 1) return [normalized]

  const chunkSize = Math.max(1, Math.ceil(sentences.length / STORY_SECTIONS.length))

  return Array.from({ length: Math.ceil(sentences.length / chunkSize) }, (_, index) =>
    sentences.slice(index * chunkSize, (index + 1) * chunkSize).join(' '),
  ).slice(0, STORY_SECTIONS.length)
}

export function splitTeamStoryDescription(value: string | null | undefined): TeamStoryDraft {
  const normalized = (value ?? '').replace(/\r\n/g, '\n')
  const draft: TeamStoryDraft = {
    direction: '',
    workflow: '',
    operation: '',
  }

  if (!normalized.trim()) {
    return draft
  }

  let activeKey: TeamStoryField | null = null
  let hasSectionHeading = false

  for (const line of normalized.split('\n')) {
    const trimmedLine = line.trim()
    const section = STORY_SECTIONS.find((item) => item.title === trimmedLine)

    if (section) {
      activeKey = section.key
      hasSectionHeading = true
      continue
    }

    if (!activeKey) {
      continue
    }

    draft[activeKey] = [draft[activeKey], line].filter(Boolean).join('\n')
  }

  if (hasSectionHeading) {
    return {
      direction: draft.direction.replace(/^\n+/, ''),
      workflow: draft.workflow.replace(/^\n+/, ''),
      operation: draft.operation.replace(/^\n+/, ''),
    }
  }

  const fallbackBlocks = splitFallbackText(normalized)

  return {
    direction: fallbackBlocks[0] ?? '',
    workflow: fallbackBlocks[1] ?? '',
    operation: fallbackBlocks[2] ?? '',
  }
}

export function buildTeamStoryDescription(draft: TeamStoryDraft) {
  return STORY_SECTIONS
    .map((section) => {
      const body = draft[section.key]?.replace(/\r\n/g, '\n') ?? ''
      if (!body.trim()) return ''

      return body ? `${section.title}\n${body}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}
