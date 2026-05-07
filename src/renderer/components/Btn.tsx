import React from 'react'
import { P } from '../tokens'
import { Icon } from './Icon'

interface BtnProps {
  children?: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'pink' | 'success' | 'gold'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  icon?: string
  style?: React.CSSProperties
  fullWidth?: boolean
  block?: boolean
}

const VARS: Record<string, { bg: string; color: string; border: string; cls: string }> = {
  primary:   { bg: 'linear-gradient(135deg,#9333ea,#7c3aed)', color: '#fff', border: 'none', cls: 'btn-primary' },
  secondary: { bg: P.surface, color: P.purple, border: `1.5px solid ${P.borderM}`, cls: 'btn-secondary' },
  ghost:     { bg: 'transparent', color: P.mid, border: 'none', cls: 'btn-ghost' },
  danger:    { bg: 'linear-gradient(135deg,#e11d48,#be123c)', color: '#fff', border: 'none', cls: 'btn-danger' },
  pink:      { bg: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff', border: 'none', cls: 'btn-pink' },
  success:   { bg: 'linear-gradient(135deg,#047857,#065f46)', color: '#fff', border: 'none', cls: 'btn-success' },
  gold:      { bg: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff', border: 'none', cls: 'btn-gold' },
}

export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled = false, icon, style, fullWidth, block }: BtnProps) {
  const isFull = fullWidth || block
  const cfg = VARS[variant] || VARS.primary
  const pad = { sm: '6px 14px', md: '10px 20px', lg: '13px 28px' }[size]

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`momo-btn ${cfg.cls}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
        padding: pad, borderRadius: 11, fontSize: 14, fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1,
        fontFamily: 'Tajawal, sans-serif',
        background: cfg.bg, color: cfg.color, border: cfg.border,
        width: isFull ? '100%' : 'auto',
        ...style
      }}
    >
      {icon && <Icon name={icon} size={14} color={cfg.color} />}
      {children}
    </button>
  )
}
