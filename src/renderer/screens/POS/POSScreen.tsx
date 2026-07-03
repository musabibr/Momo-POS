import React, { useState, useEffect, useMemo, useRef } from 'react'
import { P } from '../../tokens'
import { Icon } from '../../components/Icon'
import { MenuIcon } from '../../components/MenuIcon'
import { Btn } from '../../components/Btn'
import { Inp, Sel, Field } from '../../components/Inp'
import { Modal } from '../../components/Modal'
import { Badge } from '../../components/TabBar'
import { toast } from '../../components/Toast'
import { ProductImage } from '../../components/ProductImage'
import { Card } from '../../components/Card'
import { v4 as uuid } from 'uuid'
import { useSession } from '../../hooks/useSession'

const api = (window as any).api

const VariationModal = ({ item, onConfirm, onClose }: any) => {
  const groups = item.optionGroups || []
  const initSel: any = {}
  groups.forEach((g: any) => { initSel[g.id] = g.type === 'single' ? g.options[0]?.id : [] })
  const [sel, setSel] = useState<any>(initSel)
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  const priceAdj = groups.reduce((sum: number, g: any) => {
    if (g.type === 'single') {
      const opt = g.options.find((o: any) => o.id === sel[g.id])
      return sum + (opt?.priceAdj || 0)
    } else {
      return sum + (sel[g.id] || []).reduce((s2: number, oid: any) => { const opt = g.options.find((o: any) => o.id === oid); return s2 + (opt?.priceAdj || 0) }, 0)
    }
  }, 0)
  const unitPrice = item.price + priceAdj
  const total = unitPrice * qty

  const toggleMulti = (gid: string, oid: string) => setSel((p: any) => ({ ...p, [gid]: p[gid].includes(oid) ? p[gid].filter((x: any) => x !== oid) : [...p[gid], oid] }))

  const buildLabel = () => {
    const parts: string[] = []
    groups.forEach((g: any) => {
      if (g.type === 'single') { const o = g.options.find((x: any) => x.id === sel[g.id]); if (o) parts.push(o.name) }
      else { (sel[g.id] || []).forEach((oid: any) => { const o = g.options.find((x: any) => x.id === oid); if (o) parts.push(o.name) }) }
    })
    return parts.join('، ')
  }

  const confirm = () => {
    onConfirm({ ...item, qty, note, selections: sel, variationLabel: buildLabel(), unitPrice, totalPrice: total })
  }

  return (
    <Modal title={item.name} onClose={onClose} width={460} icon="layers">
      <div style={{ display: 'flex', gap: 14, marginBottom: 18, alignItems: 'center', padding: '14px 16px', background: P.bg2, borderRadius: 12 }}>
        <ProductImage item={item} size={64} borderRadius={10} />
        <div>
          <div style={{ fontSize: 13.5, color: P.muted, marginBottom: 4 }}>{item.desc || 'متعدد الخيارات'}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: P.purple }}>{item.price.toLocaleString()} <span style={{ fontSize: 12, color: P.faint }}>ج.س</span>
            {priceAdj > 0 && <span style={{ fontSize: 13, color: P.pink, marginRight: 6 }}>+{priceAdj.toLocaleString()}</span>}
          </div>
        </div>
      </div>

      {groups.map((g: any) => (
        <div key={g.id} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: P.ink, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            {g.name}
            <Badge label={g.type === 'single' ? 'اختر واحداً' : 'اختر أكثر من واحد'} color={g.kind === 'modifier' ? P.green : P.purple} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {g.options.map((opt: any) => {
              const isActive = g.type === 'single' ? sel[g.id] === opt.id : (sel[g.id] || []).includes(opt.id)
              const accentColor = g.kind === 'modifier' ? P.green : P.purple
              return (
                <button key={opt.id}
                  onClick={() => g.type === 'single' ? setSel((p: any) => ({ ...p, [g.id]: opt.id })) : toggleMulti(g.id, opt.id)}
                  style={{
                    padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    border: `1.5px solid ${isActive ? accentColor : P.borderM}`,
                    background: isActive ? `${accentColor}12` : P.surface,
                    color: isActive ? accentColor : P.muted, fontFamily: 'Cairo,sans-serif'
                  }}>
                  {opt.name}{opt.priceAdj > 0 && <span style={{ fontSize: 10.5, marginRight: 4, color: isActive ? P.pinkL : P.faint }}>+{opt.priceAdj}</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <Field label="ملاحظة خاصة" hint="اختياري">
        <Inp value={note} onChange={(e: any) => setNote(e.target.value)} placeholder="مثال: بدون سكر، كريمة إضافية…" />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: P.bg2, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: 9, border: `1.5px solid ${P.borderM}`, background: P.surface, color: P.mid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="minus" size={13} color={P.mid} /></button>
          <span style={{ fontSize: 18, fontWeight: 800, color: P.plum, width: 30, textAlign: 'center' }}>{qty}</span>
          <button onClick={() => setQty(q => q + 1)} style={{ width: 32, height: 32, borderRadius: 9, border: `1.5px solid ${P.borderM}`, background: P.surface, color: P.mid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={13} color={P.mid} /></button>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: P.purple }}>{total.toLocaleString()} ج.س</div>
      </div>

      <Btn variant="primary" fullWidth size="lg" onClick={confirm} icon="plus">إضافة للطلب</Btn>
    </Modal>
  )
}

export function POSScreen() {
  const { session, can } = useSession()
  const [items, setItems] = useState<any[]>([])
  const [cats, setCats] = useState<any[]>([])
  // Discount caps (percent) — mirror of the server policy; the server is authoritative.
  const [discCaps, setDiscCaps] = useState({ cashier: 10, manager: 50 })
  const [managerPin, setManagerPin] = useState('')
  const [banks, setBanks] = useState<string[]>(['بنك الخرطوم', 'بنك أمدرمان', 'فيصل الإسلامي']) // Fallback
  // Shift gate state — mirrors the server-side rule. If the admin enabled
  // shifts_required and no shift is open, POS refuses to render.
  const [activeShift, setActiveShift] = useState<any>(null)
  const [shiftsRequired, setShiftsRequired] = useState<boolean>(true)
  const [gateLoaded, setGateLoaded] = useState(false)

  const reloadGate = async () => {
    try {
      const v = await api?.settings?.get?.('shifts_required')
      // Default true (server has the same default); only false when explicitly set to '0'/'false'.
      setShiftsRequired(v == null ? true : (v === '1' || v === 'true' || v === true))
      const s = await api?.shifts?.getCurrent?.()
      setActiveShift(s || null)
    } catch (_) { /* leave defaults */ }
    finally { setGateLoaded(true) }
  }

  useEffect(() => {
    api?.menu?.listAvailable?.().then((d: any) => d && setItems(d)).catch(() => {})
    api?.menu?.listCategories?.().then((d: any) => d && setCats(d)).catch(() => {})
    api?.settings?.getBanks?.().then((d: any) => { if (d && d.length) setBanks(d) }).catch(() => {})
    Promise.all([
      api?.settings?.get?.('cashier_max_discount_pct'),
      api?.settings?.get?.('manager_max_discount_pct'),
    ]).then(([c, m]: any[]) => setDiscCaps({
      cashier: c != null && !isNaN(parseFloat(c)) ? parseFloat(c) : 10,
      manager: m != null && !isNaN(parseFloat(m)) ? parseFloat(m) : 50,
    })).catch(() => {})
    reloadGate()
  }, [])

  const [catId, setCatId] = useState('all')
  const [order, setOrder] = useState<any[]>(() => {
    try { const s = localStorage.getItem('momo_active_cart'); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const [search, setSearch] = useState('')
  const [discount, setDiscount] = useState(0)
  const [discountType, setDiscountType] = useState('pct')
  const [discountReason, setDiscountReason] = useState('')
  const [showDiscount, setShowDiscount] = useState(false)
  const [payMode, setPayMode] = useState<string | null>(null)
  const handlePayModeChange = (mode: string) => {
    setPayMode(mode); setCashIn(''); setCashPart(''); setBankRef('')
  }
  const [showPay, setShowPay] = useState(false)
  const [cashIn, setCashIn] = useState('')
  const [bank, setBank] = useState(banks[0] || 'Bank')
  const [bankRef, setBankRef] = useState('')
  const [cashPart, setCashPart] = useState('')
  const [receipt, setReceipt] = useState<any>(null)
  const [held, setHeld] = useState<any[]>(() => {
    try { const s = localStorage.getItem('momo_held_orders'); return s ? JSON.parse(s) : [] } catch { return [] }
  })
  const [showHeld, setShowHeld] = useState(false)
  const [showVoid, setShowVoid] = useState(false)
  const [voidPin, setVoidPin] = useState('')
  const [voidLoading, setVoidLoading] = useState(false)
  const [variationItem, setVariationItem] = useState<any>(null)
  const [custMatch, setCustMatch] = useState<any>(null)
  const [showCustModal, setShowCustModal] = useState(false)
  const [custSearch, setCustSearch] = useState('')
  const [custResults, setCustResults] = useState<any[]>([])
  const [showNewCust, setShowNewCust] = useState(false)
  const [newCustName, setNewCustName] = useState('')
  const [newCustPhone, setNewCustPhone] = useState('')
  const [subcatId, setSubcatId] = useState<string | null>(null)
  const [orderType, setOrderType] = useState<'local'|'takeaway'>('local')
  const [tableNum, setTableNum] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [confirming, setConfirming] = useState(false)

  // Debounced customer search
  useEffect(() => {
    if (custSearch.length < 2) { setCustResults([]); return }
    const t = setTimeout(async () => {
      try {
        const r = await api?.customers?.search?.(custSearch)
        setCustResults(Array.isArray(r) ? r : [])
      } catch (_) { setCustResults([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [custSearch])

  const createCustomerInline = async () => {
    if (!newCustName) { toast('أدخل اسم العميل'); return }
    try {
      const c = await api?.customers?.create?.({ name: newCustName, phone: newCustPhone || null })
      if (c) { setCustMatch(c); toast(`✓ تم إضافة ${newCustName}`) }
      setShowNewCust(false); setShowCustModal(false); setNewCustName(''); setNewCustPhone('')
    } catch (_) { toast('خطأ في الإضافة') }
  }

  const rootCats = cats.filter((c: any) => !c.parent_id)
  const activeCat = cats.find((c: any) => c.id === catId)
  const subCats = catId === 'all' ? [] : cats.filter((c: any) => c.parent_id === catId)

  const filtered = useMemo(() => {
    const childCatIds = catId === 'all' ? [] : cats.filter((c: any) => c.parent_id === catId).map((c: any) => c.id)

    return items.filter((i: any) => i.available !== false &&
      (catId === 'all'
        ? true
        : subcatId
          ? (i.subcat_id === subcatId || i.cat_id === subcatId)
          : (i.cat_id === catId || childCatIds.includes(i.cat_id))
      ) &&
      (search === '' || i.name.includes(search))
    )
  }, [items, catId, subcatId, search, cats])

  const handleItemClick = (item: any) => {
    if ((item.optionGroups || []).length > 0) { setVariationItem(item) }
    else addToOrder({ ...item, qty: 1, note: '', variationLabel: '', unitPrice: item.price })
  }

  const addToOrder = (entry: any) => {
    const key = `${entry.id}_${entry.variationLabel || ''}`
    setOrder(prev => {
      const ex = prev.find(o => o._key === key)
      if (ex) return prev.map(o => o._key === key ? { ...o, qty: o.qty + (entry.qty || 1) } : o)
      return [...prev, { ...entry, _key: key, qty: entry.qty || 1, itemId: entry.id }]
    })
    setVariationItem(null)
  }

  const updQty = (key: string, d: number) => setOrder(prev => {
    const next = prev.map(o => o._key === key ? { ...o, qty: Math.max(0, o.qty + d) } : o).filter(o => o.qty > 0)
    if (next.length === 0) { setDiscount(0); setDiscountReason(''); setDiscountType('pct'); setShowDiscount(false) }
    return next
  })

  const sub = order.reduce((s, o) => s + (o.unitPrice || o.price) * o.qty, 0)
  const discAmtRaw = discountType === 'pct' ? Math.round(sub * discount / 100) : Number(discount)
  const discAmt = Math.min(discAmtRaw, sub) // never exceed subtotal
  const total = Math.max(0, sub - discAmt)

  // Discount authorization (UI mirror of the server policy). A discount needs a
  // manager's approval PIN when the cashier lacks pos_discount, or the discount
  // exceeds their own role cap. '*' holders are always allowed, uncapped.
  const discPct = sub > 0 ? (discAmt / sub) * 100 : 0
  const ownDiscCap = (session?.role === 'manager' || session?.role === 'admin') ? discCaps.manager : discCaps.cashier
  const discountNeedsApproval = discAmt > 0 && !can('*') && (!can('pos_discount') || discPct > ownDiscCap)
  const cashInNum = parseInt(cashIn || '0')
  const change = payMode === 'cash' ? Math.max(0, cashInNum - total) : 0
  const bankPart = payMode === 'split' ? Math.max(0, total - parseInt(cashPart || '0')) : 0
  const DENOMS = [500, 1000, 2000, 5000]

  const confirm = async () => {
    if (confirming || order.length === 0) return
    if (payMode === 'cash' && parseInt(cashIn || '0') < total) { toast('المبلغ المدفوع أقل من الإجمالي'); return }
    if (showDiscount) {
      if (discountType === 'pct' && discount > 100) { toast('الخصم لا يمكن أن يتجاوز 100%'); return }
      if (discAmt > sub) { toast('مبلغ الخصم أكبر من الإجمالي'); return }
      if (!discountReason.trim()) { toast('يرجى إدخال سبب الخصم'); return }
      if (discountNeedsApproval && !managerPin.trim()) { toast('هذا الخصم يتطلب موافقة المدير (PIN)'); return }
    }
    if (payMode === 'split') {
      const cp = parseInt(cashPart || '0')
      if (isNaN(cp) || cp <= 0 || cp >= total) { toast('يرجى إدخال جزء نقدي صحيح أقل من الإجمالي'); return }
    }

    setConfirming(true)
    try {
      const r = await api?.orders?.create({
        clientOrderId: uuid(),
        items: order.map(l => ({
          itemId: l.itemId, qty: l.qty, unitPrice: l.unitPrice || l.price,
          variationLabel: l.variationLabel, selections: l.selections, note: l.note
        })),
        subtotal: sub, discAmount: discAmt, discType: showDiscount ? discountType : null,
        discValue: showDiscount ? Number(discount) : null,
        discReason: showDiscount ? discountReason : null,
        managerPin: showDiscount && discountNeedsApproval ? managerPin : null,
        total, payMode, bankName: payMode !== 'cash' ? bank : null,
        bankRef: payMode !== 'cash' ? bankRef : null,
        cashIn: payMode === 'cash' && cashIn ? parseInt(cashIn) : null,
        cashChange: payMode === 'cash' ? change : null,
        cashPart: payMode === 'split' && cashPart ? parseInt(cashPart) : null,
        bankPart: payMode === 'split' ? bankPart : null,
        customerId: custMatch?.id || null,
        orderType, orderNote: orderNote || null, tableNum: orderType === 'local' && tableNum ? tableNum : null
      })

      if (!r?.id) throw new Error('فشل في إنشاء الطلب — لم يُرجع رقم الطلب')

      const printItems = order.map(l => ({
        name: l.name, qty: l.qty, unitPrice: l.unitPrice || l.price,
        variationLabel: l.variationLabel, modifiers: (Array.isArray(l.selections) ? l.selections : []).map((s: any) => s.label || s.name)
      }))
      const receiptData = {
        orderNum: r.order_num || r.id, items: printItems,
        subtotal: sub, discAmount: discAmt, total, payMode,
        cashIn: payMode === 'cash' ? parseInt(cashIn || '0') : (payMode === 'split' ? parseInt(cashPart || '0') : undefined),
        cashChange: payMode === 'cash' ? change : undefined,
        bankName: bank || undefined, bankAmount: bankPart || undefined,
        createdAt: r.created_at || new Date().toISOString(),
        // UI-only fields for the receipt confirmation screen
        num: r.order_num || r.id, sub, discAmt, change,
        bank, bankRef, cashPart, bankPart,
        time: new Date().toLocaleTimeString('ar-SA'), orderType, orderNote, tableNum: orderType === 'local' && tableNum ? tableNum : null
      }
      setReceipt(receiptData)
      setOrder([]); setPayMode(null); setShowPay(false); setDiscount(0); setDiscountReason(''); setManagerPin(''); setCashIn(''); setBankRef(''); setCashPart(''); setShowDiscount(false); setCustMatch(null); setOrderNote(''); setTableNum(''); setOrderType('local');
      toast('✓ تم تأكيد الطلب')
      // Printing happens via the "طباعة" button on the receipt screen
    } catch (err: any) {
      toast(err.message || 'خطأ في إنشاء الطلب')
    } finally {
      setConfirming(false)
    }
  }

  // Persist active cart to localStorage on every change (R3-M8)
  useEffect(() => { try { localStorage.setItem('momo_active_cart', JSON.stringify(order)) } catch {} }, [order])

  // Persist held orders to localStorage
  useEffect(() => { try { localStorage.setItem('momo_held_orders', JSON.stringify(held)) } catch {} }, [held])

  const holdOrder = () => {
    if (!order.length) return
    setHeld(p => {
      const next = [...p, { id: Date.now(), items: [...order], time: new Date().toLocaleTimeString('ar-SA') }]
      return next.length > 50 ? next.slice(-50) : next // R3-M10: cap at 50
    })
    setOrder([])
    toast('تم تعليق الطلب')
  }
  const resumeHeld = (h: any) => { setOrder(h.items); setHeld(p => p.filter((x: any) => x.id !== h.id)); setShowHeld(false); toast('تم استئناف الطلب') }
  const voidOrder = async () => {
    setVoidLoading(true)
    try {
      const result = await api?.employees?.verifyAnyManagerPin?.(voidPin)
      if (result?.valid) {
        setOrder([]); setShowVoid(false); setVoidPin(''); toast('تم إلغاء الطلب')
        api?.actionLog?.write?.('VOID_ORDER', 'إلغاء طلب من نقطة البيع', result.employeeId)
      } else { toast('رمز PIN خاطئ'); setVoidPin('') }
    } catch (_) { toast('خطأ في التحقق'); setVoidPin('') }
    setVoidLoading(false)
  }

  if (receipt) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: `linear-gradient(180deg,${P.bg2},${P.bg})`, gap: 24, padding: 24, position: 'relative' }}>
      <button onClick={() => setReceipt(null)} style={{ position: 'absolute', top: 18, left: 18, width: 40, height: 40, borderRadius: '50%', border: `1.5px solid ${P.borderM}`, background: P.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,.08)' }}>
        <Icon name="close" size={18} color={P.muted} />
      </button>
      <div style={{ textAlign: 'center' }}>
        <div className="pulse-check" style={{ width: 80, height: 80, borderRadius: '50%', background: P.greenXL, border: `3px solid ${P.greenL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 28px rgba(4,120,87,.25)' }}>
          <Icon name="check" size={36} color={P.green} />
        </div>
        <div style={{ fontSize: 30, fontWeight: 900, color: P.plum, letterSpacing: '-0.02em' }}>تم تأكيد الطلب</div>
        <div style={{ color: P.muted, fontSize: 16, marginTop: 6, fontWeight: 600 }}>طلب #{receipt.num} · {receipt.time}</div>
        <span style={{ display: 'inline-block', marginTop: 8, padding: '5px 18px', borderRadius: 99, fontSize: 15, fontWeight: 800, background: receipt.orderType === 'takeaway' ? P.goldXL : P.greenXL, color: receipt.orderType === 'takeaway' ? P.gold : P.green, border: `1.5px solid ${receipt.orderType === 'takeaway' ? P.goldL : P.greenL}` }}>{receipt.orderType === 'takeaway' ? 'سفري' : 'محلي'}</span>
      </div>
      <Card style={{ width: 'min(460px,100%)', padding: 32, boxShadow: '0 12px 48px rgba(88,28,135,.12)' }}>
        {/* ── Items List ── */}
        <div style={{ borderBottom: `2px dashed ${P.borderM}`, paddingBottom: 16, marginBottom: 16 }}>
          {receipt.items.map((it: any, i: number) => (
            <div key={`receipt_${receipt.num}_${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, padding: '6px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 900, color: P.purple, background: P.purpleXL, padding: '3px 8px', borderRadius: 7, fontSize: 15, minWidth: 32, textAlign: 'center', letterSpacing: '0.5px' }}>×{it.qty}</span>
                  <span style={{ fontWeight: 800, color: P.plum, fontSize: 18 }}>{it.name}</span>
                </div>
                {it.variationLabel && <div style={{ fontSize: 14, color: P.muted, marginTop: 4, paddingRight: 42, fontWeight: 600 }}>{it.variationLabel}</div>}
                {it.note && <div style={{ fontSize: 14, color: P.pinkL, marginTop: 4, paddingRight: 42, fontWeight: 600 }}>{it.note}</div>}
              </div>
              <span style={{ color: P.purple, fontWeight: 900, fontSize: 17, whiteSpace: 'nowrap' }}>{((it.unitPrice || it.price) * it.qty).toLocaleString()}</span>
            </div>
          ))}
        </div>
        {/* ── Order Note ── */}
        {receipt.orderNote && <div style={{ fontSize: 15, color: P.gold, background: P.goldXL, borderRadius: 10, padding: '8px 14px', marginBottom: 12, fontWeight: 700 }}>📝 {receipt.orderNote}</div>}
        {/* ── Discount ── */}
        {receipt.discAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, color: P.pink, marginBottom: 8, fontWeight: 700 }}><span>خصم</span><span>−{receipt.discAmt.toLocaleString()} ج.س</span></div>}
        {/* ── Total — hero row ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 900, marginBottom: 18, color: P.plum, padding: '8px 0', borderTop: `2px solid ${P.border}`, borderBottom: `2px solid ${P.border}` }}>
          <span>الإجمالي</span><span style={{ color: P.purple }}>{receipt.total.toLocaleString()} ج.س</span>
        </div>
        {/* ── Order type highlight ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, marginBottom: 14, background: receipt.orderType === 'takeaway' ? P.goldXL : P.greenXL, border: `1.5px solid ${receipt.orderType === 'takeaway' ? P.goldL : P.greenL}` }}>
          <span style={{ fontSize: 22 }}>{receipt.orderType === 'takeaway' ? '🛍️' : '🏠'}</span>
          <span style={{ fontSize: 18, fontWeight: 900, color: receipt.orderType === 'takeaway' ? P.gold : P.green }}>{receipt.orderType === 'takeaway' ? 'طلب سفري' : 'طلب محلي'}{receipt.tableNum ? ` · طاولة ${receipt.tableNum}` : ''}</span>
        </div>
        {/* ── Payment summary ── */}
        <div style={{ fontSize: 16, color: P.muted, background: P.bg2, borderRadius: 12, padding: '12px 16px', marginBottom: 18, fontWeight: 700, lineHeight: 1.6 }}>
          {receipt.payMode === 'split' ? `مقسّم: نقداً ${parseInt(receipt.cashPart || '0').toLocaleString()} + بنك ${receipt.bankPart.toLocaleString()} ج.س ${receipt.bank ? `(${receipt.bank})` : ''}`
            : receipt.payMode === 'bank' ? `تحويل بنكي · ${receipt.bank}`
              : `نقداً · الباقي: ${receipt.change.toLocaleString()} ج.س`}
        </div>
        {/* ── Print button (single, prominent) ── */}
        <Btn variant="primary" icon="print" fullWidth size="lg" onClick={() => { api?.printer?.print?.(receipt).catch(() => {}); api?.printer?.printKitchen?.(receipt).catch(() => {}); toast('جاري الطباعة…') }}>طباعة الإيصال</Btn>
      </Card>
      <div style={{ marginTop: 6 }}>
        <Btn variant="primary" size="lg" onClick={() => setReceipt(null)}>طلب جديد +</Btn>
      </div>
    </div>
  )

  // Shift gate — mirrors the server-side requireActiveShiftIfNeeded() rule.
  // If shifts_required is true and no active shift exists, POS refuses to render.
  // The server enforces the same gate on orders:create, so this is UX, not security.
  if (gateLoaded && shiftsRequired && !activeShift) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20, gap: 16 }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: P.plum }}>نقطة البيع</div>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 40, background: P.surface, borderRadius: 16, border: `1px dashed ${P.borderM}`, textAlign: 'center'
        }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: P.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name="shift" size={36} color={P.muted} />
          </div>
          <h2 style={{ color: P.plum, marginBottom: 8 }}>لا توجد وردية مفتوحة</h2>
          <p style={{ color: P.muted, marginBottom: 8, fontSize: 15, maxWidth: 420 }}>
            لا يمكن إصدار طلبات بدون وردية مفتوحة. اذهب إلى <strong>الوردية</strong> وافتح وردية لبدء البيع.
          </p>
          <p style={{ color: P.faint, marginBottom: 20, fontSize: 12.5 }}>
            (يمكن للمسؤول إيقاف هذا الشرط من الإعدادات → المطعم → "السماح بالعمل دون فتح وردية")
          </p>
          <Btn variant="secondary" icon="refresh" onClick={reloadGate}>تحديث الحالة</Btn>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden', flexDirection: 'row-reverse' }}>
      {/* ORDER PANEL — LEFT in RTL */}
      <div style={{
        flex: '0 1 320px',
        minWidth: 260,
        maxWidth: '40%',
        background: P.surface,
        borderLeft: `1px solid ${P.border}`,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }}>
        <div style={{ padding: '14px 18px 12px', borderBottom: `1px solid ${P.border}`, background: 'linear-gradient(135deg,#fdf7ff,#f8f0ff)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: P.plum }}>الطلب الحالي</div>
            <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `1.5px solid ${P.borderM}` }}>
              {([['local','محلي'],['takeaway','سفري']] as const).map(([k,l]) => (
                <button key={k} onClick={() => { setOrderType(k as any); if(k === 'takeaway') setTableNum(''); }} style={{ padding: '5px 16px', fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none', background: orderType === k ? (k === 'takeaway' ? P.gold : P.green) : 'transparent', color: orderType === k ? '#fff' : P.muted, fontFamily: 'Cairo,sans-serif' }}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: 15, color: P.muted }}>{order.length} صنف · {sub.toLocaleString()} ج.س</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {!order.length ? (
            <div style={{ textAlign: 'center', padding: '52px 16px', color: P.faint }}>
              <div className="float-emoji" style={{ fontSize: 44, marginBottom: 12 }}>✨</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: P.muted }}>اضف أصنافاً للبدء</div>
              <div style={{ fontSize: 14, color: P.faint, marginTop: 4 }}>{orderType === 'takeaway' ? 'طلب سفري' : 'طلب محلي'}</div>
            </div>
          ) : order.map(item => (
            <div key={item._key} className="pos-order-item" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 12px', borderRadius: 13, marginBottom: 6, background: P.bg2, border: `1px solid ${P.border}` }}>
              <ProductImage item={item} size={44} borderRadius={9} />
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div
                  title={item.name}
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: P.plum,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.name}
                </div>
                {item.variationLabel && (
                  <div
                    title={item.variationLabel}
                    style={{
                      fontSize: 13,
                      color: P.purple,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.variationLabel}
                  </div>
                )}
                {item.note && (
                  <div
                    title={item.note}
                    style={{
                      fontSize: 13,
                      color: P.pinkL,
                      marginTop: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.note}
                  </div>
                )}
                <div style={{ fontSize: 14, color: P.muted, marginTop: 3 }}>{(item.unitPrice || item.price).toLocaleString()} ج.س/قطعة</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: P.purple }}>{((item.unitPrice || item.price) * item.qty).toLocaleString()}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => updQty(item._key, -1)} style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${P.borderM}`, background: P.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="minus" size={14} color={P.mid} /></button>
                  <span style={{ fontSize: 18, fontWeight: 800, width: 28, textAlign: 'center', color: P.plum }}>{item.qty}</span>
                  <button onClick={() => updQty(item._key, 1)} style={{ width: 34, height: 34, borderRadius: 9, border: `1.5px solid ${P.purple}40`, background: `${P.purple}08`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={14} color={P.purple} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Totals + Payment — natural height; order list above scrolls when needed.
            No maxHeight: 50% (used to nest scrolls and hide the change amount). */}
        <div style={{
          padding: '12px 16px 16px',
          borderTop: `1px solid ${P.border}`,
          flexShrink: 0,
          background: 'linear-gradient(0deg,#fdf7ff,#fff)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: P.muted, marginBottom: 5 }}><span>المجموع الفرعي</span><span>{sub.toLocaleString()} ج.س</span></div>
          {discAmt > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, color: P.pink, marginBottom: 5 }}><span>خصم</span><span>−{discAmt.toLocaleString()} ج.س</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, fontWeight: 900, color: P.plum, marginBottom: 12 }}><span>الإجمالي</span><span style={{ color: P.purple }}>{total.toLocaleString()} ج.س</span></div>

          {/* Order note & Table */}
          {!showPay && <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {orderType === 'local' && (
              <input value={tableNum} onChange={e => setTableNum(e.target.value)} placeholder="رقم الطاولة" style={{ width: 100, padding: '9px 14px', borderRadius: 10, border: `1.5px solid ${P.borderM}`, fontSize: 15, outline: 'none', fontFamily: 'Cairo,sans-serif', background: tableNum ? P.greenXL : 'transparent', color: tableNum ? P.green : P.plum, fontWeight: tableNum ? 800 : 400, textAlign: 'center' }} />
            )}
            <input value={orderNote} onChange={e => setOrderNote(e.target.value)} placeholder="ملاحظة على الطلب…" style={{ flex: 1, padding: '9px 14px', borderRadius: 10, border: `1px solid ${P.border}`, fontSize: 15, outline: 'none', fontFamily: 'Cairo,sans-serif', background: orderNote ? P.goldXL : 'transparent', color: P.plum }} />
          </div>}

          {!showPay && order.length > 0 && <button onClick={() => setShowDiscount(!showDiscount)} style={{ width: '100%', padding: '10px', borderRadius: 10, border: `1.5px dashed ${discAmt > 0 ? P.pinkL : P.borderM}`, background: discAmt > 0 ? P.pinkXL : 'transparent', color: P.pink, cursor: 'pointer', fontSize: 15, fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'Cairo,sans-serif' }}>
            <Icon name="tag" size={15} color={P.pink} />{discAmt > 0 ? `خصم: ${discount}${discountType === 'pct' ? '%' : ' ج.س'}` : 'إضافة خصم'}
          </button>}

          {showDiscount && !showPay && <div style={{ background: P.pinkXL, border: `1px solid ${P.pinkL}50`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {[{ k: 'pct', l: 'نسبة %' }, { k: 'amt', l: 'مبلغ ثابت' }].map(t => (
                <button key={t.k} onClick={() => { setDiscountType(t.k); setDiscount(0); }} style={{ flex: 1, padding: '8px', borderRadius: 8, border: `1.5px solid ${discountType === t.k ? P.pink : P.pinkL}`, background: discountType === t.k ? P.pink : 'transparent', color: discountType === t.k ? '#fff' : P.pink, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Cairo,sans-serif' }}>{t.l}</button>
              ))}
            </div>
            <Inp value={String(discount)} onChange={(e: any) => {
              const v = Math.max(0, +e.target.value)
              if (discountType === 'pct') setDiscount(Math.min(v, 100))
              else setDiscount(Math.min(v, sub))
            }} placeholder={discountType === 'pct' ? 'الحد الأقصى 100%' : `الحد الأقصى ${sub.toLocaleString()} ج.س`} type="number" max={discountType === 'pct' ? 100 : sub} style={{ marginBottom: 7 }} />
            {discountType === 'amt' && discount > 0 && discount >= sub && <div style={{ fontSize: 11, color: P.rose, fontWeight: 700, marginBottom: 4, textAlign: 'center' }}>⚠ الخصم يساوي كامل المبلغ</div>}
            <Inp value={discountReason} onChange={(e: any) => setDiscountReason(e.target.value)} placeholder="سبب الخصم (مطلوب)" style={{ marginBottom: 8 }} />
            {discountNeedsApproval && (
              <>
                <div style={{ fontSize: 12, color: P.rose, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>
                  ⚠ هذا الخصم يتجاوز صلاحيتك — مطلوب موافقة مدير
                </div>
                <Inp type="password" value={managerPin} onChange={(e: any) => setManagerPin(e.target.value)} placeholder="رمز موافقة المدير (PIN)" style={{ marginBottom: 8 }} />
              </>
            )}
            <Btn variant="pink" fullWidth onClick={() => setShowDiscount(false)}>تطبيق</Btn>
          </div>}

          {!showPay ? (
            <Btn variant="primary" fullWidth size="lg" disabled={!order.length} onClick={() => order.length && setShowPay(true)}>الانتقال للدفع ←</Btn>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                {[{ k: 'cash', l: '💵 نقداً' }, { k: 'bank', l: '🏦 بنكي' }, { k: 'split', l: '🔀 مقسم' }].map(({ k, l }) => (
                  <button key={k} onClick={() => handlePayModeChange(k)} className="pos-pay-btn" style={{ flex: 1, padding: '11px 6px', borderRadius: 11, border: `1.5px solid ${payMode === k ? P.purple : P.borderM}`, background: payMode === k ? P.ghost : 'transparent', color: payMode === k ? P.purple : P.muted, cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'Cairo,sans-serif' }}>{l}</button>
                ))}
              </div>
              {payMode === 'cash' && <div style={{ marginBottom: 10 }}>
                <Inp value={cashIn} onChange={(e: any) => { const v = +e.target.value; setCashIn(String(isNaN(v) || v < 0 ? '' : Math.min(v, total))) }} placeholder={`المبلغ المستلم (الحد: ${total.toLocaleString()})`} type="number" max={total} />
                <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                  {DENOMS.filter(d => d <= total).map(d => (
                    <button key={d} className="pos-denom-btn" onClick={() => setCashIn(String(d))} style={{ flex: 1, minWidth: 54, padding: '8px 4px', borderRadius: 9, border: `1px solid ${P.greenL}`, background: P.greenXL, color: P.green, cursor: 'pointer', fontSize: 15, fontWeight: 700, fontFamily: 'Cairo,sans-serif' }}>{d.toLocaleString()}</button>
                  ))}
                  <button className="pos-denom-btn" onClick={() => setCashIn(String(total))} style={{ flex: 1, minWidth: 54, padding: '8px 4px', borderRadius: 9, border: `1px solid ${P.purpleXL}`, background: `${P.purple}08`, color: P.purple, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'Cairo,sans-serif' }}>بالضبط</button>
                </div>
                {cashIn && parseInt(cashIn) >= total && <div style={{ fontSize: 16, color: P.green, marginTop: 8, fontWeight: 900, textAlign: 'center', background: P.greenXL, borderRadius: 10, padding: '10px 0' }}>✓ المبلغ مكتمل</div>}
              </div>}
              {payMode === 'bank' && <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 7 }}><Sel value={bank} onChange={(e: any) => setBank(e.target.value)} options={banks} /><Inp value={bankRef} onChange={(e: any) => setBankRef(e.target.value)} placeholder="رقم العملية (اختياري)" /></div>}
              {payMode === 'split' && <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 7 }}><Inp value={cashPart} onChange={(e: any) => { const v = Math.max(0, Math.min(+e.target.value, total - 1)); setCashPart(String(isNaN(v) ? '' : v)) }} placeholder={`الجزء النقدي (الحد: ${(total - 1).toLocaleString()})`} type="number" max={total - 1} />{cashPart && <div style={{ fontSize: 14, color: P.purple, fontWeight: 700, textAlign: 'center' }}>البنكي: {bankPart.toLocaleString()} ج.س</div>}<Sel value={bank} onChange={(e: any) => setBank(e.target.value)} options={banks} /><Inp value={bankRef} onChange={(e: any) => setBankRef(e.target.value)} placeholder="رقم العملية (اختياري)" /></div>}
              <div style={{ display: 'flex', gap: 7 }}>
                <Btn variant="secondary" onClick={() => { setShowPay(false); setPayMode(null); }} style={{ flex: 1 }}>رجوع</Btn>
                <Btn variant="primary" onClick={confirm} disabled={!payMode || confirming} icon="check" style={{ flex: 2 }}>{confirming ? '...' : 'تأكيد الطلب'}</Btn>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Btn variant="ghost" onClick={holdOrder} disabled={!order.length} style={{ flex: 1, fontSize: 14, color: P.gold, border: `1px solid ${P.goldL}`, borderRadius: 10, padding: '9px' }}>⏸ تعليق</Btn>
            {held.length > 0 && <Btn variant="ghost" onClick={() => setShowHeld(true)} style={{ flex: 1, fontSize: 14, color: P.gold, border: `1px solid ${P.goldL}`, borderRadius: 10, padding: '9px' }}>▶ استئناف ({held.length})</Btn>}
            <Btn variant="ghost" onClick={() => order.length && setShowVoid(true)} disabled={!order.length} style={{ flex: 1, fontSize: 14, color: P.rose, border: `1px solid ${P.roseL}`, borderRadius: 10, padding: '9px' }}>✕ إلغاء</Btn>
          </div>
        </div>
      </div>

      {/* ITEMS GRID */}
      <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px 16px 12px' }}>
        {/* Search + customer — wraps at narrow widths so neither field gets crushed */}
        <div style={{ display: 'flex', gap: 9, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 240px', display: 'flex', alignItems: 'center', gap: 8, background: P.surface, border: `1.5px solid ${P.border}`, borderRadius: 12, padding: '8px 13px', boxShadow: '0 1px 4px rgba(88,28,135,.06)', minWidth: 0 }}>
            <Icon name="search" size={15} color={P.muted} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث في القائمة…" style={{ border: 'none', background: 'transparent', color: P.plum, fontSize: 16, outline: 'none', flex: 1, minWidth: 0, fontFamily: 'Cairo,sans-serif' }} />
            {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex' }}><Icon name="close" size={14} color={P.faint} /></button>}
          </div>
          <button onClick={() => setShowCustModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: custMatch ? P.greenXL : P.surface,
            border: `1.5px solid ${custMatch ? P.green : P.border}`,
            borderRadius: 12, padding: '8px 14px',
            boxShadow: '0 1px 4px rgba(88,28,135,.06)',
            cursor: 'pointer', fontFamily: 'Cairo,sans-serif', fontSize: 15, fontWeight: 600,
            color: custMatch ? P.green : P.muted,
          }}>
            <Icon name={custMatch ? 'check' : 'plus'} size={14} color={custMatch ? P.green : P.muted} />
            {custMatch ? <>{custMatch.name}{custMatch.is_vip ? ' ⭐' : ''}</> : 'عميل'}
            {custMatch && <button onClick={e => { e.stopPropagation(); setCustMatch(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', marginRight: 2 }}><Icon name="close" size={12} color={P.green} /></button>}
          </button>
        </div>
        {/* Category pills */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
          <button onClick={() => { setCatId('all'); setSubcatId(null); }} className="momo-pill" style={{ padding: '8px 20px', borderRadius: 99, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${catId === 'all' ? P.purple : P.borderM}`, background: catId === 'all' ? 'linear-gradient(135deg,#9333ea,#7c3aed)' : P.surface, color: catId === 'all' ? '#fff' : P.muted, fontFamily: 'Cairo,sans-serif' }}>الكل</button>
          {rootCats.map(c => (
            <button key={c.id} onClick={() => { setCatId(c.id); setSubcatId(null); }} className="momo-pill" style={{ padding: '8px 20px', borderRadius: 99, fontSize: 15, fontWeight: 700, cursor: 'pointer', border: `1.5px solid ${catId === c.id ? c.color : P.borderM}`, background: catId === c.id ? c.color : P.surface, color: catId === c.id ? '#fff' : P.muted, fontFamily: 'Cairo,sans-serif' }}>{c.emoji ? c.emoji + ' ' : ''}{c.name}</button>
          ))}
        </div>
        {/* Subcategory pills */}
        {subCats.length > 0 && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, paddingRight: 4 }}>
          <div style={{ fontSize: 11, color: P.faint, display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}><Icon name="layers" size={12} color={P.faint} /> فئة فرعية:</div>
          <button onClick={() => setSubcatId(null)} className="momo-pill" style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${!subcatId ? activeCat?.color || P.purple : P.borderM}`, background: !subcatId ? `${activeCat?.color || P.purple}15` : 'transparent', color: !subcatId ? activeCat?.color || P.purple : P.muted, fontFamily: 'Cairo,sans-serif' }}>الكل</button>
          {subCats.map((sc: any) => (
            <button key={sc.id} onClick={() => setSubcatId(sc.id)} className="momo-pill" style={{ padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: 'pointer', border: `1px solid ${subcatId === sc.id ? sc.color : P.borderM}`, background: subcatId === sc.id ? `${sc.color}15` : 'transparent', color: subcatId === sc.id ? sc.color : P.muted, fontFamily: 'Cairo,sans-serif' }}>{sc.name}</button>
          ))}
        </div>}
        {/* Items grid — scrollable container */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, padding: '10px' }}>
            {filtered.map(item => (
              <button key={item.id} onClick={() => handleItemClick(item)} className="pos-item-card"
                style={{ background: P.surface, border: `1.5px solid ${P.border}`, borderRadius: 14, padding: 0, cursor: 'pointer', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', boxShadow: '0 2px 8px rgba(88,28,135,.06)', fontFamily: 'Cairo,sans-serif' }}>
                <div style={{ width: '100%', aspectRatio: '1', overflow: 'hidden', flexShrink: 0, position: 'relative', background: `linear-gradient(135deg,${P.bg3},${P.purpleXL})` }}>
                  {(item.display_mode === 'image') && item.image_path
                    ? <img src={item.image_path} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block' }} onError={(e: any) => { e.target.style.display = 'none'; e.target.nextSibling && (e.target.nextSibling.style.display = 'flex') }} />
                    : null}
                  <div style={{ width: '100%', height: '100%', position: (item.display_mode === 'image') && item.image_path ? 'absolute' : 'relative', top: 0, left: 0, display: (item.display_mode === 'image') && item.image_path ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center' }}><MenuIcon id={item.emoji} size={56} style={{ width: 56, height: 56 }} /></div>
                </div>
                <div style={{ padding: '6px 6px 8px', width: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 2 }}>
                  <div title={item.name} style={{ fontSize: 12.5, color: P.ink, fontWeight: 700, lineHeight: 1.3, textAlign: 'center', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 32 }}>{item.name}</div>
                  <div>
                    {(item.optionGroups || []).length > 0 && <div style={{ fontSize: 9.5, color: P.muted, marginBottom: 1 }}>متعدد الخيارات</div>}
                    <div style={{ fontSize: 14, color: P.purple, fontWeight: 900 }}>{item.price.toLocaleString()} <span style={{ fontSize: 9.5, fontWeight: 600, color: P.faint }}>ج.س</span></div>
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px 20px', color: P.faint, fontSize: 14 }}>لا توجد أصناف</div>}
          </div>
        </div>
      </div>

      {/* Modals */}
      {variationItem && <VariationModal item={variationItem} onConfirm={addToOrder} onClose={() => setVariationItem(null)} />}
      {showHeld && <Modal title="الطلبات المعلقة" onClose={() => setShowHeld(false)} width={400} icon="hold">
        {!held.length ? <div style={{ textAlign: 'center', color: P.muted, padding: 24, fontSize: 14 }}>لا توجد طلبات معلقة</div>
          : held.map(h => (
            <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: P.bg2, borderRadius: 10, marginBottom: 8 }}>
              <div><div style={{ fontSize: 13.5, fontWeight: 700, color: P.plum }}>{h.items.length} أصناف · {h.time}</div>
                <div style={{ fontSize: 11, color: P.muted }}>{h.items.map((i: any) => i.name).join('، ').substring(0, 45)}…</div></div>
              <Btn variant="primary" size="sm" onClick={() => resumeHeld(h)}>استئناف</Btn>
            </div>
          ))}
      </Modal>}
      {showVoid && <Modal title="إلغاء الطلب" onClose={() => { setShowVoid(false); setVoidPin(''); }} width={340} icon="void">
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: P.roseXL, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Icon name="alert" size={24} color={P.rose} /></div>
          <div style={{ fontSize: 13, color: P.muted }}>مطلوب رمز PIN للمدير</div>
        </div>
        <Inp value={voidPin} onChange={(e: any) => setVoidPin(e.target.value)} type="password" placeholder="أدخل رمز PIN" style={{ textAlign: 'center', letterSpacing: 8, marginBottom: 16, fontSize: 18 }} />
        <div style={{ display: 'flex', gap: 8 }}><Btn variant="secondary" onClick={() => { setShowVoid(false); setVoidPin(''); }} style={{ flex: 1 }}>إلغاء</Btn><Btn variant="danger" onClick={voidOrder} style={{ flex: 1 }}>تأكيد الإلغاء</Btn></div>
        <div style={{ fontSize: 11, color: P.faint, textAlign: 'center', marginTop: 10 }}>أدخل رمز PIN لأي مدير أو مسؤول</div>
      </Modal>}
      {showCustModal && <Modal title="اختيار عميل" onClose={() => { setShowCustModal(false); setCustSearch(''); setShowNewCust(false) }} width={400} icon="plus">
        {!showNewCust ? <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: P.bg2, borderRadius: 10, padding: '8px 12px', marginBottom: 12 }}>
            <Icon name="search" size={14} color={P.muted} />
            <input value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="ابحث بالاسم أو الرقم…" autoFocus style={{ border: 'none', background: 'transparent', color: P.plum, fontSize: 14, outline: 'none', flex: 1, fontFamily: 'Cairo,sans-serif' }} />
          </div>
          <div style={{ maxHeight: 220, overflowY: 'auto', marginBottom: 12 }}>
            {custResults.length > 0 ? custResults.map((c: any) => (
              <div key={c.id} onClick={() => { setCustMatch(c); setShowCustModal(false); setCustSearch(''); toast(`✓ ${c.name}`) }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 4, background: P.surface, border: `1px solid ${P.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = P.ghost}
                onMouseLeave={e => e.currentTarget.style.background = P.surface}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: P.plum }}>{c.name}{c.is_vip ? ' ⭐' : ''}</div>
                  {c.phone && <div style={{ fontSize: 12, color: P.muted }}>{c.phone}</div>}
                </div>
                <div style={{ fontSize: 12, color: P.purple, fontWeight: 700 }}>{c.visit_count || 0} زيارة</div>
              </div>
            )) : custSearch.length >= 2 ? (
              <div style={{ textAlign: 'center', padding: 20, color: P.faint, fontSize: 13 }}>لا توجد نتائج</div>
            ) : (
              <div style={{ textAlign: 'center', padding: 20, color: P.faint, fontSize: 13 }}>اكتب للبحث عن عميل</div>
            )}
          </div>
          <Btn variant="primary" fullWidth icon="plus" onClick={() => setShowNewCust(true)}>عميل جديد</Btn>
        </> : <>
          <Field label="اسم العميل" required><Inp value={newCustName} onChange={(e: any) => setNewCustName(e.target.value)} autoFocus placeholder="مثال: أحمد محمد" /></Field>
          <Field label="رقم الهاتف"><Inp value={newCustPhone} onChange={(e: any) => setNewCustPhone(e.target.value)} placeholder="اختياري" /></Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setShowNewCust(false)} style={{ flex: 1 }}>رجوع</Btn>
            <Btn variant="primary" icon="check" onClick={createCustomerInline} style={{ flex: 1 }}>إضافة</Btn>
          </div>
        </>}
      </Modal>}
    </div>
  )
}
