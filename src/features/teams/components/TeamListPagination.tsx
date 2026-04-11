import { Button } from '../../../components/ui/Button'
import { TEAM_LIST_PAGE_GROUP_SIZE, getPaginationGroup } from '../lib/teamListPagination'

interface TeamListPaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function TeamListPagination({
  currentPage,
  totalPages,
  onPageChange,
}: TeamListPaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  const { pages, groupStartPage, groupEndPage, currentGroup, totalGroups } = getPaginationGroup({
    currentPage,
    totalPages,
  })

  const previousGroupPage = Math.max(1, groupStartPage - TEAM_LIST_PAGE_GROUP_SIZE)
  const nextGroupPage = Math.min(totalPages, groupEndPage + 1)

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(1)}
      >
        처음
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={currentGroup <= 1}
        onClick={() => onPageChange(previousGroupPage)}
      >
        이전 10개
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        이전
      </Button>

      {pages.map((page) => (
        <Button
          key={page}
          type="button"
          size="sm"
          variant={page === currentPage ? 'primary' : 'ghost'}
          className={page === currentPage ? 'border-brand-500 bg-brand-600 text-white hover:bg-brand-600' : ''}
          onClick={() => onPageChange(page)}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </Button>
      ))}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        다음
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={currentGroup >= totalGroups}
        onClick={() => onPageChange(nextGroupPage)}
      >
        다음 10개
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(totalPages)}
      >
        마지막
      </Button>
    </div>
  )
}
