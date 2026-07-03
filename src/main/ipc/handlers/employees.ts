import { handle } from '../helpers'
import { getSession, setSession, clearSession } from '../../session'
import { EmployeeRepo } from '../../db/repositories/EmployeeRepo'
import { createEmployeeSchema, updateEmployeeSchema } from '../schemas'
import { hasPermission, PERM } from '@shared/permissions'

/** Parse the stored permissions JSON of an employee row into an array. */
function permsOf(emp: any): string[] {
  if (!emp) return []
  if (Array.isArray(emp.permissions)) return emp.permissions
  try { return JSON.parse(emp.permissions || '[]') } catch { return [] }
}

/**
 * Guard against privilege escalation: a non-superadmin actor must not be able
 * to grant '*', nor to modify/delete/unlock a superadmin account.
 */
function assertNoEscalation(actorPerms: string[] | undefined, targetEmp: any | null, incomingPerms?: string[]) {
  if (actorPerms?.includes(PERM.ALL)) return // superadmin may do anything
  if (incomingPerms?.includes(PERM.ALL)) {
    throw new Error('لا يمكنك منح صلاحية الوصول الكامل (*) — تتطلب حساب مسؤول أعلى')
  }
  if (targetEmp && permsOf(targetEmp).includes(PERM.ALL)) {
    throw new Error('لا يمكنك تعديل حساب يملك الوصول الكامل (*)')
  }
}

export function registerEmployeeHandlers() {
  // list is un-gated — LoginScreen calls it pre-session (public columns only)
  handle('employees:list', () => EmployeeRepo.list())
  handle('employees:get', (id: number) => EmployeeRepo.getById(id), [PERM.USERS_MANAGE])
  handle('employees:create', (data) => {
    const session = getSession()
    // Allow if no employees exist (first-run setup) or if the actor can manage users.
    const isFirstRun = EmployeeRepo.list().length === 0
    if (!isFirstRun && !hasPermission(session?.permissions, [PERM.USERS_MANAGE])) {
      throw new Error('UNAUTHORIZED')
    }
    const validated = createEmployeeSchema.parse(data)
    if (!isFirstRun) assertNoEscalation(session?.permissions, null, validated.permissions)
    return EmployeeRepo.create(validated)
  })
  handle('employees:update', (id: number, data) => {
    const session = getSession()
    const validated = updateEmployeeSchema.parse(data)
    assertNoEscalation(session?.permissions, EmployeeRepo.getById(id), validated.permissions)
    const updated = EmployeeRepo.update(id, validated) as any

    // If the actor edited their own account, refresh the in-memory session so
    // name/role/permission changes apply without forcing a re-login. Deactivating
    // one's own account ends the session.
    if (session && id === session.employeeId && updated) {
      if (updated.active === 0) {
        clearSession()
      } else {
        setSession({
          employeeId: updated.id, name: updated.name, username: updated.username,
          role: updated.role, permissions: permsOf(updated),
        })
      }
    }
    return updated
  }, [PERM.USERS_MANAGE])
  handle('employees:delete', (id: number) => {
    const session = getSession()
    assertNoEscalation(session?.permissions, EmployeeRepo.getById(id))
    return EmployeeRepo.delete(id)
  }, [PERM.USERS_MANAGE])
  handle('employees:getSecurityQuestion', (username: string) => EmployeeRepo.getSecurityQuestion(username))
  handle('employees:resetPasswordWithSecurityAnswer', (username: string, answer: string, newPassword: string) => EmployeeRepo.resetPasswordWithSecurityAnswer(username, answer, newPassword))
  handle('employees:verifyAnyManagerPin', (pin: string) => EmployeeRepo.verifyAnyManagerPin(pin), [])
  handle('employees:unlock', (id: number) => {
    const session = getSession()
    assertNoEscalation(session?.permissions, EmployeeRepo.getById(id))
    return EmployeeRepo.unlockEmployee(id)
  }, [PERM.USERS_MANAGE])
}
