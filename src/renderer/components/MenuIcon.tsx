import React from 'react'
import { getMenuIcon } from './menuIcons'

interface MenuIconProps {
  id: string | null | undefined
  size?: number
  style?: React.CSSProperties
}

/**
 * Renders a menu item icon — either a multicolor SVG from the icon library,
 * or falls back to displaying raw emoji/text for legacy items.
 */
export function MenuIcon({ id, size = 24, style }: MenuIconProps) {
  const icon = getMenuIcon(id)

  if (icon) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        style={{ flexShrink: 0, ...style }}
        dangerouslySetInnerHTML={{ __html: icon.svg }}
      />
    )
  }

  // Fallback: render raw text (legacy emoji like ☕ 🍰)
  return (
    <span style={{ fontSize: size * 0.85, lineHeight: 1, flexShrink: 0, ...style }}>
      {id || '🍮'}
    </span>
  )
}
