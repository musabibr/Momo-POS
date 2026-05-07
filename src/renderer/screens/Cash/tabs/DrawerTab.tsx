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
const PAGE_SIZE = 10

export function DrawerTab({ shift }: { shift: any }) {
  const [items, setItems] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [page, setPage] = useState(1)

  // Withdraw reasons
  const [wdReasons, setWdReasons] = useState<string[]>([])
  const [selReason, setSelReason] = useState('')
  const [showReasonMgr, setShowReasonMgr] = useState(false)
  const [newReason, setNewReason] = useState('')

  const load = () => api?.cash?.listPettyCash?.(shift?.id).then((d: any) => { if (d) { setItems(d); setPage(1) } })
  const loadReasons = () => api?.settings?.getWithdrawReasons?.().then((d: any) => {
    if (d) { setWdReasons(d); if (!selReason && d.length) setSelReason(d[0]) }
  })
  useEffect(() => { load(); loadReasons() }, [])

  const float = shift?.open_float || 0
  const currentBal = float + items.reduce((s: number, p: any) => s + (p.type === 'in' ? p.amount : -p.amount), 0)

  const totalPages = Math.ceil(items.length / PAGE_SIZE)
  const paged = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  async function add() {
    if (!amount) { toast('المبلغ مطلوب'); return }
    let finalReason: string
    if (showAdd === 'out') {
      if (!selReason) { toast('اختر سبب السحب'); return }
      finalReason = note.trim() ? `${selReason} — ${note.trim()}` : selReason
    } else {
      if (!reason) { toast('السبب مطلوب'); return }
      finalReason = reason
    }
    await api?.cash?.logPettyCash?.(showAdd, parseInt(amount), finalReason, shift?.id)
    toast('تم التسجيل ✓')
    load()
    setShowAdd(null); setAmount(''); setReason(''); setNote('')
  }

  async function addReason() {
    if (!newReason.trim()) return
    const updated = [...wdReasons, newReason.trim()]
    await api?.settings?.setWithdrawReasons?.(updated)
    setWdReasons(updated); setNewReason(''); toast('تمت الإضافة ✓')
  }
  async function removeReason(i: number) {
    const updated = wdReasons.filter((_, j) => j !== i)
    await api?.settings?.setWithdrawReasons?.(updated)
    setWdReasons(updated); toast('تم الحذف')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Balance bar */}
      <Card style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 13, color: P.muted, fontWeight: 700 }}>رصيد الدرج الحالي</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: P.purple }}>{currentBal.toLocaleString()} <span style={{ fontSize: 14, color: P.muted }}>ج.س</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" size="sm" icon="sett" onClick={() => setShowReasonMgr(true)}>أسباب السحب</Btn>
          <Btn variant="success" icon="plus" onClick={() => { setShowAdd('in'); setReason(''); setNote('') }}>إيداع</Btn>
          <Btn variant="danger" icon="minus" onClick={() => { setShowAdd('out'); setSelReason(wdReasons[0] || ''); setNote('') }}>سحب</Btn>
        </div>
      </Card>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, border: `1px solid ${P.border}`, borderRadius: 14, background: P.surface }}>
        {items.length === 0 && <div style={{ textAlign: 'center', padding: 50, color: P.faint, fontSize: 15 }}>لا توجد حركات درج</div>}
        {paged.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'Tajawal,sans-serif' }}>
            <thead>
              <tr style={{ background: P.bg2, position: 'sticky', top: 0, zIndex: 1 }}>
                {['م', 'الوقت', 'النوع', 'المبلغ', 'السبب', 'الموظف', 'الرصيد'].map(h => (
                  <th key={h} style={{ padding: '10px 8px', fontSize: 13, fontWeight: 800, color: P.plum, textAlign: 'right', borderBottom: `2px solid ${P.borderM}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paged.map((p, idx) => {
                const globalIdx = (page - 1) * PAGE_SIZE + idx
                let bal = float
                for (let i = items.length - 1; i >= globalIdx; i--) {
                  bal += items[i].type === 'in' ? items[i].amount : -items[i].amount
                }
                return (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${P.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = P.ghost}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 8px', color: P.faint, fontSize: 13 }}>{items.length - globalIdx}</td>
                    <td style={{ padding: '10px 8px', color: P.muted, whiteSpace: 'nowrap' }}>{p.created_at?.slice(11, 16)}</td>
                    <td style={{ padding: '10px 8px' }}>
                      <Badge label={p.type === 'in' ? 'إيداع' : 'سحب'} color={p.type === 'in' ? P.green : P.rose} bg={p.type === 'in' ? P.greenXL : P.roseXL} />
                    </td>
                    <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: 15, color: p.type === 'in' ? P.green : P.rose }}>
                      {p.type === 'in' ? '+' : '−'}{(p.amount || 0).toLocaleString()}
                    </td>
                    <td style={{ padding: '10px 8px', color: P.ink }}>{p.reason}</td>
                    <td style={{ padding: '10px 8px', color: P.muted }}>{p.employee_name || '—'}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 700, color: P.purple }}>{bal.toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0 }}>
          <Btn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← السابق</Btn>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1
            return <button key={p} onClick={() => setPage(p)} style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${page === p ? P.purple : P.borderM}`, background: page === p ? P.purple : P.surface, color: page === p ? '#fff' : P.muted, cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Tajawal,sans-serif' }}>{p}</button>
          })}
          {totalPages > 7 && <span style={{ color: P.faint }}>…</span>}
          <Btn variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>التالي →</Btn>
          <span style={{ fontSize: 13, color: P.muted, marginRight: 8 }}>صفحة {page} من {totalPages}</span>
        </div>
      )}

      {/* Deposit modal — free text reason */}
      {showAdd === 'in' && (
        <Modal title="إيداع في الدرج" onClose={() => setShowAdd(null)} width={360} icon="cash">
          <Field label="المبلغ (ج.س)" required><Inp value={amount} onChange={(e: any) => setAmount(e.target.value)} type="number" autoFocus /></Field>
          <Field label="السبب" required><Inp value={reason} onChange={(e: any) => setReason(e.target.value)} placeholder="سبب الإيداع" /></Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setShowAdd(null)} style={{ flex: 1 }}>إلغاء</Btn>
            <Btn variant="success" onClick={add} style={{ flex: 1 }} disabled={!amount || !reason}>تسجيل</Btn>
          </div>
        </Modal>
      )}

      {/* Withdraw modal — selectable reason + optional note */}
      {showAdd === 'out' && (
        <Modal title="سحب من الدرج" onClose={() => setShowAdd(null)} width={380} icon="cash">
          <Field label="المبلغ (ج.س)" required><Inp value={amount} onChange={(e: any) => setAmount(e.target.value)} type="number" autoFocus /></Field>
          <Field label="سبب السحب" required>
            <Sel value={selReason} onChange={(e: any) => setSelReason(e.target.value)}
              options={wdReasons.map(r => ({ value: r, label: r }))} />
          </Field>
          <Field label="ملاحظة"><Inp value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="تفاصيل إضافية (اختياري)" /></Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setShowAdd(null)} style={{ flex: 1 }}>إلغاء</Btn>
            <Btn variant="danger" onClick={add} style={{ flex: 1 }} disabled={!amount || !selReason}>تسجيل</Btn>
          </div>
        </Modal>
      )}

      {/* Withdraw reasons manager */}
      {showReasonMgr && (
        <Modal title="إدارة أسباب السحب" onClose={() => setShowReasonMgr(false)} width={400} icon="sett">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {wdReasons.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: P.bg2, borderRadius: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: P.plum }}>{r}</span>
                <Btn variant="secondary" size="sm" onClick={() => removeReason(i)} style={{ color: P.rose, borderColor: P.roseL }}>حذف</Btn>
              </div>
            ))}
            {wdReasons.length === 0 && <div style={{ textAlign: 'center', color: P.faint, padding: 20 }}>لا توجد أسباب</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Inp value={newReason} onChange={(e: any) => setNewReason(e.target.value)} placeholder="سبب جديد…" onKeyDown={(e: any) => e.key === 'Enter' && addReason()} />
            <Btn variant="primary" onClick={addReason}>إضافة</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
