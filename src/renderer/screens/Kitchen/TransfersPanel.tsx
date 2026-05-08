import { useState, useMemo } from 'react'
import { P } from '../../tokens'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { ResponsiveTable, Pagination, usePaginated } from '../../components/layouts'
import { useKitchenTransfers } from '../../hooks/useKitchen'

export function TransfersPanel() {
  const { transfers } = useKitchenTransfers(200)
  const [search, setSearch] = useState('')
  const [direction, setDirection] = useState<'all' | 'in' | 'out'>('all')

  const filtered = useMemo(() => {
    let items = transfers
    if (direction === 'in') items = items.filter((t: any) => t.to_location === 'kitchen')
    else if (direction === 'out') items = items.filter((t: any) => t.from_location === 'kitchen')
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      items = items.filter((t: any) => t.item_name?.toLowerCase().includes(q) || t.employee_name?.toLowerCase()?.includes(q))
    }
    return items
  }, [transfers, direction, search])

  const paged = usePaginated(filtered, 10)

  const dirFilters = [
    { id: 'all' as const, label: 'الكل', count: transfers.length },
    { id: 'in' as const, label: '📥 وارد', count: transfers.filter((t: any) => t.to_location === 'kitchen').length },
    { id: 'out' as const, label: '📤 صادر', count: transfers.filter((t: any) => t.from_location === 'kitchen').length },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, height: '100%' }}>
      {/* ── Search + Direction Filter ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 160, position: 'relative' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن مادة أو موظف..."
            style={{
              width: '100%', padding: '7px 12px', borderRadius: 10,
              border: `1.5px solid ${P.border}`, background: P.surface,
              fontSize: 12, fontFamily: 'Cairo,sans-serif', color: P.ink,
              outline: 'none', direction: 'rtl', paddingRight: 32
            }}
            onFocus={e => e.currentTarget.style.borderColor = P.purple}
            onBlur={e => e.currentTarget.style.borderColor = P.border}
          />
          <div style={{ position: 'absolute', top: '50%', right: 9, transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Icon name="search" size={13} color={P.faint} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {dirFilters.map(f => (
            <button key={f.id} onClick={() => setDirection(f.id)} style={{
              padding: '5px 10px', borderRadius: 99, fontSize: 11, fontWeight: direction === f.id ? 700 : 500,
              cursor: 'pointer', border: `1.5px solid ${direction === f.id ? P.purple : P.border}`,
              background: direction === f.id ? P.purpleXL : P.surface,
              color: direction === f.id ? P.purple : P.muted,
              fontFamily: 'Cairo,sans-serif', display: 'flex', gap: 3, alignItems: 'center',
              transition: 'all .12s',
            }}>
              {f.label}
              <span style={{
                background: direction === f.id ? `${P.purple}18` : P.bg2,
                padding: '1px 5px', borderRadius: 99, fontSize: 9, fontWeight: 800,
                color: direction === f.id ? P.purple : P.faint,
              }}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <Card style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: P.muted }}>{search ? 'لا توجد نتائج' : 'لا توجد تحويلات'}</div>
        </Card>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <ResponsiveTable minWidth={520}>
          <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: `2px solid ${P.border}`, background: P.bg2 }}>
              {['المادة', 'الاتجاه', 'الكمية', 'الموظف', 'ملاحظة', 'التاريخ'].map(h =>
                <th key={h} style={{ padding: '8px 10px', fontSize: 11, color: P.muted, fontWeight: 700, textAlign: 'right' }}>{h}</th>
              )}
            </tr></thead>
            <tbody>{paged.pageRows.map((t: any) => {
              const toKitchen = t.to_location === 'kitchen'
              return (
                <tr key={t.id} style={{ borderBottom: `1px solid ${P.ghost}`, transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = P.bg2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '9px 10px', fontSize: 13, fontWeight: 700, color: P.plum }}>{t.item_name}</td>
                  <td style={{ padding: '9px 10px' }}>
                    <span style={{
                      background: toKitchen ? P.goldXL : P.purpleXL,
                      color: toKitchen ? P.gold : P.purple,
                      padding: '3px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700
                    }}>
                      {toKitchen ? '📥 وارد' : '📤 صادر'}
                    </span>
                  </td>
                  <td style={{ padding: '9px 10px', fontSize: 14, fontWeight: 900, color: P.plum }}>{t.quantity} <span style={{ fontSize: 10, fontWeight: 500, color: P.muted }}>{t.unit}</span></td>
                  <td style={{ padding: '9px 10px', fontSize: 11, color: P.muted }}>{t.employee_name || '—'}</td>
                  <td style={{ padding: '9px 10px', fontSize: 11, color: P.faint, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || '—'}</td>
                  <td style={{ padding: '9px 10px', fontSize: 10, color: P.muted, direction: 'ltr' as const, whiteSpace: 'nowrap' }}>{t.created_at?.slice(0, 16)}</td>
                </tr>
              )
            })}</tbody>
          </table>
          </ResponsiveTable>
        </div>
      )}
      <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} startIndex={paged.startIndex} endIndex={paged.endIndex} onChange={paged.setPage} />
    </div>
  )
}
