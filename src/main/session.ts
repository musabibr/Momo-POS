/**
 * Main-process session store.
 *
 * Holds the currently-logged-in employee + role so that IPC handlers can
 * enforce RBAC without trusting the renderer.  Stored in-memory only — a
 * restart always requires a fresh login.
 */

export interface Session {
  employeeId: number
  name: string
  role: 'admin' | 'manager' | 'cashier' | 'kitchen'
}

let currentSession: Session | null = null

export function setSession(session: Session | null): void {
  currentSession = session
}

export function getSession(): Session | null {
  return currentSession
}

export function clearSession(): void {
  currentSession = null
}
