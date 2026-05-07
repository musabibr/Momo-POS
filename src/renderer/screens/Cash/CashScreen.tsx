import React, { useState, useEffect } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp, Sel, Field } from '../../components/Inp'
import { Modal } from '../../components/Modal'
import { Badge } from '../../components/TabBar'
import { Icon } from '../../components/Icon'
import { Card } from '../../components/Card'
import { toast } from '../../components/Toast'
import { ScrollableTabs, KpiGrid } from '../../components/layouts'
import { OverviewTab } from './tabs/OverviewTab'
import { DrawerTab } from './tabs/DrawerTab'
import { ExpensesTab } from './tabs/ExpensesTab'
import { ReconcileTab } from './tabs/ReconcileTab'
import { ShiftHistoryTab } from './tabs/ShiftHistoryTab'
import { ReportsTab } from './tabs/ReportsTab'

const api = (window as any).api

export function CashScreen() {
  const [tab, setTab] = useState('overview')
  const [shift, setShift] = useState<any>(null)
  const [showOpen, setShowOpen] = useState(false)
  const [openFloat, setOpenFloat] = useState('')
  const [employees, setEmployees] = useState<any[]>([])

  // Edit float
  const [showEditFloat, setShowEditFloat] = useState(false)
  const [editFloat, setEditFloat] = useState('')
  const [editFloatReason, setEditFloatReason] = useState('')

  const loadShift = () => {
    api?.shifts?.getCurrent?.().then((s: any) => setShift(s))
  }
  useEffect(() => {
    loadShift()
    api?.employees?.list?.().then((d: any) => d && setEmployees(d))
  }, [])

  async function openShift() {
    const f = parseInt(openFloat || '0')
    await api?.shifts?.open?.(f)
    toast('تم فتح الوردية ✓')
    setShowOpen(false)
    setOpenFloat('')
    loadShift()
  }

  async function saveEditFloat() {
    if (!editFloat) { toast('أدخل المبلغ'); return }
    await api?.shifts?.updateOpenFloat?.(shift.id, parseInt(editFloat), editFloatReason || 'تعديل الرصيد')
    toast('تم تعديل الرصيد الافتتاحي ✓')
    setShowEditFloat(false)
    setEditFloat('')
    setEditFloatReason('')
    loadShift()
  }

  const empName = employees.find((e: any) => e.id === shift?.employee_id)?.name || ''

  // No active shift → show open-shift gate
  if (!shift) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20, gap: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: P.plum }}>الوردية والدرج</div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, background: P.surface, borderRadius: 16, border: `1px dashed ${P.borderM}` }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, background: P.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Icon name="shift" size={36} color={P.muted} />
          </div>
          <h2 style={{ color: P.plum, marginBottom: 8, fontSize: 20 }}>لا توجد وردية مفتوحة</h2>
          <p style={{ color: P.muted, marginBottom: 20, fontSize: 16, textAlign: 'center' }}>افتح وردية جديدة لبدء عمليات البيع</p>
          <Btn variant="primary" icon="plus" onClick={() => setShowOpen(true)}>فتح الوردية</Btn>
        </div>
        <Modal open={showOpen} onClose={() => setShowOpen(false)} title="فتح وردية" icon="shift" width={360}>
          <Field label="الدرج الافتتاحي (ج.س)" required>
            <Inp type="number" value={openFloat} onChange={(e: any) => setOpenFloat(e.target.value)} autoFocus />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setShowOpen(false)}>إلغاء</Btn>
            <Btn variant="primary" style={{ flex: 1 }} onClick={openShift}>تأكيد الفتح</Btn>
          </div>
        </Modal>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20, gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: P.plum }}>الوردية والدرج</div>
          <div style={{ fontSize: 14, color: P.muted, marginTop: 2, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <Badge label="مفتوحة" color={P.green} bg={P.greenXL} />
            <span>افتُتحت {shift.opened_at?.slice(11, 16)}</span>
            {empName && <span>· 👤 {empName}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: P.bg2, borderRadius: 10, padding: '6px 14px', border: `1px solid ${P.border}` }}>
            <span style={{ fontSize: 13, color: P.muted }}>الافتتاحي:</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: P.purple }}>{(shift.open_float || 0).toLocaleString()}</span>
            <span style={{ fontSize: 13, color: P.muted }}>ج.س</span>
            <Icon name="edit" size={13} color={P.muted} onClick={() => { setEditFloat(String(shift.open_float || 0)); setEditFloatReason(''); setShowEditFloat(true) }} style={{ cursor: 'pointer', marginRight: 4 }} />
          </div>
        </div>
      </div>

      <ScrollableTabs tabs={[
        { id: 'overview', label: 'الملخص' },
        { id: 'drawer', label: 'الدرج' },
        { id: 'expenses', label: 'المصروفات' },
        { id: 'reconcile', label: 'المطابقة والإغلاق' },
        { id: 'history', label: 'سجل الورديات' },
        { id: 'reports', label: 'التقارير' }
      ]} active={tab} onChange={setTab} />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {tab === 'overview' && <OverviewTab shift={shift} />}
        {tab === 'drawer' && <DrawerTab shift={shift} />}
        {tab === 'expenses' && <ExpensesTab shift={shift} />}
        {tab === 'reconcile' && <ReconcileTab shift={shift} onShiftClosed={loadShift} />}
        {tab === 'history' && <ShiftHistoryTab employees={employees} />}
        {tab === 'reports' && <ReportsTab employees={employees} />}
      </div>

      {/* Edit float modal */}
      {showEditFloat && (
        <Modal title="تعديل الرصيد الافتتاحي" onClose={() => setShowEditFloat(false)} width={380} icon="edit">
          <div style={{ fontSize: 14, color: P.muted, background: P.bg2, borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            ⚠️ هذه العملية مسجلة ومراقبة. الرصيد الحالي: <strong style={{ color: P.purple }}>{(shift.open_float || 0).toLocaleString()} ج.س</strong>
          </div>
          <Field label="المبلغ الجديد (ج.س)" required>
            <Inp type="number" value={editFloat} onChange={(e: any) => setEditFloat(e.target.value)} autoFocus />
          </Field>
          <Field label="سبب التعديل" required>
            <Inp value={editFloatReason} onChange={(e: any) => setEditFloatReason(e.target.value)} placeholder="مثال: خطأ في الإدخال" />
          </Field>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Btn variant="secondary" style={{ flex: 1 }} onClick={() => setShowEditFloat(false)}>إلغاء</Btn>
            <Btn variant="primary" style={{ flex: 1 }} disabled={!editFloat || !editFloatReason} onClick={saveEditFloat}>حفظ التعديل</Btn>
          </div>
        </Modal>
      )}
    </div>
  )
}
