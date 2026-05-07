import React, { useState, useEffect } from 'react'
import { P } from '../tokens'

interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error' | 'info'
}

let _setToasts: React.Dispatch<React.SetStateAction<ToastMessage[]>> | null = null
let _toastId = 0

export function toast(text: string, type: 'success' | 'error' | 'info' = 'success') {
  if (_setToasts) {
    const id = ++_toastId
    _setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => {
      _setToasts?.(prev => prev.filter(t => t.id !== id))
    }, 2600)
  }
}

export function ToastHost() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    _setToasts = setToasts
    return () => { _setToasts = null }
  }, [])

  const colors = {
    success: { bg: '#ecfdf5', border: '#a7f3d0', color: P.green },
    error: { bg: '#fef2f2', border: '#fecaca', color: P.rose },
    info: { bg: P.ghost, border: P.border, color: P.purple }
  }

  return (
    <div style={{
      position: 'fixed', top: 60, insetInlineEnd: 20, zIndex: 2000,
      display: 'flex', flexDirection: 'column', gap: 8
    }}>
      {toasts.map(t => {
        const c = colors[t.type]
        return (
          <div key={t.id} style={{
            background: c.bg, border: `1px solid ${c.border}`, color: c.color,
            padding: '10px 18px', borderRadius: P.radiusSm,
            fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            animation: 'slideIn .3s cubic-bezier(.34,1.56,.64,1)',
            minWidth: 200
          }}>
            {t.text}
          </div>
        )
      })}
    </div>
  )
}
