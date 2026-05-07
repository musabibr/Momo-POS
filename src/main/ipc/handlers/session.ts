import { handle } from '../helpers'
import { getSession, setSession, clearSession, Session } from '../../session'
import { EmployeeRepo } from '../../db/repositories/EmployeeRepo'
import { ActionLogRepo } from '../../db/repositories/ActionLogRepo'

export function registerSessionHandlers() {
  handle('session:login', (employeeId: number, pin: string) => {
    const result = EmployeeRepo.verifyPin(employeeId, pin)
    if (!result.valid) return result
    const emp = EmployeeRepo.getById(employeeId) as any
    if (!emp) return { valid: false }
    const session: Session = { employeeId: emp.id, name: emp.name, role: emp.role }
    setSession(session)
    ActionLogRepo.write('SESSION_LOGIN', JSON.stringify({ employeeId: emp.id, name: emp.name }), emp.id)
    return { valid: true, employee: emp }
  })

  handle('session:logout', () => {
    const s = getSession()
    if (s) ActionLogRepo.write('SESSION_LOGOUT', JSON.stringify({ employeeId: s.employeeId }), s.employeeId)
    clearSession()
    return true
  })

  handle('session:current', () => getSession())
}
