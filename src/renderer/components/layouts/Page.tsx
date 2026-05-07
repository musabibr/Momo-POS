import { CSSProperties, ReactNode } from 'react'
import { P } from '../../tokens'
import { ScrollArea } from './ScrollArea'

interface PageProps {
  /** Module title (Arabic). */
  title?: string
  /** Subtitle / count below the title. */
  subtitle?: string
  /** Right-aligned action area (in RTL: visually right; logically end of header). */
  actions?: ReactNode
  /** Optional content rendered above the scrollable body — sticks to header (e.g. tab bar). */
  toolbar?: ReactNode
  /** Body content. Wrapped in ScrollArea unless `scrollable={false}`. */
  children: ReactNode
  /** Whether the body should be wrapped in a ScrollArea. Default: true. */
  scrollable?: boolean
  /** Optional padding override. Default: 20px. */
  pad?: number
  style?: CSSProperties
}

/**
 * Standard module shell.
 *
 * Provides:
 *   - Title + subtitle + actions header row (wraps on narrow viewports)
 *   - Optional sticky toolbar slot (TabBar / filter pills)
 *   - ScrollArea body that handles overflow correctly
 *   - `min-height: 0` chain so the inner ScrollArea actually scrolls
 *
 * Replaces ~12 lines of repeated boilerplate that every screen had.
 */
export function Page({
  title,
  subtitle,
  actions,
  toolbar,
  children,
  scrollable = true,
  pad = 20,
  style,
}: PageProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        padding: pad,
        gap: 16,
        ...style,
      }}
    >
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
            flexShrink: 0,
          }}
        >
          {title && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: P.plum }}>{title}</div>
              {subtitle && <div style={{ fontSize: 13, color: P.muted, marginTop: 2 }}>{subtitle}</div>}
            </div>
          )}
          {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
        </div>
      )}

      {toolbar && <div style={{ flexShrink: 0 }}>{toolbar}</div>}

      {scrollable ? (
        <ScrollArea>{children}</ScrollArea>
      ) : (
        <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      )}
    </div>
  )
}
