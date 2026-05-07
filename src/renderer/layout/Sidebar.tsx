import React from 'react'
import { P, NAV, Screen, Role, navForRole, NavSlot } from '../tokens'
import { Icon } from '../components/Icon'

const ROLE_LABELS: Record<string, string> = {
  admin: 'مسؤول', manager: 'مدير', cashier: 'كاشير', kitchen: 'مطبخ'
}
const ROLE_COLORS: Record<string, string> = {
  admin: P.purple, manager: P.pink, cashier: P.green, kitchen: P.gold
}

interface SidebarProps {
  active: Screen
  onChange: (s: Screen) => void
  collapsed?: boolean
  role: string
  permissions?: string[]
  employee?: { id: number; name: string; role: string }
  onLogout?: () => void
}

export function Sidebar({ active, onChange, collapsed, role, permissions, employee, onLogout }: SidebarProps) {
  const visibleNav = navForRole(role, permissions)

  return (
    <div className="app-sidebar sidebar-grad" style={{
      width: collapsed ? 80 : P.sidebarW, flexShrink: 0, borderLeft: `1px solid ${P.border}`,
      display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', transition: 'width .3s', position: 'relative', zIndex: 10,
      direction: 'rtl'
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: `1px solid ${P.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: collapsed ? 'center' : 'flex-start' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#9333ea,#db2777)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 14px rgba(147,51,234,.35)' }}>
            <Icon name="spark" size={18} color="#fff" />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <div style={{ fontSize: 20, fontWeight: 900, color: P.purple, letterSpacing: -1, lineHeight: 1 }}>Momo</div>
            </div>
          )}
        </div>
      </div>
      {/* Nav — filtered by role */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {visibleNav.map((n: NavSlot) => {
          const isA = active === n.id;
          return (
            <button key={n.id} onClick={() => onChange(n.id as Screen)} className="nav-btn"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 11px', borderRadius: 11, border: 'none',
                background: isA ? `${n.accent}14` : 'transparent', color: isA ? n.accent : P.muted,
                cursor: 'pointer', textAlign: 'right', fontSize: 16, fontWeight: isA ? 800 : 400,
                fontFamily: 'Tajawal,sans-serif', boxShadow: isA ? `inset 0 0 0 1px ${n.accent}30` : 'none',
                justifyContent: collapsed ? 'center' : 'flex-start'
              }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: isA ? `${n.accent}18` : 'transparent', flexShrink: 0,
                boxShadow: isA ? `0 2px 8px ${n.accent}30` : 'none'
              }}>
                <Icon name={n.icon} size={16} color={isA ? n.accent : P.muted} />
              </div>
              {!collapsed && <span className="nav-label" style={{ whiteSpace: 'nowrap' }}>{n.label}</span>}
              {isA && !collapsed && <div className="nav-label" style={{ marginRight: 'auto', width: 5, height: 5, borderRadius: '50%', background: n.accent }} />}
            </button>
          );
        })}
      </nav>
      {/* Footer — current employee + logout */}
      <div className="sidebar-footer" style={{ padding: '12px 16px', borderTop: `1px solid ${P.border}`, flexShrink: 0 }}>
        {!collapsed ? (
          <>
            {employee && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: `${ROLE_COLORS[employee.role] || P.muted}20`,
                  border: `1.5px solid ${ROLE_COLORS[employee.role] || P.muted}50`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 800, color: ROLE_COLORS[employee.role] || P.muted, flexShrink: 0
                }}>{employee.name?.[0] || '?'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: P.plum, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee.name}</div>
                  <div style={{ fontSize: 11, color: ROLE_COLORS[employee.role] || P.muted, fontWeight: 600 }}>{ROLE_LABELS[employee.role] || employee.role}</div>
                </div>
                {onLogout && (
                  <button onClick={onLogout} title="تسجيل الخروج" style={{
                    background: `${P.rose}10`, border: `1px solid ${P.roseL}60`, borderRadius: 7,
                    width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', flexShrink: 0
                  }}>
                    <Icon name="lock" size={12} color={P.rose} />
                  </button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: P.muted }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: P.green, boxShadow: `0 0 6px ${P.green}66` }} />
              غير متصل · آمن
            </div>
          </>
        ) : (
          <>
            {onLogout && (
              <button onClick={onLogout} title="تسجيل الخروج" style={{
                background: `${P.rose}10`, border: `1px solid ${P.roseL}60`, borderRadius: 7,
                width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', margin: '0 auto 6px'
              }}>
                <Icon name="lock" size={12} color={P.rose} />
              </button>
            )}
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: P.green, boxShadow: `0 0 6px ${P.green}66`, margin: '0 auto' }} />
          </>
        )}
      </div>
    </div>
  )
}
