import React, { useState } from 'react'
import { P } from '../tokens'
import { Modal } from './Modal'
import { Icon } from './Icon'
import { Inp } from './Inp'
import { Btn } from './Btn'
import { Badge } from './TabBar'
import { ProductImage } from './ProductImage'
import { Field } from './Field'

interface VarGroup {
  id: string
  name: string
  type: 'single' | 'multi'
  options: { id: string; name: string; priceAdj?: number }[]
}

interface VariationModalProps {
  item: any
  groups: VarGroup[]
  onConfirm: (entry: any) => void
  onClose: () => void
}

export function VariationModal({ item, groups, onConfirm, onClose }: VariationModalProps) {
  const initSel: Record<string, any> = {}
  groups.forEach(g => { initSel[g.id] = g.type === 'single' ? g.options[0]?.id : [] })
  const [sel, setSel] = useState(initSel)
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  const priceAdj = groups.reduce((sum, g) => {
    if (g.type === 'single') {
      const opt = g.options.find(o => o.id === sel[g.id])
      return sum + (opt?.priceAdj || 0)
    } else {
      return sum + (sel[g.id] || []).reduce((s2: number, oid: string) => {
        const opt = g.options.find(o => o.id === oid)
        return s2 + (opt?.priceAdj || 0)
      }, 0)
    }
  }, 0)
  const unitPrice = item.price + priceAdj
  const total = unitPrice * qty

  const toggleMulti = (gid: string, oid: string) =>
    setSel(p => ({ ...p, [gid]: p[gid].includes(oid) ? p[gid].filter((x: string) => x !== oid) : [...p[gid], oid] }))

  const buildLabel = () => {
    const parts: string[] = []
    groups.forEach(g => {
      if (g.type === 'single') { const o = g.options.find(x => x.id === sel[g.id]); if (o) parts.push(o.name) }
      else { (sel[g.id] || []).forEach((oid: string) => { const o = g.options.find(x => x.id === oid); if (o) parts.push(o.name) }) }
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
          <div style={{ fontSize: 13.5, color: P.muted, marginBottom: 4 }}>{item.desc}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: P.purple }}>{item.price.toLocaleString()} <span style={{ fontSize: 12, color: P.faint }}>SDG</span>
            {priceAdj > 0 && <span style={{ fontSize: 13, color: P.pink, marginRight: 6 }}>+{priceAdj.toLocaleString()}</span>}
          </div>
        </div>
      </div>

      {groups.map(g => (
        <div key={g.id} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: P.ink, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            {g.name}
            <Badge label={g.type === 'single' ? 'اختر واحداً' : 'اختر أكثر من واحد'} color={P.purple} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {g.options.map(opt => {
              const isActive = g.type === 'single' ? sel[g.id] === opt.id : (sel[g.id] || []).includes(opt.id)
              return (
                <button key={opt.id}
                  onClick={() => g.type === 'single' ? setSel(p => ({ ...p, [g.id]: opt.id })) : toggleMulti(g.id, opt.id)}
                  style={{ padding: '7px 14px', borderRadius: 99, fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                    border: `1.5px solid ${isActive ? P.purple : P.borderM}`,
                    background: isActive ? 'linear-gradient(135deg,#9333ea15,#7c3aed15)' : P.surface,
                    color: isActive ? P.purple : P.muted, transition: 'all .15s', fontFamily: 'Tajawal, sans-serif' }}>
                  {opt.name}{(opt.priceAdj ?? 0) > 0 && <span style={{ fontSize: 10.5, marginRight: 4, color: isActive ? P.pinkL : P.faint }}>+{opt.priceAdj}</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <Field label="ملاحظة خاصة" hint="اختياري">
        <Inp value={note} onChange={(e: any) => setNote(typeof e === 'string' ? e : e.target.value)} placeholder="مثال: بدون سكر، كريمة إضافية…" />
      </Field>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: P.bg2, borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{ width: 32, height: 32, borderRadius: 9, border: `1.5px solid ${P.borderM}`, background: P.surface, color: P.mid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="minus" size={13} color={P.mid} /></button>
          <span style={{ fontSize: 18, fontWeight: 800, color: P.plum, width: 30, textAlign: 'center' }}>{qty}</span>
          <button onClick={() => setQty(q => q + 1)} style={{ width: 32, height: 32, borderRadius: 9, border: `1.5px solid ${P.borderM}`, background: P.surface, color: P.mid, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={13} color={P.mid} /></button>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: P.purple }}>{total.toLocaleString()} SDG</div>
      </div>

      <Btn variant="primary" fullWidth size="lg" onClick={confirm} icon="plus">إضافة للطلب</Btn>
    </Modal>
  )
}
