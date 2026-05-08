import { P } from '../tokens'

/**
 * Unified loading spinner for all screens and tabs.
 * Prevents "empty state flash" while async data is being fetched.
 * Use this everywhere data is loading to maintain visual consistency.
 */
export function LoadingPlaceholder({ height }: { lines?: number; height?: number | string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flex: 1, minHeight: height || 180, gap: 10,
    }}>
      <div className="momo-spinner" />
      <span style={{ fontSize: 14, color: P.muted, fontWeight: 600 }}>جاري التحميل…</span>
    </div>
  )
}
