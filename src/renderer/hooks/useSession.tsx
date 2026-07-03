import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { hasPermission, hasDomainAccess } from '@shared/permissions'

const api = (window as any).api

/** Coerce a permissions value (array, JSON string, or nullish) into a string[]. */
function normalizePerms(value: any): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') { try { const p = JSON.parse(value); return Array.isArray(p) ? p : [] } catch { return [] } }
  return []
}

export interface SessionData {
  employee: {
    id: number
    name: string
    username: string
    role: string
    permissions: string[]
    active: number
  }
  role: string
  permissions: string[]
}

interface SessionContextValue {
  session: SessionData | null
  loading: boolean
  login: (username: string, pass: string) => Promise<{ valid: boolean; locked?: boolean; lockedUntil?: string; employee?: any }>
  logout: () => Promise<void>
  /** True if the current session holds any of the given permission(s) — parent group implies children. */
  can: (required: string | string[]) => boolean
  /** True if the session holds ANY permission within a domain group (for nav/screen visibility). */
  canDomain: (groupId: string) => boolean
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
  login: async () => ({ valid: false }),
  logout: async () => {},
  can: () => false,
  canDomain: () => false,
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount (in case of hot-reload during dev)
  useEffect(() => {
    api?.session?.current?.().then((s: any) => {
      if (s && s.employeeId) {
        const perms = normalizePerms(s.permissions)
        setSession({
          employee: { id: s.employeeId, name: s.name, username: s.username, role: s.role, permissions: perms, active: 1 },
          role: s.role,
          permissions: perms
        })
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, pass: string) => {
    try {
      const result = await api?.session?.login?.(username, pass)
      if (result?.valid && result.employee) {
        const perms = normalizePerms(result.employee.permissions)
        setSession({
          employee: { ...result.employee, permissions: perms },
          role: result.employee.role,
          permissions: perms
        })
        return { valid: true, employee: result.employee }
      }
      return result || { valid: false }
    } catch (err: any) {
      return { valid: false }
    }
  }, [])

  const logout = useCallback(async () => {
    try { await api?.session?.logout?.() } catch (_) {}
    setSession(null)
  }, [])

  const can = useCallback((required: string | string[]) => {
    return hasPermission(session?.permissions, Array.isArray(required) ? required : [required])
  }, [session?.permissions])

  const canDomain = useCallback((groupId: string) => {
    return hasDomainAccess(session?.permissions, groupId)
  }, [session?.permissions])

  return (
    <SessionContext.Provider value={{ session, loading, login, logout, can, canDomain }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
