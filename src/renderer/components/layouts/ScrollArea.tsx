import { CSSProperties, ReactNode } from 'react'

interface ScrollAreaProps {
  children: ReactNode
  /** Override scroll axis. Default: vertical only. */
  axis?: 'y' | 'x' | 'both'
  /** Optional inline style override. */
  style?: CSSProperties
  className?: string
}

/**
 * Guaranteed-scrollable region inside a flex column.
 *
 * Solves the common bug where a chain of `overflow: hidden` parents (e.g. POS,
 * many module screens) prevent inner content from scrolling at all on short
 * viewports. ALWAYS wrap a list/table that may exceed its container in this
 * primitive — never rely on a child component to scroll itself.
 *
 * Critical detail: `min-height: 0` is what allows a flex child to actually
 * shrink and let `overflow: auto` kick in. Without it, flex items expand to
 * their content's intrinsic size and the scrollbar never appears.
 */
export function ScrollArea({ children, axis = 'y', style, className }: ScrollAreaProps) {
  const overflow =
    axis === 'y' ? { overflowY: 'auto' as const, overflowX: 'hidden' as const } :
    axis === 'x' ? { overflowX: 'auto' as const, overflowY: 'hidden' as const } :
    { overflow: 'auto' as const }
  return (
    <div
      className={className}
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        ...overflow,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
