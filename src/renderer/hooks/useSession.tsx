import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Role } from '../tokens'

const api = (window as any).api

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
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  loading: true,
  login: async () => ({ valid: false }),
  logout: async () => {},
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing session on mount (in case of hot-reload during dev)
  useEffect(() => {
    api?.session?.current?.().then((s: any) => {
      if (s && s.employeeId) {
        setSession({
          employee: { id: s.employeeId, name: s.name, username: s.username, role: s.role, permissions: s.permissions || [], active: 1 },
          role: s.role,
          permissions: s.permissions || []
        })
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username: string, pass: string) => {
    try {
      const result = await api?.session?.login?.(username, pass)
      if (result?.valid && result.employee) {
        let perms = []
        try { perms = JSON.parse(result.employee.permissions) } catch {}
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

  return (
    <SessionContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
