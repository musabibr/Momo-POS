import React, { useState, useEffect } from 'react'
import { P } from '../../../tokens'
import { Btn } from '../../../components/Btn'
import { Inp, Field } from '../../../components/Inp'
import { Sel } from '../../../components/Sel'
import { Modal } from '../../../components/Modal'
import { Badge } from '../../../components/TabBar'
import { Icon } from '../../../components/Icon'
import { Card } from '../../../components/Card'
import { toast } from '../../../components/Toast'

const api = (window as any).api
const PAGE_SIZE = 10

export function ExpensesTab({ shift }: { shift: any }) {
  const [items, setItems] = useState<any[]>([])
  const [cats, setCats] = useState<string[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [showCatMgr, setShowCatMgr] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [page, setPage] = useState(1)

  const loadCats = () => api?.settings?.getExpenseCategories?.().then((d: any) => {
    if (d) { setCats(d); if (!category && d.length) setCategory(d[0]) }
  })
  const load = () => api?.cash?.listExpenses?.(shift?.id).then((d: any) => { if (d) { setItems(d); setPage(1) } })
  useEffect(() => { loadCats(); load() }, [])

  const totalExp = items.reduce((s, e) => s + e.amount, 0)

  // Category summary
  const catSummary = new Map<string, number>()
  items.forEach(e => catSummary.set(e.category, (catSummary.get(e.category) || 0) + e.amount))

  async function add() {
    if (!amount) { toast('المبلغ مطلوب'); return }
    await api?.cash?.logExpense?.(parseInt(amount), category || 'عام', note, shift?.id)
    toast('تم تسجيل المصروف ✓')
    load(); setShowAdd(false); setAmount(''); setNote('')
  }

  async function addCat() {
    if (!newCat.trim()) return
    const updated = [...cats, newCat.trim()]
    await api?.settings?.setExpenseCategories?.(updated)
    setCats(updated); setNewCat(''); toast('تمت الإضافة ✓')
  }

  async function removeCat(i: number) {
    const updated = cats.filter((_, j) => j !== i)
    await api?.settings?.setExpenseCategories?.(updated)
    setCats(updated); toast('تم الحذف')
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: P.plum }}>إجمالي المصروفات: <span style={{ color: P.rose }}>{totalExp.toLocaleString()} ج.س</span></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" size="sm" icon="sett" onClick={() => setShowCatMgr(true)}>الفئات</Btn>
          <Btn variant="primary" icon="plus" onClick={() => setShowAdd(true)}>تسجيل مصروف</Btn>
        </div>
      </div>

      {/* Category summary chips */}
      {catSummary.size > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Array.from(catSummary).map(([cat, amt]) => (
            <span key={cat} style={{ padding: '4px 12px', borderRadius: 99, fontSize: 13, fontWeight: 700, background: P.bg2, color: P.plum, border: `1px solid ${P.border}` }}>
              {cat}: <span style={{ color: P.rose }}>−{amt.toLocaleString()}</span>
            </span>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, border: `1px solid ${P.border}`, borderRadius: 14, background: P.surface }}>
        {items.length === 0 && <div style={{ textAlign: 'center', padding: 50, color: P.faint, fontSize: 15 }}>لا توجد مصروفات</div>}
        {items.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: 'Cairo,sans-serif' }}>
            <thead>
              <tr style={{ background: P.bg2, position: 'sticky', top: 0, zIndex: 1 }}>
                {['م', 'الوقت', 'الفئة', 'المبلغ', 'الملاحظة', 'الموظف'].map(h => (
                  <th key={h} style={{ padding: '10px 8px', fontSize: 13, fontWeight: 800, color: P.plum, textAlign: 'right', borderBottom: `2px solid ${P.borderM}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => { const totalPages = Math.ceil(items.length / PAGE_SIZE); const paged = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE); return paged.map((e, idx) => (
                <tr key={e.id} style={{ borderBottom: `1px solid ${P.border}` }}
                  onMouseEnter={ev => ev.currentTarget.style.background = P.ghost}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 8px', color: P.faint, fontSize: 13 }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                  <td style={{ padding: '10px 8px', color: P.muted, whiteSpace: 'nowrap' }}>{e.created_at?.slice(11, 16)}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <Badge label={e.category} color={P.purple} bg={P.purpleXL} />
                  </td>
                  <td style={{ padding: '10px 8px', fontWeight: 800, color: P.rose, fontSize: 15 }}>−{(e.amount || 0).toLocaleString()}</td>
                  <td style={{ padding: '10px 8px', color: P.ink }}>{e.note || '—'}</td>
                  <td style={{ padding: '10px 8px', color: P.muted }}>{e.employee_name || '—'}</td>
                </tr>
              )) })()} 
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {(() => { const totalPages = Math.ceil(items.length / PAGE_SIZE); return totalPages > 1 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0 }}>
          <Btn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← السابق</Btn>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = i + 1
            return <button key={p} onClick={() => setPage(p)} style={{ width: 34, height: 34, borderRadius: 8, border: `1.5px solid ${page === p ? P.purple : P.borderM}`, background: page === p ? P.purple : P.surface, color: page === p ? '#fff' : P.muted, cursor: 'pointer', fontSize: 14, fontWeight: 800, fontFamily: 'Cairo,sans-serif' }}>{p}</button>
          })}
          {totalPages > 7 && <span style={{ color: P.faint }}>…</span>}
          <Btn variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>التالي →</Btn>
          <span style={{ fontSize: 13, color: P.muted, marginRight: 8 }}>صفحة {page} من {totalPages}</span>
        </div>
      ) : null })()}

      {/* Add expense modal */}
      {showAdd && (
        <Modal title="تسجيل مصروف" onClose={() => setShowAdd(false)} width={380} icon="cash">
          <Field label="المبلغ (ج.س)" required><Inp value={amount} onChange={(e: any) => setAmount(e.target.value)} type="number" autoFocus /></Field>
          <Field label="الفئة">
            <Sel value={category} onChange={(e: any) => setCategory(e.target.value)} options={cats.map(c => ({ value: c, label: c }))} />
          </Field>
          <Field label="ملاحظة"><Inp value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="وصف المصروف" /></Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>إلغاء</Btn>
            <Btn variant="primary" onClick={add} style={{ flex: 1 }} disabled={!amount}>تسجيل</Btn>
          </div>
        </Modal>
      )}

      {/* Category manager modal */}
      {showCatMgr && (
        <Modal title="إدارة فئات المصروفات" onClose={() => setShowCatMgr(false)} width={400} icon="sett">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {cats.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: P.bg2, borderRadius: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: P.plum }}>{c}</span>
                <Btn variant="secondary" size="sm" onClick={() => removeCat(i)} style={{ color: P.rose, borderColor: P.roseL }}>حذف</Btn>
              </div>
            ))}
            {cats.length === 0 && <div style={{ textAlign: 'center', color: P.faint, padding: 20 }}>لا توجد فئات</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Inp value={newCat} onChange={(e: any) => setNewCat(e.target.value)} placeholder="فئة جديدة…" onKeyDown={(e: any) => e.key === 'Enter' && addCat()} />
            <Btn variant="primary" onClick={addCat}>إضافة</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
