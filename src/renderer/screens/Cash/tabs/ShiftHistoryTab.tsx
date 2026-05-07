import React, { useState, useEffect } from 'react'
import { P } from '../../../tokens'
import { Btn } from '../../../components/Btn'
import { Inp, Field } from '../../../components/Inp'
import { Sel } from '../../../components/Sel'
import { Modal } from '../../../components/Modal'
import { Badge } from '../../../components/TabBar'
import { Card } from '../../../components/Card'
import { toast } from '../../../components/Toast'

const api = (window as any).api
const today = () => new Date().toISOString().slice(0, 10)

export function ShiftHistoryTab({ employees }: { employees: any[] }) {
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 10
  const [data, setData] = useState<any>({ rows: [], total: 0, totalPages: 0 })
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [fEmployee, setFEmployee] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [zData, setZData] = useState<any>(null)

  const load = () => {
    const filters: any = {}
    if (startDate) filters.startDate = startDate + ' 00:00:00'
    if (endDate) filters.endDate = endDate + ' 23:59:59'
    if (fEmployee !== 'all') filters.employeeId = parseInt(fEmployee)
    api?.shifts?.listPaginated?.(page, PAGE_SIZE, filters).then((d: any) => d && setData(d))
  }

  useEffect(() => { setPage(1) }, [startDate, endDate, fEmployee])
  useEffect(() => { load() }, [page, startDate, endDate, fEmployee])

  const openDetail = async (s: any) => {
    setSelected(s)
    if (s.closed_at) {
      try {
        const d = await api?.cash?.getZReportData?.(s.id)
        setZData(d)
      } catch { setZData(null) }
    } else { setZData(null) }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Field label="من" style={{ marginBottom: 0, minWidth: 140 }}>
          <Inp type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} />
        </Field>
        <Field label="إلى" style={{ marginBottom: 0, minWidth: 140 }}>
          <Inp type="date" value={endDate} onChange={(e: any) => setEndDate(e.target.value)} />
        </Field>
        {employees.length > 0 && (
          <Field label="الموظف" style={{ marginBottom: 0, minWidth: 150 }}>
            <Sel value={fEmployee} onChange={(e: any) => setFEmployee(e.target.value)}
              options={[{ value: 'all', label: 'الكل' }, ...employees.map(e => ({ value: String(e.id), label: e.name }))]} />
          </Field>
        )}
        <span style={{ fontSize: 13, color: P.muted, padding: '8px 0' }}>{data.total} وردية</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, border: `1px solid ${P.border}`, borderRadius: 14, background: P.surface }}>
        {data.rows.length === 0 && <div style={{ textAlign: 'center', padding: 50, color: P.faint }}>لا توجد ورديات</div>}
        {data.rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'Tajawal,sans-serif' }}>
            <thead>
              <tr style={{ background: P.bg2, position: 'sticky', top: 0, zIndex: 1 }}>
                {['م', 'التاريخ', 'الموظف', 'المبيعات', 'الطلبات', 'الافتتاحي', 'الختامي', 'الحالة'].map(h => (
                  <th key={h} style={{ padding: '10px 8px', fontSize: 13, fontWeight: 800, color: P.plum, textAlign: 'right', borderBottom: `2px solid ${P.borderM}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((s: any, idx: number) => (
                <tr key={s.id} onClick={() => openDetail(s)} style={{ cursor: 'pointer', borderBottom: `1px solid ${P.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = P.ghost}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 8px', color: P.faint, fontSize: 13 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td style={{ padding: '10px 8px', color: P.ink, whiteSpace: 'nowrap', fontSize: 13 }}>
                    {s.opened_at?.slice(0, 10)}<br /><span style={{ color: P.muted }}>{s.opened_at?.slice(11, 16)} → {s.closed_at?.slice(11, 16) || '—'}</span>
                  </td>
                  <td style={{ padding: '10px 8px', color: P.plum, fontWeight: 700 }}>{s.employee_name || '—'}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 800, color: P.purple }}>{(s.total_revenue || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', color: P.muted, textAlign: 'center' }}>{s.total_orders ?? '—'}</td>
                  <td style={{ padding: '10px 8px', color: P.ink }}>{(s.open_float || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', color: P.ink }}>{s.close_float != null ? s.close_float.toLocaleString() : '—'}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <Badge label={s.closed_at ? 'مغلقة' : 'مفتوحة'} color={s.closed_at ? P.muted : P.green} bg={s.closed_at ? P.ghost : P.greenXL} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0 }}>
          <Btn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← السابق</Btn>
          {Array.from({ length: Math.min(data.totalPages, 7) }, (_, i) => {
            const p = i + 1
            return <button key={p} onClick={() => setPage(p)} style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${page === p ? P.purple : P.borderM}`, background: page === p ? P.purple : P.surface, color: page === p ? '#fff' : P.muted, cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Tajawal,sans-serif' }}>{p}</button>
          })}
          {data.totalPages > 7 && <span style={{ color: P.faint }}>…</span>}
          <Btn variant="secondary" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>التالي →</Btn>
          <span style={{ fontSize: 13, color: P.muted, marginRight: 8 }}>صفحة {page} من {data.totalPages}</span>
        </div>
      )}

      {/* Detail modal */}
      {selected && (
        <Modal title={`وردية #${selected.id}`} onClose={() => { setSelected(null); setZData(null) }} width={500} icon="shift">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            {[
              { l: 'الموظف', v: selected.employee_name || '—' },
              { l: 'الفتح', v: selected.opened_at?.slice(0, 16)?.replace('T', ' ') || '—' },
              { l: 'الإغلاق', v: selected.closed_at?.slice(0, 16)?.replace('T', ' ') || 'مفتوحة' },
              { l: 'الافتتاحي', v: `${(selected.open_float || 0).toLocaleString()} ج.س` },
              { l: 'الختامي', v: selected.close_float != null ? `${selected.close_float.toLocaleString()} ج.س` : '—' },
              { l: 'الطلبات', v: selected.total_orders ?? '—' },
              { l: 'الإيرادات', v: `${(selected.total_revenue || 0).toLocaleString()} ج.س` },
            ].map(f => (
              <div key={f.l} style={{ padding: '8px 12px', background: P.bg2, borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: P.muted }}>{f.l}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: P.plum }}>{f.v}</div>
              </div>
            ))}
          </div>
          {zData && (
            <div style={{ background: P.bg2, borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: P.plum, marginBottom: 8 }}>بيانات Z-Report</div>
              {[
                { l: 'نقدي', v: zData.byPayMode?.cash, c: P.green },
                { l: 'بنكي', v: zData.byPayMode?.bank, c: P.blue },
                { l: 'إيداعات', v: zData.pettyCashIn, c: P.green },
                { l: 'سحوبات', v: zData.pettyCashOut, c: P.rose },
                { l: 'مصروفات', v: zData.expenses, c: P.rose },
                { l: 'المتوقع', v: zData.expected, c: P.purple },
                { l: 'الفرق', v: zData.diff, c: zData.diff >= 0 ? P.green : P.rose },
              ].map(r => (
                <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                  <span style={{ color: P.muted }}>{r.l}</span>
                  <span style={{ fontWeight: 700, color: r.c }}>{(r.v || 0).toLocaleString()} ج.س</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {selected.closed_at && (
              <Btn variant="secondary" icon="print" fullWidth onClick={() => {
                if (zData) { api?.printer?.printZReport?.(zData).catch(() => {}); toast('جاري إعادة طباعة تقرير Z…') }
              }}>إعادة طباعة Z-Report</Btn>
            )}
            <Btn variant="secondary" fullWidth onClick={() => { setSelected(null); setZData(null) }}>إغلاق</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
