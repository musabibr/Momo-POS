import React from 'react'
import { P } from '../tokens'

export function ProductImage({ item, size = 56, borderRadius = 12 }: { item: any, size?: number, borderRadius?: number }) {
  if (item.image) return (
    <img src={item.image} alt={item.name}
      style={{ width: size, height: size, borderRadius, objectFit: 'cover', flexShrink: 0 }}
      onError={(e: any) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
  );
  return (
    <div style={{
      width: size, height: size, borderRadius, background: `linear-gradient(135deg,${P.bg3},${P.purpleXL})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, flexShrink: 0
    }}>
      {item.emoji || '🍮'}
    </div>
  );
}
