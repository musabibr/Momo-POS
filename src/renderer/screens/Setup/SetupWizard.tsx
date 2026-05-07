import React, { useState } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp, Field } from '../../components/Inp'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { toast } from '../../components/Toast'

const api = (window as any).api

interface Props { onComplete: () => void }

export function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [p1Port, setP1Port] = useState('')
  const [p2Port, setP2Port] = useState('')
  const [p1Tested, setP1Tested] = useState(false)
  const [p1Skipped, setP1Skipped] = useState(false)
  const [p2Tested, setP2Tested] = useState(false)
  const [p2Skipped, setP2Skipped] = useState(false)
  const [usbPath, setUsbPath] = useState('')
  const [backupDone, setBackupDone] = useState(false)

  const steps = [
    { title: 'مرحباً بك في موموـ', icon: '🎉' },
    { title: 'إنشاء حساب المسؤول', icon: '👤' },
    { title: 'إعداد الطابعة 1 (الكاشير)', icon: '🖨️' },
    { title: 'إعداد الطابعة 2 (المطبخ)', icon: '🍳' },
    { title: 'النسخ الاحتياطي', icon: '💾' },
    { title: 'تم الإعداد!', icon: '✅' }
  ]

  async function createAdmin() {
    if (!adminName) { toast('اسم المسؤول مطلوب'); return }
    if (!pin || pin.length < 4) { toast('PIN يجب أن يكون 4 أرقام على الأقل'); return }
    if (pin !== pinConfirm) { toast('رمز PIN غير متطابق'); return }
    try {
      await api?.employees?.create?.({ name: adminName, role: 'admin', pin })
      await api?.settings?.set?.('restaurant_name', name)
      toast('تم إنشاء حساب المسؤول ✓')
      setStep(2)
    } catch (err: any) { toast(err?.message || 'خطأ') }
  }

  async function testPrinter(num: number) {
    const port = num === 1 ? p1Port : p2Port
    if (!port) { toast('أدخل منفذ الطابعة أولاً'); return }
    await api?.settings?.set?.(`printer${num}_port`, port)
    const r = await api?.printer?.testPrint?.(num)
    if (r?.data?.success) {
      toast(`طابعة ${num} تعمل ✓`)
      num === 1 ? setP1Tested(true) : setP2Tested(true)
    } else {
      toast(`فشل اختبار الطابعة ${num} — تحقق من التوصيل`)
    }
  }

  async function runTestBackup() {
    if (!usbPath) { toast('أدخل مسار النسخ الاحتياطي'); return }
    try {
      await api?.settings?.set?.('backup_usb_path', usbPath)
      const r = await api?.backup?.run?.(usbPath)
      if (r?.data) {
        setBackupDone(true)
        toast('تم النسخ الاحتياطي التجريبي ✓')
      } else {
        toast('فشل النسخ الاحتياطي')
      }
    } catch { toast('فشل النسخ الاحتياطي') }
  }

  async function finish() {
    toast('مرحباً بك في موموـ! 🎉')
    onComplete()
  }

  const canAdvancePrinter1 = p1Tested || p1Skipped
  const canAdvancePrinter2 = p2Tested || p2Skipped

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: `linear-gradient(135deg, ${P.bg} 0%, ${P.ghost} 100%)`, padding: 20 }}>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {steps.map((_, i) => (
          <div key={i} style={{ width: 40, height: 4, borderRadius: 99, background: i <= step ? P.purple : P.border, transition: 'background .3s' }} />
        ))}
      </div>

      <Card style={{ width: '100%', maxWidth: 480, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{steps[step].icon}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: P.plum, marginBottom: 20 }}>{steps[step].title}</div>

        {/* Step 0: Welcome */}
        {step === 0 && (
          <div>
            <p style={{ fontSize: 15, color: P.muted, marginBottom: 20, lineHeight: 1.8 }}>
              نظام إدارة المطاعم الشامل — يعمل بدون إنترنت.
              <br />سنساعدك في الإعداد الأولي خلال دقائق.
            </p>
            <Field label="اسم المطعم"><Inp value={name} onChange={(e: any) => setName(e.target.value)} placeholder="مثال: موموـ للحلويات" autoFocus /></Field>
            <Btn variant="primary" fullWidth onClick={() => { if (name) setStep(1); else toast('أدخل اسم المطعم') }} style={{ marginTop: 12 }}>التالي ←</Btn>
          </div>
        )}

        {/* Step 1: Admin account */}
        {step === 1 && (
          <div style={{ textAlign: 'right' }}>
            <Field label="اسم المسؤول" required><Inp value={adminName} onChange={(e: any) => setAdminName(e.target.value)} autoFocus /></Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="رمز PIN" required><Inp type="password" placeholder="4 أرقام" value={pin} onChange={(e: any) => setPin(e.target.value)} /></Field>
              <Field label="تأكيد PIN" required><Inp type="password" placeholder="أعد إدخال PIN" value={pinConfirm} onChange={(e: any) => setPinConfirm(e.target.value)} /></Field>
            </div>
            <Btn variant="primary" fullWidth onClick={createAdmin} style={{ marginTop: 12 }}>إنشاء الحساب ←</Btn>
          </div>
        )}

        {/* Step 2: Printer 1 */}
        {step === 2 && (
          <div style={{ textAlign: 'right' }}>
            <Field label="منفذ الطابعة (مثال COM3 أو USB)"><Inp value={p1Port} onChange={(e: any) => setP1Port(e.target.value)} placeholder="COM3" /></Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn variant="primary" onClick={() => testPrinter(1)} style={{ flex: 1 }}>اختبار الطباعة</Btn>
              {!p1Tested && <Btn variant="secondary" onClick={() => { setP1Skipped(true); toast('تم تخطي اختبار الطابعة 1') }} style={{ flex: 1, color: P.gold }}>تخطي ⚠️</Btn>}
            </div>
            {canAdvancePrinter1 && <Btn variant="primary" fullWidth onClick={() => setStep(3)} style={{ marginTop: 14 }}>التالي ←</Btn>}
          </div>
        )}

        {/* Step 3: Printer 2 */}
        {step === 3 && (
          <div style={{ textAlign: 'right' }}>
            <Field label="منفذ الطابعة (مثال COM4 أو USB)"><Inp value={p2Port} onChange={(e: any) => setP2Port(e.target.value)} placeholder="COM4" /></Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn variant="primary" onClick={() => testPrinter(2)} style={{ flex: 1 }}>اختبار الطباعة</Btn>
              {!p2Tested && <Btn variant="secondary" onClick={() => { setP2Skipped(true); toast('تم تخطي اختبار الطابعة 2') }} style={{ flex: 1, color: P.gold }}>تخطي ⚠️</Btn>}
            </div>
            {canAdvancePrinter2 && <Btn variant="primary" fullWidth onClick={() => setStep(4)} style={{ marginTop: 14 }}>التالي ←</Btn>}
          </div>
        )}

        {/* Step 4: Backup */}
        {step === 4 && (
          <div style={{ textAlign: 'right' }}>
            <Field label="مسار النسخ الاحتياطي (USB أو مجلد محلي)"><Inp value={usbPath} onChange={(e: any) => setUsbPath(e.target.value)} placeholder="E:\backups" /></Field>
            <Btn variant="primary" fullWidth onClick={runTestBackup} disabled={backupDone} style={{ marginTop: 12 }}>{backupDone ? 'تم النسخ ✓' : 'نسخ تجريبي'}</Btn>
            {backupDone && <Btn variant="primary" fullWidth onClick={() => setStep(5)} style={{ marginTop: 10 }}>التالي ←</Btn>}
          </div>
        )}

        {/* Step 5: Done */}
        {step === 5 && (
          <div>
            <p style={{ fontSize: 16, color: P.muted, marginBottom: 8, lineHeight: 1.8 }}>
              تم إعداد النظام بنجاح!
              <br />يمكنك الآن البدء في استخدام نقطة البيع.
            </p>
            <div style={{ background: P.greenXL, border: `1px solid ${P.greenL}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: P.green, fontWeight: 700 }}>✓ حساب المسؤول: {adminName}</div>
              <div style={{ fontSize: 13, color: P.green, fontWeight: 700 }}>✓ طابعة 1: {p1Tested ? p1Port : 'تم التخطي'}</div>
              <div style={{ fontSize: 13, color: P.green, fontWeight: 700 }}>✓ طابعة 2: {p2Tested ? p2Port : 'تم التخطي'}</div>
              <div style={{ fontSize: 13, color: P.green, fontWeight: 700 }}>✓ النسخ الاحتياطي: {usbPath}</div>
            </div>
            <Btn variant="primary" fullWidth size="lg" onClick={finish}>ابدأ الآن 🚀</Btn>
          </div>
        )}
      </Card>
    </div>
  )
}
