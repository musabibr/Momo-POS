import React, { useState, useEffect } from 'react'
import { P } from '../../../tokens'
import { Btn } from '../../../components/Btn'
import { Inp, Field } from '../../../components/Inp'
import { Modal } from '../../../components/Modal'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { toast } from '../../../components/Toast'

const api = (window as any).api

export function ReconcileTab({ shift, onShiftClosed }: { shift: any; onShiftClosed: () => void }) {
  const [counted, setCounted] = useState('')
  const [summary, setSummary] = useState<any>(null)
  const [petty, setPetty] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [closing, setClosing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (shift?.id) {
      api?.cash?.getRevenueSummary?.(shift.id).then((d: any) => d && setSummary(d))
      api?.cash?.listPettyCash?.(shift.id).then((d: any) => d && setPetty(d))
      api?.cash?.listExpenses?.(shift.id).then((d: any) => d && setExpenses(d))
    }
  }, [shift])

  const float = shift?.open_float || 0
  const cashSales = summary?.byCash || 0
  const bankSales = summary?.byBank || 0
  const pettyCashIn = petty.filter(p => p.type === 'in').reduce((s, p) => s + p.amount, 0)
  const pettyCashOut = petty.filter(p => p.type === 'out').reduce((s, p) => s + p.amount, 0)
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const expected = float + cashSales + pettyCashIn - pettyCashOut - totalExpenses
  const countedNum = parseInt(counted || '0')
  const diff = countedNum - expected

  const closeShift = async () => {
    setClosing(true)
    try {
      await api?.shifts?.close?.(shift.id, countedNum)
      // Auto-print Z-Report
      try {
        const data = await api?.cash?.getZReportData?.(shift.id)
        if (data) api?.printer?.printZReport?.(data).catch(() => {})
      } catch {}
      toast('تم إغلاق الوردية بنجاح ✓')
      setShowConfirm(false)
      onShiftClosed?.()
    } catch (err: any) { toast(err?.message || 'خطأ في إغلاق الوردية') }
    setClosing(false)
  }

  const rows = [
    { l: 'الرصيد الافتتاحي', v: float, c: P.ink },
    { l: 'المبيعات النقدية', v: cashSales, c: P.green, sign: '+' },
    { l: 'إيداعات درج', v: pettyCashIn, c: P.green, sign: '+' },
    { l: 'سحوبات درج', v: pettyCashOut, c: P.rose, sign: '−' },
    { l: 'المصروفات', v: totalExpenses, c: P.rose, sign: '−' },
  ]

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Responsive 2-col */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        {/* Reconciliation breakdown */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: P.plum, marginBottom: 14 }}>تفاصيل المطابقة</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(r => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${P.border}` }}>
                <span style={{ fontSize: 14, color: P.muted }}>{r.l}</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: r.c }}>{r.sign || ''}{r.v.toLocaleString()} ج.س</span>
              </div>
            ))}
            {/* Bank info row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${P.border}` }}>
              <span style={{ fontSize: 14, color: P.muted }}>تحويلات بنكية (للعلم)</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: P.blue }}>{bankSales.toLocaleString()} ج.س</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: `2px solid ${P.purple}` }}>
              <span style={{ fontSize: 17, fontWeight: 900, color: P.plum }}>النقد المتوقع</span>
              <span style={{ fontSize: 22, fontWeight: 900, color: P.purple }}>{expected.toLocaleString()} ج.س</span>
            </div>
          </div>
        </Card>

        {/* Counted input */}
        <Card style={{ padding: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: P.plum, marginBottom: 14 }}>العد الفعلي</div>
          <Field label="النقد المعدود فعلياً (ج.س)" required>
            <Inp value={counted} onChange={(e: any) => setCounted(e.target.value)} type="number" placeholder="أدخل المبلغ المعدود" style={{ fontSize: 22, fontWeight: 800, textAlign: 'center' }} />
          </Field>

          {counted && (
            <div style={{ marginTop: 14, background: diff === 0 ? P.greenXL : diff > 0 ? P.greenXL : P.roseXL, border: `1px solid ${diff === 0 ? P.greenL : diff > 0 ? P.greenL : P.roseL}`, borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: diff >= 0 ? P.green : P.rose, marginBottom: 4, fontWeight: 700 }}>
                {diff === 0 ? 'مطابق تماماً ✓' : diff > 0 ? 'فائض' : 'عجز'}
              </div>
              <div style={{ fontSize: 32, fontWeight: 900, color: diff >= 0 ? P.green : P.rose }}>
                {diff > 0 ? '+' : ''}{diff.toLocaleString()} ج.س
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Close button */}
      <Btn variant="danger" size="lg" fullWidth icon="check" disabled={!counted} onClick={() => setShowConfirm(true)}>
        إغلاق الوردية
      </Btn>

      {/* Confirmation modal */}
      {showConfirm && (
        <Modal title="تأكيد إغلاق الوردية" onClose={() => setShowConfirm(false)} width={420} icon="alert">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: P.roseXL, border: `2px solid ${P.roseL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Icon name="alert" size={26} color={P.rose} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: P.plum }}>هل تريد إغلاق الوردية؟</div>
            <div style={{ fontSize: 14, color: P.muted, marginTop: 4 }}>سيتم طباعة تقرير Z تلقائياً</div>
          </div>
          <div style={{ background: P.bg2, borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: P.muted }}>المتوقع</span>
              <span style={{ fontWeight: 800, color: P.purple }}>{expected.toLocaleString()} ج.س</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ color: P.muted }}>المعدود</span>
              <span style={{ fontWeight: 800, color: P.plum }}>{countedNum.toLocaleString()} ج.س</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${P.border}`, paddingTop: 6 }}>
              <span style={{ fontWeight: 800, color: diff >= 0 ? P.green : P.rose }}>الفرق</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: diff >= 0 ? P.green : P.rose }}>{diff > 0 ? '+' : ''}{diff.toLocaleString()} ج.س</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>تراجع</Btn>
            <Btn variant="danger" style={{ flex: 1 }} disabled={closing} onClick={closeShift}>
              {closing ? 'جاري الإغلاق…' : 'تأكيد الإغلاق'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
