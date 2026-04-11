export const TEAM_LIST_PAGE_SIZE = 10
export const TEAM_LIST_PAGE_GROUP_SIZE = 10

export type RecruitingFilterValue = 'all' | 'true' | 'false'

export function normalizeTeamListParam(value: string | null) {
  return value?.trim() ?? ''
}

export function parseTeamListPageParam(value: string | null) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}

export function parseRecruitingParam(value: string | null): boolean | null {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return null
}

export function toRecruitingFilterValue(value: boolean | null): RecruitingFilterValue {
  if (value === true) {
    return 'true'
  }

  if (value === false) {
    return 'false'
  }

  return 'all'
}

export function parseRecruitingFilterValue(value: string): boolean | null {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return null
}

export function buildTeamListSearchParams(params: {
  page: number
  search: string
  category: string
  recruiting: boolean | null
}) {
  const searchParams = new URLSearchParams()

  if (params.page > 1) {
    searchParams.set('page', String(params.page))
  }

  if (params.search) {
    searchParams.set('search', params.search)
  }

  if (params.category) {
    searchParams.set('category', params.category)
  }

  if (params.recruiting !== null) {
    searchParams.set('recruiting', params.recruiting ? 'true' : 'false')
  }

  return searchParams
}

export function getPaginationGroup(params: {
  currentPage: number
  totalPages: number
  groupSize?: number
}) {
  const { currentPage, totalPages, groupSize = TEAM_LIST_PAGE_GROUP_SIZE } = params

  if (totalPages <= 0) {
    return {
      pages: [] as number[],
      groupStartPage: 1,
      groupEndPage: 0,
      currentGroup: 1,
      totalGroups: 0,
    }
  }

  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)
  const currentGroup = Math.ceil(safeCurrentPage / groupSize)
  const totalGroups = Math.ceil(totalPages / groupSize)
  const groupStartPage = (currentGroup - 1) * groupSize + 1
  const groupEndPage = Math.min(groupStartPage + groupSize - 1, totalPages)
  const pages = Array.from({ length: groupEndPage - groupStartPage + 1 }, (_, index) => groupStartPage + index)

  return {
    pages,
    groupStartPage,
    groupEndPage,
    currentGroup,
    totalGroups,
  }
}
