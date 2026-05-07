import { P } from '../../tokens'

interface ScrollableTabsProps {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}

/**
 * Horizontally-scrollable tab bar.
 *
 * The default `TabBar` becomes unusable above ~5 tabs at narrow widths because
 * each tab `flex: 1` shrinks below readability. This variant lays tabs out at
 * their natural width and scrolls horizontally when they overflow. Used by
 * Settings (7 tabs), Menu (5), Cash (4 + KPI bar), Inventory (≤4), Reports (4),
 * Shifts (4).
 *
 * Active tab uses the same surface/shadow treatment as TabBar for visual
 * consistency.
 */
export function ScrollableTabs({ tabs, active, onChange }: ScrollableTabsProps) {
  return (
    <div
      style={{
        background: P.bg2,
        borderRadius: 12,
        padding: 4,
        flexShrink: 0,
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
      <div style={{ display: 'flex', gap: 3, minWidth: 'max-content' }}>
        {tabs.map(t => {
          const isA = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 9,
                border: 'none',
                background: isA ? P.surface : 'transparent',
                color: isA ? P.purple : P.muted,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isA ? 800 : 400,
                boxShadow: isA ? '0 1px 6px rgba(88,28,135,.10)' : 'none',
                transition: 'background .15s ease, color .15s ease',
                fontFamily: 'Tajawal, sans-serif',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
