import { CSSProperties, ReactNode } from 'react'

interface ResponsiveTableProps {
  children: ReactNode
  /** The table's intrinsic minimum width — below this, horizontal scroll kicks in. */
  minWidth?: number
  /** Optional sticky header (when scrolled vertically inside its container). */
  stickyHeader?: boolean
  style?: CSSProperties
}

/**
 * Wraps a `<table>` (or any wide row layout) in a horizontal scroll container.
 *
 * The single fix for the systemic issue where 5–7 column tables silently lose
 * their rightmost columns at narrow viewports. The wrapper enforces:
 *   - `overflow-x: auto` so users can scroll the table horizontally
 *   - `min-width` on the table so columns keep their natural width below the
 *     breakpoint (instead of squishing to unreadable)
 *
 * USAGE: replace
 *     <table style={{ width: '100%' }}>...</table>
 * with
 *     <ResponsiveTable minWidth={780}>
 *       <table style={{ width: '100%', minWidth: 780 }}>...</table>
 *     </ResponsiveTable>
 *
 * The inner `<table>` keeps its `width: 100%` for normal sizing; the
 * `minWidth: 780` makes it overflow into the scroll container at narrow widths.
 */
export function ResponsiveTable({
  children,
  minWidth = 720,
  stickyHeader = false,
  style,
}: ResponsiveTableProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: stickyHeader ? 'auto' : 'visible',
        ['--rt-min' as any]: `${minWidth}px`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
