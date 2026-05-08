import { P } from '../../tokens'

interface ScrollableTabsProps {
  tabs: { id: string; label: string }[]
  active: string
  onChange: (id: string) => void
}

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
              className="momo-tab"
              style={{
                padding: '8px 16px',
                borderRadius: 9,
                border: 'none',
                background: isA ? P.surface : 'transparent',
                color: isA ? P.purple : P.muted,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isA ? 800 : 500,
                boxShadow: isA ? '0 1px 6px rgba(88,28,135,.10)' : 'none',
                fontFamily: 'Cairo, sans-serif',
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
