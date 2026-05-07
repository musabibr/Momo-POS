import React, { useState, useEffect, useRef } from 'react'
import { P } from '../../tokens'
import { Icon } from '../../components/Icon'
import { toast } from '../../components/Toast'

const api = (window as any).api

const ROLE_LABELS: Record<string, string> = {
  admin: 'مسؤول', manager: 'مدير', cashier: 'كاشير', kitchen: 'مطبخ'
}
const ROLE_COLORS: Record<string, string> = {
  admin: P.purple, manager: P.pink, cashier: P.green, kitchen: P.gold
}

interface LoginScreenProps {
  onLogin: (employeeId: number, pin: string) => Promise<{ valid: boolean; locked?: boolean; lockedUntil?: string }>
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [employees, setEmployees] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(Date.now())
  const pinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    api?.employees?.list?.().then((d: any) => {
      if (d) setEmployees(d.filter((e: any) => e.active !== 0))
    })
  }, [])

  // Tick every second to update lockout countdowns
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(iv)
  }, [])

  const isLocked = (emp: any) => {
    if (!emp.locked_until) return false
    return new Date(emp.locked_until).getTime() > now
  }

  const lockRemaining = (emp: any) => {
    if (!emp.locked_until) return 0
    return Math.max(0, Math.ceil((new Date(emp.locked_until).getTime() - now) / 1000))
  }

  const selectEmployee = (emp: any) => {
    if (isLocked(emp)) {
      toast(`🔒 ${emp.name} مقفل لمدة ${formatSeconds(lockRemaining(emp))}`)
      return
    }
    setSelected(emp)
    setPin('')
    setError('')
    setTimeout(() => pinRef.current?.focus(), 100)
  }

  const handleSubmit = async () => {
    if (!selected || pin.length < 4) return
    setLoading(true)
    setError('')
    const result = await onLogin(selected.id, pin)
    setLoading(false)
    if (result.valid) {
      // Session is set by the provider; we get unmounted
      return
    }
    if (result.locked) {
      toast(`🔒 تم قفل الحساب! يرجى المحاولة بعد ${formatSeconds(lockRemaining({ locked_until: result.lockedUntil }))}`)
      // Refresh employee list to show lockout
      api?.employees?.list?.().then((d: any) => {
        if (d) setEmployees(d.filter((e: any) => e.active !== 0))
      })
      setSelected(null)
    } else {
      setError('رمز PIN خاطئ')
      setPin('')
      pinRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') { setSelected(null); setPin(''); setError('') }
  }

  const handlePadPress = (digit: string) => {
    if (digit === 'clear') { setPin(''); setError(''); return }
    if (digit === 'back') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= 8) return
    const newPin = pin + digit
    setPin(newPin)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw',
      background: `linear-gradient(135deg, #1a0a2e 0%, #2d1657 40%, #1a0a2e 100%)`,
      fontFamily: 'Tajawal, sans-serif', direction: 'rtl', overflow: 'hidden'
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

      {selected ? (
        /* ── PIN Entry ────────────────────────────────── */
        <div style={{
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)',
          borderRadius: 24, padding: '36px 32px 28px', width: 340,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 24px 64px rgba(0,0,0,.35)',
          position: 'relative', zIndex: 1
        }}>
          {/* Back button */}
          <button onClick={() => { setSelected(null); setPin(''); setError('') }}
            style={{ position: 'absolute', top: 14, left: 14, background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chevR" size={16} color="rgba(255,255,255,0.5)" />
          </button>

          {/* Avatar */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 12px',
              background: `${ROLE_COLORS[selected.role]}25`,
              border: `2.5px solid ${ROLE_COLORS[selected.role]}60`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, fontWeight: 900, color: ROLE_COLORS[selected.role]
            }}>{selected.name?.[0] || '?'}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{selected.name}</div>
            <span style={{
              display: 'inline-block', marginTop: 6, padding: '2px 12px', borderRadius: 99,
              fontSize: 12, fontWeight: 700,
              background: `${ROLE_COLORS[selected.role]}20`, color: ROLE_COLORS[selected.role]
            }}>{ROLE_LABELS[selected.role] || selected.role}</span>
          </div>

          {/* PIN dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 14, height: 14, borderRadius: '50%',
                background: i < pin.length ? ROLE_COLORS[selected.role] : 'rgba(255,255,255,0.12)',
                border: `1.5px solid ${i < pin.length ? ROLE_COLORS[selected.role] : 'rgba(255,255,255,0.2)'}`,
                transition: 'all .15s',
                boxShadow: i < pin.length ? `0 0 8px ${ROLE_COLORS[selected.role]}50` : 'none'
              }} />
            ))}
          </div>

          {/* Hidden real input for keyboard entry */}
          <input
            ref={pinRef} value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, '').slice(0, 8)); setError('') }}
            onKeyDown={handleKeyDown} type="password" autoFocus
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          />

          {/* Error message */}
          {error && (
            <div style={{ textAlign: 'center', fontSize: 13, color: '#f87171', fontWeight: 700, marginBottom: 8, marginTop: 4 }}>{error}</div>
          )}

          {/* Numpad */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 16 }}>
            {['1','2','3','4','5','6','7','8','9','clear','0','back'].map(key => (
              <button key={key}
                onClick={() => key === 'clear' || key === 'back' ? handlePadPress(key) : handlePadPress(key)}
                style={{
                  height: 52, borderRadius: 12, border: 'none', fontSize: key === 'clear' || key === 'back' ? 13 : 20,
                  fontWeight: 700, cursor: 'pointer',
                  background: key === 'clear' ? 'rgba(248,113,113,0.15)' : key === 'back' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
                  color: key === 'clear' ? '#f87171' : key === 'back' ? 'rgba(255,255,255,0.5)' : '#fff',
                  fontFamily: 'Tajawal, sans-serif',
                  transition: 'background .12s'
                }}
                onMouseDown={e => (e.currentTarget.style.background = 'rgba(147,51,234,0.25)')}
                onMouseUp={e => (e.currentTarget.style.background = key === 'clear' ? 'rgba(248,113,113,0.15)' : key === 'back' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)')}
              >
                {key === 'clear' ? 'مسح' : key === 'back' ? '←' : key}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button onClick={handleSubmit} disabled={pin.length < 4 || loading}
            style={{
              width: '100%', height: 48, marginTop: 16, borderRadius: 12, border: 'none',
              background: pin.length >= 4 ? 'linear-gradient(135deg,#9333ea,#db2777)' : 'rgba(255,255,255,0.06)',
              color: pin.length >= 4 ? '#fff' : 'rgba(255,255,255,0.3)',
              fontSize: 16, fontWeight: 800, cursor: pin.length >= 4 ? 'pointer' : 'default',
              fontFamily: 'Tajawal, sans-serif',
              boxShadow: pin.length >= 4 ? '0 8px 24px rgba(147,51,234,.35)' : 'none',
              transition: 'all .2s'
            }}>
            {loading ? 'جاري التحقق…' : 'تسجيل الدخول'}
          </button>
        </div>
      ) : (
        /* ── Employee Grid ──────────────────────────── */
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: 560 }}>
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 20, fontWeight: 600 }}>
            اختر موظفاً لتسجيل الدخول
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, padding: '0 16px' }}>
            {employees.map(emp => {
              const locked = isLocked(emp)
              const rc = ROLE_COLORS[emp.role] || P.muted
              return (
                <button key={emp.id}
                  onClick={() => selectEmployee(emp)}
                  style={{
                    padding: '20px 12px 16px', borderRadius: 18, border: 'none',
                    background: locked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
                    cursor: locked ? 'not-allowed' : 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    opacity: locked ? 0.45 : 1,
                    transition: 'all .2s', fontFamily: 'Tajawal, sans-serif',
                    boxShadow: '0 4px 20px rgba(0,0,0,.15)'
                  }}
                  onMouseEnter={e => { if (!locked) e.currentTarget.style.background = 'rgba(147,51,234,0.12)' }}
                  onMouseLeave={e => { if (!locked) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: '50%',
                    background: `${rc}20`, border: `2px solid ${rc}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, fontWeight: 900, color: rc
                  }}>
                    {locked ? <Icon name="lock" size={20} color={rc} /> : (emp.name?.[0] || '?')}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{emp.name}</div>
                  <span style={{
                    padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    background: `${rc}18`, color: rc
                  }}>
                    {locked ? `مقفل ${formatSeconds(lockRemaining(emp))}` : ROLE_LABELS[emp.role] || emp.role}
                  </span>
                </button>
              )
            })}
          </div>
          {employees.length === 0 && (
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 15, marginTop: 30 }}>
              لا يوجد موظفون — يرجى إنشاء موظف من معالج الإعداد
            </div>
          )}
        </div>
      )}

      {/* Bottom version tag */}
      <div style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)', fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>
        Momo POS v1.0 · غير متصل · آمن
      </div>
    </div>
  )
}

function formatSeconds(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}ث`
}
