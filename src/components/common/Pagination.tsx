import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PaginationProps {
  currentPage: number
  totalItems: number
  pageSize?: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const page = Math.min(Math.max(1, currentPage), totalPages)

  const startItem = totalItems === 0 ? 0 : (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (page > 3) pages.push('ellipsis')

      const start = Math.max(2, page - 1)
      const end = Math.min(totalPages - 1, page + 1)
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i)
      }

      if (page < totalPages - 2) pages.push('ellipsis')
      if (!pages.includes(totalPages)) pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 py-3 text-xs sm:text-sm ${className}`}>
      {/* Entries Info */}
      <div className="text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{startItem}</span> to{' '}
        <span className="font-semibold text-foreground">{endItem}</span> of{' '}
        <span className="font-semibold text-foreground">{totalItems}</span> entries
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Page size dropdown (if handler provided) */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
            <span>Show</span>
            <select
              aria-label="Items per page"
              className="h-8 rounded-md border bg-background px-2 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={pageSize}
              onChange={e => {
                onPageSizeChange(Number(e.target.value))
                onPageChange(1)
              }}
            >
              {pageSizeOptions.map(opt => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="First page"
            disabled={page <= 1}
            onClick={() => onPageChange(1)}
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, idx) =>
              p === 'ellipsis' ? (
                <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 min-w-[32px] px-2 text-xs font-medium"
                  aria-label={`Page ${p}`}
                  aria-current={p === page ? 'page' : undefined}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              )
            )}
          </div>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Next page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Last page"
            disabled={page >= totalPages}
            onClick={() => onPageChange(totalPages)}
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
