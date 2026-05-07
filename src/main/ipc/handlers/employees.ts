import { handle } from '../helpers'
import { getSession } from '../../session'
import { EmployeeRepo } from '../../db/repositories/EmployeeRepo'
import { createEmployeeSchema, updateEmployeeSchema } from '../schemas'

export function registerEmployeeHandlers() {
  // list and verifyPin are un-gated — LoginScreen calls them pre-session
  handle('employees:list', () => EmployeeRepo.list())
  handle('employees:get', (id: number) => EmployeeRepo.getById(id), ['admin'])
  handle('employees:create', (data) => {
    const session = getSession()
    // Allow if no employees exist (first run setup) or if user is admin
    const isFirstRun = EmployeeRepo.list().length === 0
    
    if (!isFirstRun && (!session || (!session.permissions?.includes('*') && session.role !== 'admin' && !session.permissions?.includes('admin')))) {
      throw new Error('UNAUTHORIZED')
    }
    
    const validated = createEmployeeSchema.parse(data)
    return EmployeeRepo.create(validated)
  })
  handle('employees:update', (id: number, data) => {
    const validated = updateEmployeeSchema.parse(data)
    return EmployeeRepo.update(id, validated)
  }, ['admin'])
  handle('employees:delete', (id: number) => EmployeeRepo.delete(id), ['admin'])
  handle('employees:login', (username: string, pass: string) => EmployeeRepo.login(username, pass))
  handle('employees:getSecurityQuestion', (username: string) => EmployeeRepo.getSecurityQuestion(username))
  handle('employees:resetPasswordWithSecurityAnswer', (username: string, answer: string, newPassword: string) => EmployeeRepo.resetPasswordWithSecurityAnswer(username, answer, newPassword))
  handle('employees:verifyAnyManagerPin', (pin: string) => EmployeeRepo.verifyAnyManagerPin(pin))
  handle('employees:unlock', (id: number) => EmployeeRepo.unlockEmployee(id), ['admin'])
}
