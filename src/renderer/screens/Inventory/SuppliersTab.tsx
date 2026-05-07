import React, { useState } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp, Field } from '../../components/Inp'
import { Modal } from '../../components/Modal'
import { Icon } from '../../components/Icon'
import { Card } from '../../components/Card'
import { toast } from '../../components/Toast'
import { useSuppliers } from '../../hooks/useProcurement'

const api = (window as any).api

export function SuppliersTab() {
  const { suppliers, reload: load } = useSuppliers()
  const [showAdd, setShowAdd] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmDel, setConfirmDel] = useState<{id: number, name: string} | null>(null)

  const add = async () => {
    if (!name) return
    try {
      await api?.procurement?.createSupplier?.({ name, phone, notes })
      toast('تمت الإضافة'); load(); setShowAdd(false); setName(''); setPhone(''); setNotes('')
    } catch(err:any) { toast(err.message||'خطأ في الإضافة') }
  }

  const confirmDelete = async () => {
    if (!confirmDel) return
    try {
      await api?.procurement?.deleteSupplier?.(confirmDel.id)
      toast('تم الحذف'); load(); setConfirmDel(null)
    } catch(err:any) { toast(err.message||'خطأ في الحذف') }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontWeight: 800, color: P.plum, margin: 0 }}>الموردون</h3>
        <Btn variant="primary" icon="plus" onClick={() => setShowAdd(true)}>إضافة مورد</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 14 }}>
        {suppliers.map(s => (
          <Card key={s.id} style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontWeight: 800, color: P.ink, fontSize: 16 }}>{s.name}</div>
              <Btn variant="ghost" size="sm" icon="del" onClick={() => setConfirmDel({ id: s.id, name: s.name })} style={{ color: P.rose }}></Btn>
            </div>
            {s.phone && <div style={{ fontSize: 14, color: P.muted, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}><Icon name="phone" size={12} color={P.muted} /> {s.phone}</div>}
            {s.notes && <div style={{ fontSize: 13, color: P.faint, marginTop: 8, background: P.bg2, padding: '6px 10px', borderRadius: 8 }}>{s.notes}</div>}
          </Card>
        ))}
      </div>
      {showAdd && <Modal onClose={() => setShowAdd(false)} title="إضافة مورد" icon="plus">
        <Field label="الاسم" required><Inp value={name} onChange={(e: any) => setName(e.target.value)} autoFocus /></Field>
        <Field label="الهاتف"><Inp value={phone} onChange={(e: any) => setPhone(e.target.value)} /></Field>
        <Field label="ملاحظات"><Inp value={notes} onChange={(e: any) => setNotes(e.target.value)} /></Field>
        <Btn variant="primary" fullWidth onClick={add}>حفظ المورد</Btn>
      </Modal>}

      {confirmDel && <Modal title="تأكيد الحذف" onClose={() => setConfirmDel(null)} width={380} icon="alert">
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: P.roseXL, border: `2px solid ${P.roseL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Icon name="alert" size={26} color={P.rose} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: P.plum }}>هل تريد حذف المورد "{confirmDel.name}"؟</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setConfirmDel(null)}>إلغاء</Btn>
          <Btn variant="danger" style={{ flex: 1 }} onClick={confirmDelete}>حذف</Btn>
        </div>
      </Modal>}
    </div>
  )
}

