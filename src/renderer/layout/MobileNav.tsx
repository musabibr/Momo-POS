import React from 'react'
import { P, NAV, Screen } from '../tokens'
import { Icon } from '../components/Icon'

interface MobileNavProps {
  active: Screen
  onChange: (s: Screen) => void
}

export function MobileNav({ active, onChange }: MobileNavProps) {
  const allowed = NAV.slice(0, 5)
  return (
    <div className="mobile-nav">
      {allowed.map(n => {
        const isA = active === n.id
        return (
          <button key={n.id} onClick={() => onChange(n.id as Screen)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '4px 8px', borderRadius: 10, border: 'none', background: 'transparent',
              cursor: 'pointer', color: isA ? n.accent : P.faint,
              fontFamily: 'Cairo, sans-serif', fontSize: 10, fontWeight: isA ? 700 : 400
            }}>
            <Icon name={n.icon} size={20} color={isA ? n.accent : P.faint} />
            <span>{n.label.split(' ')[0]}</span>
          </button>
        )
      })}
    </div>
  )
}
