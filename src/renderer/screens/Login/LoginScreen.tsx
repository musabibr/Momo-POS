import React, { useState, useEffect, useRef } from 'react'
import { P } from '../../tokens'
import { Icon } from '../../components/Icon'
import { toast } from '../../components/Toast'
import { Modal } from '../../components/Modal'
import { Inp, Field } from '../../components/Inp'
import { Btn } from '../../components/Btn'

const api = (window as any).api

interface LoginScreenProps {
  onLogin: (username: string, pass: string) => Promise<{ valid: boolean; locked?: boolean; lockedUntil?: string }>
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(Date.now())
  
  const [showForgot, setShowForgot] = useState(false)
  const [fUsername, setFUsername] = useState('')
  const [secQuestion, setSecQuestion] = useState('')
  const [secAnswer, setSecAnswer] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [forgotStep, setForgotStep] = useState(1) // 1=user, 2=answer

  // Tick every second to update lockout countdowns (if any are active globally)
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!username || !password) {
      setError('أدخل اسم المستخدم وكلمة المرور')
      return
    }
    setLoading(true)
    setError('')
    const result = await onLogin(username, password)
    setLoading(false)
    
    if (result.valid) {
      return // Component unmounts
    }
    if (result.locked) {
      const lockRemaining = Math.max(0, Math.ceil((new Date(result.lockedUntil!).getTime() - Date.now()) / 1000))
      setError(`تم قفل الحساب! المحاولة بعد ${formatSeconds(lockRemaining)}`)
    } else {
      setError('اسم المستخدم أو كلمة المرور خاطئة')
      setPassword('')
    }
  }

  const handleForgotSubmit = async () => {
    if (forgotStep === 1) {
      if (!fUsername) { toast('أدخل اسم المستخدم'); return }
      const q = await api?.employees?.getSecurityQuestion?.(fUsername)
      if (q) {
        setSecQuestion(q)
        setForgotStep(2)
      } else {
        toast('المستخدم غير موجود أو لا يملك سؤال أمان')
      }
    } else if (forgotStep === 2) {
      if (!secAnswer || newPassword.length < 4) { toast('أدخل الإجابة وكلمة مرور جديدة (4 خانات على الأقل)'); return }
      const success = await api?.employees?.resetPasswordWithSecurityAnswer?.(fUsername, secAnswer, newPassword)
      if (success) {
        toast('✓ تم إعادة تعيين كلمة المرور بنجاح')
        setShowForgot(false)
        setForgotStep(1)
        setFUsername('')
        setSecAnswer('')
        setNewPassword('')
        setUsername(fUsername)
        setPassword('')
      } else {
        toast('الإجابة خاطئة')
      }
    }
  }

  return (
    <div className="app-fadein" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw',
      background: `linear-gradient(135deg, #1a0a2e 0%, #2d1657 40%, #1a0a2e 100%)`,
      fontFamily: 'Cairo, sans-serif', direction: 'rtl', overflow: 'hidden'
    }}>
      {/* Decorative bg circles */}
      <div style={{ position: 'absolute', top: -100, left: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(147,51,234,0.15) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: -60, right: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(219,39,119,0.12) 0%, transparent 70%)' }} />

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'linear-gradient(135deg,#9333ea,#db2777)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(147,51,234,.4)'
        }}>
          <Icon name="spark" size={26} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1, lineHeight: 1 }}>Momo</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 2, fontWeight: 500 }}>POINT OF SALE</div>
        </div>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)',
        borderRadius: 24, padding: '36px 32px 28px', width: 340,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 24px 64px rgba(0,0,0,.35)',
        position: 'relative', zIndex: 1
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>تسجيل الدخول</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>أدخل اسم المستخدم وكلمة المرور</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>اسم المستخدم</label>
            <input 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              autoFocus 
              placeholder="اسم المستخدم"
              style={{
                width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'Cairo, sans-serif'
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6 }}>كلمة المرور</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              style={{
                width: '100%', height: 44, padding: '0 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 15, outline: 'none', fontFamily: 'Cairo, sans-serif', letterSpacing: 3
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
            <button type="button" onClick={() => setShowForgot(true)} style={{ background: 'none', border: 'none', color: '#db2777', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
              نسيت كلمة المرور؟
            </button>
          </div>

          {error && (
            <div style={{ textAlign: 'center', fontSize: 13, color: '#f87171', fontWeight: 700, marginBottom: 12 }}>{error}</div>
          )}

          <button type="submit" disabled={!username || !password || loading}
            style={{
              width: '100%', height: 48, borderRadius: 12, border: 'none',
              background: username && password ? 'linear-gradient(135deg,#9333ea,#db2777)' : 'rgba(255,255,255,0.06)',
              color: username && password ? '#fff' : 'rgba(255,255,255,0.3)',
              fontSize: 16, fontWeight: 800, cursor: username && password ? 'pointer' : 'default',
              fontFamily: 'Cairo, sans-serif',
              boxShadow: username && password ? '0 8px 24px rgba(147,51,234,.35)' : 'none',
              transition: 'all .2s'
            }}>
            {loading ? 'جاري التحقق…' : 'تسجيل الدخول'}
          </button>
        </form>
      </div>

      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
        Momo POS v1.0 · آمن · يعتمد على الصلاحيات الفردية
      </div>

      {showForgot && (
        <Modal title="استعادة كلمة المرور" width={380} icon="lock" onClose={() => { setShowForgot(false); setForgotStep(1) }}>
          {forgotStep === 1 ? (
            <div>
              <Field label="اسم المستخدم">
                <Inp value={fUsername} onChange={(e: any) => setFUsername(e.target.value)} autoFocus placeholder="أدخل اسم المستخدم الخاص بك" />
              </Field>
              <Btn fullWidth onClick={handleForgotSubmit}>متابعة</Btn>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: P.plum, marginBottom: 12, padding: 12, background: P.bg2, borderRadius: 8 }}>
                ❓ {secQuestion}
              </div>
              <Field label="الإجابة">
                <Inp value={secAnswer} onChange={(e: any) => setSecAnswer(e.target.value)} autoFocus placeholder="أدخل إجابة سؤال الأمان" />
              </Field>
              <Field label="كلمة المرور الجديدة">
                <Inp value={newPassword} type="password" onChange={(e: any) => setNewPassword(e.target.value)} placeholder="أدخل كلمة مرور جديدة" />
              </Field>
              <Btn fullWidth onClick={handleForgotSubmit}>إعادة تعيين</Btn>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}ث`
}
