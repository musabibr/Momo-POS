import { useState, useEffect } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp, Field } from '../../components/Inp'
import { Modal } from '../../components/Modal'
import { Icon } from '../../components/Icon'
import { Badge } from '../../components/TabBar'
import { Card } from '../../components/Card'
import { toast } from '../../components/Toast'
import { TwoPane } from '../../components/layouts'

const api = (window as any).api

export function CustomersScreen() {
  const [custs, setCusts] = useState<any[]>([])
  const [sel, setSel] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showRedeem, setShowRedeem] = useState(false)
  const [redeemPts, setRedeemPts] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [orderHistory, setOrderHistory] = useState<any[]>([])
  const [newCust, setNewCust] = useState({ name: '', phone: '', bday: '' })

  const load = (q?: string) => api?.customers?.list?.(q || undefined).then((d: any) => {
    if (d) {
      setCusts(d)
      if (sel) {
        const upd = d.find((x: any) => x.id === sel.id)
        if (upd) setSel(upd)
      }
    }
  })
  useEffect(() => { load() }, [])

  // Load order history when customer selected
  useEffect(() => {
    if (sel?.id) {
      setEditNotes(sel.notes || '')
      api?.customers?.getOrderHistory?.(sel.id, 10).then((d: any) => setOrderHistory(Array.isArray(d) ? d : []))
    } else {
      setOrderHistory([])
    }
  }, [sel?.id])

  const today = new Date()
  const isBday = (c: any) => { if (!c.birthday) return false; const b = new Date(c.birthday); return b.getMonth() === today.getMonth() && b.getDate() === today.getDate() }

  const filtered = custs.filter(c => (c.name || '').includes(search) || (c.phone || '').includes(search))

  const addCust = async () => {
    if (!newCust.name || !newCust.phone) { toast('يرجى ملء الاسم والهاتف'); return }
    try {
      await api?.customers?.create?.({ name: newCust.name, phone: newCust.phone, birthday: newCust.bday || null })
      toast('تم تسجيل العميل ✓')
      setShowAdd(false)
      setNewCust({ name: '', phone: '', bday: '' })
      load()
    } catch (err: any) {
      toast(err?.message?.includes('UNIQUE') ? 'رقم الهاتف مسجل مسبقاً' : 'خطأ في التسجيل')
    }
  }

  const toggleVip = async () => {
    if (!sel) return
    await api?.customers?.update?.(sel.id, { isVip: !sel.is_vip })
    toast(!sel.is_vip ? 'تم تعيين VIP ✓' : 'تم إزالة VIP')
    load()
  }

  const saveNotes = async () => {
    if (!sel) return
    await api?.customers?.update?.(sel.id, { notes: editNotes })
    toast('تم حفظ الملاحظات ✓')
    load()
  }

  const doRedeem = async () => {
    if (!sel) return
    const pts = parseInt(redeemPts || '0')
    if (pts <= 0 || pts > (sel.points || 0)) { toast('كمية نقاط غير صالحة'); return }
    await api?.customers?.redeemPoints?.(sel.id, pts)
    toast(`تم استخدام ${pts} نقطة ✓`)
    setShowRedeem(false)
    setRedeemPts('')
    load()
  }

  const listPane = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 20, gap: 14, overflow: 'hidden', minHeight: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontSize: 20, fontWeight: 900, color: P.plum }}>العملاء والولاء</div><div style={{ fontSize: 13, color: P.muted, marginTop: 2 }}>{custs.length} عميل</div></div>
          <Btn variant="primary" icon="plus" onClick={() => setShowAdd(true)}>عميل جديد</Btn>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: P.surface, border: `1.5px solid ${P.border}`, borderRadius: 12, padding: '8px 13px' }}>
          <Icon name="search" size={15} color={P.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث بالاسم أو الهاتف…" style={{ border: 'none', background: 'transparent', color: P.plum, fontSize: 15, outline: 'none', flex: 1, fontFamily: 'Tajawal,sans-serif' }} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {filtered.map(c => (
            <div key={c.id} onClick={() => setSel(c)} style={{ background: sel?.id === c.id ? P.ghost : P.surface, border: `1.5px solid ${sel?.id === c.id ? P.borderS : P.border}`, borderRadius: 14, padding: '13px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 13, transition: 'all .15s', boxShadow: sel?.id === c.id ? '0 4px 16px rgba(88,28,135,.10)' : 'none' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.is_vip ? 'linear-gradient(135deg,#fde68a,#f59e0b)' : P.bg3, border: `2px solid ${c.is_vip ? '#fde68a' : P.borderM}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: c.is_vip ? '#92400e' : P.muted, flexShrink: 0 }}>{c.name?.[0] || 'U'}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: P.plum }}>{c.name}</span>
                  {c.is_vip ? <Badge label="VIP" color="#b45309" /> : null}
                  {isBday(c) && <Badge label="🎂 عيد ميلاد" color={P.pink} />}
                </div>
                <div style={{ fontSize: 13, color: P.muted, marginTop: 2 }}>{c.phone || '—'}</div>
              </div>
              <div style={{ textAlign: 'left' }}><div style={{ fontSize: 15, fontWeight: 800, color: P.purple }}>{(c.points || 0).toLocaleString()} نقطة</div><div style={{ fontSize: 12, color: P.muted }}>{c.visit_count || 0} زيارة</div></div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: P.faint, fontSize: 15 }}>لا يوجد عملاء</div>}
        </div>
      </div>
  )

  const detailPane = sel ? (
    <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 68, height: 68, borderRadius: '50%', background: sel.is_vip ? 'linear-gradient(135deg,#fde68a,#f59e0b)' : P.bg3, border: `2px solid ${sel.is_vip ? '#fde68a' : P.borderM}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 800, color: sel.is_vip ? '#92400e' : P.muted, margin: '0 auto 10px' }}>{sel.name?.[0] || 'U'}</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: P.plum }}>{sel.name}</div>
        {sel.is_vip ? <Badge label="VIP Guest" color="#b45309" /> : null}
      </div>
      <Card style={{ padding: 14 }}>
        {[{ l: 'الهاتف', v: sel.phone || '—' }, { l: 'الزيارات', v: `${sel.visit_count || 0}×` }, { l: 'الإنفاق', v: `${(sel.total_spend || 0).toLocaleString()} ج.س` }, { l: 'الميلاد', v: sel.birthday || '—' }].map(f => (
          <div key={f.l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8, paddingBottom: 8, borderBottom: `1px solid ${P.border}` }}>
            <span style={{ color: P.muted }}>{f.l}</span><span style={{ color: P.ink, fontWeight: 700 }}>{f.v}</span>
          </div>
        ))}
      </Card>

      {/* Loyalty Points */}
      <Card style={{ padding: 14, background: P.ghost }}>
        <div style={{ fontSize: 12, color: P.muted, marginBottom: 4 }}>نقاط الولاء</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: P.purple }}>{(sel.points || 0).toLocaleString()}</div>
        <div style={{ fontSize: 12, color: P.faint, marginBottom: 12 }}>10 نقاط / 1,000 ج.س</div>
        <Btn variant="secondary" fullWidth icon="gift" disabled={(sel.points || 0) === 0} onClick={() => { setRedeemPts(''); setShowRedeem(true) }}>استخدام كخصم</Btn>
      </Card>

      {/* Notes — editable */}
      <Card style={{ padding: 14 }}>
        <div style={{ fontSize: 13, color: P.muted, marginBottom: 6, fontWeight: 700 }}>ملاحظات</div>
        <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="ملاحظات عن العميل…"
          style={{ width: '100%', minHeight: 60, background: P.bg2, border: `1px solid ${P.border}`, borderRadius: 8, padding: '8px 10px', fontSize: 14, fontFamily: 'Tajawal,sans-serif', outline: 'none', resize: 'vertical', color: P.plum }} />
        {editNotes !== (sel.notes || '') && (
          <Btn variant="success" size="sm" onClick={saveNotes} style={{ marginTop: 6 }} icon="save">حفظ</Btn>
        )}
      </Card>

      {/* VIP Toggle */}
      <Btn variant="ghost" onClick={toggleVip} style={{ color: P.gold, border: `1px solid ${P.goldL}`, borderRadius: 10, width: '100%', justifyContent: 'center' }}>
        <Icon name="star" size={14} color={P.gold} /> {sel.is_vip ? 'إزالة VIP' : 'ترقية إلى VIP'}
      </Btn>

      {/* Order History */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: P.muted, marginBottom: 8 }}>آخر الطلبات</div>
        {orderHistory.length === 0 ? (
          <div style={{ fontSize: 13, color: P.faint, textAlign: 'center', padding: 12 }}>لا توجد طلبات</div>
        ) : orderHistory.map((o: any) => (
          <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '8px 0', borderBottom: `1px solid ${P.border}` }}>
            <span style={{ color: P.ink }}>#{o.order_num || o.id}</span>
            <span style={{ color: P.purple, fontWeight: 700 }}>{(o.total || 0).toLocaleString()} ج.س</span>
            <span style={{ color: P.faint, fontSize: 12 }}>{o.created_at?.slice(0, 10)}</span>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div style={{ background: P.bg2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: P.faint, height: '100%' }}>
      <Icon name="user" size={36} color={P.faint} /><div style={{ fontSize: 14 }}>اختر عميلاً</div>
    </div>
  )

  return (
    <>
      <TwoPane
        list={listPane}
        detail={detailPane}
        selected={!!sel}
        onBack={() => setSel(null)}
        detailWidth={320}
      />

      {/* Add Modal */}
      {showAdd && <Modal title="عميل جديد" onClose={() => setShowAdd(false)} width={360} icon="user">
        <Field label="الاسم" required><Inp value={newCust.name} onChange={(e: any) => setNewCust({ ...newCust, name: e.target.value })} autoFocus /></Field>
        <Field label="الهاتف" required><Inp value={newCust.phone} onChange={(e: any) => setNewCust({ ...newCust, phone: e.target.value })} /></Field>
        <Field label="تاريخ الميلاد"><Inp value={newCust.bday} onChange={(e: any) => setNewCust({ ...newCust, bday: e.target.value })} type="date" /></Field>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}><Btn variant="secondary" onClick={() => setShowAdd(false)} style={{ flex: 1 }}>إلغاء</Btn><Btn variant="primary" onClick={addCust} style={{ flex: 1 }}>تسجيل</Btn></div>
      </Modal>}

      {/* Redeem Modal */}
      {showRedeem && sel && <Modal title="استخدام نقاط الولاء" onClose={() => setShowRedeem(false)} width={380} icon="gift">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, color: P.muted, marginBottom: 6 }}>الرصيد الحالي</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: P.purple }}>{(sel.points || 0).toLocaleString()}</div>
          <div style={{ fontSize: 13, color: P.faint }}>نقطة</div>
        </div>
        <Field label="عدد النقاط للاستخدام" required>
          <Inp value={redeemPts} onChange={(e: any) => setRedeemPts(e.target.value)} type="number" placeholder={`الحد الأقصى: ${sel.points || 0}`} />
        </Field>
        {parseInt(redeemPts || '0') > 0 && (
          <div style={{ background: P.greenXL, border: `1px solid ${P.greenL}`, borderRadius: 10, padding: '10px 14px', textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: P.muted }}>قيمة الخصم</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: P.green }}>{(parseInt(redeemPts || '0') * 100).toLocaleString()} ج.س</div>
            <div style={{ fontSize: 12, color: P.faint }}>1 نقطة = 100 ج.س</div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="secondary" onClick={() => setShowRedeem(false)} style={{ flex: 1 }}>إلغاء</Btn>
          <Btn variant="primary" icon="check" onClick={doRedeem} disabled={parseInt(redeemPts || '0') <= 0 || parseInt(redeemPts || '0') > (sel.points || 0)} style={{ flex: 2 }}>تأكيد الاستخدام</Btn>
        </div>
      </Modal>}
    </>
  )
}
