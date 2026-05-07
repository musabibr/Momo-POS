import { CSSProperties, ReactNode } from 'react'

interface CardGridProps {
  children: ReactNode
  /** Minimum column width before the grid wraps. Defaults to 240px (card content). */
  min?: number
  /** Grid gap. Default: 14px. */
  gap?: number
  style?: CSSProperties
}

/**
 * Auto-fitting grid for medium content cards (employee cards, supplier cards,
 * variation/modifier groups, customer profile cards, etc.).
 *
 * Replaces every fixed `'1fr 1fr'` and `'repeat(N, 1fr)'` that doesn't reflow.
 */
export function CardGrid({ children, min = 240, gap = 14, style }: CardGridProps) {
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
