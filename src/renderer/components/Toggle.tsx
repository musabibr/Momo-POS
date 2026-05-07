import React from 'react'
import { P } from '../tokens'

interface ToggleProps {
  value: boolean
  onChange: (value: boolean) => void
}

export function Toggle({ value, onChange }: ToggleProps) {
  return (
    <button onClick={() => onChange(!value)} className="momo-toggle" style={{
      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
      background: value ? 'linear-gradient(135deg,#9333ea,#7c3aed)' : P.borderM, position: 'relative', flexShrink: 0
    }}>
      <div className="momo-toggle-knob" style={{
        position: 'absolute', top: 3, right: value ? 22 : 3, width: 18, height: 18, borderRadius: '50%',
        background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,.18)'
      }} />
    </button>
  )
}
