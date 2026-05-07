import React from 'react'
import { P } from '../tokens'
import { Icon } from './Icon'

interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  width?: number
  icon?: string
  open?: boolean // Adding open for compat with existing React code
}

export function Modal({ title, onClose, children, width = 440, icon, open = true }: ModalProps) {
  if (!open) return null
  return (
    <div
      className="momo-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(26,10,46,.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 400,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="momo-modal-panel"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.key === 'Escape' && onClose()}
        style={{
          background: P.surface,
          borderRadius: 20,
          width: `min(${width}px, calc(100vw - 32px))`,
          maxHeight: 'calc(100vh - 32px)',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          boxShadow: '0 24px 80px rgba(88,28,135,.22)',
          border: `1px solid ${P.borderM}`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 22px 14px',
            borderBottom: `1px solid ${P.border}`,
            flexShrink: 0,
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {icon && (
              <div style={{ width: 34, height: 34, borderRadius: 10, background: P.ghost, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={icon} size={18} color={P.purple} />
              </div>
            )}
            <span id="modal-title" style={{ fontWeight: 800, fontSize: 19, color: P.plum, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="momo-btn"
            style={{ width: 32, height: 32, borderRadius: 9, border: 'none', background: P.bg2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = P.bg3)}
            onMouseLeave={e => (e.currentTarget.style.background = P.bg2)}
          >
            <Icon name="close" size={16} color={P.muted} />
          </button>
        </div>
        <div style={{ padding: '18px 22px 22px', overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
