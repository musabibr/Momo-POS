import React, { useState, useEffect } from 'react'
import { P } from '../../../tokens'
import { Card } from '../../../components/Card'
import { KpiGrid } from '../../../components/layouts'
import { LoadingPlaceholder } from '../../../components/LoadingPlaceholder'

const api = (window as any).api

export function OverviewTab({ shift }: { shift: any }) {
  const [summary, setSummary] = useState<any>(null)
  const [petty, setPetty] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (shift?.id) {
      setLoading(true)
      Promise.all([
        api?.cash?.getRevenueSummary?.(shift.id).then((d: any) => d && setSummary(d)),
        api?.cash?.listPettyCash?.(shift.id).then((d: any) => d && setPetty(d)),
        api?.cash?.listExpenses?.(shift.id).then((d: any) => d && setExpenses(d)),
      ]).finally(() => setLoading(false))
    }
  }, [shift])

  if (loading) return <LoadingPlaceholder />

  const total = summary?.total || 0
  const cashSales = summary?.byCash || 0
  const bankSales = summary?.byBank || 0
  const orderCount = summary?.orderCount || 0
  const totalDisc = summary?.totalDiscount || 0
  const pettyCashIn = petty.filter(p => p.type === 'in').reduce((s, p) => s + p.amount, 0)
  const pettyCashOut = petty.filter(p => p.type === 'out').reduce((s, p) => s + p.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const float = shift?.open_float || 0
  const expected = float + cashSales + pettyCashIn - pettyCashOut - totalExpenses

  return (
    <KpiGrid min={180} style={{ flex: 1 }}>
      {[
        { l: 'إجمالي الإيرادات', v: `${total.toLocaleString()} ج.س`, c: P.purple, sub: `${orderCount} طلب` },
        { l: 'مبيعات نقدية', v: `${cashSales.toLocaleString()} ج.س`, c: P.green },
        { l: 'تحويل بنكي', v: `${bankSales.toLocaleString()} ج.س`, c: P.blue },
        { l: 'الخصومات', v: `−${totalDisc.toLocaleString()} ج.س`, c: P.pink },
        { l: 'إيداعات درج', v: `+${pettyCashIn.toLocaleString()} ج.س`, c: P.green },
        { l: 'سحوبات درج', v: `−${pettyCashOut.toLocaleString()} ج.س`, c: P.rose },
        { l: 'مصروفات', v: `−${totalExpenses.toLocaleString()} ج.س`, c: P.rose },
        { l: 'النقد المتوقع بالدرج', v: `${expected.toLocaleString()} ج.س`, c: P.gold, highlight: true },
      ].map(k => (
        <Card key={k.l} style={{ padding: 16, background: k.highlight ? P.ghost : P.surface }}>
          <div style={{ fontSize: 13, color: P.muted, marginBottom: 4, fontWeight: 700 }}>{k.l}</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: k.c }}>{k.v}</div>
          {k.sub && <div style={{ fontSize: 12, color: P.faint, marginTop: 2 }}>{k.sub}</div>}
        </Card>
      ))}
    </KpiGrid>
  )
}
