import React, { useState } from 'react'
import { P } from '../../tokens'
import { Icon } from '../../components/Icon'
import { ResponsiveTable, Pagination, usePaginated } from '../../components/layouts'
import { usePurchases } from '../../hooks/useProcurement'


export function PurchaseHistoryTab() {
  const { purchases, loading } = usePurchases({ limit: 200 })
  const [expanded, setExpanded] = useState<number | null>(null)
  const paged = usePaginated(purchases, 10)

  const toggleExpand = (id: number) => {
    setExpanded(expanded === id ? null : id)
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: P.muted }}>جاري التحميل...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 12 }}>
      <div><div style={{ fontSize: 13, color: P.muted }}>{purchases.length} عملية شراء</div></div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <ResponsiveTable minWidth={600} stickyHeader>
        <table style={{ width: '100%', minWidth: 600, borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: `2px solid ${P.border}`, background: P.surface, position: 'sticky', top: 0 }}>
            {['#', 'المورد', 'الإجمالي', 'ملاحظة', 'التاريخ', ''].map(h =>
              <th key={h} style={{ padding: '10px 12px', fontSize: 13, color: P.muted, fontWeight: 700, textAlign: 'right' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {paged.pageRows.map((p: any) => (
              <React.Fragment key={p.id}>
                <tr style={{ borderBottom: `1px solid ${P.border}`, cursor: 'pointer' }}
                  onClick={() => toggleExpand(p.id)}
                  onMouseEnter={e => e.currentTarget.style.background = P.bg2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '11px 12px', fontSize: 14, color: P.muted }}>#{p.id}</td>
                  <td style={{ padding: '11px 12px', fontSize: 14, fontWeight: 700, color: P.plum }}>{p.supplier_name || '—'}</td>
                  <td style={{ padding: '11px 12px', fontSize: 15, fontWeight: 900, color: P.purple }}>{(p.total_cost || 0).toLocaleString()} ج.س</td>
                  <td style={{ padding: '11px 12px', fontSize: 13, color: P.faint }}>{p.note || '—'}</td>
                  <td style={{ padding: '11px 12px', fontSize: 12, color: P.muted, direction: 'ltr' }}>
                    {p.created_at ? new Date(p.created_at).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <Icon name={expanded === p.id ? 'chevD' : 'chevR'} size={14} color={P.muted} />
                  </td>
                </tr>
                {expanded === p.id && (
                  <tr><td colSpan={6} style={{ padding: '0 24px 16px', background: P.bg2 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.ink, marginBottom: 8, marginTop: 12 }}>تفاصيل الأصناف</div>
                    {(p.items || []).map((item: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '8px 12px', background: P.surface, borderRadius: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: P.plum, flex: 1 }}>{item.item_name || `#${item.item_id}`}</span>
                        <span style={{ color: P.muted, fontSize: 13 }}>{item.quantity} وحدة</span>
                        <span style={{ color: P.muted, fontSize: 13 }}>× {item.unit_cost} ج.س</span>
                        <span style={{ color: P.purple, fontWeight: 800 }}>{(item.total_cost || 0).toLocaleString()} ج.س</span>
                      </div>
                    ))}
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        </ResponsiveTable>
        {purchases.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: P.faint }}>
            <Icon name="box" size={40} color={P.faint} />
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 12 }}>لا توجد مشتريات بعد</div>
          </div>
        )}
      </div>
      <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} startIndex={paged.startIndex} endIndex={paged.endIndex} onChange={paged.setPage} />
    </div>
  )
}
