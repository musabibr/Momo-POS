import { useEffect, useRef, useCallback, useState } from 'react'
import { toast } from '../components/Toast'

const api = (window as any).api
const EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll']
const WARNING_SECONDS = 30

/**
 * Auto-lock the app after a period of inactivity.
 * Shows a 30-second countdown warning before locking.
 *
 * @param onLock  Called when the lock triggers (should call session.logout)
 * @param enabled Whether the lock is active (false when on login screen)
 */
export function useInactivityLock(onLock: () => void, enabled: boolean = true) {
  const lastActivity = useRef(Date.now())
  const timerRef = useRef<any>(null)
  const warningRef = useRef(false)
  const [timeoutMinutes, setTimeoutMinutes] = useState(10)

  // Load timeout from settings
  useEffect(() => {
    api?.settings?.get?.('inactivity_lock_minutes').then((v: any) => {
      const mins = parseInt(v)
      if (mins > 0) setTimeoutMinutes(mins)
    }).catch(() => {})
  }, [])

  const resetTimer = useCallback(() => {
    lastActivity.current = Date.now()
    if (warningRef.current) {
      warningRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled || timeoutMinutes <= 0) return

    const timeoutMs = timeoutMinutes * 60 * 1000
    const warningMs = timeoutMs - WARNING_SECONDS * 1000

    // Listen for user activity
    EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    // Check every 5 seconds
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current

      if (elapsed >= timeoutMs) {
        // Lock!
        clearInterval(timerRef.current)
        toast('🔒 تم قفل الشاشة بسبب عدم النشاط')
        onLock()
        return
      }

      if (elapsed >= warningMs && !warningRef.current) {
        warningRef.current = true
        const remaining = Math.ceil((timeoutMs - elapsed) / 1000)
        toast(`⏱ سيتم قفل الشاشة خلال ${remaining} ثانية…`)
      }
    }, 5000)

    return () => {
      EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
      clearInterval(timerRef.current)
    }
  }, [enabled, timeoutMinutes, onLock, resetTimer])
}
