import React from 'react'
import { IC } from '../tokens'

interface IconProps {
  name: string
  size?: number
  color?: string
  style?: React.CSSProperties
  onClick?: (e?: any) => void
}

export function Icon({ name, size = 18, color = 'currentColor', style, onClick }: IconProps) {
  const path = IC[name]
  if (!path) return <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0, ...style }} />
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ cursor: onClick ? 'pointer' : undefined, flexShrink: 0, ...style }}
      onClick={onClick}
    >
      <path d={path} stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
