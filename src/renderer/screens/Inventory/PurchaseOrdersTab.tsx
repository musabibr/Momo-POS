import React, { useState } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp, Sel, Field } from '../../components/Inp'
import { Icon } from '../../components/Icon'
import { Card } from '../../components/Card'
import { toast } from '../../components/Toast'
import { useSuppliers } from '../../hooks/useProcurement'
import { useInventoryItems } from '../../hooks/useInventory'

const api = (window as any).api

export function PurchaseOrdersTab() {
  const { suppliers } = useSuppliers()
  const { items: ingredients, reload: reloadIngs } = useInventoryItems()
  const [selSupplier, setSelSupplier] = useState<number | null>(null)
  const [poLines, setPoLines] = useState<any[]>([])
  const [poNote, setPoNote] = useState('')

  const lowStockIngs = ingredients.filter(i => i.low_threshold > 0 && (i.stock_main ?? i.stock ?? 0) + (i.stock_kitchen ?? 0) <= i.low_threshold)

  const addLine = (ing: any) => {
    if (poLines.find(l => l.itemId === ing.id)) return
    setPoLines(p => [...p, { itemId: ing.id, name: ing.name, unit: ing.unit, currentStock: ing.stock_main ?? ing.stock ?? 0, qty: Math.max(1, (ing.low_threshold * 3) - (ing.stock_main ?? ing.stock ?? 0)), unitCost: ing.cost_per_unit || 0 }])
  }

  const confirmPurchase = async () => {
    if (!selSupplier || poLines.length === 0) { toast('اختر مورد وأصناف'); return }
    if (poLines.some(l => !l.unitCost || l.unitCost <= 0)) { toast('أدخل تكلفة الوحدة لكل صنف'); return }
    try {
      await api?.procurement?.createPurchase?.({ supplierId: selSupplier, items: poLines.map(l => ({ itemId: l.itemId, quantity: l.qty, unitCost: l.unitCost })), note: poNote || null })
      toast('✓ تم تسجيل المشتريات وتحديث المخزون')
      setPoLines([]); setPoNote(''); reloadIngs()
    } catch (err: any) { toast(err.message || 'خطأ في تسجيل المشتريات') }
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* Supplier list */}
      <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 10, flexShrink: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: P.plum }}>اختر مورد</div>
        <div style={{ background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', flex: 1, overflowY: 'auto' }}>
          {suppliers.map(s => (
            <div key={s.id} onClick={() => setSelSupplier(s.id)} style={{ padding: '12px 14px', borderBottom: `1px solid ${P.border}`, cursor: 'pointer', background: selSupplier === s.id ? P.ghost : 'transparent', transition: 'background .15s' }}>
              <div style={{ fontWeight: selSupplier === s.id ? 800 : 500, color: selSupplier === s.id ? P.purple : P.ink, fontSize: 14 }}>{s.name}</div>
              {s.phone && <div style={{ fontSize: 11, color: P.faint, marginTop: 2 }}>{s.phone}</div>}
            </div>
          ))}
          {suppliers.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: P.faint, fontSize: 13 }}>لا يوجد موردون</div>}
        </div>
      </div>

      {/* PO form */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {selSupplier ? (
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: P.plum, marginBottom: 4 }}>أمر شراء — {suppliers.find(s => s.id === selSupplier)?.name}</div>
            <div style={{ fontSize: 13, color: P.muted, marginBottom: 14 }}>اختر المكونات المطلوبة وحدد الكميات</div>

            {lowStockIngs.length > 0 && <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.gold, marginBottom: 8 }}>⚠ مكونات منخفضة:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {lowStockIngs.map(ing => <button key={ing.id} onClick={() => addLine(ing)} disabled={poLines.some(l => l.itemId === ing.id)} style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, border: `1px solid ${P.goldL}`, background: P.goldXL, color: P.gold, cursor: 'pointer', fontFamily: 'Tajawal,sans-serif', fontWeight: 600, opacity: poLines.some(l => l.itemId === ing.id) ? 0.4 : 1 }}>{ing.name}</button>)}
              </div>
            </div>}

            <Sel value="" onChange={(e: any) => { const ing = ingredients.find(i => i.id === parseInt(e.target.value)); if (ing) addLine(ing) }} options={[{ value: '', label: '+ إضافة مكون…' }, ...ingredients.map(i => ({ value: String(i.id), label: `${i.name} (${i.stock_main ?? i.stock ?? 0} ${i.unit})` }))]} />

            <div style={{ marginTop: 12 }}>
              {poLines.map((line, i) => (
                <div key={line.itemId} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, background: P.bg2, padding: '10px 14px', borderRadius: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 120px', fontSize: 14, fontWeight: 700, color: P.plum }}>{line.name}</div>
                  <div style={{ fontSize: 11, color: P.muted }}>مخزون: {line.currentStock}</div>
                  <input type="number" value={line.qty} onChange={e => setPoLines(p => p.map((l, j) => j === i ? { ...l, qty: parseFloat(e.target.value) || 0 } : l))} style={{ width: 70, padding: '6px 8px', borderRadius: 8, border: `1px solid ${P.border}`, fontSize: 13, outline: 'none', fontFamily: 'Tajawal,sans-serif', textAlign: 'center' }} />
                  <span style={{ fontSize: 11, color: P.muted }}>{line.unit}</span>
                  <input type="number" value={line.unitCost} onChange={e => setPoLines(p => p.map((l, j) => j === i ? { ...l, unitCost: parseFloat(e.target.value) || 0 } : l))} placeholder="تكلفة" style={{ width: 80, padding: '6px 8px', borderRadius: 8, border: `1px solid ${P.border}`, fontSize: 13, outline: 'none', fontFamily: 'Tajawal,sans-serif', textAlign: 'center' }} />
                  <span style={{ fontSize: 13, color: P.purple, fontWeight: 700, minWidth: 60 }}>= {(line.qty * line.unitCost).toLocaleString()}</span>
                  <button onClick={() => setPoLines(p => p.filter((_, j) => j !== i))} style={{ width: 28, height: 28, borderRadius: 7, background: P.roseXL, border: 'none', color: P.rose, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Icon name="del" size={13} color={P.rose} /></button>
                </div>
              ))}
              {poLines.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: P.faint, fontSize: 13 }}>لم يتم اختيار أصناف بعد</div>}
            </div>

            {poLines.length > 0 && <div style={{ fontSize: 15, fontWeight: 900, color: P.plum, textAlign: 'left', marginTop: 8 }}>الإجمالي: {poLines.reduce((s, l) => s + l.qty * l.unitCost, 0).toLocaleString()} ج.س</div>}
            <Field label="ملاحظة"><Inp value={poNote} onChange={(e: any) => setPoNote(e.target.value)} placeholder="اختياري" /></Field>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <Btn variant="secondary" onClick={() => setPoLines([])} style={{ flex: 1 }}>مسح الكل</Btn>
              <Btn variant="primary" icon="check" onClick={confirmPurchase} disabled={poLines.length === 0} style={{ flex: 2 }}>تسجيل المشتريات</Btn>
            </div>
          </Card>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: P.faint, flexDirection: 'column', gap: 10 }}>
            <Icon name="layers" size={48} color={P.faint} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>اختر مورداً لإنشاء أمر شراء</div>
          </div>
        )}
      </div>
    </div>
  )
}
