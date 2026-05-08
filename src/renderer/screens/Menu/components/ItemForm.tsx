import React, { useRef } from 'react'
import { P } from '../../../tokens'
import { Btn } from '../../../components/Btn'
import { Inp, Sel, Field } from '../../../components/Inp'
import { Modal } from '../../../components/Modal'
import { ImagePicker } from './ImagePicker'
import { OptionGroupsEditor } from './OptionGroupsEditor'
import { IconPicker } from './IconPicker'

export const ItemForm = ({ data, setData, onSave, onClose, title, rootCats, subCats }: any) => {
  const displayMode = data.displayMode || data.display_mode || 'icon'
  const optionGroupsRef = useRef<any>(null)

  // Simple field updater
  const upd = (patch: any) => setData((prev: any) => ({ ...prev, ...patch }))

  // At save time, read option groups directly from the editor's ref
  const handleSave = () => {
    const currentGroups = optionGroupsRef.current?.getGroups?.() || []
    const payload = { ...data, optionGroups: currentGroups }
    onSave(payload)
  }

  return (
    <Modal title={title} onClose={onClose} width={600} icon="edit">
      {/* Display Mode Toggle */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: P.ink, marginBottom: 7 }}>طريقة العرض في نقطة البيع</div>
        <div style={{ display: 'flex', borderRadius: 12, overflow: 'hidden', border: `1.5px solid ${P.borderM}` }}>
          {([
            { k: 'icon', label: '🎨 أيقونة' },
            { k: 'image', label: '📷 صورة' },
          ] as const).map(({ k, label }) => (
            <button
              key={k}
              type="button"
              onClick={() => upd({ displayMode: k, display_mode: k })}
              style={{
                flex: 1, padding: '10px 14px', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', border: 'none',
                background: displayMode === k
                  ? `linear-gradient(135deg, ${P.purple}, ${P.purpleL})`
                  : 'transparent',
                color: displayMode === k ? '#fff' : P.muted,
                fontFamily: 'Cairo,sans-serif',
                transition: 'all .15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
        {displayMode === 'icon' ? (
          <Field label="الأيقونة"><IconPicker value={data.emoji} onChange={(id: string) => upd({ emoji: id })} /></Field>
        ) : (
          <Field label="صورة المنتج">
            <ImagePicker value={data.image || data.image_path || ''} onChange={(v: string) => upd({ image: v })} itemName={data.name} />
          </Field>
        )}
        <Field label="الاسم" required><Inp value={data.name} onChange={(e: any) => upd({ name: e.target.value })} autoFocus /></Field>
        <Field label="السعر (ج.س)" required><Inp value={String(data.price || '')} onChange={(e: any) => upd({ price: e.target.value })} type="number" /></Field>
        <Field label="التكلفة (ج.س)"><Inp value={String(data.cost || '')} onChange={(e: any) => upd({ cost: e.target.value })} type="number" /></Field>
      </div>
      <Field label="الوصف"><Inp value={data.desc || data.description || ''} onChange={(e: any) => upd({ desc: e.target.value })} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="الفئة الرئيسية">
          <Sel value={data.catId || data.cat_id || ''} onChange={(e: any) => upd({ catId: e.target.value, subcatId: null })} options={[{ value: '', label: 'بدون' }, ...rootCats.map((c: any) => ({ value: c.id, label: c.name }))]} />
        </Field>
        <Field label="الفئة الفرعية">
          <Sel value={data.subcatId || data.subcat_id || ''} onChange={(e: any) => upd({ subcatId: e.target.value || null })}
            options={[{ value: '', label: '— لا يوجد —' }, ...subCats.filter((c: any) => c.parent_id === (data.catId || data.cat_id)).map((c: any) => ({ value: c.id, label: c.name }))]} />
        </Field>
      </div>
      <Field label="الخيارات والإضافات">
        <OptionGroupsEditor ref={optionGroupsRef} initialGroups={data.optionGroups || []} />
      </Field>
      <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
        <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>إلغاء</Btn>
        <Btn variant="primary" icon="save" onClick={handleSave} style={{ flex: 2 }}>حفظ الصنف</Btn>
      </div>
    </Modal>
  )
}
