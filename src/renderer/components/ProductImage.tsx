import React from 'react'
import { P } from '../tokens'
import { MenuIcon } from './MenuIcon'

/**
 * Renders a product image or icon for cart items, variation modals, etc.
 * Respects the item's display_mode: if 'image' and an image_path exists, show the image.
 * Otherwise, renders the SVG icon via MenuIcon (not raw text).
 */
export function ProductImage({ item, size = 56, borderRadius = 12 }: { item: any, size?: number, borderRadius?: number }) {
  const hasImage = item.image_path
  const displayMode = item.display_mode || 'icon'

  // Show image if display_mode is 'image' and an image source exists
  if (displayMode === 'image' && hasImage) {
    return (
      <div style={{ width: size, height: size, borderRadius, overflow: 'hidden', flexShrink: 0, position: 'relative', background: `linear-gradient(135deg,${P.bg3},${P.purpleXL})` }}>
        <img
          src={hasImage}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }}
          onError={(e: any) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex' }}
        />
        {/* Fallback icon if image fails to load */}
        <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, display: 'none', alignItems: 'center', justifyContent: 'center' }}>
          <MenuIcon id={item.emoji} size={size * 0.55} />
        </div>
      </div>
    )
  }

  // Icon mode (default): render MenuIcon SVG
  return (
    <div style={{
      width: size, height: size, borderRadius, background: `linear-gradient(135deg,${P.bg3},${P.purpleXL})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
    }}>
      <MenuIcon id={item.emoji} size={size * 0.55} />
    </div>
  )
}
