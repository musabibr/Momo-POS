import { handle } from '../helpers'
import { getSession, setSession, clearSession, Session } from '../../session'
import { EmployeeRepo } from '../../db/repositories/EmployeeRepo'
import { ActionLogRepo } from '../../db/repositories/ActionLogRepo'

export function registerSessionHandlers() {
  handle('session:login', (username: string, pass: string) => {
    const result = EmployeeRepo.login(username, pass)
    if (!result.valid) return result
    const emp = result.employee
    if (!emp) return { valid: false }

    let permissions: string[] = []
    try { permissions = JSON.parse(emp.permissions) } catch {}

    const session: Session = { employeeId: emp.id, name: emp.name, username: emp.username, role: emp.role, permissions }
    setSession(session)
    ActionLogRepo.write('SESSION_LOGIN', JSON.stringify({ employeeId: emp.id, name: emp.name, username }), emp.id)
    // Return permissions already parsed so the renderer's login and current-session
    // paths are symmetric (both receive an array).
    return { valid: true, employee: { ...emp, permissions } }
  })

  handle('session:logout', () => {
    const s = getSession()
    if (s) ActionLogRepo.write('SESSION_LOGOUT', JSON.stringify({ employeeId: s.employeeId }), s.employeeId)
    clearSession()
    return true
  })

  handle('session:current', () => getSession())
}
