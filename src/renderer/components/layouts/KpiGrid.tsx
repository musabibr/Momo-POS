import { CSSProperties, ReactNode } from 'react'

interface KpiGridProps {
  children: ReactNode
  /** Minimum column width before the grid wraps. Defaults to 160px (KPI cards). */
  min?: number
  /** Grid gap. Default: 12px. */
  gap?: number
  style?: CSSProperties
}

/**
 * Auto-fitting grid for KPI cards.
 *
 * `grid-template-columns: repeat(auto-fill, minmax(min, 1fr))` reflows from
 * 6 columns at desktop down to 1 column at narrow widths automatically.
 * Replaces every `gridTemplateColumns: 'repeat(4, 1fr)'` and similar fixed
 * column counts that don't reflow on small screens.
 */
export function KpiGrid({ children, min = 160, gap = 12, style }: KpiGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${min}px, 1fr))`,
        gap,
        alignContent: 'start',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
