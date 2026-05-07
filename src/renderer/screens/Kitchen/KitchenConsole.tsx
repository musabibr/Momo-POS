import { useState, useEffect } from 'react'
import { P } from '../../tokens'
import { Icon } from '../../components/Icon'
import { TicketsPanel } from './TicketsPanel'
import { KitchenStockPanel } from './KitchenStockPanel'
import { ProductionPanel } from './ProductionPanel'
import { TransfersPanel } from './TransfersPanel'
import { DamagePanel } from './DamagePanel'

const api = (window as any).api

type KitchenTab = 'tickets' | 'stock' | 'production' | 'transfers' | 'damage'

/**
 * KitchenConsole — premium kitchen hub with live stats header.
 */
export function KitchenConsole() {
  const [self, setSelf] = useState<any>(null)
  const [tab, setTab] = useState<KitchenTab>('stock')
  const [stats, setStats] = useState({ totalItems: 0, lowItems: 0, premadeCount: 0, todayTickets: 0 })

  useEffect(() => {
    const init = async () => {
      try {
        const session = await api?.session?.current?.()
        setSelf(session?.employee || session || null)
      } catch {}
      loadStats()
    }
    init()
  }, [])

  const loadStats = async () => {
    try {
      const [stock, tickets] = await Promise.all([
        api?.kitchen?.getStock?.(),
        api?.kitchen?.todaysTickets?.()
      ])
      const s = Array.isArray(stock) ? stock : []
      setStats({
        totalItems: s.length,
        lowItems: s.filter((i: any) => {
          const th = i.low_threshold || 0
          return th > 0 && (i.kitchen_stock || 0) <= th
        }).length,
        premadeCount: s.filter((i: any) => i.type === 'premade').length,
        todayTickets: Array.isArray(tickets) ? tickets.length : 0
      })
    } catch {}
  }

  // Refresh stats when tab changes (lightweight)
  useEffect(() => { loadStats() }, [tab])

  const tabs: { id: KitchenTab; label: string; icon: string; accent?: string }[] = [
    { id: 'stock', label: 'المخزون', icon: 'box' },
    { id: 'production', label: 'الإنتاج', icon: 'spark' },
    { id: 'tickets', label: 'الطلبات', icon: 'layers' },
    { id: 'transfers', label: 'التحويلات', icon: 'sync' },
    { id: 'damage', label: 'التالف', icon: 'alert', accent: P.rose },
  ]

  const statCards: { label: string; value: number; color: string; bg: string; icon: string }[] = [
    { label: 'إجمالي المواد', value: stats.totalItems, color: P.purple, bg: P.purpleXL, icon: 'box' },
    { label: 'منخفض المخزون', value: stats.lowItems, color: P.rose, bg: P.roseXL, icon: 'alert' },
    { label: 'منتجات جاهزة', value: stats.premadeCount, color: P.gold, bg: P.goldXL, icon: 'star' },
    { label: 'طلبات اليوم', value: stats.todayTickets, color: P.green, bg: P.greenXL, icon: 'layers' },
  ]

  return (
    <div style={{ padding: '16px 20px', height: '100%', display: 'flex', flexDirection: 'column', gap: 12, direction: 'rtl' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 12,
            background: P.purpleGrad, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 12px ${P.purple}30`
          }}>
            <Icon name="box" size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: P.plum, lineHeight: 1.1 }}>المطبخ</div>
            <div style={{ fontSize: 11, color: P.muted, fontWeight: 500 }}>{self?.name || '—'}</div>
          </div>
        </div>
      </div>

      {/* ── Live Stats Strip ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: s.bg, borderRadius: 12, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 10,
            border: `1px solid ${s.color}18`,
            transition: 'transform .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={s.icon} size={15} color={s.color} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: s.color, fontWeight: 600, opacity: .7 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        display: 'flex', gap: 2, background: P.bg2, borderRadius: 14, padding: 3,
        border: `1px solid ${P.border}`
      }}>
        {tabs.map(t => {
          const active = tab === t.id
          const accent = t.accent || P.purple
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flex: 1, padding: '9px 6px', borderRadius: 11, border: 'none',
              background: active ? P.surface : 'transparent',
              color: active ? accent : P.muted, cursor: 'pointer',
              fontWeight: active ? 800 : 500, fontSize: 13, fontFamily: 'Tajawal,sans-serif',
              boxShadow: active ? `0 1px 6px ${accent}15` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              transition: 'all .15s ease',
            }}>
              <Icon name={t.icon} size={13} color={active ? accent : P.faint} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Panel Content ── */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {tab === 'stock' && <KitchenStockPanel />}
        {tab === 'production' && <ProductionPanel />}
        {tab === 'tickets' && <TicketsPanel />}
        {tab === 'transfers' && <TransfersPanel />}
        {tab === 'damage' && <DamagePanel />}
      </div>
    </div>
  )
}
