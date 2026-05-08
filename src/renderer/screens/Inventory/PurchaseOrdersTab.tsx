import React, { useState } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp, Sel, Field } from '../../components/Inp'
import { Modal } from '../../components/Modal'
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

  // New Ingredient state
  const [showAddIng, setShowAddIng] = useState(false)
  const [ingForm, setIngForm] = useState({ name: '', unit: 'g', type: 'ingredient' })
  const [dbUnits, setDbUnits] = useState<{value:string,label:string}[]>([])
  
  React.useEffect(() => {
    api?.inventory?.listUnits?.().then((r:any) => { if(r?.length) setDbUnits(r.map((u:any)=>({value:u.id,label:u.name}))) }).catch(()=>{})
  }, [])
  const UNITS = dbUnits.length > 0 ? dbUnits : [
    {value:'g',label:'جرام'},{value:'kg',label:'كيلو'},{value:'ml',label:'مل'},{value:'l',label:'لتر'},
    {value:'pcs',label:'قطعة'},{value:'box',label:'صندوق'},{value:'pack',label:'عبوة'},{value:'bottle',label:'زجاجة'}
  ]

  const lowStockIngs = ingredients.filter(i => i.low_threshold > 0 && (i.stock_main ?? i.stock ?? 0) + (i.stock_kitchen ?? 0) <= i.low_threshold)

  const addLine = (ing: any) => {
    if (poLines.find(l => l.itemId === ing.id)) return
    setPoLines(p => [...p, { itemId: ing.id, name: ing.name, unit: ing.unit, currentStock: ing.stock_main ?? ing.stock ?? 0, qty: Math.max(1, (ing.low_threshold * 3) - (ing.stock_main ?? ing.stock ?? 0)), unitCost: ing.cost_per_unit || 0 }])
  }

  const confirmPurchase = async () => {
    if (!selSupplier) { toast('يرجى اختيار مورد أولاً', 'error'); return }
    if (poLines.length === 0) { toast('يرجى إضافة أصناف إلى الفاتورة', 'error'); return }
    if (poLines.some(l => !l.unitCost || l.unitCost <= 0)) { toast('يرجى إدخال تكلفة صحيحة لكل الأصناف', 'error'); return }
    
    try {
      await api?.procurement?.createPurchase?.({ 
        supplierId: selSupplier, 
        items: poLines.map(l => ({ itemId: l.itemId, quantity: l.qty, unitCost: l.unitCost })), 
        note: poNote || null 
      })
      toast('✓ تم تسجيل فاتورة المشتريات وتحديث المخزون بنجاح', 'success')
      setPoLines([])
      setPoNote('')
      setSelSupplier(null)
      reloadIngs()
    } catch (err: any) { 
      toast(err.message || 'خطأ في تسجيل المشتريات', 'error') 
    }
  }

  const handleCreateIngredient = async () => {
    if (!ingForm.name) { toast('الاسم مطلوب', 'error'); return }
    try {
      const newIng = await api?.inventory?.createItem?.({
        name: ingForm.name,
        unit: ingForm.unit,
        stock: 0,
        lowThreshold: 0,
        costPerUnit: null,
        barcode: null,
        type: ingForm.type
      })
      toast('تمت إضافة المادة بنجاح', 'success')
      await reloadIngs()
      setShowAddIng(false)
      setIngForm({ name: '', unit: 'g', type: 'ingredient' })
      
      // Auto-add it to the PO lines
      if (newIng && newIng.id) {
        addLine({ id: newIng.id, name: ingForm.name, unit: ingForm.unit, stock_main: 0, low_threshold: 0, cost_per_unit: 0 })
      }
    } catch (err: any) {
      toast(err.message || 'خطأ في إضافة المادة', 'error')
    }
  }

  const totalAmount = poLines.reduce((s, l) => s + l.qty * l.unitCost, 0)

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%', alignItems: 'flex-start' }}>
      {/* LEFT PANE: Selection & Tools */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflowY: 'auto', paddingRight: 4 }}>
        
        <Card style={{ padding: 20, background: 'linear-gradient(135deg, #f8f9fc 0%, #ffffff 100%)', border: `1px solid ${P.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ background: P.plum, padding: 8, borderRadius: 8, color: '#fff', display: 'flex' }}>
              <Icon name="truck" size={20} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: P.plum }}>إعداد فاتورة مشتريات</div>
              <div style={{ fontSize: 13, color: P.muted }}>قم باختيار المكونات وتحديد المورد لإضافتها للمخزون</div>
            </div>
          </div>

          <Field label="المورد (إلزامي)">
            <Sel 
              value={selSupplier || ''} 
              onChange={(e: any) => setSelSupplier(e.target.value ? parseInt(e.target.value) : null)} 
              options={[{ value: '', label: '— اختر المورد —' }, ...suppliers.map(s => ({ value: String(s.id), label: s.name }))]} 
              style={{ fontWeight: selSupplier ? 700 : 400, color: selSupplier ? P.plum : P.ink }}
            />
          </Field>
          
          <Field label="ملاحظات الفاتورة (اختياري)">
            <Inp value={poNote} onChange={(e: any) => setPoNote(e.target.value)} placeholder="رقم الفاتورة المرجعي، تفاصيل الشحن..." />
          </Field>
        </Card>

        {lowStockIngs.length > 0 && (
          <Card style={{ padding: 16, background: P.goldXL, border: `1px solid ${P.goldL}` }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: P.gold, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="alert" size={16} /> نواقص مقترحة للشراء
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {lowStockIngs.map(ing => (
                <button 
                  key={ing.id} 
                  onClick={() => addLine(ing)} 
                  disabled={poLines.some(l => l.itemId === ing.id)} 
                  style={{ 
                    padding: '6px 14px', borderRadius: 99, fontSize: 13, 
                    border: `1px solid ${poLines.some(l => l.itemId === ing.id) ? 'transparent' : P.gold}`, 
                    background: poLines.some(l => l.itemId === ing.id) ? P.ghost : '#fff', 
                    color: poLines.some(l => l.itemId === ing.id) ? P.faint : P.gold, 
                    cursor: poLines.some(l => l.itemId === ing.id) ? 'default' : 'pointer', 
                    fontFamily: 'Cairo,sans-serif', fontWeight: 700,
                    transition: 'all 0.2s',
                    boxShadow: poLines.some(l => l.itemId === ing.id) ? 'none' : '0 2px 4px rgba(0,0,0,0.05)'
                  }}>
                  {ing.name} {poLines.some(l => l.itemId === ing.id) ? '(مضاف)' : '+'}
                </button>
              ))}
            </div>
          </Card>
        )}

        <Card style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: P.plum }}>إضافة مكونات أخرى</div>
            <Btn variant="secondary" size="sm" icon="plus" onClick={() => setShowAddIng(true)}>مادة جديدة</Btn>
          </div>
          <Sel 
            value="" 
            onChange={(e: any) => { const ing = ingredients.find(i => i.id === parseInt(e.target.value)); if (ing) addLine(ing) }} 
            options={[{ value: '', label: 'بحث وإضافة مكون...' }, ...ingredients.map(i => ({ value: String(i.id), label: `${i.name} (المخزون: ${i.stock_main ?? i.stock ?? 0} ${i.unit})` }))]} 
          />
        </Card>

      </div>

      {/* RIGHT PANE: The Invoice / Cart */}
      <div style={{ width: 440, display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
        <Card style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', border: `1px solid ${P.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
          {/* Invoice Header */}
          <div style={{ background: P.plum, padding: '20px', color: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 4 }}>إجمالي الفاتورة</div>
            <div style={{ fontSize: 32, fontWeight: 900, fontFamily: 'monospace' }}>{totalAmount.toLocaleString()} ج.س</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginTop: 8 }}>
              {selSupplier ? `المورد: ${suppliers.find(s => s.id === selSupplier)?.name}` : 'لم يتم تحديد المورد'}
            </div>
          </div>

          {/* Line Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12, background: '#fafafa' }}>
            {poLines.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: P.faint, opacity: 0.6 }}>
                <Icon name="cart" size={48} color={P.muted} style={{ marginBottom: 16 }} />
                <div style={{ fontSize: 16, fontWeight: 700 }}>الفاتورة فارغة</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>قم بإضافة مكونات من القائمة الجانبية</div>
              </div>
            ) : (
              poLines.map((line, i) => (
                <div key={line.itemId} style={{ background: '#fff', border: `1px solid ${P.border}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: P.plum }}>{line.name}</div>
                      <div style={{ fontSize: 12, color: P.muted, marginTop: 2 }}>المخزون الحالي: <span style={{ fontWeight: 700 }}>{line.currentStock} {line.unit}</span></div>
                    </div>
                    <button onClick={() => setPoLines(p => p.filter((_, j) => j !== i))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <Icon name="del" size={16} color={P.rose} />
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: P.ghost, padding: 8, borderRadius: 8 }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 11, color: P.muted, marginBottom: 4, fontWeight: 700 }}>الكمية ({line.unit})</span>
                      <input type="number" min={0.1} step={0.1} value={line.qty} onChange={e => setPoLines(p => p.map((l, j) => j === i ? { ...l, qty: parseFloat(e.target.value) || 0 } : l))} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${P.border}`, fontSize: 14, outline: 'none', fontFamily: 'Cairo,sans-serif', fontWeight: 700, textAlign: 'center' }} />
                    </div>
                    <div style={{ color: P.muted, fontSize: 16, marginTop: 16 }}>×</div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 11, color: P.muted, marginBottom: 4, fontWeight: 700 }}>سعر الوحدة</span>
                      <input type="number" min={0} value={line.unitCost} onChange={e => setPoLines(p => p.map((l, j) => j === i ? { ...l, unitCost: parseFloat(e.target.value) || 0 } : l))} style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: `1px solid ${P.border}`, fontSize: 14, outline: 'none', fontFamily: 'Cairo,sans-serif', fontWeight: 700, textAlign: 'center' }} />
                    </div>
                    <div style={{ color: P.muted, fontSize: 16, marginTop: 16 }}>=</div>
                    <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: P.muted, marginBottom: 4, fontWeight: 700 }}>الإجمالي</span>
                      <div style={{ fontSize: 14, fontWeight: 900, color: P.purple, marginTop: 6 }}>
                        {(line.qty * line.unitCost).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout Footer */}
          <div style={{ padding: 16, background: '#fff', borderTop: `1px solid ${P.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: P.muted, fontWeight: 700 }}>
              <span>عدد الأصناف: {poLines.length}</span>
              {poLines.length > 0 && <span onClick={() => setPoLines([])} style={{ color: P.rose, cursor: 'pointer' }}>إفراغ الفاتورة</span>}
            </div>
            <Btn 
              variant="primary" 
              icon="check" 
              onClick={confirmPurchase} 
              disabled={poLines.length === 0 || !selSupplier} 
              style={{ padding: '16px 0', fontSize: 16, borderRadius: 12, opacity: (poLines.length === 0 || !selSupplier) ? 0.5 : 1 }}
              fullWidth
            >
              تسجيل المشتريات
            </Btn>
          </div>
        </Card>
      </div>

      {showAddIng && (
        <Modal title="مادة خام / مكون جديد" onClose={() => setShowAddIng(false)} width={380} icon="layers">
          <Field label="اسم المادة" required>
            <Inp value={ingForm.name} onChange={(e: any) => setIngForm({ ...ingForm, name: e.target.value })} autoFocus placeholder="مثال: دقيق فاخر" />
          </Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="الوحدة" style={{ flex: 1 }} required>
              <Sel value={ingForm.unit} onChange={(e: any) => setIngForm({ ...ingForm, unit: e.target.value })} options={UNITS} />
            </Field>
            <Field label="النوع" style={{ flex: 1 }}>
              <Sel value={ingForm.type} onChange={(e: any) => setIngForm({ ...ingForm, type: e.target.value })} options={[{ value: 'ingredient', label: 'مكون خام' }, { value: 'packaging', label: 'تغليف' }, { value: 'retail', label: 'منتج جاهز' }]} />
            </Field>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="secondary" onClick={() => setShowAddIng(false)} style={{ flex: 1 }}>إلغاء</Btn>
            <Btn variant="primary" onClick={handleCreateIngredient} style={{ flex: 1 }}>إضافة</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
