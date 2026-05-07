import React, { useState } from 'react'
import { P } from '../../tokens'
import { Btn } from '../../components/Btn'
import { Inp, Field } from '../../components/Inp'
import { Card } from '../../components/Card'
import { toast } from '../../components/Toast'

const api = (window as any).api

interface Props { onComplete: () => void }

export function SetupWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passConfirm, setPassConfirm] = useState('')
  const [usbPath, setUsbPath] = useState('')
  const [backupDone, setBackupDone] = useState(false)
  const [adminCreated, setAdminCreated] = useState(false)
  const [saving, setSaving] = useState(false)

  const steps = [
    { title: 'مرحباً بك في موموـ', icon: '🎉' },
    { title: 'إنشاء حساب المسؤول', icon: '👤' },
    { title: 'النسخ الاحتياطي', icon: '💾' },
    { title: 'تم الإعداد!', icon: '✅' },
  ]

  const totalSteps = steps.length

  /* ── Step 0 → 1: validate restaurant name ── */
  function validateStep0(): boolean {
    if (!name.trim()) { toast('أدخل اسم المطعم'); return false }
    return true
  }

  /* ── Step 1 → 2: create admin ── */
  async function validateStep1(): Promise<boolean> {
    if (!adminName.trim()) { toast('اسم المسؤول مطلوب'); return false }
    if (!adminUsername || adminUsername.length < 3) { toast('اسم المستخدم يجب أن يكون 3 أحرف على الأقل'); return false }
    if (!password || password.length < 4) { toast('كلمة المرور يجب أن تكون 4 خانات على الأقل'); return false }
    if (password !== passConfirm) { toast('كلمة المرور غير متطابقة'); return false }

    if (adminCreated) return true // already created on a previous attempt

    setSaving(true)
    try {
      await api?.settings?.set?.('restaurant_name', name)
      await api?.employees?.create?.({ name: adminName, role: 'admin', username: adminUsername, password, permissions: ['*'] })
      setAdminCreated(true)
      toast('تم إنشاء حساب المسؤول ✓')
      return true
    } catch (err: any) {
      toast(err?.message || 'خطأ في إنشاء الحساب')
      return false
    } finally {
      setSaving(false)
    }
  }

  /* ── Step 2: backup (optional) ── */
  async function runTestBackup() {
    if (!usbPath) { toast('أدخل مسار النسخ الاحتياطي'); return }
    setSaving(true)
    try {
      await api?.settings?.set?.('backup_usb_path', usbPath)
      const r = await api?.backup?.run?.(usbPath)
      if (r) {
        setBackupDone(true)
        toast('تم النسخ الاحتياطي التجريبي ✓')
      } else {
        toast('فشل النسخ الاحتياطي')
      }
    } catch (e: any) { toast(e?.message || 'فشل النسخ الاحتياطي') }
    finally { setSaving(false) }
  }

  /* ── Navigation ── */
  async function goNext() {
    if (step === 0 && !validateStep0()) return
    if (step === 1) {
      const ok = await validateStep1()
      if (!ok) return
    }
    if (step < totalSteps - 1) setStep(step + 1)
  }

  function goBack() {
    if (step > 0) setStep(step - 1)
  }

  function finish() {
    toast('مرحباً بك في موموـ! 🎉')
    onComplete()
  }

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
          </div>
        )}

        {/* Step 1: Admin account */}
        {step === 1 && (
          <div style={{ textAlign: 'right' }}>
            {adminCreated ? (
              <div style={{ background: P.greenXL, border: `1px solid ${P.greenL}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: P.green, fontWeight: 700 }}>✓ تم إنشاء حساب المسؤول: {adminName}</div>
                <div style={{ fontSize: 12, color: P.muted, marginTop: 4 }}>اسم المستخدم: {adminUsername}</div>
              </div>
            ) : (
              <>
                <Field label="اسم المسؤول" required><Inp value={adminName} onChange={(e: any) => setAdminName(e.target.value)} autoFocus /></Field>
                <Field label="اسم المستخدم (إنجليزي)" required><Inp value={adminUsername} onChange={(e: any) => setAdminUsername(e.target.value)} placeholder="admin" dir="ltr" /></Field>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="كلمة المرور" required><Inp type="password" placeholder="4 خانات على الأقل" value={password} onChange={(e: any) => setPassword(e.target.value)} /></Field>
                  <Field label="تأكيد كلمة المرور" required><Inp type="password" placeholder="أعد إدخال كلمة المرور" value={passConfirm} onChange={(e: any) => setPassConfirm(e.target.value)} /></Field>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 2: Backup */}
        {step === 2 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, color: P.muted, marginBottom: 14, textAlign: 'center' }}>يمكنك تخطي هذه الخطوة وإعدادها لاحقاً من الإعدادات.</div>
            <Field label="مسار النسخ الاحتياطي (USB أو مجلد محلي)">
              <div style={{ display: 'flex', gap: 8 }}>
                <Inp value={usbPath} onChange={(e: any) => setUsbPath(e.target.value)} placeholder="E:\backups" style={{ flex: 1 }} />
                <Btn variant="secondary" size="sm" onClick={async () => {
                  try {
                    const path = await api?.backup?.pickFolder?.()
                    if (path) setUsbPath(path)
                  } catch { /* cancelled */ }
                }}>تصفح</Btn>
              </div>
            </Field>
            {usbPath && !backupDone && (
              <Btn variant="primary" fullWidth onClick={runTestBackup} disabled={saving} style={{ marginTop: 12 }}>
                {saving ? 'جاري النسخ...' : 'نسخ تجريبي'}
              </Btn>
            )}
            {backupDone && (
              <div style={{ background: P.greenXL, border: `1px solid ${P.greenL}`, borderRadius: 10, padding: '10px 14px', marginTop: 12, textAlign: 'center', fontSize: 13, color: P.green, fontWeight: 700 }}>
                ✓ تم النسخ الاحتياطي التجريبي بنجاح
              </div>
            )}
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div>
            <p style={{ fontSize: 16, color: P.muted, marginBottom: 8, lineHeight: 1.8 }}>
              تم إعداد النظام بنجاح!
              <br />يمكنك الآن البدء في استخدام نقطة البيع.
            </p>
            <div style={{ background: P.greenXL, border: `1px solid ${P.greenL}`, borderRadius: 12, padding: '12px 16px', marginBottom: 20, textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: P.green, fontWeight: 700 }}>✓ المطعم: {name}</div>
              <div style={{ fontSize: 13, color: P.green, fontWeight: 700 }}>✓ حساب المسؤول: {adminName}</div>
              <div style={{ fontSize: 13, color: P.green, fontWeight: 700 }}>✓ النسخ الاحتياطي: {backupDone ? usbPath : 'لم يتم الإعداد (يمكن إعداده لاحقاً)'}</div>
            </div>
            <Btn variant="primary" fullWidth size="lg" onClick={finish}>ابدأ الآن 🚀</Btn>
          </div>
        )}

        {/* ── Navigation Buttons ── */}
        {step < totalSteps - 1 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            {step > 0 && (
              <Btn variant="secondary" onClick={goBack} style={{ flex: 1 }}>→ السابق</Btn>
            )}
            <Btn variant="primary" onClick={goNext} disabled={saving} style={{ flex: 1 }}>
              {saving ? 'جاري الحفظ...' : step === 2 ? (backupDone || !usbPath ? 'التالي ←' : 'تخطي ←') : 'التالي ←'}
            </Btn>
          </div>
        )}
      </Card>
    </div>
  )
}
