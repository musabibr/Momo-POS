import React from 'react'
import { P } from '../tokens'

interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  onClick?: () => void
  hover?: boolean
  className?: string
}

export function Card({ children, style, onClick, hover, className }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`momo-card${hover ? ' momo-card-hover' : ''}${className ? ` ${className}` : ''}`}
      style={{
        background: P.surface, borderRadius: 16, border: `1px solid ${P.border}`,
        boxShadow: '0 1px 4px rgba(88,28,135,.05)',
        cursor: onClick ? 'pointer' : 'default', ...style
      }}
    >
      {children}
    </div>
  )
}
