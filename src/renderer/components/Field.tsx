import React from 'react'
import { P } from '../tokens'

interface FieldProps {
  label: string
  children: React.ReactNode
  required?: boolean
  hint?: string
  style?: React.CSSProperties
}

export function Field({ label, children, required, hint, style }: FieldProps) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <div style={{ fontSize: 13, color: P.muted, marginBottom: 6, fontWeight: 700, display: 'flex', gap: 4, alignItems: 'center' }}>
        {label}{required && <span style={{ color: P.pink }}> *</span>}
        {hint && <span style={{ color: P.faint, fontWeight: 400, fontSize: 12 }}>({hint})</span>}
      </div>
      {children}
    </div>
  )
}
