import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { getSession, Session } from '../session'
import { SettingsRepo } from '../db/repositories/SettingsRepo'
import { ShiftRepo } from '../db/repositories/ShiftRepo'

export type Role = 'admin' | 'manager' | 'cashier' | 'kitchen'

/**
 * In-memory rate limiter for auth-sensitive IPC channels.
 * Limits to MAX_CALLS per WINDOW_MS per channel+key combination.
 * The key is derived from the first argument (e.g. employee ID for login).
 */
const rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map()
const RATE_LIMIT_MAX = 15
const RATE_LIMIT_WINDOW_MS = 60_000

function rateLimitCheck(channel: string, key?: string): void {
  const rateLimitKey = key ? `${channel}:${key}` : channel
  const now = Date.now()
  const entry = rateLimitMap.get(rateLimitKey) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS }
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + RATE_LIMIT_WINDOW_MS }
  entry.count++
  rateLimitMap.set(rateLimitKey, entry)
  if (entry.count > RATE_LIMIT_MAX) {
    throw new Error('TOO_MANY_ATTEMPTS')
  }
}

/** Channels that require rate limiting (auth endpoints) */
const RATE_LIMITED_CHANNELS = new Set([
  'session:login', 'employees:verifyPin', 'employees:verifyAnyManagerPin'
])

/**
 * Register an IPC handler with optional RBAC guard.
 * When `requiredRoles` is provided the handler rejects with UNAUTHORIZED
 * if the current session role is not in the list.
 */
export function handle(channel: string, fn: (...args: any[]) => any, requiredRoles?: readonly Role[]) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      // Rate-limit auth-sensitive channels (keyed by first arg, e.g. employee ID)
      if (RATE_LIMITED_CHANNELS.has(channel)) rateLimitCheck(channel, args[0] != null ? String(args[0]) : undefined)

      if (requiredRoles && requiredRoles.length > 0) {
        const session = getSession()
        if (!session || !requiredRoles.includes(session.role)) {
          return { error: 'UNAUTHORIZED' }
        }
      }
      const result = await fn(...args)
      return { data: result }
    } catch (err: any) {
      if (err instanceof ZodError) {
        const msg = err.errors.map(e => e.message).join(', ')
        console.error(`[IPC] ${channel} validation error:`, msg)
        return { error: 'INVALID_INPUT', details: msg }
      }
      console.error(`[IPC] ${channel} error:`, err.message)
      return { error: err.message }
    }
  })
}

/**
 * Workflow gate: when `settings.shifts_required` is truthy, refuse
 * to proceed without an active shift.
 */
export function isShiftsRequired(): boolean {
  const v = SettingsRepo.get('shifts_required')
  if (v == null) return true
  return v === '1' || v === 'true'
}

export function requireActiveShiftIfNeeded(): void {
  if (!isShiftsRequired()) return
  const shift = ShiftRepo.getCurrent() as any
  if (!shift) {
    const err: any = new Error('NO_ACTIVE_SHIFT')
    err.code = 'NO_ACTIVE_SHIFT'
    throw err
  }
}

/**
 * Operations that are inherently shift-scoped (petty cash, expenses)
 * always require an active shift, even when shifts_required is off.
 */
export function requireActiveShiftAlways(): any {
  const shift = ShiftRepo.getCurrent() as any
  if (!shift) {
    const err: any = new Error('NO_ACTIVE_SHIFT')
    err.code = 'NO_ACTIVE_SHIFT'
    throw err
  }
  return shift
}
