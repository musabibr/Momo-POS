import { useState, useEffect, useMemo, useCallback } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { Inp } from '../../components/Inp'
import { Field } from '../../components/Field'
import { Badge } from '../../components/TabBar'
import { toast } from '../../components/Toast'
import { useKitchenStock } from '../../hooks/useKitchen'
import { ResponsiveTable, Pagination, usePaginated } from '../../components/layouts'

const api = (window as any).api
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const today = () => fmtDate(new Date())

export function DamagePanel() {
  const { stock, reload: reloadStock } = useKitchenStock()
  const [history, setHistory] = useState<any[]>([])
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Add damage modal state
  const [showAdd, setShowAdd] = useState(false)
  const [dmgItemId, setDmgItemId] = useState('')
  const [dmgQty, setDmgQty] = useState('')
  const [dmgReason, setDmgReason] = useState('')

  const loadHistory = useCallback(async () => {
    try {
      const filters: any = {}
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      const d = await api?.kitchen?.damageHistory?.(filters)
      setHistory(Array.isArray(d) ? d : [])
    } catch { setHistory([]) }
  }, [startDate, endDate])

  useEffect(() => { loadHistory() }, [loadHistory])

  const filtered = useMemo(() => {
    if (!search.trim()) return history
    const q = search.trim().toLowerCase()
    return history.filter((r: any) =>
      r.item_name?.toLowerCase().includes(q) || r.reason?.toLowerCase().includes(q)
    )
  }, [history, search])

  const paged = usePaginated(filtered, 15)
  const totalLoss = filtered.reduce((s, r) => s + Math.abs(r.quantity || 0), 0)

  const openAddForm = () => {
    setShowAdd(true)
    setDmgItemId('')
    setDmgQty('')
    setDmgReason('')
  }

  const reportDamage = async () => {
    const id = parseInt(dmgItemId)
    if (!id) { toast('اختر مادة'); return }
    const qty = parseFloat(dmgQty)
    if (isNaN(qty) || qty <= 0) { toast('أدخل كمية صالحة'); return }
    if (!dmgReason.trim()) { toast('أدخل سبب التلف'); return }
    try {
      await api?.kitchen?.reportDamage?.(id, qty, dmgReason.trim())
      toast('✓ تم تسجيل التلف')
      setShowAdd(false)
      reloadStock()
      loadHistory()
    } catch (err: any) { toast(err.message || 'خطأ') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: P.roseXL, border: `1px solid ${P.roseL}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="alert" size={14} color={P.rose} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: P.plum }}>سجل التالف</div>
            <div style={{ fontSize: 10, color: P.muted }}>{filtered.length} سجل · إجمالي الخسارة: {totalLoss.toLocaleString()}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: 150 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث..."
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 10,
                border: `1.5px solid ${P.border}`, background: P.surface,
                fontSize: 11, fontFamily: 'Cairo,sans-serif', color: P.ink,
                outline: 'none', direction: 'rtl', paddingRight: 28
              }}
              onFocus={e => e.currentTarget.style.borderColor = P.rose}
              onBlur={e => e.currentTarget.style.borderColor = P.border}
            />
            <div style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Icon name="search" size={12} color={P.faint} />
            </div>
          </div>
          <Btn variant="danger" icon="plus" onClick={openAddForm} style={{ fontSize: 12 }}>تسجيل تلف</Btn>
        </div>
      </div>

      {/* ── Date Filters ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {[
          { l: 'اليوم', fn: () => { setStartDate(today()); setEndDate(today()) } },
          { l: 'الكل', fn: () => { setStartDate(''); setEndDate('') } },
        ].map(b => (
          <button key={b.l} onClick={b.fn} style={{
            padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer',
            border: `1.5px solid ${P.border}`, background: P.surface, color: P.rose,
            fontFamily: 'Cairo,sans-serif',
          }}>{b.l}</button>
        ))}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: P.muted }}>من</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 8, border: `1.5px solid ${P.border}`, fontSize: 11, fontFamily: 'Cairo,sans-serif', background: P.bg2, color: P.ink, outline: 'none' }} />
          <span style={{ fontSize: 11, color: P.muted }}>إلى</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 8, border: `1.5px solid ${P.border}`, fontSize: 11, fontFamily: 'Cairo,sans-serif', background: P.bg2, color: P.ink, outline: 'none' }} />
        </div>
      </div>

      {/* ── Damage History Table ── */}
      {filtered.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>🗑️</div>
          <div style={{ fontSize: 13, color: P.muted }}>{search ? 'لا توجد نتائج' : 'لا يوجد سجل تالف'}</div>
        </Card>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <ResponsiveTable minWidth={500} stickyHeader>
            <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse', fontFamily: 'Cairo,sans-serif' }}>
              <thead>
                <tr style={{ background: P.bg2 }}>
                  {['المادة', 'النوع', 'الكمية', 'التاريخ', 'الموظف', ''].map(h =>
                    <th key={h} style={{ padding: '9px 10px', fontSize: 12, fontWeight: 800, color: P.plum, textAlign: 'right', borderBottom: `2px solid ${P.borderM}` }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paged.pageRows.map((r: any) => {
                  const isExpanded = expandedId === r.id
                  return (
                    <>
                      <tr key={r.id}
                        style={{ cursor: 'pointer', borderBottom: isExpanded ? 'none' : `1px solid ${P.ghost}`, transition: 'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = P.bg2}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setExpandedId(isExpanded ? null : r.id)}>
                        <td style={{ padding: '10px', fontWeight: 700, color: P.plum, fontSize: 13 }}>{r.item_name || '—'}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{
                            padding: '2px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700,
                            background: r.item_type === 'premade' ? P.purpleXL : P.bg2,
                            color: r.item_type === 'premade' ? P.purple : P.muted,
                          }}>{r.item_type === 'premade' ? 'جاهز' : 'خام'}</span>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 900, color: P.rose, fontSize: 14 }}>
                          {Math.abs(r.quantity || 0).toLocaleString()} <span style={{ fontSize: 10, fontWeight: 500, color: P.muted }}>{r.unit}</span>
                        </td>
                        <td style={{ padding: '10px', color: P.muted, fontSize: 12, whiteSpace: 'nowrap' }}>
                          <div>{r.created_at?.slice(0, 10)}</div>
                          <div style={{ color: P.faint }}>{r.created_at?.slice(11, 16)}</div>
                        </td>
                        <td style={{ padding: '10px', color: P.muted, fontSize: 12 }}>{r.employee_name || '—'}</td>
                        <td style={{ padding: '10px', textAlign: 'center', fontSize: 13, color: P.rose }}>{isExpanded ? '▲' : '▼'}</td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${r.id}-detail`} style={{ background: P.bg2 }}>
                          <td colSpan={6} style={{ padding: '10px 16px', borderBottom: `1.5px solid ${P.border}` }}>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                              <div>
                                <span style={{ fontWeight: 700, color: P.plum }}>السبب: </span>
                                <span style={{ color: P.ink }}>{r.reason || '—'}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
      )}
      <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} startIndex={paged.startIndex} endIndex={paged.endIndex} onChange={paged.setPage} />

      {/* ── Add Damage Modal ── */}
      {showAdd && (
        <Modal title="تسجيل تلف" onClose={() => setShowAdd(false)} width={420} icon="alert">
          <Field label="المادة" required>
            <select value={dmgItemId} onChange={(e: any) => setDmgItemId(e.target.value)}
              style={{
                width: '100%', background: P.bg2, border: `1.5px solid ${P.border}`, borderRadius: 10,
                padding: '9px 13px', color: P.plum, fontSize: 14, outline: 'none',
                fontFamily: 'Cairo, sans-serif', cursor: 'pointer'
              }}>
              <option value="">اختر مادة...</option>
              {stock.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.kitchen_stock} {s.unit} ({s.type === 'premade' ? 'جاهز' : 'خام'})
                </option>
              ))}
            </select>
          </Field>
          {dmgItemId && (() => {
            const item = stock.find((s: any) => s.id === parseInt(dmgItemId))
            return item ? (
              <div style={{ background: P.roseXL, border: `1px solid ${P.roseL}`, borderRadius: 10, padding: '8px 14px', marginBottom: 8, fontSize: 12, color: P.rose, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Icon name="box" size={12} color={P.rose} />
                مخزون المطبخ: {item.kitchen_stock} {item.unit}
              </div>
            ) : null
          })()}
          <Field label="الكمية التالفة" required>
            <Inp value={dmgQty} onChange={(e: any) => setDmgQty(e.target.value)} type="number" autoFocus />
          </Field>
          <Field label="السبب" required>
            <Inp value={dmgReason} onChange={(e: any) => setDmgReason(e.target.value)} placeholder="سقط، انتهت صلاحيته..." />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>إلغاء</Btn>
            <Btn variant="danger" onClick={reportDamage} style={{ flex: 1 }}>تسجيل التلف</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
