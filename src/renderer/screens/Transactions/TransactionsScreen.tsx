import { useState, useEffect } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp, Sel, Field } from '../../components/Inp'
import { Modal } from '../../components/Modal'
import { Badge } from '../../components/TabBar'
import { Icon } from '../../components/Icon'
import { Card } from '../../components/Card'
import { toast } from '../../components/Toast'
import { ResponsiveTable, Pagination, usePaginated } from '../../components/layouts'

const api = (window as any).api

const PAY: Record<string,string> = { cash:'نقداً', bank:'تحويل بنكي', split:'مقسّم' }
const TYPE: Record<string,string> = { local:'🍽️ محلي', takeaway:'📦 سفري', delivery:'🚗 توصيل' }
const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
const today = () => fmtDate(new Date())
const weekAgo = () => { const d = new Date(); d.setDate(d.getDate() - 7); return fmtDate(d) }
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01` }

export function TransactionsScreen({ role, employeeId }: { role: string; employeeId?: number }) {
  const isManager = role === 'admin' || role === 'manager'
  const [orders, setOrders] = useState<any[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [requireReason, setRequireReason] = useState(true)

  // Filters — default to showing all orders up to today
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [fStatus, setFStatus] = useState<string>('all')
  const [fPayMode, setFPayMode] = useState<string>('all')
  const [fEmployee, setFEmployee] = useState<string>('all')
  const [fOrderType, setFOrderType] = useState<string>('all')
  const [searchNum, setSearchNum] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Detail/void state
  const [selected, setSelected] = useState<any>(null)
  const [showVoid, setShowVoid] = useState<any>(null)
  const [voidPin, setVoidPin] = useState('')
  const [voidReason, setVoidReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  // Correction state
  const [showCorrect, setShowCorrect] = useState<any>(null)
  const [corrItems, setCorrItems] = useState<any[]>([])
  const [corrReason, setCorrReason] = useState('')
  const [corrPin, setCorrPin] = useState('')
  const [correcting, setCorrecting] = useState(false)

  useEffect(() => {
    if (isManager) api?.employees?.list?.().then((d: any) => d && setEmployees(d))
    api?.settings?.get?.('require_void_reason').then((v: any) => {
      if (v != null) setRequireReason(v === '1' || v === 'true' || v === true)
    })
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (startDate) filters.startDate = startDate + ' 00:00:00'
      if (endDate) filters.endDate = endDate + ' 23:59:59'
      if (fStatus !== 'all') filters.status = fStatus
      if (fPayMode !== 'all') filters.payMode = fPayMode
      if (isManager && fEmployee !== 'all') filters.employeeId = parseInt(fEmployee)
      if (fOrderType !== 'all') filters.orderType = fOrderType
      if (searchNum.trim()) filters.orderNum = parseInt(searchNum)

      const d = isManager ? await api?.orders?.list?.(filters) : await api?.orders?.myOrders?.(filters)
      setOrders(Array.isArray(d) ? d : [])
    } catch (_) { toast('خطأ في تحميل المعاملات') }
    setLoading(false)
  }
  const paged = usePaginated(orders, 15)
  useEffect(() => { paged.setPage(1); load() }, [startDate, endDate, fStatus, fPayMode, fEmployee, fOrderType, searchNum])

  // Stats
  const confirmed = orders.filter(o => o.status === 'confirmed')
  const voided = orders.filter(o => o.status === 'voided')
  const totalRev = confirmed.reduce((s, o) => s + (o.total || 0), 0)
  const totalDisc = confirmed.reduce((s, o) => s + (o.disc_amount || 0), 0)
  const cashTotal = confirmed.reduce((s, o) => s + (o.pay_mode === 'cash' ? o.total : o.pay_mode === 'split' ? (o.cash_part || 0) : 0), 0)
  const bankTotal = confirmed.reduce((s, o) => s + (o.pay_mode === 'bank' ? o.total : o.pay_mode === 'split' ? (o.bank_part || 0) : 0), 0)

  // Employee summary
  const empMap = new Map<number, { name: string; count: number; total: number }>()
  confirmed.forEach(o => {
    const e = empMap.get(o.employee_id) || { name: '', count: 0, total: 0 }
    const emp = employees.find((x: any) => x.id === o.employee_id)
    e.name = emp?.name || `#${o.employee_id}`
    e.count++; e.total += o.total || 0
    empMap.set(o.employee_id, e)
  })

  const doVoid = async () => {
    if (!voidPin || (requireReason && !voidReason)) { toast(requireReason ? 'أدخل رمز PIN وسبب الإلغاء' : 'أدخل رمز PIN'); return }
    setVoiding(true)
    try {
      const r = await api?.employees?.verifyAnyManagerPin?.(voidPin)
      if (!r?.valid) { toast('رمز PIN خاطئ'); setVoidPin(''); setVoiding(false); return }
      await api?.orders?.void?.(showVoid.id, r.employeeId, voidReason || 'بدون سبب')
      toast('تم إلغاء الطلب ✓')
      setShowVoid(null); setVoidPin(''); setVoidReason(''); setSelected(null)
      load()
    } catch (err: any) { toast(err?.message || 'خطأ في إلغاء الطلب') }
    setVoiding(false)
  }

  const reprint = (o: any) => {
    const receiptData = {
      orderNum: o.order_num, total: o.total, subtotal: o.subtotal, discAmount: o.disc_amount,
      payMode: o.pay_mode, cashIn: o.cash_in, cashChange: o.cash_change,
      bankName: o.bank_name, bankRef: o.bank_ref, bankAmount: o.bank_part,
      createdAt: o.created_at, orderType: o.order_type, orderNote: o.order_note,
      items: (o.items || []).map((it: any) => ({ name: it.name, qty: it.qty, unitPrice: it.unit_price }))
    }
    api?.printer?.print?.(receiptData).catch(() => {})
    api?.printer?.printKitchen?.(receiptData).catch(() => {})
    toast('جاري إعادة الطباعة…')
  }

  const setQuickDate = (s: string, e: string) => { setStartDate(s); setEndDate(e) }

  // Order-type breakdown
  const localOrders = confirmed.filter(o => o.order_type === 'local')
  const takeawayOrders = confirmed.filter(o => o.order_type === 'takeaway')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20, gap: 14, direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: P.plum }}>المعاملات</div>
          <div style={{ fontSize: 15, color: P.muted }}>{isManager ? 'جميع المعاملات' : 'معاملاتي'} · {orders.length} طلب</div>
        </div>
        <Btn variant="secondary" icon="refresh" onClick={load} disabled={loading}>{loading ? 'جاري التحميل…' : 'تحديث'}</Btn>
      </div>

      {/* Quick date buttons + Filters */}
      <Card style={{ padding: '14px 18px' }}>
        {/* Quick dates */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          {[
            { l: 'اليوم', fn: () => setQuickDate(today(), today()) },
            { l: 'هذا الأسبوع', fn: () => setQuickDate(weekAgo(), today()) },
            { l: 'هذا الشهر', fn: () => setQuickDate(monthStart(), today()) },
            { l: 'الكل', fn: () => setQuickDate('', today()) },
          ].map(b => (
            <button key={b.l} onClick={b.fn} style={{ padding: '7px 16px', borderRadius: 99, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${P.borderM}`, background: P.surface, color: P.purple, fontFamily: 'Tajawal,sans-serif' }}>{b.l}</button>
          ))}
        </div>
        {/* Filter row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 130 }}>
            <div style={{ fontSize: 13, color: P.muted, marginBottom: 3, fontWeight: 700 }}>من تاريخ</div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, fontFamily: 'Tajawal,sans-serif', background: P.bg2, color: P.ink, outline: 'none' }} />
          </div>
          <div style={{ minWidth: 130 }}>
            <div style={{ fontSize: 13, color: P.muted, marginBottom: 3, fontWeight: 700 }}>إلى تاريخ</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, fontFamily: 'Tajawal,sans-serif', background: P.bg2, color: P.ink, outline: 'none' }} />
          </div>
          <div style={{ minWidth: 100 }}>
            <div style={{ fontSize: 13, color: P.muted, marginBottom: 3, fontWeight: 700 }}>الحالة</div>
            <select value={fStatus} onChange={e => setFStatus(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, fontFamily: 'Tajawal,sans-serif', background: P.bg2, color: P.ink, outline: 'none' }}>
              <option value="all">الكل</option>
              <option value="confirmed">مؤكد</option>
              <option value="voided">ملغي</option>
            </select>
          </div>
          <div style={{ minWidth: 110 }}>
            <div style={{ fontSize: 13, color: P.muted, marginBottom: 3, fontWeight: 700 }}>طريقة الدفع</div>
            <select value={fPayMode} onChange={e => setFPayMode(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, fontFamily: 'Tajawal,sans-serif', background: P.bg2, color: P.ink, outline: 'none' }}>
              <option value="all">الكل</option>
              <option value="cash">نقداً</option>
              <option value="bank">تحويل بنكي</option>
              <option value="split">مقسّم</option>
            </select>
          </div>
          <div style={{ minWidth: 100 }}>
            <div style={{ fontSize: 13, color: P.muted, marginBottom: 3, fontWeight: 700 }}>نوع الطلب</div>
            <select value={fOrderType} onChange={e => setFOrderType(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, fontFamily: 'Tajawal,sans-serif', background: P.bg2, color: P.ink, outline: 'none' }}>
              <option value="all">الكل</option>
              <option value="local">محلي</option>
              <option value="takeaway">سفري</option>
            </select>
          </div>
          {isManager && (
            <div style={{ minWidth: 130 }}>
              <div style={{ fontSize: 13, color: P.muted, marginBottom: 3, fontWeight: 700 }}>الموظف</div>
              <select value={fEmployee} onChange={e => setFEmployee(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, fontFamily: 'Tajawal,sans-serif', background: P.bg2, color: P.ink, outline: 'none' }}>
                <option value="all">جميع الموظفين</option>
                {employees.filter(e => e.active !== 0).map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ minWidth: 100 }}>
            <div style={{ fontSize: 13, color: P.muted, marginBottom: 3, fontWeight: 700 }}>رقم الطلب</div>
            <input value={searchNum} onChange={e => setSearchNum(e.target.value.replace(/\D/g,''))} placeholder="بحث #"
              style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, fontFamily: 'Tajawal,sans-serif', background: P.bg2, color: P.ink, outline: 'none' }} />
          </div>
        </div>
      </Card>

      {/* Summary KPIs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { l: 'إجمالي المبيعات', v: totalRev, c: P.purple, sub: `${confirmed.length} طلب` },
          { l: 'نقداً', v: cashTotal, c: P.green },
          { l: 'بنكي', v: bankTotal, c: P.blue },
          { l: 'محلي 🍽️', v: localOrders.reduce((s,o) => s+o.total,0), c: P.green, sub: `${localOrders.length} طلب` },
          { l: 'سفري 📦', v: takeawayOrders.reduce((s,o) => s+o.total,0), c: P.gold, sub: `${takeawayOrders.length} طلب` },
          { l: 'خصومات', v: totalDisc, c: P.rose },
          { l: 'ملغي', v: voided.reduce((s, o) => s + o.total, 0), c: P.faint, sub: `${voided.length} طلب` },
        ].map(k => (
          <Card key={k.l} style={{ flex: '1 1 110px', padding: '12px 14px', minWidth: 110 }}>
            <div style={{ fontSize: 13, color: P.muted, fontWeight: 700 }}>{k.l}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: k.c }}>{k.v.toLocaleString()} <span style={{ fontSize: 12 }}>ج.س</span></div>
            {k.sub && <div style={{ fontSize: 12, color: P.faint }}>{k.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Per-employee breakdown (manager only) */}
      {isManager && empMap.size > 1 && (
        <Card style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: P.plum, marginBottom: 8 }}>مبيعات حسب الموظف</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Array.from(empMap.entries()).map(([id, e]) => (
              <div key={id} onClick={() => setFEmployee(String(id))} style={{
                padding: '7px 16px', borderRadius: 10, background: fEmployee === String(id) ? `${P.purple}15` : P.bg2,
                border: `1.5px solid ${fEmployee === String(id) ? P.purple : P.border}`, cursor: 'pointer', fontSize: 14
              }}>
                <span style={{ fontWeight: 700, color: P.plum }}>{e.name}</span>
                <span style={{ color: P.muted, marginRight: 8 }}>{e.count} طلب · {e.total.toLocaleString()} ج.س</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Order table */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {orders.length === 0 && !loading ? (
          <Card style={{ padding: 50, textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10, opacity: 0.3 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: P.muted }}>لا توجد معاملات</div>
            <div style={{ fontSize: 13, color: P.faint, marginTop: 4 }}>جرب تغيير الفلاتر أو التاريخ</div>
          </Card>
        ) : orders.length > 0 && (
          <ResponsiveTable minWidth={700} stickyHeader>
            <table style={{ width: '100%', minWidth: 700, borderCollapse: 'collapse', fontSize: 14, fontFamily: 'Tajawal,sans-serif' }}>
              <thead>
                <tr style={{ background: P.bg2 }}>
                  {['#', 'التاريخ', 'النوع', 'الأصناف', 'الإجمالي', 'الدفع', ...(isManager ? ['الموظف'] : []), 'الحالة', ''].map(h => (
                    <th key={h} style={{ padding: '10px 10px', fontSize: 12, fontWeight: 800, color: P.plum, textAlign: 'right', borderBottom: `2px solid ${P.borderM}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.pageRows.map((o: any) => {
                  const emp = employees.find((e: any) => e.id === o.employee_id)
                  const isVoided = o.status === 'voided'
                  const isExpanded = expandedId === o.id
                  const itemCount = (o.items || []).length
                  return (
                    <>
                      <tr key={o.id}
                        style={{ cursor: 'pointer', borderBottom: isExpanded ? 'none' : `1px solid ${P.ghost}`, opacity: isVoided ? 0.55 : 1, transition: 'background .1s' }}
                        onMouseEnter={e => e.currentTarget.style.background = P.bg2}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setExpandedId(isExpanded ? null : o.id)}>
                        <td style={{ padding: '10px', fontWeight: 900, color: P.green, fontSize: 15 }}>#{o.order_num}</td>
                        <td style={{ padding: '10px', color: P.muted, whiteSpace: 'nowrap', fontSize: 12 }}>
                          <div>{o.created_at?.slice(0, 10)}</div>
                          <div style={{ color: P.faint }}>{o.created_at?.slice(11, 16)}</div>
                        </td>
                        <td style={{ padding: '10px' }}>
                          {o.order_type && <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: o.order_type === 'takeaway' ? P.goldXL : P.greenXL, color: o.order_type === 'takeaway' ? P.gold : P.green }}>{o.order_type === 'takeaway' ? '📦 سفري' : '🍽️ محلي'}</span>}
                        </td>
                        <td style={{ padding: '10px', color: P.muted, fontSize: 13 }}>{itemCount} صنف</td>
                        <td style={{ padding: '10px', fontWeight: 900, color: P.purple, fontSize: 15 }}>{o.total?.toLocaleString()} <span style={{ fontSize: 10, fontWeight: 500 }}>ج.س</span></td>
                        <td style={{ padding: '10px' }}>
                          <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: o.pay_mode === 'cash' ? P.greenXL : o.pay_mode === 'bank' ? `${P.blue}15` : P.goldXL, color: o.pay_mode === 'cash' ? P.green : o.pay_mode === 'bank' ? P.blue : P.gold }}>{PAY[o.pay_mode] || o.pay_mode}</span>
                        </td>
                        {isManager && <td style={{ padding: '10px', color: P.muted, fontSize: 12 }}>{emp?.name || '—'}</td>}
                        <td style={{ padding: '10px' }}>
                          {isVoided ? <Badge label="ملغي" color={P.rose} bg={P.roseXL} /> : <Badge label="مؤكد" color={P.green} bg={P.greenXL} />}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button onClick={e => { e.stopPropagation(); setSelected(o) }} style={{ padding: '3px 8px', borderRadius: 7, border: `1px solid ${P.border}`, background: P.surface, cursor: 'pointer', fontSize: 11, color: P.purple, fontWeight: 700, fontFamily: 'Tajawal,sans-serif' }} title="تفاصيل">⋯</button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${o.id}-detail`} style={{ background: P.bg2 }}>
                          <td colSpan={isManager ? 9 : 8} style={{ padding: '10px 16px', borderBottom: `1.5px solid ${P.border}` }}>
                            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                              {/* Items list */}
                              <div style={{ flex: 2, minWidth: 200 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: P.purple, marginBottom: 4 }}>الأصناف</div>
                                {(o.items || []).map((it: any, i: number) => (
                                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0', borderBottom: i < (o.items||[]).length - 1 ? `1px dashed ${P.ghost}` : 'none' }}>
                                    <span style={{ color: P.plum, fontWeight: 600 }}>{it.qty}× {it.name}{it.variation_label ? ` (${it.variation_label})` : ''}</span>
                                    <span style={{ color: P.purple, fontWeight: 700 }}>{(it.unit_price * it.qty).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                              {/* Payment details */}
                              <div style={{ flex: 1, minWidth: 150 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: P.purple, marginBottom: 4 }}>تفاصيل الدفع</div>
                                {o.disc_amount > 0 && <div style={{ fontSize: 12, color: P.rose }}>خصم: −{o.disc_amount.toLocaleString()} {o.disc_reason ? `(${o.disc_reason})` : ''}</div>}
                                {o.pay_mode === 'cash' && <div style={{ fontSize: 12, color: P.muted }}>المدفوع: {(o.cash_in||0).toLocaleString()} · الباقي: {(o.cash_change||0).toLocaleString()}</div>}
                                {o.pay_mode === 'bank' && <div style={{ fontSize: 12, color: P.muted }}>{o.bank_name || 'بنك'} · مرجع: {o.bank_ref || '—'}</div>}
                                {o.pay_mode === 'split' && <div style={{ fontSize: 12, color: P.muted }}>نقد: {(o.cash_part||0).toLocaleString()} · بنك: {(o.bank_part||0).toLocaleString()} {o.bank_name ? `(${o.bank_name})` : ''}</div>}
                                {o.order_note && <div style={{ fontSize: 12, color: P.gold, marginTop: 3 }}>📝 {o.order_note}</div>}
                              </div>
                              {/* Actions */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 90 }}>
                                <Btn variant="secondary" onClick={() => reprint(o)} style={{ fontSize: 11, padding: '4px 8px' }}>🖨 طباعة</Btn>
                                {o.status === 'confirmed' && isManager && <Btn variant="secondary" onClick={() => { setSelected(o) }} style={{ fontSize: 11, padding: '4px 8px' }}>✎ إجراءات</Btn>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </ResponsiveTable>
        )}
      </div>
      <Pagination page={paged.page} totalPages={paged.totalPages} total={paged.total} startIndex={paged.startIndex} endIndex={paged.endIndex} onChange={paged.setPage} />

      {/* Order Detail Modal */}
      {selected && (
        <Modal title={`طلب #${selected.order_num}`} onClose={() => setSelected(null)} width={520} icon="layers">
          {/* Order type banner */}
          {selected.order_type && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 14, background: selected.order_type === 'takeaway' ? P.goldXL : P.greenXL, border: `1.5px solid ${selected.order_type === 'takeaway' ? P.goldL : P.greenL}` }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: selected.order_type === 'takeaway' ? P.gold : P.green }}>{TYPE[selected.order_type]||''}</span>
          </div>}
          <div style={{ borderBottom: `1.5px dashed ${P.borderM}`, paddingBottom: 14, marginBottom: 14 }}>
            {(selected.items || []).map((it: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, marginBottom: 8 }}>
                <div>
                  <span style={{ fontWeight: 700, color: P.plum }}>{it.qty}× {it.name}</span>
                  {it.variation_label && <div style={{ fontSize: 13, color: P.muted }}>{it.variation_label}</div>}
                  {it.note && <div style={{ fontSize: 13, color: P.pinkL }}>{it.note}</div>}
                </div>
                <span style={{ color: P.purple, fontWeight: 800, fontSize: 16 }}>{(it.unit_price * it.qty).toLocaleString()}</span>
              </div>
            ))}
          </div>
          {selected.order_note && <div style={{ fontSize: 14, color: P.gold, background: P.goldXL, borderRadius: 8, padding: '7px 12px', marginBottom: 10 }}>📝 {selected.order_note}</div>}
          {selected.disc_amount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: P.pink, marginBottom: 6 }}>
              <span>خصم {selected.disc_reason ? `(${selected.disc_reason})` : ''}</span>
              <span>−{selected.disc_amount.toLocaleString()} ج.س</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22, fontWeight: 900, marginBottom: 14, color: P.plum }}>
            <span>الإجمالي</span><span style={{ color: P.purple }}>{selected.total.toLocaleString()} ج.س</span>
          </div>
          <div style={{ fontSize: 15, color: P.muted, background: P.bg2, borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            {selected.pay_mode === 'split'
              ? `مقسّم: نقداً ${(selected.cash_part||0).toLocaleString()} + بنك ${(selected.bank_part||0).toLocaleString()} ج.س ${selected.bank_name ? `(${selected.bank_name})` : ''}`
              : selected.pay_mode === 'bank'
                ? `تحويل بنكي · ${selected.bank_name||''} · مرجع: ${selected.bank_ref||'—'}`
                : `نقداً · المدفوع: ${(selected.cash_in||0).toLocaleString()} · الباقي: ${(selected.cash_change||0).toLocaleString()} ج.س`}
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 14, color: P.faint, marginBottom: 16, flexWrap: 'wrap' }}>
            <span>⏰ {selected.created_at?.slice(0,16).replace('T',' ')}</span>
            {isManager && (() => { const e = employees.find((x:any) => x.id === selected.employee_id); return e ? <span>👤 {e.name}</span> : null })()}
            {selected.status === 'voided' && <Badge label="ملغي" color={P.rose} bg={P.roseXL} />}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="secondary" icon="print" fullWidth onClick={() => reprint(selected)}>إعادة طباعة</Btn>
            {selected.status === 'confirmed' && isManager && (
              <Btn variant="primary" icon="layers" fullWidth onClick={() => {
                setCorrItems((selected.items || []).map((it: any) => ({ ...it, newQty: it.qty })))
                setShowCorrect(selected); setCorrReason(''); setCorrPin('')
                setSelected(null)
              }}>تصحيح</Btn>
            )}
            {selected.status === 'confirmed' && isManager && (
              <Btn variant="danger" icon="close" fullWidth onClick={() => { setShowVoid(selected); setVoidPin(''); setVoidReason('') }}>إلغاء</Btn>
            )}
          </div>
        </Modal>
      )}

      {/* Void Modal */}
      {showVoid && (
        <Modal title="إلغاء طلب" onClose={() => setShowVoid(null)} width={380} icon="alert">
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ width: 54, height: 54, borderRadius: '50%', background: P.roseXL, border: `2px solid ${P.roseL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Icon name="alert" size={26} color={P.rose} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: P.plum }}>إلغاء طلب #{showVoid.order_num}؟</div>
            <div style={{ fontSize: 14, color: P.muted, marginTop: 4 }}>سيتم استرجاع المخزون وإلغاء نقاط الولاء</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: P.rose, marginTop: 8 }}>{showVoid.total?.toLocaleString()} ج.س</div>
          </div>
          <Field label="سبب الإلغاء" required={requireReason}><Inp value={voidReason} onChange={(e: any) => setVoidReason(e.target.value)} placeholder={requireReason ? 'مثال: خطأ في الطلب' : 'اختياري'} autoFocus /></Field>
          <Field label="رمز PIN لمدير/مسؤول" required><Inp type="password" value={voidPin} onChange={(e: any) => setVoidPin(e.target.value)} placeholder="أدخل PIN المدير" /></Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setShowVoid(null)}>تراجع</Btn>
            <Btn variant="danger" style={{ flex: 1 }} disabled={voiding || !voidPin || (requireReason && !voidReason)} onClick={doVoid}>
              {voiding ? 'جاري الإلغاء…' : 'تأكيد الإلغاء'}
            </Btn>
          </div>
        </Modal>
      )}

      {/* Correction Modal */}
      {showCorrect && (
        <Modal title={`تصحيح طلب #${showCorrect.order_num}`} onClose={() => setShowCorrect(null)} width={520} icon="layers">
          <div style={{ fontSize: 14, color: P.muted, marginBottom: 14, background: P.bg2, borderRadius: 10, padding: '10px 14px' }}>
            عدّل الكميات أو احذف أصنافاً بوضع الكمية = 0. سيتم إعادة حساب الإجمالي واسترجاع المخزون.
          </div>
          <div style={{ borderBottom: `1.5px dashed ${P.borderM}`, paddingBottom: 14, marginBottom: 14 }}>
            {corrItems.map((it: any, idx: number) => {
              const changed = it.newQty !== it.qty
              const removed = it.newQty === 0
              return (
                <div key={it.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, opacity: removed ? 0.4 : 1 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: removed ? P.faint : P.plum, textDecoration: removed ? 'line-through' : 'none' }}>
                      {it.name}
                      {it.variation_label && <span style={{ fontSize: 12, color: P.muted, marginRight: 6 }}>({it.variation_label})</span>}
                    </div>
                    <div style={{ fontSize: 13, color: P.muted }}>{it.unit_price?.toLocaleString()} ج.س/قطعة · الأصلي: {it.qty}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => setCorrItems(p => p.map((x, i) => i === idx ? { ...x, newQty: Math.max(0, x.newQty - 1) } : x))}
                      style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${P.borderM}`, background: P.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="minus" size={14} color={P.rose} /></button>
                    <span style={{ fontSize: 18, fontWeight: 900, width: 32, textAlign: 'center', color: changed ? P.rose : P.plum }}>{it.newQty}</span>
                    <button onClick={() => setCorrItems(p => p.map((x, i) => i === idx ? { ...x, newQty: Math.min(x.qty, x.newQty + 1) } : x))}
                      style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${P.borderM}`, background: P.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={14} color={P.green} /></button>
                    <span style={{ fontSize: 15, fontWeight: 700, color: changed ? P.rose : P.purple, width: 70, textAlign: 'left' }}>
                      {(it.unit_price * it.newQty).toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {(() => {
            const newSub = corrItems.reduce((s: number, it: any) => s + it.unit_price * it.newQty, 0)
            const hasChanges = corrItems.some((it: any) => it.newQty !== it.qty)
            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: P.muted, marginBottom: 4 }}>
                  <span>المجموع الجديد</span>
                  <span style={{ fontWeight: 700, color: hasChanges ? P.rose : P.ink }}>{newSub.toLocaleString()} ج.س</span>
                </div>
                {hasChanges && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: P.rose, marginBottom: 4 }}>
                  <span>الفرق</span>
                  <span>−{(showCorrect.subtotal - newSub).toLocaleString()} ج.س</span>
                </div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 900, color: P.plum, marginBottom: 14 }}>
                  <span>الإجمالي الأصلي</span>
                  <span style={{ color: P.faint, textDecoration: hasChanges ? 'line-through' : 'none' }}>{showCorrect.total?.toLocaleString()} ج.س</span>
                </div>
              </>
            )
          })()}
          <Field label="سبب التصحيح" required={requireReason}><Inp value={corrReason} onChange={(e: any) => setCorrReason(e.target.value)} placeholder={requireReason ? 'مثال: العميل غير رأيه' : 'اختياري'} autoFocus /></Field>
          <Field label="رمز PIN لمدير/مسؤول" required><Inp type="password" value={corrPin} onChange={(e: any) => setCorrPin(e.target.value)} placeholder="أدخل PIN المدير" /></Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setShowCorrect(null)}>تراجع</Btn>
            <Btn variant="primary" style={{ flex: 1 }} disabled={correcting || !corrPin || (requireReason && !corrReason) || !corrItems.some((it: any) => it.newQty !== it.qty)} onClick={async () => {
              setCorrecting(true)
              try {
                const r = await api?.employees?.verifyAnyManagerPin?.(corrPin)
                if (!r?.valid) { toast('رمز PIN خاطئ'); setCorrPin(''); setCorrecting(false); return }
                const changes = corrItems.filter((it: any) => it.newQty !== it.qty).map((it: any) => ({ orderItemId: it.id, newQty: it.newQty }))
                await api?.orders?.correct?.(showCorrect.id, corrReason || 'بدون سبب', changes)
                toast('✓ تم تصحيح الطلب')
                setShowCorrect(null); setCorrReason(''); setCorrPin('')
                load()
              } catch (err: any) { toast(err?.message || 'خطأ في التصحيح') }
              setCorrecting(false)
            }}>
              {correcting ? 'جاري التصحيح…' : 'تأكيد التصحيح'}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
