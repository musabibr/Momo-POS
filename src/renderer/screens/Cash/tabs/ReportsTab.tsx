import React, { useState, useEffect } from 'react'
import { P } from '../../../tokens'
import { Btn } from '../../../components/Btn'
import { Inp, Field } from '../../../components/Inp'
import { Sel } from '../../../components/Sel'
import { Badge } from '../../../components/TabBar'
import { Card } from '../../../components/Card'
import { toast } from '../../../components/Toast'
import { KpiGrid } from '../../../components/layouts'

const api = (window as any).api
const today = () => new Date().toISOString().slice(0, 10)

export function ReportsTab({ employees }: { employees: any[] }) {
  const [startDate, setStartDate] = useState(today())
  const [endDate, setEndDate] = useState(today())
  const [fEmployee, setFEmployee] = useState('all')
  const [data, setData] = useState<any>({ rows: [], total: 0 })
  const [saving, setSaving] = useState(false)

  const load = () => {
    const filters: any = {}
    if (startDate) filters.startDate = startDate + ' 00:00:00'
    if (endDate) filters.endDate = endDate + ' 23:59:59'
    if (fEmployee !== 'all') filters.employeeId = parseInt(fEmployee)
    api?.shifts?.listPaginated?.(1, 500, filters).then((d: any) => d && setData(d))
  }

  useEffect(() => { load() }, [startDate, endDate, fEmployee])

  const rows = data.rows || []
  const totalRev = rows.reduce((s: number, r: any) => s + (r.total_revenue || 0), 0)
  const totalOrders = rows.reduce((s: number, r: any) => s + (r.total_orders || 0), 0)
  const closedCount = rows.filter((r: any) => r.closed_at).length

  const savePdf = async () => {
    setSaving(true)
    try {
      const empLabel = fEmployee !== 'all' ? employees.find(e => String(e.id) === fEmployee)?.name || '' : 'الكل'
      const html = buildReportHtml(rows, { startDate, endDate, empLabel, totalRev, totalOrders, closedCount, total: rows.length })
      await api?.printer?.saveShiftReportPDF?.(html)
      toast('تم حفظ التقرير ✓')
    } catch (err: any) { toast(err?.message || 'خطأ في حفظ التقرير') }
    setSaving(false)
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
        <Btn variant="primary" icon="save" onClick={savePdf} disabled={saving || rows.length === 0}>
          {saving ? 'جاري الحفظ…' : 'حفظ كـ PDF'}
        </Btn>
      </div>

      {/* Summary KPIs */}
      <KpiGrid min={160}>
        {[
          { l: 'الورديات', v: rows.length, c: P.plum },
          { l: 'مغلقة', v: closedCount, c: P.green },
          { l: 'الطلبات', v: totalOrders, c: P.purple },
          { l: 'الإيرادات', v: `${totalRev.toLocaleString()} ج.س`, c: P.purple },
        ].map(k => (
          <Card key={k.l} style={{ padding: 14 }}>
            <div style={{ fontSize: 12, color: P.muted, fontWeight: 700 }}>{k.l}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.c }}>{k.v}</div>
          </Card>
        ))}
      </KpiGrid>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, border: `1px solid ${P.border}`, borderRadius: 14, background: P.surface }}>
        {rows.length === 0 && <div style={{ textAlign: 'center', padding: 50, color: P.faint }}>لا توجد ورديات في الفترة المحددة</div>}
        {rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'Cairo,sans-serif' }}>
            <thead>
              <tr style={{ background: P.bg2, position: 'sticky', top: 0, zIndex: 1 }}>
                {['م', 'التاريخ', 'الموظف', 'المبيعات', 'الطلبات', 'الافتتاحي', 'الختامي', 'الحالة'].map(h => (
                  <th key={h} style={{ padding: '10px 8px', fontSize: 13, fontWeight: 800, color: P.plum, textAlign: 'right', borderBottom: `2px solid ${P.borderM}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s: any, idx: number) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${P.border}` }}
                  onMouseEnter={e => e.currentTarget.style.background = P.ghost}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 8px', color: P.faint }}>{idx + 1}</td>
                  <td style={{ padding: '10px 8px', color: P.ink, whiteSpace: 'nowrap', fontSize: 13 }}>{s.opened_at?.slice(0, 10)}</td>
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
    </div>
  )
}

function buildReportHtml(rows: any[], meta: any): string {
  const tableRows = rows.map((s: any, i: number) => `
    <tr>
      <td>${i + 1}</td>
      <td>${s.opened_at?.slice(0, 10) || '—'}</td>
      <td>${s.employee_name || '—'}</td>
      <td>${(s.total_revenue || 0).toLocaleString()}</td>
      <td>${s.total_orders ?? '—'}</td>
      <td>${(s.open_float || 0).toLocaleString()}</td>
      <td>${s.close_float != null ? s.close_float.toLocaleString() : '—'}</td>
      <td>${s.closed_at ? 'مغلقة' : 'مفتوحة'}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8">
<style>
@page { size: A4 portrait; margin: 15mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; color: #1e1b4b; padding: 20px; }
h1 { font-size: 22px; color: #581c87; margin-bottom: 6px; }
.meta { color: #666; font-size: 14px; margin-bottom: 20px; }
.kpi { display: flex; gap: 16px; margin-bottom: 20px; }
.kpi-card { flex: 1; padding: 12px 16px; background: #f5edff; border-radius: 10px; text-align: center; }
.kpi-label { font-size: 12px; color: #666; }
.kpi-val { font-size: 20px; font-weight: 900; color: #9333ea; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th { background: #f3e8ff; padding: 8px; text-align: right; font-weight: 800; color: #581c87; border-bottom: 2px solid #d8b4fe; }
td { padding: 8px; border-bottom: 1px solid #ede5ff; }
tr:nth-child(even) { background: #fdf7ff; }
</style>
</head>
<body>
<h1>تقرير الورديات</h1>
<div class="meta">من ${meta.startDate || '—'} إلى ${meta.endDate || '—'} · الموظف: ${meta.empLabel} · ${meta.total} وردية</div>
<div class="kpi">
  <div class="kpi-card"><div class="kpi-label">الورديات</div><div class="kpi-val">${meta.total}</div></div>
  <div class="kpi-card"><div class="kpi-label">المغلقة</div><div class="kpi-val">${meta.closedCount}</div></div>
  <div class="kpi-card"><div class="kpi-label">الطلبات</div><div class="kpi-val">${meta.totalOrders}</div></div>
  <div class="kpi-card"><div class="kpi-label">الإيرادات</div><div class="kpi-val">${meta.totalRev.toLocaleString()} ج.س</div></div>
</div>
<table>
  <thead><tr><th>م</th><th>التاريخ</th><th>الموظف</th><th>المبيعات</th><th>الطلبات</th><th>الافتتاحي</th><th>الختامي</th><th>الحالة</th></tr></thead>
  <tbody>${tableRows}</tbody>
</table>
</body>
</html>`
}
