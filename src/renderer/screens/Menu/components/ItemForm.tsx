import React from 'react'
import { P } from '../../../tokens'
import { Btn } from '../../../components/Btn'
import { Inp, Sel, Field } from '../../../components/Inp'
import { Modal } from '../../../components/Modal'
import { ImagePicker } from './ImagePicker'
import { OptionGroupsEditor } from './OptionGroupsEditor'

export const ItemForm = ({ data, setData, onSave, onClose, title, rootCats, subCats }: any) => (
  <Modal title={title} onClose={onClose} width={600} icon="edit">
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
      <Field label="الإيموجي"><Inp value={data.emoji} onChange={(e: any) => setData({ ...data, emoji: e.target.value })} /></Field>
      <Field label="الاسم" required><Inp value={data.name} onChange={(e: any) => setData({ ...data, name: e.target.value })} autoFocus /></Field>
      <Field label="السعر (ج.س)" required><Inp value={String(data.price || '')} onChange={(e: any) => setData({ ...data, price: e.target.value })} type="number" /></Field>
      <Field label="التكلفة (ج.س)"><Inp value={String(data.cost || '')} onChange={(e: any) => setData({ ...data, cost: e.target.value })} type="number" /></Field>
    </div>
    <Field label="الوصف"><Inp value={data.desc || data.description || ''} onChange={(e: any) => setData({ ...data, desc: e.target.value })} /></Field>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Field label="التصنيف الرئيسي">
        <Sel value={data.catId || data.cat_id || ''} onChange={(e: any) => setData({ ...data, catId: e.target.value, subcatId: null })} options={[{ value: '', label: 'بدون' }, ...rootCats.map((c: any) => ({ value: c.id, label: c.name }))]} />
      </Field>
      <Field label="التصنيف الفرعي">
        <Sel value={data.subcatId || data.subcat_id || ''} onChange={(e: any) => setData({ ...data, subcatId: e.target.value || null })}
          options={[{ value: '', label: '— لا يوجد —' }, ...subCats.filter((c: any) => c.parent_id === (data.catId || data.cat_id)).map((c: any) => ({ value: c.id, label: c.name }))]} />
      </Field>
    </div>
    <Field label="الباركود" hint="اختياري">
      <Inp value={data.barcode || ''} onChange={(e: any) => setData({ ...data, barcode: e.target.value })} placeholder="امسح أو أدخل الباركود" />
    </Field>
    <Field label="صورة المنتج" hint="اختياري">
      <ImagePicker value={data.image} onChange={(v: string) => setData({ ...data, image: v })} itemName={data.name} />
    </Field>
    <Field label="الخيارات والإضافات">
      <OptionGroupsEditor groups={data.optionGroups || []} onChange={(g) => setData({ ...data, optionGroups: g })} />
    </Field>
    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
      <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>إلغاء</Btn>
      <Btn variant="primary" icon="save" onClick={onSave} style={{ flex: 2 }}>حفظ الصنف</Btn>
    </div>
  </Modal>
)
