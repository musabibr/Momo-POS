import { P } from '../../tokens'
import { Btn } from '../Btn'
import { Icon } from '../Icon'

interface PaginationProps {
  page: number
  totalPages: number
  onChange: (n: number) => void
  /** Optional total count for the "showing X–Y of Z" label. */
  total?: number
  startIndex?: number
  endIndex?: number
}

/**
 * Pagination controls for in-memory lists. Pairs with `usePaginated`.
 *
 * Renders: «  page X / Y  » plus an optional row-count label.
 * Hides itself when there's only one page (no clutter).
 */
export function Pagination({ page, totalPages, onChange, total, startIndex, endIndex }: PaginationProps) {
  if (totalPages <= 1) return null

  const canPrev = page > 1
  const canNext = page < totalPages
  const showRange = total != null && startIndex != null && endIndex != null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '8px 4px',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      {showRange ? (
        <div style={{ fontSize: 12, color: P.muted, fontWeight: 600 }}>
          عرض <span style={{ color: P.purple, fontWeight: 800 }}>{startIndex! + 1}–{endIndex}</span> من{' '}
          <span style={{ color: P.purple, fontWeight: 800 }}>{total}</span>
        </div>
      ) : (
        <div />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Btn
          variant="secondary"
          size="sm"
          onClick={() => canPrev && onChange(page - 1)}
          disabled={!canPrev}
        >
          <Icon name="chevR" size={14} color={P.purple} />
          السابق
        </Btn>
        <div
          style={{
            padding: '6px 14px',
            borderRadius: 9,
            background: P.bg2,
            border: `1.5px solid ${P.border}`,
            fontSize: 13,
            fontWeight: 700,
            color: P.plum,
            minWidth: 80,
            textAlign: 'center',
          }}
        >
          {page} / {totalPages}
        </div>
        <Btn
          variant="secondary"
          size="sm"
          onClick={() => canNext && onChange(page + 1)}
          disabled={!canNext}
        >
          التالي
          <Icon name="chevD" size={14} color={P.purple} style={{ transform: 'rotate(90deg)' }} />
        </Btn>
      </div>
    </div>
  )
}
