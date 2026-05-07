import { handle, requireActiveShiftIfNeeded } from '../helpers'
import { OrderRepo } from '../../db/repositories/OrderRepo'
import { ShiftRepo } from '../../db/repositories/ShiftRepo'
import { createOrderSchema } from '../schemas'
import { getSession } from '../../session'

export function registerOrderHandlers() {
  handle('orders:create', (data) => {
    // Throws if shifts_required=true and no shift is open.
    requireActiveShiftIfNeeded()
    const validated = createOrderSchema.parse(data)
    const session = getSession()
    if (!session) throw new Error('يجب تسجيل الدخول لإتمام الطلب')
    validated.employeeId = session.employeeId
    // Always attach the current shift so orders are counted in shift close / Z-report.
    const currentShift = ShiftRepo.getCurrent() as any
    if (currentShift) validated.shiftId = currentShift.id
    return OrderRepo.create(validated)
  }, ['admin', 'manager', 'cashier'])

  handle('orders:list', (filters) => OrderRepo.list(filters), ['admin', 'manager'])
  handle('orders:get', (id: number) => OrderRepo.getById(id), ['admin', 'manager'])

  /** Cashier-accessible: returns only the current session's employee orders */
  handle('orders:myOrders', (filters) => {
    const session = getSession()
    if (!session) throw new Error('UNAUTHORIZED')
    return OrderRepo.list({ ...filters, employeeId: session.employeeId })
  }, ['admin', 'manager', 'cashier'])

  handle('orders:void', (orderId: number, _employeeId: number, reason: string) => {
    const session = getSession()
    if (!session) throw new Error('يجب تسجيل الدخول')
    return OrderRepo.voidOrder(orderId, session.employeeId, reason)
  }, ['admin', 'manager'])

  handle('orders:correct', (orderId: number, reason: string, correctedItems: any[]) => {
    const session = getSession()
    if (!session) throw new Error('يجب تسجيل الدخول')
    return OrderRepo.correctOrder(orderId, session.employeeId, reason, correctedItems)
  }, ['admin', 'manager'])
  handle('orders:salesSummary', (filters) => OrderRepo.salesSummary(filters), ['admin', 'manager'])
  handle('orders:itemRanking', (filters) => OrderRepo.itemRanking(filters), ['admin', 'manager'])
  handle('orders:profitByItem', (filters) => OrderRepo.profitByItem(filters), ['admin', 'manager'])
}
