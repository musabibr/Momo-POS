import { useState, useEffect, useMemo } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { Inp } from '../../components/Inp'
import { Field } from '../../components/Field'
import { toast } from '../../components/Toast'
import { useKitchenStock } from '../../hooks/useKitchen'

const api = (window as any).api

/**
 * ProductionPanel — simplified production workflow.
 * 1. Pick a menu item
 * 2. Set quantity
 * 3. Optionally add consumed materials (raw or premade) from kitchen stock
 */
export function ProductionPanel() {
  const { stock, reload } = useKitchenStock()
  const [menuItems, setMenuItems] = useState<any[]>([])
  const [allInventory, setAllInventory] = useState<any[]>([])
  const [showProduce, setShowProduce] = useState(false)

  // Form state
  const [selectedItem, setSelectedItem] = useState('')
  const [qty, setQty] = useState('1')
  const [materials, setMaterials] = useState<{ itemId: number; name: string; quantity: string; unit: string; type: string; available: number }[]>([])
  const [addMatId, setAddMatId] = useState('')
  const [matFilter, setMatFilter] = useState<'all' | 'ingredient' | 'premade'>('all')

  useEffect(() => {
    const load = async () => {
      try {
        const [items, inv] = await Promise.all([
          api?.menu?.listItems?.(),
          api?.inventory?.listItems?.()
        ])
        setMenuItems(Array.isArray(items) ? items : [])
        setAllInventory(Array.isArray(inv) ? inv : [])
      } catch {
        setMenuItems([])
        setAllInventory([])
      }
    }
    load()
  }, [])

  const openForm = () => {
    setShowProduce(true)
    setSelectedItem('')
    setQty('1')
    setMaterials([])
    setAddMatId('')
    setMatFilter('all')
  }

  const addMaterial = () => {
    const id = parseInt(addMatId)
    if (!id || materials.some(m => m.itemId === id)) return

    // Find item in kitchen stock first, then all inventory for info
    const kitchenItem = stock.find((s: any) => s.id === id)
    const invItem = allInventory.find((s: any) => s.id === id)
    const item = kitchenItem || invItem
    if (!item) return

    const kitchenQty = kitchenItem?.kitchen_stock ?? invItem?.stock_kitchen ?? 0

    setMaterials([...materials, {
      itemId: id,
      name: item.name,
      quantity: '',
      unit: item.unit || '',
      type: item.type || 'ingredient',
      available: kitchenQty,
    }])
    setAddMatId('')
  }

  const removeMaterial = (idx: number) => {
    setMaterials(materials.filter((_, i) => i !== idx))
  }

  const updateMatQty = (idx: number, val: string) => {
    const copy = [...materials]
    copy[idx].quantity = val
    setMaterials(copy)
  }

  const doProduce = async () => {
    if (!selectedItem) { toast('اختر صنف من القائمة'); return }
    const q = parseFloat(qty)
    if (isNaN(q) || q <= 0) { toast('كمية غير صالحة'); return }

    // Build consumed materials (filter out empty quantities)
    const consumed = materials
      .filter(m => m.quantity && parseFloat(m.quantity) > 0)
      .map(m => ({ itemId: m.itemId, quantity: parseFloat(m.quantity) }))

    try {
      const result = await api?.kitchen?.produce?.({
        menuItemName: selectedItem,
        quantity: q,
        consumedMaterials: consumed.length > 0 ? consumed : undefined,
      })
      const msg = result?.materialsDeducted > 0
        ? `✓ تم تسجيل إنتاج ${q}× ${selectedItem} (خصم ${result.materialsDeducted} مادة)`
        : `✓ تم تسجيل إنتاج ${q}× ${selectedItem}`
      toast(msg)
      setShowProduce(false)
      reload()
    } catch (err: any) { toast(err.message || 'خطأ في الإنتاج') }
  }

  // Available materials to add — filter by type and exclude already added
  const availableMaterials = useMemo(() => {
    const usedIds = new Set(materials.map(m => m.itemId))
    // Merge kitchen stock + all inventory, deduplicate, prefer kitchen items
    const merged = new Map<number, any>()
    for (const item of allInventory) {
      merged.set(item.id, {
        ...item,
        kitchen_stock: item.stock_kitchen ?? 0,
      })
    }
    // Override with kitchen stock data (more accurate kitchen qty)
    for (const item of stock) {
      merged.set(item.id, item)
    }
    let items = Array.from(merged.values()).filter((s: any) => !usedIds.has(s.id))
    if (matFilter === 'ingredient') items = items.filter((s: any) => s.type !== 'premade')
    else if (matFilter === 'premade') items = items.filter((s: any) => s.type === 'premade')
    return items
  }, [stock, allInventory, materials, matFilter])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: P.plum }}>الإنتاج</div>
          <div style={{ fontSize: 11, color: P.muted }}>سجّل ما تم إنتاجه واختيارياً حدد المواد المستهلكة</div>
        </div>
        <Btn variant="primary" icon="plus" onClick={openForm}>تسجيل إنتاج</Btn>
      </div>

      {/* ── Empty state ── */}
      {!showProduce && (
        <Card style={{ padding: 50, textAlign: 'center' }}>
          <div style={{ fontSize: 42, opacity: 0.25, marginBottom: 10 }}>🏭</div>
          <div style={{ fontSize: 14, color: P.muted, fontWeight: 600, marginBottom: 4 }}>اضغط "تسجيل إنتاج" لتوثيق العمل</div>
          <div style={{ fontSize: 12, color: P.faint }}>اختر صنف → حدد الكمية → اختيارياً أضف المواد المستهلكة</div>
        </Card>
      )}

      {/* ── Production Modal ── */}
      {showProduce && (
        <Modal title="تسجيل إنتاج" onClose={() => setShowProduce(false)} width={500} icon="spark">
          {/* Step 1: Pick menu item */}
          <Field label="الصنف" required>
            <select value={selectedItem} onChange={(e: any) => setSelectedItem(e.target.value)}
              style={{
                width: '100%', background: P.bg2, border: `1.5px solid ${P.border}`, borderRadius: 10,
                padding: '9px 13px', color: P.plum, fontSize: 14, outline: 'none',
                fontFamily: 'Tajawal, sans-serif', cursor: 'pointer'
              }}>
              <option value="">اختر صنف...</option>
              {menuItems.map((item: any) => (
                <option key={item.id} value={item.name}>{item.emoji || '🍽'} {item.name}</option>
              ))}
            </select>
          </Field>

          {/* Step 2: Quantity */}
          <Field label="الكمية المنتجة" required>
            <Inp value={qty} onChange={(e: any) => setQty(e.target.value)} type="number" min="1" autoFocus />
          </Field>

          {/* Step 3: Optional consumed materials */}
          <div style={{ marginTop: 10, borderTop: `1px dashed ${P.border}`, paddingTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.purple, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Icon name="box" size={13} color={P.purple} />
                المواد المستهلكة
                <span style={{ fontSize: 10, fontWeight: 400, color: P.muted }}>(اختياري)</span>
              </div>
            </div>

            {/* Added materials list */}
            {materials.map((mat, idx) => (
              <div key={mat.itemId} style={{
                display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6,
                background: P.bg2, padding: '8px 12px', borderRadius: 10,
                border: `1px solid ${P.ghost}`
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: P.plum, display: 'flex', alignItems: 'center', gap: 5 }}>
                    {mat.name}
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 99,
                      background: mat.type === 'premade' ? P.purpleXL : P.bg3,
                      color: mat.type === 'premade' ? P.purple : P.muted,
                    }}>{mat.type === 'premade' ? 'جاهز' : 'خام'}</span>
                  </div>
                  <div style={{ fontSize: 10, color: P.faint }}>المتوفر: {mat.available} {mat.unit}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input value={mat.quantity} onChange={(e: any) => updateMatQty(idx, e.target.value)}
                    type="number" step="any" placeholder="0"
                    style={{
                      width: 70, padding: '5px 8px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      border: `1.5px solid ${P.border}`, background: P.surface, outline: 'none',
                      textAlign: 'center', fontFamily: 'Tajawal,sans-serif', color: P.plum,
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = P.purple}
                    onBlur={e => e.currentTarget.style.borderColor = P.border}
                  />
                  <span style={{ fontSize: 12, color: P.purple, fontWeight: 700, minWidth: 30 }}>{mat.unit}</span>
                </div>
                <button onClick={() => removeMaterial(idx)} style={{
                  padding: '4px 7px', background: P.roseXL, border: `1px solid ${P.roseL}`,
                  borderRadius: 7, color: P.rose, cursor: 'pointer', fontSize: 11,
                  fontFamily: 'Tajawal,sans-serif', fontWeight: 800,
                }}>✕</button>
              </div>
            ))}

            {/* Add material picker — with type filter */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
              {/* Type filter chips */}
              <div style={{ display: 'flex', gap: 3 }}>
                {([
                  { id: 'all' as const, label: 'الكل' },
                  { id: 'ingredient' as const, label: 'خام' },
                  { id: 'premade' as const, label: 'جاهز' },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setMatFilter(f.id)} style={{
                    padding: '3px 7px', borderRadius: 99, fontSize: 9, fontWeight: matFilter === f.id ? 700 : 400,
                    cursor: 'pointer', border: `1px solid ${matFilter === f.id ? P.purple : P.border}`,
                    background: matFilter === f.id ? P.purpleXL : 'transparent',
                    color: matFilter === f.id ? P.purple : P.muted,
                    fontFamily: 'Tajawal,sans-serif',
                  }}>{f.label}</button>
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <select value={addMatId} onChange={(e: any) => setAddMatId(e.target.value)}
                  style={{
                    width: '100%', background: P.bg2, border: `1.5px solid ${P.border}`, borderRadius: 10,
                    padding: '6px 10px', color: P.plum, fontSize: 12, outline: 'none',
                    fontFamily: 'Tajawal, sans-serif', cursor: 'pointer'
                  }}>
                  <option value="">+ إضافة مادة...</option>
                  {availableMaterials.map((s: any) => {
                    const kQty = s.kitchen_stock ?? 0
                    const typeLabel = s.type === 'premade' ? '⚙' : '🧂'
                    return (
                      <option key={s.id} value={s.id}>
                        {typeLabel} {s.name} — {kQty} {s.unit} (مطبخ)
                      </option>
                    )
                  })}
                </select>
              </div>
              <Btn variant="secondary" onClick={addMaterial} disabled={!addMatId}
                style={{ padding: '5px 10px', fontSize: 11, whiteSpace: 'nowrap' }}>إضافة</Btn>
            </div>

            {materials.length === 0 && (
              <div style={{ fontSize: 11, color: P.faint, marginTop: 8, textAlign: 'center' }}>
                يمكنك تسجيل الإنتاج بدون تحديد مواد مستهلكة
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <Btn variant="secondary" onClick={() => setShowProduce(false)} style={{ flex: 1 }}>إلغاء</Btn>
            <Btn variant="primary" icon="spark" onClick={doProduce} style={{ flex: 2 }}>تسجيل الإنتاج</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
