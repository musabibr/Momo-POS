import React, { useState } from 'react'
import { P } from '../tokens'

interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
  hover?: boolean
  className?: string
}

export function Card({ children, style, onClick, hover, className }: CardProps) {
  const [hov, setHov] = useState(false)
  return (
    <div
      onClick={onClick}
      className={`momo-card${className ? ` ${className}` : ''}`}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        background: P.surface, borderRadius: 16, border: `1px solid ${hov ? P.borderM : P.border}`,
        boxShadow: hov ? '0 8px 32px rgba(88,28,135,.12)' : '0 1px 4px rgba(88,28,135,.05)',
        cursor: onClick ? 'pointer' : 'default', ...style
      }}
    >
      {children}
    </div>
  )
}
