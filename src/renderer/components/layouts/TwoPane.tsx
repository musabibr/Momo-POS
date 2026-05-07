import { ReactNode, useState } from 'react'
import { P } from '../../tokens'
import { useViewport } from '../../ds/useViewport'
import { Btn } from '../Btn'

interface TwoPaneProps {
  /** The list pane (always visible at lgUp; visible when no detail selected at mdDown). */
  list: ReactNode
  /** The detail pane (visible at lgUp; replaces list at mdDown when `selected`). */
  detail: ReactNode
  /** Whether a detail item is currently selected (controls mdDown stacking). */
  selected: boolean
  /** Width of the detail pane at lgUp (default 320px). */
  detailWidth?: number
  /** Called when user taps "back" on the mobile detail view. */
  onBack?: () => void
  /** Optional label for the back button (default: "رجوع"). */
  backLabel?: string
}

/**
 * Two-pane layout (list + detail) that adapts to viewport width.
 *
 *   lgUp   (≥ 1280): both panes side by side. Detail pane is fixed-width at the
 *                    leading edge (left in RTL = visually left).
 *   mdDown (< 900):  ONE pane visible at a time. With no selection, list shows
 *                    full-width. With a selection, detail takes full width and a
 *                    "back" button appears in its top-left.
 *
 * Used by Customers, Recipes, Suppliers/POs.
 */
export function TwoPane({
  list,
  detail,
  selected,
  detailWidth = 320,
  onBack,
  backLabel = 'رجوع',
}: TwoPaneProps) {
  const { isNarrow } = useViewport()

  // Narrow: single-pane navigation
  if (isNarrow) {
    if (selected) {
      return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {onBack && (
            <div style={{ padding: '8px 12px', borderBottom: `1px solid ${P.border}`, flexShrink: 0, background: P.surface }}>
              <Btn variant="ghost" size="sm" icon="chevR" onClick={onBack}>{backLabel}</Btn>
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{detail}</div>
        </div>
      )
    }
    return <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{list}</div>
  }

  // Wide: side-by-side
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>{list}</div>
      <div
        style={{
          flexShrink: 0,
          width: detailWidth,
          background: P.surface,
          borderLeft: `1px solid ${P.border}`,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
        }}
      >
        {detail}
      </div>
    </div>
  )
}

/** Helper: detect "use stacked layout" without rendering TwoPane. Useful for
 *  callers that want to gate detail-only state machines. */
export function useTwoPaneNarrow(): boolean {
  return useViewport().isNarrow
}

// re-export for codes that don't import useState elsewhere
export { useState as useDetailState }
