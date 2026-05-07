import React, { useState, useEffect } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp } from '../../components/Inp'
import { TabBar, Badge } from '../../components/TabBar'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { toast } from '../../components/Toast'
import { ScrollableTabs, ResponsiveTable, Pagination, usePaginated, KpiGrid } from '../../components/layouts'

const api = (window as any).api

export function ReportsScreen() {
  const [tab, setTab] = useState('sales')
  const [range, setRange] = useState('today')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    const today = new Date()
    let start = new Date()
    if (range === 'today') { /* keep today */ }
    else if (range === 'week') start.setDate(today.getDate() - 7)
    else if (range === 'month') start.setMonth(today.getMonth() - 1)
    if (range !== 'custom') {
      setStartDate(start.toISOString().split('T')[0])
      setEndDate(today.toISOString().split('T')[0])
    }
  }, [range])

  const filters = { startDate: startDate || undefined, endDate: endDate || undefined }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 14px', gap: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div><div style={{ fontSize: 20, fontWeight: 900, color: P.plum }}>التقارير والتحليلات</div></div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          {[{ k: 'today', l: 'اليوم' }, { k: 'week', l: 'أسبوع' }, { k: 'month', l: 'شهر' }, { k: 'custom', l: 'مخصص' }].map(r => (
            <button key={r.k} onClick={() => setRange(r.k)} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 14, fontWeight: range === r.k ? 800 : 500, cursor: 'pointer', border: `1.5px solid ${range === r.k ? P.purple : P.borderM}`, background: range === r.k ? P.purple : P.surface, color: range === r.k ? '#fff' : P.muted, fontFamily: 'Tajawal,sans-serif', transition: 'all .15s' }}>{r.l}</button>
          ))}
          {range === 'custom' && <>
            <div style={{ borderLeft: `1px solid ${P.border}`, margin: '0 4px', height: 24 }} />
            <Inp type="date" value={startDate} onChange={(e: any) => setStartDate(e.target.value)} style={{ padding: '4px 8px', fontSize: 13, height: 32, width: 130 }} />
            <Inp type="date" value={endDate} onChange={(e: any) => setEndDate(e.target.value)} style={{ padding: '4px 8px', fontSize: 13, height: 32, width: 130 }} />
          </>}
          <Btn variant="secondary" size="sm" icon="export" onClick={() => exportPDF(tab, filters)}>تصدير PDF</Btn>
        </div>
      </div>

      <ScrollableTabs tabs={[
        { id: 'sales', label: 'المبيعات' },
        { id: 'pnl', label: 'الأرباح والخسائر' },
        { id: 'items', label: 'الأصناف' },
        { id: 'pays', label: 'طرق الدفع' },
        { id: 'audit', label: 'سجل العمليات' }
      ]} active={tab} onChange={setTab} />

      {tab === 'sales' && <SalesReport filters={filters} />}
      {tab === 'pnl' && <PnLReport filters={filters} />}
      {tab === 'items' && <ItemsReport filters={filters} />}
      {tab === 'pays' && <PaymentsReport filters={filters} />}
      {tab === 'audit' && <AuditLog filters={filters} />}
    </div>
  )
}

async function exportPDF(reportType: string, filters: any) {
  try {
    const result = await api?.reports?.exportPDF?.(reportType, filters)
    if (result?.path) {
      toast(`تم تصدير التقرير PDF بنجاح ✓\n${result.path}`)
    } else {
      toast('تم تصدير التقرير PDF بنجاح ✓')
    }
  } catch (err: any) {
    const msg = err?.message || 'خطأ في التصدير'
    if (msg.includes('إلغاء')) return // User cancelled save dialog
    toast(msg)
  }
}

function SalesReport({ filters }: any) {
  const [summary, setSummary] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [heatmap, setHeatmap] = useState<number[]>(new Array(24).fill(0))
  const ordersPaged = usePaginated(orders, 10)

  useEffect(() => {
    api?.orders?.salesSummary?.(filters).then((d: any) => d && setSummary(d))
    api?.orders?.list?.({ ...filters, status: 'confirmed' }).then((d: any) => {
      if (!d) return
      setOrders(d)
      // Build real hourly heatmap from orders
      const hours = new Array(24).fill(0)
      d.forEach((o: any) => {
        if (o.created_at) {
          const h = new Date(o.created_at).getHours()
          hours[h] += o.total || 0
        }
      })
      setHeatmap(hours)
    })
  }, [filters.startDate, filters.endDate])

  const maxH = Math.max(...heatmap, 1)
  const HOURS = Array.from({ length: 24 }, (_, i) => {
    if (i === 0) return '12ص'
    if (i < 12) return `${i}ص`
    if (i === 12) return '12م'
    return `${i - 12}م`
  })

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
      {summary && (
        <KpiGrid min={180}>
          {[
            { l: 'إجمالي الإيرادات', v: `${summary.totalRevenue?.toLocaleString()} ج.س`, c: P.purple },
            { l: 'تكلفة البضاعة', v: `${(summary.totalCost || 0).toLocaleString()} ج.س`, c: P.rose },
            { l: 'الربح الإجمالي', v: `${(summary.grossProfit || 0).toLocaleString()} ج.س`, c: P.green },
            { l: 'إجمالي الطلبات', v: summary.totalOrders?.toLocaleString(), c: '#4f46e5' },
            { l: 'متوسط الطلب', v: `${summary.avgOrder?.toLocaleString()} ج.س`, c: P.pink },
            { l: 'إجمالي الخصومات', v: `${summary.totalDiscount?.toLocaleString()} ج.س`, c: P.gold }
          ].map(k => (
            <Card key={k.l} style={{ padding: 16 }}>
              <div style={{ fontSize: 13, color: P.muted, fontWeight: 700, marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: k.c }}>{k.v}</div>
            </Card>
          ))}
        </KpiGrid>
      )}

      {summary && (
        <KpiGrid min={180}>
          {[
            { l: 'مبيعات نقدية', v: `${summary.cashSum?.toLocaleString()} ج.س`, c: P.green, sub: `${summary.cashCount} طلب` },
            { l: 'مبيعات بنكية', v: `${summary.bankSum?.toLocaleString()} ج.س`, c: P.blue, sub: `${summary.bankCount} طلب` },
            { l: 'دفع مقسم', v: `${summary.splitSum?.toLocaleString()} ج.س`, c: P.gold, sub: `${summary.splitCount} طلب` }
          ].map(k => (
            <Card key={k.l} style={{ padding: 14 }}>
              <div style={{ fontSize: 12, color: P.muted, fontWeight: 700, marginBottom: 2 }}>{k.l}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: k.c }}>{k.v}</div>
              <div style={{ fontSize: 12, color: P.faint, marginTop: 2 }}>{k.sub}</div>
            </Card>
          ))}
        </KpiGrid>
      )}

      <Card style={{ padding: 16, overflow: 'hidden' }}>
        <div style={{ fontSize: 14, color: P.muted, fontWeight: 700, marginBottom: 16 }}>خريطة المبيعات بالساعة</div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, minWidth: 500 }}>
          {HOURS.map((h, i) => (
            <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: '100%', borderRadius: '4px 4px 0 0', minHeight: 2, height: `${Math.round(100 * heatmap[i] / maxH)}%`, background: `rgba(147,51,234,${0.15 + 0.85 * heatmap[i] / maxH})`, transition: 'height .5s' }} />
              <div style={{ fontSize: 9, color: P.faint, fontWeight: 600 }}>{h}</div>
            </div>
          ))}
          </div>
        </div>
      </Card>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', background: P.bg2, borderBottom: `1.5px solid ${P.border}`, fontSize: 14, fontWeight: 700, color: P.plum }}>تفاصيل الطلبات</div>
        <ResponsiveTable minWidth={680}>
          <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ background: P.bg2, borderBottom: `1.5px solid ${P.border}` }}>
              {['رقم الطلب', 'الإجمالي', 'طريقة الدفع', 'الأصناف', 'التاريخ'].map(h => <th key={h} style={{ padding: '10px 14px', fontSize: 13, color: P.muted, fontWeight: 700, textAlign: 'right' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {ordersPaged.pageRows.map(o => (
                <tr key={o.id} style={{ borderBottom: `1px solid ${P.ghost}`, transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background = P.bg2} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: P.plum, fontSize: 15 }}>#{o.order_num}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 800, color: P.purple, fontSize: 15 }}>{(o.total || 0).toLocaleString()} ج.س</td>
                  <td style={{ padding: '11px 14px' }}>
                    <Badge label={o.pay_mode === 'cash' ? 'نقداً' : o.pay_mode === 'bank' ? 'بنكي' : 'مقسم'} color={o.pay_mode === 'cash' ? P.green : P.blue} bg={o.pay_mode === 'cash' ? P.greenXL : '#eff6ff'} />
                  </td>
                  <td style={{ padding: '11px 14px', color: P.muted, fontSize: 14 }}>{o.items?.length || 0} صنف</td>
                  <td style={{ padding: '11px 14px', color: P.faint, fontSize: 13 }}>{o.created_at?.slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
        {orders.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.faint, fontSize: 15 }}>لا توجد طلبات في هذه الفترة</div>}
      </Card>
      <Pagination
        page={ordersPaged.page}
        totalPages={ordersPaged.totalPages}
        total={ordersPaged.total}
        startIndex={ordersPaged.startIndex}
        endIndex={ordersPaged.endIndex}
        onChange={ordersPaged.setPage}
      />
    </div>
  )
}

function ItemsReport({ filters }: any) {
  const [ranked, setRanked] = useState<any[]>([])

  useEffect(() => {
    api?.orders?.profitByItem?.(filters).then((d: any) => d && setRanked(d))
  }, [filters.startDate, filters.endDate])

  const maxRevenue = ranked.length > 0 ? ranked[0].revenue : 1
  const top = ranked.slice(0, 10)
  const bottom = ranked.length > 10 ? ranked.slice(-5).reverse() : []

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card style={{ padding: 18 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: P.plum, marginBottom: 16 }}>🏆 الأصناف الأكثر ربحية</div>
        <ResponsiveTable minWidth={780}>
        <table style={{ width: '100%', minWidth: 780, borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: `1.5px solid ${P.border}` }}>
            {['#', 'الصنف', 'الكمية', 'الإيرادات', 'التكلفة', 'الربح', 'الهامش %', 'مؤشر'].map(h => <th key={h} style={{ padding: '8px 12px', fontSize: 13, color: P.muted, fontWeight: 700, textAlign: 'right' }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {top.map((it, i) => {
              const margin = it.revenue > 0 ? Math.round(it.profit / it.revenue * 100) : 0
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${P.ghost}` }} onMouseEnter={e => e.currentTarget.style.background = P.bg2} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '11px 12px', fontSize: 14, color: i < 3 ? P.gold : P.faint, fontWeight: 800 }}>#{i + 1}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{it.emoji || '🍮'}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: P.plum }}>{it.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: 15, color: P.purple, fontWeight: 700 }}>{it.total_qty}</td>
                  <td style={{ padding: '11px 12px', fontSize: 14, fontWeight: 700, color: P.ink }}>{(it.revenue || 0).toLocaleString()} ج.س</td>
                  <td style={{ padding: '11px 12px', fontSize: 14, color: P.rose }}>{(it.cost || 0).toLocaleString()} ج.س</td>
                  <td style={{ padding: '11px 12px', fontSize: 15, fontWeight: 800, color: it.profit > 0 ? P.green : P.rose }}>{(it.profit || 0).toLocaleString()} ج.س</td>
                  <td style={{ padding: '11px 12px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700, color: margin > 50 ? P.green : margin > 30 ? P.gold : P.rose, background: margin > 50 ? P.greenXL : margin > 30 ? P.goldXL : P.roseXL }}>{margin}%</span>
                  </td>
                  <td style={{ padding: '11px 12px', width: 120 }}>
                    <div style={{ height: 6, borderRadius: 99, background: P.bg2 }}>
                      <div style={{ height: '100%', borderRadius: 99, background: `linear-gradient(90deg,${P.purple},${P.pink})`, width: `${Math.round((it.revenue || 0) / maxRevenue * 100)}%`, transition: 'width .6s' }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </ResponsiveTable>
        {ranked.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.faint, fontSize: 15 }}>لا توجد مبيعات أصناف في هذه الفترة</div>}
      </Card>

      {bottom.length > 0 && (
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: P.plum, marginBottom: 16 }}>📉 الأصناف الأقل مبيعاً</div>
          <ResponsiveTable minWidth={420}>
          <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: `1.5px solid ${P.border}` }}>
              {['الصنف', 'الكمية', 'الإيرادات', 'الربح'].map(h => <th key={h} style={{ padding: '8px 12px', fontSize: 13, color: P.muted, fontWeight: 700, textAlign: 'right' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {bottom.map((it, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${P.ghost}` }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>{it.emoji || '🍮'}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: P.muted }}>{it.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: P.rose, fontWeight: 700 }}>{it.total_qty}</td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: P.faint }}>{(it.revenue || 0).toLocaleString()} ج.س</td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: it.profit > 0 ? P.green : P.rose, fontWeight: 700 }}>{(it.profit || 0).toLocaleString()} ج.س</td>
                </tr>
              ))}
            </tbody>
          </table>
          </ResponsiveTable>
        </Card>
      )}
    </div>
  )
}

function PnLReport({ filters }: any) {
  const [sales, setSales] = useState<any>(null)
  const [expenses, setExpenses] = useState<any>(null)

  useEffect(() => {
    api?.orders?.salesSummary?.(filters).then((d: any) => d && setSales(d))
    api?.cash?.expensesSummary?.(filters).then((d: any) => d && setExpenses(d))
  }, [filters.startDate, filters.endDate])

  if (!sales || !expenses) return <div style={{ padding: 40, textAlign: 'center', color: P.faint }}>جاري التحميل…</div>

  const revenue = sales.totalRevenue || 0
  const cogs = sales.totalCost || 0
  const grossProfit = revenue - cogs
  const totalExpenses = expenses.totalExpenses || 0
  const netProfit = grossProfit - totalExpenses
  const grossMargin = revenue > 0 ? Math.round(grossProfit / revenue * 100) : 0
  const netMargin = revenue > 0 ? Math.round(netProfit / revenue * 100) : 0

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* P&L KPIs */}
      <KpiGrid min={180}>
        {[
          { l: 'إجمالي الإيرادات', v: revenue.toLocaleString(), c: P.purple, icon: '💰' },
          { l: 'تكلفة البضاعة (COGS)', v: cogs.toLocaleString(), c: P.rose, icon: '📦' },
          { l: 'الربح الإجمالي', v: grossProfit.toLocaleString(), c: grossProfit > 0 ? P.green : P.rose, icon: '📊', sub: `هامش ${grossMargin}%` },
          { l: 'المصروفات', v: totalExpenses.toLocaleString(), c: '#e67e22', icon: '🧾' },
          { l: 'صافي الربح', v: netProfit.toLocaleString(), c: netProfit > 0 ? P.green : P.rose, icon: netProfit > 0 ? '🟢' : '🔴', sub: `هامش ${netMargin}%` },
        ].map(k => (
          <Card key={k.l} style={{ padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>{k.icon}</span>
              <span style={{ fontSize: 13, color: P.muted, fontWeight: 700 }}>{k.l}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: k.c }}>{k.v} <span style={{ fontSize: 13, fontWeight: 600, color: P.muted }}>ج.س</span></div>
            {(k as any).sub && <div style={{ fontSize: 12, color: k.c, fontWeight: 700, marginTop: 4 }}>{(k as any).sub}</div>}
          </Card>
        ))}
      </KpiGrid>

      {/* P&L Waterfall Bar */}
      <Card style={{ padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: P.plum, marginBottom: 16 }}>📊 قائمة الأرباح والخسائر</div>
        {[{ l: 'الإيرادات', v: revenue, c: P.purple },
          { l: '(−) تكلفة البضاعة', v: cogs, c: P.rose },
          { l: '= الربح الإجمالي', v: grossProfit, c: grossProfit > 0 ? P.green : P.rose, bold: true },
          { l: '(−) المصروفات', v: totalExpenses, c: '#e67e22' },
          { l: '= صافي الربح', v: netProfit, c: netProfit > 0 ? P.green : P.rose, bold: true },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: (row as any).bold ? `2px solid ${P.border}` : `1px solid ${P.ghost}`, background: (row as any).bold ? P.bg2 : 'transparent' }}>
            <span style={{ flex: 1, fontSize: 15, fontWeight: (row as any).bold ? 900 : 600, color: (row as any).bold ? P.plum : P.ink }}>{row.l}</span>
            <span style={{ fontSize: 18, fontWeight: 900, color: row.c }}>{row.v.toLocaleString()} ج.س</span>
          </div>
        ))}
      </Card>

      {/* Expense categories breakdown */}
      {expenses.byCategory?.length > 0 && (
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: P.plum, marginBottom: 16 }}>🧾 تفصيل المصروفات حسب الفئة</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {expenses.byCategory.map((cat: any, i: number) => {
              const pct = totalExpenses > 0 ? Math.round(cat.cat_total / totalExpenses * 100) : 0
              const colors = [P.rose, '#e67e22', P.gold, P.purple, P.blue, P.green]
              const color = colors[i % colors.length]
              return (
                <div key={i} style={{ padding: 14, borderRadius: 14, border: `1px solid ${color}20`, background: `${color}08` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: P.ink, marginBottom: 4 }}>{cat.category || 'عام'}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color }}>{(cat.cat_total || 0).toLocaleString()} ج.س</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 99, background: P.bg2 }}>
                      <div style={{ height: '100%', borderRadius: 99, background: color, width: `${pct}%` }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color }}>{pct}%</span>
                  </div>
                  <div style={{ fontSize: 11, color: P.faint, marginTop: 4 }}>{cat.cat_count} عملية</div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Warning for historical data */}
      {cogs === 0 && revenue > 0 && (
        <div style={{ padding: '12px 16px', borderRadius: 12, background: `${P.gold}12`, border: `1px solid ${P.gold}30`, fontSize: 13, color: P.gold, fontWeight: 600 }}>
          ⚠️ تكلفة البضاعة = 0 — تأكد من إدخال التكلفة لكل صنف في إدارة القائمة. الطلبات القديمة قبل التحديث لا تحتوي على بيانات التكلفة.
        </div>
      )}
    </div>
  )
}

function PaymentsReport({ filters }: any) {
  const [summary, setSummary] = useState<any>(null)

  useEffect(() => {
    api?.orders?.salesSummary?.(filters).then((d: any) => d && setSummary(d))
  }, [filters.startDate, filters.endDate])

  if (!summary) return <div style={{ padding: 40, textAlign: 'center', color: P.faint, fontSize: 15 }}>جاري التحميل…</div>

  const total = summary.totalRevenue || 1
  const methods = [
    { l: 'نقداً', v: summary.cashSum || 0, c: P.green, bg: P.greenXL, count: summary.cashCount || 0 },
    { l: 'تحويل بنكي', v: summary.bankSum || 0, c: P.blue, bg: '#eff6ff', count: summary.bankCount || 0 },
    { l: 'دفع مقسم', v: summary.splitSum || 0, c: P.gold, bg: P.goldXL, count: summary.splitCount || 0 },
  ]

  // Per-bank breakdown
  const banks = summary.byBank || []

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Payment method cards */}
      <KpiGrid min={220}>
        {methods.map(m => (
          <Card key={m.l} style={{ padding: 18 }}>
            <div style={{ fontSize: 13, color: P.muted, fontWeight: 700, marginBottom: 6 }}>{m.l}</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: m.c }}>{m.v.toLocaleString()} ج.س</div>
            <div style={{ fontSize: 13, color: P.faint, marginTop: 4 }}>{m.count} طلب</div>
            <div style={{ marginTop: 10, height: 6, borderRadius: 99, background: P.bg2 }}>
              <div style={{ height: '100%', borderRadius: 99, background: m.c, width: `${Math.round(m.v / total * 100)}%`, transition: 'width .5s' }} />
            </div>
            <div style={{ fontSize: 12, color: m.c, fontWeight: 700, marginTop: 4 }}>{Math.round(m.v / total * 100)}%</div>
          </Card>
        ))}
      </KpiGrid>

      {/* Per-bank breakdown */}
      {banks.length > 0 && (
        <Card style={{ padding: 18 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: P.plum, marginBottom: 12 }}>تفصيل حسب البنك</div>
          <ResponsiveTable minWidth={520}>
          <table style={{ width: '100%', minWidth: 520, borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: `1.5px solid ${P.border}` }}>
              {['البنك', 'المبلغ', 'عدد العمليات', 'النسبة'].map(h => <th key={h} style={{ padding: '8px 12px', fontSize: 13, color: P.muted, fontWeight: 700, textAlign: 'right' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {banks.map((b: any, i: number) => (
                <tr key={i} style={{ borderBottom: `1px solid ${P.ghost}` }}>
                  <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 700, color: P.plum }}>{b.bank_name}</td>
                  <td style={{ padding: '10px 12px', fontSize: 15, fontWeight: 800, color: P.blue }}>{(b.total || 0).toLocaleString()} ج.س</td>
                  <td style={{ padding: '10px 12px', fontSize: 14, color: P.muted }}>{b.count} عملية</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 99, background: P.bg2 }}>
                        <div style={{ height: '100%', borderRadius: 99, background: P.blue, width: `${Math.round((b.total || 0) / total * 100)}%` }} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: P.blue }}>{Math.round((b.total || 0) / total * 100)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </ResponsiveTable>
        </Card>
      )}

      {/* Total summary */}
      <Card style={{ padding: 18, background: P.ghost }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: P.plum }}>إجمالي الإيرادات</span>
          <span style={{ fontSize: 26, fontWeight: 900, color: P.purple }}>{(summary.totalRevenue || 0).toLocaleString()} ج.س</span>
        </div>
      </Card>
    </div>
  )
}

function AuditLog({ filters }: any) {
  const [logs, setLogs] = useState<any[]>([])
  const [filterType, setFilterType] = useState('')

  useEffect(() => {
    api?.actionLog?.list?.({ action: filterType || undefined, ...filters }).then((d: any) => d && setLogs(d))
  }, [filterType, filters.startDate, filters.endDate])

  const actionLabels: Record<string, string> = {
    ORDER_CONFIRM: 'تأكيد طلب', ORDER_VOID: 'إلغاء طلب', SHIFT_OPEN: 'فتح وردية',
    SHIFT_CLOSE: 'إغلاق وردية', ITEM_CREATE: 'إضافة صنف', ITEM_UPDATE: 'تعديل صنف',
    ITEM_DELETE: 'حذف صنف', PO_CREATED: 'أمر شراء', VOID_ORDER: 'إلغاء طلب'
  }

  const logsPaged = usePaginated(logs, 10)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterType('')} style={{ padding: '5px 14px', borderRadius: 99, fontSize: 13, fontWeight: !filterType ? 700 : 500, cursor: 'pointer', border: `1.5px solid ${!filterType ? P.purple : P.borderM}`, background: !filterType ? P.purple : P.surface, color: !filterType ? '#fff' : P.muted, fontFamily: 'Tajawal,sans-serif' }}>الكل</button>
        {Object.entries(actionLabels).map(([k, v]) => (
          <button key={k} onClick={() => setFilterType(k)} style={{ padding: '5px 14px', borderRadius: 99, fontSize: 13, fontWeight: filterType === k ? 700 : 500, cursor: 'pointer', border: `1.5px solid ${filterType === k ? P.purple : P.borderM}`, background: filterType === k ? P.purple : P.surface, color: filterType === k ? '#fff' : P.muted, fontFamily: 'Tajawal,sans-serif' }}>{v}</button>
        ))}
      </div>
      <Card style={{ flex: 1, padding: 0, overflowY: 'auto', minHeight: 0 }}>
        <ResponsiveTable minWidth={680} stickyHeader>
          <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ background: P.bg2, borderBottom: `1.5px solid ${P.border}` }}>
              {['العملية', 'الموظف', 'التفاصيل', 'التاريخ'].map(h => <th key={h} style={{ padding: '10px 14px', fontSize: 13, color: P.muted, fontWeight: 700, textAlign: 'right' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {logsPaged.pageRows.map(log => (
                <tr key={log.id} style={{ borderBottom: `1px solid ${P.ghost}`, transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background = P.bg2} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '11px 14px' }}><Badge label={actionLabels[log.action] || log.action} bg={P.ghost} /></td>
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: P.ink, fontSize: 14 }}>{log.employee_name || 'مدير النظام'}</td>
                  <td style={{ padding: '11px 14px', color: P.muted, fontSize: 13 }}>{log.detail}</td>
                  <td style={{ padding: '11px 14px', color: P.faint, fontSize: 13 }}>{log.created_at?.slice(0, 16)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ResponsiveTable>
        {logs.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.faint, fontSize: 15 }}>لا توجد سجلات عمليات</div>}
      </Card>

      <Pagination
        page={logsPaged.page}
        totalPages={logsPaged.totalPages}
        total={logsPaged.total}
        startIndex={logsPaged.startIndex}
        endIndex={logsPaged.endIndex}
        onChange={logsPaged.setPage}
      />
    </div>
  )
}
