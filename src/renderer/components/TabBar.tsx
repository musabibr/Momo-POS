import React from 'react'
import { P } from '../tokens'

interface Tab {
  id: string
  label: string
}

interface TabBarProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div style={{ display: 'flex', background: P.bg2, borderRadius: 12, padding: 4, gap: 3, flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className="momo-tab"
          style={{
            flex: 1, padding: '10px 8px', borderRadius: 9, border: 'none',
            background: active === t.id ? P.surface : 'transparent',
            color: active === t.id ? P.purple : P.muted, cursor: 'pointer', fontSize: 15, fontWeight: active === t.id ? 800 : 500,
            boxShadow: active === t.id ? '0 1px 6px rgba(88,28,135,.10)' : 'none',
            fontFamily: 'Tajawal, sans-serif', whiteSpace: 'nowrap'
          }}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Badge({ label, color = P.purple, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 800, letterSpacing: .5, padding: '3px 9px', borderRadius: 99,
      background: bg || `${color}15`, color, border: `1px solid ${color}30`, textTransform: 'uppercase', flexShrink: 0
    }}>
      {label}
    </span>
  )
}
