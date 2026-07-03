import { ipcMain } from 'electron'
import { ZodError } from 'zod'
import { getSession } from '../session'
import { SettingsRepo } from '../db/repositories/SettingsRepo'
import { ShiftRepo } from '../db/repositories/ShiftRepo'
import { hasPermission } from '@shared/permissions'

/**
 * In-memory rate limiter for auth-sensitive IPC channels.
 * Limits to MAX_CALLS per WINDOW_MS per channel+key combination.
 * The key is derived from the first argument (e.g. username for login).
 */
const rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map()
const RATE_LIMIT_MAX = 15
const RATE_LIMIT_WINDOW_MS = 60_000

// Periodic cleanup of expired rate-limit entries to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key)
  }
}, 10 * 60 * 1000)

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

/**
 * Channels that require rate limiting (auth endpoints).
 * Keyed by first arg (username) so one account can't exhaust another's budget —
 * except PIN verification, which is keyed by channel only: keying by the PIN
 * would give every wrong guess a fresh bucket, defeating the limiter.
 */
const RATE_LIMITED_CHANNELS = new Set([
  'session:login', 'employees:getSecurityQuestion', 'employees:resetPasswordWithSecurityAnswer',
])
const RATE_LIMITED_BY_CHANNEL_ONLY = new Set(['employees:verifyAnyManagerPin'])

/**
 * Check the current session against required permission keys.
 * Returns null when allowed, or an `{ error }` object to return to the caller.
 * Semantics: `[]` = any authenticated session; non-empty = any-of; '*' passes all.
 * For raw `ipcMain.handle` sites that manage their own {data}/{error} shapes.
 */
export function checkPermission(required: readonly string[]): { error: 'UNAUTHORIZED' } | null {
  const session = getSession()
  if (!session) return { error: 'UNAUTHORIZED' }
  if (!hasPermission(session.permissions, required)) return { error: 'UNAUTHORIZED' }
  return null
}

/**
 * Register an IPC handler with optional RBAC guard.
 * `requiredPermissions` semantics:
 *   - undefined  → public channel, no session needed
 *   - []         → any authenticated session
 *   - non-empty  → session must hold '*' or at least one of the listed permission keys
 * Guards take PERMISSION KEYS (pos_access, menu_manage, …) — never role names.
 */
export function handle(channel: string, fn: (...args: any[]) => any, requiredPermissions?: readonly string[]) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      if (RATE_LIMITED_CHANNELS.has(channel)) rateLimitCheck(channel, args[0] != null ? String(args[0]) : undefined)
      if (RATE_LIMITED_BY_CHANNEL_ONLY.has(channel)) rateLimitCheck(channel)

      if (requiredPermissions) {
        const denied = checkPermission(requiredPermissions)
        if (denied) return denied
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
