import React from 'react'
import { P, NAV, Screen } from '../tokens'
import { Icon } from '../components/Icon'
import dayjs from 'dayjs'
import 'dayjs/locale/ar'

dayjs.locale('ar')

interface TopbarProps {
  active: Screen
}

export function Topbar({ active }: TopbarProps) {
  const nav = NAV.find(n => n.id === active)
  const now = dayjs().format('dddd، D MMMM YYYY')

  return (
    <header style={{
      height: P.topbarH,
      background: 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      borderBottom: `1px solid ${P.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {nav && <Icon name={nav.icon} size={22} color={P.purple} />}
        <h1 style={{ fontSize: 16, fontWeight: 700, color: P.plum }}>{nav?.label || ''}</h1>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 12, color: P.muted }}>{now}</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          background: '#ecfdf5', color: P.green,
          padding: '4px 10px', borderRadius: 20,
          fontSize: 11, fontWeight: 600
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 3, background: P.green }} />
          غير متصل
        </span>
      </div>
    </header>
  )
}
