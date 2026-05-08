import React, { useState, useEffect } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp, Sel, Field } from '../../components/Inp'
import { Modal } from '../../components/Modal'
import { TabBar, Badge } from '../../components/TabBar'
import { Icon } from '../../components/Icon'
import { Card } from '../../components/Card'
import { toast } from '../../components/Toast'
import { ScrollableTabs, ResponsiveTable } from '../../components/layouts'

const api = (window as any).api

export function SettingsScreen() {
  const [tab, setTab] = useState('rest')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 20, gap: 16 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900, color: P.plum }}>الإعدادات والنظام</div>
        <div style={{ fontSize: 13, color: P.muted, marginTop: 2 }}>صلاحية المسؤول · خيارات النظام</div>
      </div>

      <ScrollableTabs tabs={[
        { id: 'rest', label: 'المطعم' },
        { id: 'receipt', label: 'الإيصال' },
        { id: 'banks', label: 'البنوك' },
        { id: 'print', label: 'الطابعات' },
        { id: 'loyalty', label: 'الولاء' },
        { id: 'shiftHistory', label: 'سجل الورديات' },
        { id: 'bkp', label: 'النسخ الاحتياطي' }
      ]} active={tab} onChange={setTab} />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {tab === 'rest' && <GeneralTab />}
        {tab === 'receipt' && <ReceiptTab />}
        {tab === 'banks' && <BanksTab />}
        {tab === 'print' && <PrintTab />}
        {tab === 'loyalty' && <LoyaltyTab />}
        {tab === 'shiftHistory' && <ShiftHistoryTab />}
        {tab === 'bkp' && <BackupTab />}
      </div>
    </div>
  )
}

function GeneralTab() {
  const [sett, setSett] = useState({ name: '', currency: 'ج.س', cashierDisc: '10', managerDisc: '50', inactivityMins: '10', shiftsRequired: true, requireVoidReason: true })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api?.settings?.getAll?.().then((s: any) => {
      if (s) {
        const sr = s.shifts_required
        setSett({
          name: s.restaurant_name || '',
          currency: s.currency || 'ج.س',
          cashierDisc: s.cashier_max_discount_pct || '10',
          managerDisc: s.manager_max_discount_pct || '50',
          inactivityMins: s.inactivity_lock_minutes || '10',
          // Default true unless explicitly disabled
          shiftsRequired: sr == null ? true : (sr === '1' || sr === 'true' || sr === true),
          requireVoidReason: s.require_void_reason == null ? true : (s.require_void_reason === '1' || s.require_void_reason === 'true' || s.require_void_reason === true),
        })
      }
    })
  }, [])

  const upd = (k: string, v: any) => setSett(p => ({ ...p, [k]: v }))

  async function save() {
    await api?.settings?.set?.('restaurant_name', sett.name)
    await api?.settings?.set?.('currency', sett.currency)
    await api?.settings?.set?.('cashier_max_discount_pct', sett.cashierDisc)
    await api?.settings?.set?.('manager_max_discount_pct', sett.managerDisc)
    await api?.settings?.set?.('inactivity_lock_minutes', sett.inactivityMins)
    await api?.settings?.set?.('shifts_required', sett.shiftsRequired ? '1' : '0')
    await api?.settings?.set?.('require_void_reason', sett.requireVoidReason ? '1' : '0')
    setSaved(true)
    toast('تم حفظ الإعدادات ✓')
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
      <Field label="اسم المطعم"><Inp value={sett.name} onChange={(e: any) => upd('name', e.target.value)} /></Field>
      <Field label="العملة"><Inp value={sett.currency} onChange={(e: any) => upd('currency', e.target.value)} /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        <Field label="حد خصم الكاشير %"><Inp type="number" value={sett.cashierDisc} onChange={(e: any) => upd('cashierDisc', e.target.value)} /></Field>
        <Field label="حد خصم المدير %"><Inp type="number" value={sett.managerDisc} onChange={(e: any) => upd('managerDisc', e.target.value)} /></Field>
      </div>
      <Field label="قفل الشاشة بعد عدم النشاط (دقائق)"><Inp type="number" value={sett.inactivityMins} onChange={(e: any) => upd('inactivityMins', e.target.value)} /></Field>

      {/* Shift workflow gate — admin can disable to allow POS without an open shift */}
      <Card style={{ padding: 14, background: sett.shiftsRequired ? P.greenXL : P.bg2, border: `1.5px solid ${sett.shiftsRequired ? P.greenL : P.borderM}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: P.plum, marginBottom: 4 }}>
              {sett.shiftsRequired ? 'تتطلب وردية مفتوحة' : 'مسموح بالعمل دون وردية'}
            </div>
            <div style={{ fontSize: 12.5, color: P.muted, lineHeight: 1.5 }}>
              {sett.shiftsRequired
                ? 'لا يمكن إصدار طلبات أو تسجيل درج أو مصروفات بدون فتح وردية أولاً.'
                : 'يمكن إصدار الطلبات بدون وردية. الدرج والمصروفات تتطلب وردية دائماً (لتسوية صحيحة).'}
            </div>
          </div>
          <Btn
            variant={sett.shiftsRequired ? 'success' : 'secondary'}
            size="sm"
            onClick={() => upd('shiftsRequired', !sett.shiftsRequired)}
          >
            {sett.shiftsRequired ? 'مفعّل' : 'معطّل'}
          </Btn>
        </div>
      </Card>

      {/* Require void/correction reason toggle */}
      <Card style={{ padding: 14, background: sett.requireVoidReason ? P.greenXL : P.bg2, border: `1.5px solid ${sett.requireVoidReason ? P.greenL : P.borderM}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: P.plum, marginBottom: 4 }}>
              {sett.requireVoidReason ? 'سبب الإلغاء/التصحيح إلزامي' : 'سبب الإلغاء/التصحيح اختياري'}
            </div>
            <div style={{ fontSize: 12.5, color: P.muted, lineHeight: 1.5 }}>
              {sett.requireVoidReason
                ? 'يجب إدخال سبب عند إلغاء أو تصحيح طلب للتوثيق.'
                : 'يمكن إلغاء أو تصحيح الطلبات بدون إدخال سبب.'}
            </div>
          </div>
          <Btn
            variant={sett.requireVoidReason ? 'success' : 'secondary'}
            size="sm"
            onClick={() => upd('requireVoidReason', !sett.requireVoidReason)}
          >
            {sett.requireVoidReason ? 'إلزامي' : 'اختياري'}
          </Btn>
        </div>
      </Card>

      <Btn variant={saved ? 'success' : 'primary'} icon={saved ? 'check' : 'save'} onClick={save} style={{ alignSelf: 'flex-start' }}>{saved ? 'تم الحفظ!' : 'حفظ الإعدادات'}</Btn>
    </div>
  )
}

function ReceiptTab() {
  const [sett, setSett] = useState({ header: '', footer: '', logo: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api?.settings?.getAll?.().then((s: any) => {
      if (s) setSett({ header: s.receipt_header || '', footer: s.receipt_footer || '', logo: s.logo_path || '' })
    })
  }, [])

  const upd = (k: string, v: string) => setSett(p => ({ ...p, [k]: v }))

  async function save() {
    await api?.settings?.set?.('receipt_header', sett.header)
    await api?.settings?.set?.('receipt_footer', sett.footer)
    await api?.settings?.set?.('logo_path', sett.logo)
    setSaved(true)
    toast('تم حفظ إعدادات الإيصال ✓')
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 500 }}>
        <Field label="نص رأس الإيصال"><textarea value={sett.header} onChange={(e: any) => upd('header', e.target.value)} rows={3} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, fontSize: 14, resize: 'vertical', fontFamily: 'Cairo,sans-serif', outline: 'none' }} /></Field>
        <Field label="نص ذيل الإيصال"><textarea value={sett.footer} onChange={(e: any) => upd('footer', e.target.value)} rows={2} style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: `1px solid ${P.border}`, background: P.bg, fontSize: 14, resize: 'vertical', fontFamily: 'Cairo,sans-serif', outline: 'none' }} /></Field>
        <Field label="الشعار"><div style={{ display: 'flex', gap: 8 }}><Inp value={sett.logo} onChange={(e: any) => upd('logo', e.target.value)} placeholder="مسار الشعار" /><Btn variant="secondary" size="sm" onClick={() => api?.settings?.pickLogo?.().then((p: string) => p && upd('logo', p))}>رفع</Btn></div></Field>
        <Btn variant={saved ? 'success' : 'primary'} icon={saved ? 'check' : 'save'} onClick={save} style={{ alignSelf: 'flex-start' }}>{saved ? 'تم الحفظ!' : 'حفظ إعدادات الإيصال'}</Btn>
      </div>
      <div style={{ width: 260, background: '#fff', border: '2px dashed #ddd', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 11, textAlign: 'center', direction: 'rtl', flexShrink: 0 }}>
        <div style={{ borderBottom: '1px dashed #ccc', paddingBottom: 8, marginBottom: 8, whiteSpace: 'pre-line' }}>{sett.header || 'موموـ للحلويات\nاستمتع بكل لحظة'}</div>
        <div style={{ textAlign: 'right', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 'bold' }}>طلب #042</div>
          <div style={{ fontSize: 10, color: '#999' }}>2026/05/01 12:00</div>
        </div>
        <div style={{ borderTop: '1px dashed #ccc', borderBottom: '1px dashed #ccc', padding: '6px 0', margin: '6px 0', textAlign: 'right' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span>1x لاتيه الورد</span><span>2000</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>2x كريم بروليه</span><span>2400</span></div>
        </div>
        <div style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>الإجمالي</span><span>4400 ج.س</span></div>
        <div style={{ borderTop: '1px dashed #ccc', paddingTop: 8, marginTop: 8, whiteSpace: 'pre-line', color: '#666' }}>{sett.footer || 'شكراً — نراك قريباً!'}</div>
      </div>
    </div>
  )
}

function BanksTab() {
  const [banks, setBanks] = useState<string[]>([])
  const [newBank, setNewBank] = useState('')

  useEffect(() => { api?.settings?.getBanks?.().then((d: any) => d && setBanks(d)) }, [])

  async function add() {
    if (!newBank.trim()) { toast('أدخل اسم البنك'); return }
    const updated = [...banks, newBank.trim()]
    await api?.settings?.setBanks?.(updated)
    setBanks(updated); setNewBank(''); toast('تمت الإضافة ✓')
  }

  async function remove(i: number) {
    const updated = banks.filter((_, j) => j !== i)
    await api?.settings?.setBanks?.(updated)
    setBanks(updated); toast('تم حذف البنك')
  }

  return (
    <div style={{ maxWidth: 440 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
        {banks.map((b, i) => (
          <Card key={i} style={{ padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: P.plum }}>{b}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="secondary" size="sm" onClick={() => remove(i)} style={{ color: P.rose, borderColor: P.roseL }}>حذف</Btn>
            </div>
          </Card>
        ))}
        {banks.length === 0 && <div style={{ textAlign: 'center', color: P.faint, padding: 20 }}>لا توجد بنوك معتمدة</div>}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={newBank} onChange={e => setNewBank(e.target.value)} placeholder="اسم البنك الجديد…" style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: `1.5px solid ${P.border}`, fontSize: 15, outline: 'none', fontFamily: 'Cairo,sans-serif' }} onKeyDown={e => e.key === 'Enter' && add()} />
        <Btn variant="primary" onClick={add}>إضافة</Btn>
      </div>
    </div>
  )
}

function PrintTab() {
  const [printers, setPrinters] = useState<any[]>([])
  const [assignments, setAssignments] = useState({ cashier: '', kitchen: '', silentMode: true })
  const [scanning, setScanning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)

  const scan = async () => {
    setScanning(true)
    try {
      const list = await api?.printer?.getSystemPrinters?.()
      setPrinters(Array.isArray(list) ? list : [])
    } catch { setPrinters([]) }
    try {
      const a = await api?.printer?.getAssignments?.()
      if (a) setAssignments(a)
    } catch {}
    setScanning(false)
  }

  useEffect(() => { scan() }, [])

  const assign = async (role: string, name: string) => {
    setAssignments(p => ({ ...p, [role]: name }))
    await api?.printer?.setAssignment?.(role, name)
  }

  const toggleSilent = async () => {
    const next = !assignments.silentMode
    setAssignments(p => ({ ...p, silentMode: next }))
    await api?.printer?.setSilentMode?.(next)
  }

  const testPrint = async (num: number) => {
    setTestResult(null)
    toast(`جاري اختبار الطابعة ${num}…`)
    try {
      const r = await api?.printer?.testPrint?.(num)
      setTestResult(r)
      if (r?.success) toast(r.message || '✅ تمت الطباعة', 'success')
      else toast(r?.message || '❌ فشل الاختبار', 'error')
    } catch { toast('خطأ في الاختبار') }
  }

  const printerOptions = [{ value: '', label: '— تلقائي (كشف ذكي) —' }, ...printers.map((p: any) => ({ value: p.name, label: `${p.name}${p.isDefault ? ' ⭐' : ''}` }))]

  return (
    <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Status bar */}
      <Card style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: printers.length > 0 ? P.greenXL : P.goldXL, border: `1.5px solid ${printers.length > 0 ? P.greenL : P.goldL}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: printers.length > 0 ? P.green : P.gold, boxShadow: `0 0 8px ${printers.length > 0 ? P.green : P.gold}` }} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: P.plum }}>
              {scanning ? 'جاري البحث عن الطابعات…' : printers.length > 0 ? `تم العثور على ${printers.length} طابعة` : 'لم يتم العثور على طابعات'}
            </div>
            {printers.length > 0 && <div style={{ fontSize: 12, color: P.muted }}>{printers.map((p: any) => p.name).join('، ')}</div>}
          </div>
        </div>
        <Btn variant="secondary" size="sm" icon="refresh" onClick={scan} style={{ flexShrink: 0 }}>
          {scanning ? '…' : 'إعادة البحث'}
        </Btn>
      </Card>

      {/* Cashier Printer */}
      {[
        { role: 'cashier', num: 1, label: 'طابعة الكاشير', desc: 'الإيصال الكامل مع الأسعار والدفع', color: P.purple, icon: '🧾' },
        { role: 'kitchen', num: 2, label: 'طابعة المطبخ', desc: 'تذاكر التحضير بدون أسعار', color: P.pink, icon: '👨‍🍳' }
      ].map(p => (
        <Card key={p.role} style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 20 }}>{p.icon}</span>
            <div style={{ fontWeight: 800, fontSize: 15, color: p.color }}>{p.label}</div>
          </div>
          <div style={{ fontSize: 13, color: P.muted, marginBottom: 12 }}>{p.desc}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <Field label="الطابعة المعيّنة" style={{ marginBottom: 0, flex: 1 }}>
              <Sel
                value={(assignments as any)[p.role] || ''}
                onChange={(e: any) => assign(p.role, e.target.value)}
                options={printerOptions}
              />
            </Field>
            <Btn variant="secondary" size="sm" icon="print" onClick={() => testPrint(p.num)} style={{ borderColor: `${p.color}40`, color: p.color }}>اختبار</Btn>
          </div>
          {(assignments as any)[p.role] === '' && printers.length > 0 && (
            <div style={{ fontSize: 11.5, color: P.green, fontWeight: 600, marginTop: 6 }}>
              ✨ الكشف الذكي مفعّل — سيتم اختيار الطابعة تلقائياً
            </div>
          )}
        </Card>
      ))}

      {/* Silent mode toggle */}
      <Card style={{ padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: P.plum, marginBottom: 4 }}>
              {assignments.silentMode ? '🔇 طباعة صامتة' : '🖨️ طباعة مع نافذة الحوار'}
            </div>
            <div style={{ fontSize: 13, color: P.muted, lineHeight: 1.5 }}>
              {assignments.silentMode
                ? 'الطباعة تتم مباشرة بدون نافذة — أسرع للمطاعم'
                : 'تظهر نافذة اختيار الطابعة قبل كل عملية طباعة'}
            </div>
          </div>
          <Btn
            variant={assignments.silentMode ? 'success' : 'secondary'}
            size="sm"
            onClick={toggleSilent}
          >
            {assignments.silentMode ? 'صامتة' : 'حوار'}
          </Btn>
        </div>
      </Card>

      {/* Info note */}
      <div style={{ fontSize: 12, color: P.faint, lineHeight: 1.7, padding: '8px 4px' }}>
        💡 <strong>ملاحظة:</strong> إذا كانت لديك طابعة واحدة فقط، سيتم طباعة إيصال الكاشير وتذكرة المطبخ عليها تلقائياً.
        اختر "تلقائي" للسماح للنظام باختيار الطابعة المناسبة بناءً على اسمها.
      </div>
    </div>
  )
}

function LoyaltyTab() {
  const [sett, setSett] = useState({ loyalty: '1000', maxDisc: '100', autoVip: '' })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api?.settings?.getAll?.().then((s: any) => {
      if (s) setSett({ loyalty: s.loyalty_rate || '1000', maxDisc: s.loyalty_redemption_value || '100', autoVip: s.auto_vip_threshold || '' })
    })
  }, [])

  const upd = (k: string, v: string) => setSett(p => ({ ...p, [k]: v }))

  async function save() {
    await api?.settings?.set?.('loyalty_rate', sett.loyalty)
    await api?.settings?.set?.('loyalty_redemption_value', sett.maxDisc)
    await api?.settings?.set?.('auto_vip_threshold', sett.autoVip)
    setSaved(true)
    toast('تم حفظ إعدادات الولاء ✓')
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <div style={{ maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card style={{ padding: 18 }}>
        <Field label="معدل اكتساب النقاط (نقطة لكل X ج.س)"><Inp type="number" value={sett.loyalty} onChange={(e: any) => upd('loyalty', e.target.value)} /></Field>
        <div style={{ fontSize: 13, color: P.muted, marginTop: -8, marginBottom: 16 }}>مثال: 1000 = نقطة واحدة مقابل كل 1000 ج.س إنفاق</div>
        <Field label="قيمة استرداد النقاط (قرش لكل نقطة)"><Inp type="number" value={sett.maxDisc} onChange={(e: any) => upd('maxDisc', e.target.value)} /></Field>
        <div style={{ fontSize: 13, color: P.muted, marginTop: -8, marginBottom: 12 }}>مثال: 100 = كل نقطة تخصم 100 قرش (1 ج.س)</div>
      </Card>
      <Card style={{ padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: P.gold, marginBottom: 4 }}>الترقية التلقائية لـ VIP</div>
        <div style={{ fontSize: 13, color: P.muted, marginBottom: 12 }}>سيتم ترقية العميل تلقائياً عند تجاوز إجمالي إنفاقه هذا المبلغ. اترك الحقل فارغاً لتعطيل الميزة.</div>
        <Field label="حد الإنفاق للترقية (ج.س)"><Inp type="number" value={sett.autoVip} onChange={(e: any) => upd('autoVip', e.target.value)} placeholder="مثال: 500000" /></Field>
      </Card>
      <Btn variant={saved ? 'success' : 'primary'} icon={saved ? 'check' : 'save'} onClick={save} style={{ alignSelf: 'flex-start' }}>{saved ? 'تم الحفظ!' : 'حفظ الإعدادات'}</Btn>
    </div>
  )
}

function BackupTab() {
  const [usbPath, setUsbPath] = useState('')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [backing, setBacking] = useState(false)
  const [schedule, setSchedule] = useState('shift')

  const [showReset, setShowReset] = useState(false)
  const [resetPin, setResetPin] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    api?.settings?.getAll?.().then((s: any) => {
      if (!s) return
      setUsbPath(s.backup_usb_path || '')
      setLastBackup(s.last_backup_at || null)
      setSchedule(s.backup_schedule || 'shift')
    })
  }, [])

  async function backup() {
    setBacking(true)
    try {
      await api?.settings?.set?.('backup_usb_path', usbPath)
      const result = await api?.backup?.run?.(usbPath)
      if (result) {
        const now = new Date().toISOString()
        await api?.settings?.set?.('last_backup_at', now)
        setLastBackup(now)
        toast('تم النسخ الاحتياطي بنجاح ✓')
      } else {
        toast('خدمة النسخ الاحتياطي غير متاحة حالياً', 'info')
        await api?.settings?.set?.('backup_usb_path', usbPath)
        toast('تم حفظ مسار النسخ الاحتياطي')
      }
    } catch (e: any) { toast(e.message || 'فشل النسخ الاحتياطي', 'error') }
    setBacking(false)
  }

  async function resetData() {
    try {
      const r = await api?.employees?.verifyAnyManagerPin?.(resetPin)
      if (!r?.valid) { toast('كلمة المرور خاطئة أو ليس لديك صلاحية مدير'); setResetPin(''); return }
      if (!confirmReset) { setConfirmReset(true); return }
      await api?.backup?.preFlightSnapshot?.('factoryReset')
      await api?.settings?.factoryReset?.()
      toast('تم إعادة ضبط المصنع — سيتم إعادة التشغيل')
      setShowReset(false); setResetPin(''); setConfirmReset(false)
    } catch { toast('خطأ في إعادة الضبط') }
  }

  return (
    <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card style={{ padding: 18 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: P.plum, marginBottom: 4 }}>مسار النسخ الاحتياطي</div>
        <div style={{ fontSize: 13, color: P.muted, marginBottom: 14 }}>حفظ ملفات قاعدة البيانات محلياً أو على وحدة USB</div>
        <Field label="مسار المجلد / USB" style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Inp value={usbPath} onChange={(e: any) => setUsbPath(e.target.value)} placeholder="مثال: E:\backups" style={{ flex: 1 }} />
            <Btn variant="secondary" size="sm" onClick={async () => {
              try {
                const path = await api?.backup?.pickFolder?.()
                if (path) { setUsbPath(path); await api?.settings?.set?.('backup_usb_path', path); toast('تم تحديد المجلد ✓') }
              } catch { /* cancelled */ }
            }}>تصفح</Btn>
          </div>
        </Field>
        <Field label="جدول النسخ التلقائي" style={{ marginBottom: 10 }}><Sel value={schedule} onChange={(e: any) => { setSchedule(e.target.value); api?.settings?.set?.('backup_schedule', e.target.value) }} options={[{value:'hourly',label:'كل ساعة'},{value:'shift',label:'عند إغلاق الوردية'},{value:'daily',label:'يومياً'}]} /></Field>
        {lastBackup && <div style={{ fontSize: 13, color: P.green, fontWeight: 600, marginBottom: 14 }}>آخر نسخ: {lastBackup.slice(0, 16).replace('T', ' ')}</div>}
      </Card>

      <div style={{ display: 'flex', gap: 10 }}>
        <div onClick={backing ? undefined : backup} style={{ flex: 1, padding: 16, textAlign: 'center', cursor: backing ? 'default' : 'pointer', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, transition: 'background .15s' }}>
          <Icon name="usb" size={26} color={P.purple} style={{ margin: '0 auto 8px', opacity: backing ? 0.5 : 1 }} />
          <div style={{ fontWeight: 700, fontSize: 14, color: P.plum }}>{backing ? 'جاري النسخ...' : 'نسخ الآن ← مسار'}</div>
        </div>
        <div onClick={async () => {
          try {
            const folder = await api?.backup?.pickRestoreFolder?.()
            if (!folder) return
            await api?.backup?.restore?.(folder)
            toast('تمت الاستعادة — سيتم إعادة التشغيل ✓')
          } catch (e: any) { toast(e?.message || 'فشل الاستعادة', 'error') }
        }} style={{ flex: 1, padding: 16, textAlign: 'center', cursor: 'pointer', background: P.surface, border: `1px solid ${P.border}`, borderRadius: 12, transition: 'background .15s' }}>
          <Icon name="refresh" size={26} color={P.gold} style={{ margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 700, fontSize: 14, color: P.plum }}>استعادة من مجلد</div>
        </div>
      </div>

      <div style={{ background: '#fff7f7', border: `1.5px solid ${P.roseL}`, borderRadius: 14, padding: 18, marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Icon name="alert" size={17} color={P.rose} /><span style={{ fontWeight: 800, color: P.rose, fontSize: 15 }}>منطقة الخطر</span></div>
        <div style={{ fontSize: 14, color: P.rose, marginBottom: 14 }}>مسح وتصفير قواعد البيانات. يتم أخذ نسخة احتياطية تلقائياً قبل المسح.</div>
        <Btn variant="danger" onClick={() => { setShowReset(true); setConfirmReset(false) }}>إعادة ضبط المصنع</Btn>
      </div>

      <Modal open={showReset} onClose={() => { setShowReset(false); setResetPin('') }} title="تأكيد إعادة الضبط" icon="alert" width={360}>
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: P.roseXL, border: `2px solid ${P.roseL}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Icon name="alert" size={26} color={P.rose} /></div>
          <div style={{ fontSize: 16, fontWeight: 800, color: P.plum, marginBottom: 7 }}>{confirmReset ? '⚠️ تأكيد نهائي — لا يمكن التراجع!' : 'هل أنت متأكد تماماً؟'}</div>
          <div style={{ fontSize: 14, color: P.muted }}>{confirmReset ? 'اضغط مرة أخرى لتأكيد المسح النهائي' : 'سيتم مسح جميع بيانات المطعم والطلبات.'}</div>
        </div>
        <Field label="أدخل كلمة مرور المدير لتأكيد الإجراء"><Inp type="password" value={resetPin} onChange={(e: any) => setResetPin(e.target.value)} autoFocus /></Field>
        <div style={{ display: 'flex', gap: 10 }}><Btn variant="secondary" onClick={() => setShowReset(false)} style={{ flex: 1 }}>إلغاء</Btn><Btn variant="danger" onClick={resetData} style={{ flex: 1 }}>{confirmReset ? '🗑️ تأكيد المسح النهائي' : 'نعم، مسح البيانات'}</Btn></div>
      </Modal>

    </div>
  )
}



// ─────────────────────────────────────────────────────────────────────
// SHIFT HISTORY — read-only audit of past shifts
// ─────────────────────────────────────────────────────────────────────

function ShiftHistoryTab() {
  const [shifts, setShifts] = useState<any[]>([])
  useEffect(() => {
    api?.shifts?.list?.().then((d: any) => setShifts(Array.isArray(d) ? d : []))
  }, [])

  return (
    <Card style={{ padding: 0, overflow: 'hidden' }}>
      <ResponsiveTable minWidth={680}>
        <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: 14 }}>
          <thead><tr style={{ background: P.bg2, borderBottom: `1.5px solid ${P.border}` }}>
            {['البداية', 'النهاية', 'الطلبات', 'الإيرادات', 'الحالة'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'right', color: P.muted, fontWeight: 700, fontSize: 13 }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {shifts.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${P.ghost}`, transition: 'background .15s' }} onMouseEnter={e => e.currentTarget.style.background = P.bg2} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '11px 14px', color: P.ink, fontWeight: 600, fontSize: 14 }}>{s.opened_at?.slice(0, 16)}</td>
                <td style={{ padding: '11px 14px', color: P.muted, fontSize: 14 }}>{s.closed_at?.slice(0, 16) || '—'}</td>
                <td style={{ padding: '11px 14px', color: P.muted, fontSize: 14 }}>{s.total_orders ?? '—'}</td>
                <td style={{ padding: '11px 14px', fontWeight: 800, color: P.purple, fontSize: 15 }}>{s.total_revenue != null ? `${s.total_revenue.toLocaleString()} ج.س` : '—'}</td>
                <td style={{ padding: '11px 14px' }}>
                  <Badge label={s.closed_at ? 'مغلقة' : 'مفتوحة'} color={s.closed_at ? P.muted : P.green} bg={s.closed_at ? P.ghost : P.greenXL} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ResponsiveTable>
      {shifts.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: P.faint, fontSize: 15 }}>لا توجد ورديات سابقة</div>}
    </Card>
  )
}
