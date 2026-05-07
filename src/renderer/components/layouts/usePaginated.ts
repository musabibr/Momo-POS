import { useMemo, useState, useEffect } from 'react'

export interface Paginated<T> {
  page: number
  setPage: (n: number) => void
  pageRows: T[]
  totalPages: number
  total: number
  pageSize: number
  setPageSize: (n: number) => void
  startIndex: number
  endIndex: number
}

/**
 * Pagination hook for in-memory lists.
 *
 *   const { pageRows, page, totalPages, setPage } = usePaginated(rows, 50)
 *   {pageRows.map(...)}
 *   <Pagination page={page} totalPages={totalPages} onChange={setPage} />
 *
 * Resets to page 1 when the input array length changes (filter applied, etc.).
 * Use a stable input array reference to avoid pointless resets.
 */
export function usePaginated<T>(rows: T[], initialPageSize = 50): Paginated<T> {
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [page, setPage] = useState(1)

  // Reset page when row count changes (filter, search, etc.)
  useEffect(() => {
    setPage(1)
  }, [rows.length])

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)

  const { pageRows, startIndex, endIndex } = useMemo(() => {
    const start = (safePage - 1) * pageSize
    const end = Math.min(start + pageSize, total)
    return { pageRows: rows.slice(start, end), startIndex: start, endIndex: end }
  }, [rows, safePage, pageSize, total])

  return {
    page: safePage,
    setPage,
    pageRows,
    totalPages,
    total,
    pageSize,
    setPageSize,
    startIndex,
    endIndex,
  }
}
