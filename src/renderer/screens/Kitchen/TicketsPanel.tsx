import { useEffect, useState, useMemo } from 'react'
import { P } from '../../tokens'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { Btn } from '../../components/Btn'
import { Badge } from '../../components/TabBar'
import { useTickets } from '../../hooks/useKitchen'
import { ResponsiveTable, Pagination, usePaginated } from '../../components/layouts'

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const today = () => fmtDate(new Date())

export function TicketsPanel() {
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const { tickets, reload } = useTickets({ startDate: startDate || undefined, endDate: endDate || undefined })
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    const id = setInterval(reload, 12000)
    return () => clearInterval(id)
  }, [reload])

  const filtered = useMemo(() => {
    if (!search.trim()) return tickets
    const q = search.trim().toLowerCase()
    return tickets.filter((t: any) =>
      String(t.order_num).includes(q) ||
      (t.items || []).some((it: any) => it.name?.toLowerCase().includes(q))
    )
  }, [tickets, search])

  const activeCount = filtered.filter((t: any) => t.status !== 'voided').length
  const voidedCount = filtered.filter((t: any) => t.status === 'voided').length
  const paged = usePaginated(filtered, 15)

  const getTimeAgo = (created_at: string) => {
    try {
      const diff = Date.now() - new Date(created_at).getTime()
      const mins = Math.floor(diff / 60000)
      if (mins < 1) return 'الآن'
      if (mins < 60) return `${mins} د`
      return `${Math.floor(mins / 60)} س ${mins % 60} د`
    } catch { return '' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: P.plum }}>الطلبات</div>
          <span style={{ background: P.greenXL, color: P.green, padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800 }}>{activeCount} نشط</span>
          {voidedCount > 0 && <span style={{ background: P.roseXL, color: P.rose, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700 }}>{voidedCount} ملغي</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: 150 }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="رقم طلب أو صنف..."
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 10,
                border: `1.5px solid ${P.border}`, background: P.surface,
                fontSize: 11, fontFamily: 'Cairo,sans-serif', color: P.ink,
                outline: 'none', direction: 'rtl', paddingRight: 28
              }}
              onFocus={e => e.currentTarget.style.borderColor = P.purple}
              onBlur={e => e.currentTarget.style.borderColor = P.border}
            />
            <div style={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Icon name="search" size={12} color={P.faint} />
            </div>
          </div>
          <Btn variant="secondary" onClick={reload} style={{ padding: '5px 10px', fontSize: 11 }}>
            <Icon name="refresh" size={12} color={P.purple} />
          </Btn>
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
            border: `1.5px solid ${P.border}`, background: P.surface, color: P.purple,
            fontFamily: 'Cairo,sans-serif', transition: 'all .12s'
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

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <Card style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 36, opacity: 0.3, marginBottom: 8 }}>🍰</div>
          <div style={{ fontSize: 13, color: P.muted }}>{search ? 'لا توجد نتائج' : 'لا توجد طلبات بعد'}</div>
        </Card>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <ResponsiveTable minWidth={500} stickyHeader>
            <table style={{ width: '100%', minWidth: 500, borderCollapse: 'collapse', fontFamily: 'Cairo,sans-serif' }}>
              <thead>
                <tr style={{ background: P.bg2 }}>
                  {['#', 'الوقت', 'منذ', 'الأصناف', 'الحالة', ''].map(h =>
                    <th key={h} style={{ padding: '9px 10px', fontSize: 12, fontWeight: 800, color: P.plum, textAlign: 'right', borderBottom: `2px solid ${P.borderM}` }}>{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paged.pageRows.map((t: any) => {
                  const isVoided = t.status === 'voided'
                  const isExpanded = expandedId === t.id
                  const itemCount = (t.items || []).length
                  const timeAgo = getTimeAgo(t.created_at)
                  return (
                    <>
                      <tr key={t.id}
                        style={{ cursor: 'pointer', opacity: isVoided ? 0.55 : 1, borderBottom: isExpanded ? 'none' : `1px solid ${P.ghost}`, transition: 'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = P.bg2}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                        <td style={{ padding: '10px', fontWeight: 900, color: isVoided ? P.rose : P.green, fontSize: 15 }}>#{t.order_num}</td>
                        <td style={{ padding: '10px', color: P.muted, whiteSpace: 'nowrap', fontSize: 12 }}>{t.created_at?.slice(11, 16)}</td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: P.purpleXL, color: P.purple }}>{timeAgo}</span>
                        </td>
                        <td style={{ padding: '10px', color: P.muted, fontSize: 13 }}>{itemCount} صنف</td>
                        <td style={{ padding: '10px' }}>
                          {isVoided ? <Badge label="ملغي" color={P.rose} bg={P.roseXL} /> : <Badge label="مؤكد" color={P.green} bg={P.greenXL} />}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center', fontSize: 13, color: P.purple }}>
                          {isExpanded ? '▲' : '▼'}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${t.id}-detail`} style={{ background: P.bg2 }}>
                          <td colSpan={6} style={{ padding: '10px 16px', borderBottom: `1.5px solid ${P.border}` }}>
                            {(t.items || []).map((it: any, i: number) => (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0',
                                borderBottom: i < (t.items || []).length - 1 ? `1px dashed ${P.ghost}` : 'none',
                              }}>
                                <span style={{
                                  minWidth: 24, height: 24, borderRadius: 7,
                                  background: P.purpleXL, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                  fontSize: 13, fontWeight: 900, color: P.purple
                                }}>{it.qty}</span>
                                <span style={{ fontSize: 14, color: P.plum, fontWeight: 700 }}>{it.name}</span>
                                {it.variation_label && <span style={{ fontSize: 10, color: P.muted, background: P.bg3 || P.surface, padding: '1px 6px', borderRadius: 5 }}>{it.variation_label}</span>}
                                {it.note && <span style={{ fontSize: 10, color: P.gold }}>📝 {it.note}</span>}
                              </div>
                            ))}
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
    </div>
  )
}
