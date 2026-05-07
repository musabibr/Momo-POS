import { handle } from '../helpers'
import { EmployeeRepo } from '../../db/repositories/EmployeeRepo'
import { createEmployeeSchema, updateEmployeeSchema } from '../schemas'

export function registerEmployeeHandlers() {
  // list and verifyPin are un-gated — LoginScreen calls them pre-session
  handle('employees:list', () => EmployeeRepo.list())
  handle('employees:get', (id: number) => EmployeeRepo.getById(id), ['admin'])
  handle('employees:create', (data) => {
    const validated = createEmployeeSchema.parse(data)
    return EmployeeRepo.create(validated)
  }, ['admin'])
  handle('employees:update', (id: number, data) => {
    const validated = updateEmployeeSchema.parse(data)
    return EmployeeRepo.update(id, validated)
  }, ['admin'])
  handle('employees:delete', (id: number) => EmployeeRepo.delete(id), ['admin'])
  handle('employees:verifyPin', (id: number, pin: string) => EmployeeRepo.verifyPin(id, pin))
  handle('employees:verifyAnyManagerPin', (pin: string) => EmployeeRepo.verifyAnyManagerPin(pin))
  handle('employees:unlock', (id: number) => EmployeeRepo.unlockEmployee(id), ['admin'])
}
