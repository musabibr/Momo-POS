import { handle, requireActiveShiftIfNeeded } from '../helpers'
import { OrderRepo } from '../../db/repositories/OrderRepo'
import { ShiftRepo } from '../../db/repositories/ShiftRepo'
import { EmployeeRepo } from '../../db/repositories/EmployeeRepo'
import { SettingsRepo } from '../../db/repositories/SettingsRepo'
import { ActionLogRepo } from '../../db/repositories/ActionLogRepo'
import { createOrderSchema } from '../schemas'
import { getSession } from '../../session'
import { hasPermission, PERM } from '@shared/permissions'

/** Max discount percentage a user may apply on their own. '*' holders are uncapped. */
function ownDiscountCapPct(role: string | undefined): number {
  const key = role === 'manager' || role === 'admin' ? 'manager_max_discount_pct' : 'cashier_max_discount_pct'
  const fallback = key === 'manager_max_discount_pct' ? 50 : 10
  const raw = SettingsRepo.get(key)
  const n = raw != null ? parseFloat(raw) : NaN
  return Number.isFinite(n) ? n : fallback
}

/**
 * Server-side discount policy. The renderer's PIN prompt is UX only —
 * this is the authoritative check.
 */
function enforceDiscountPolicy(validated: any, session: { employeeId: number; name: string; role: string; permissions: string[] }) {
  const discAmount = validated.discAmount ?? 0
  if (discAmount <= 0) return
  const perms = session.permissions || []
  if (perms.includes(PERM.ALL)) return

  const pct = validated.subtotal > 0 ? (discAmount / validated.subtotal) * 100 : 100
  if (perms.includes(PERM.POS_DISCOUNT) && pct <= ownDiscountCapPct(session.role)) return

  const pin = validated.managerPin
  if (!pin) {
    const err: any = new Error('الخصم يتجاوز صلاحيتك — مطلوب موافقة صاحب صلاحية الخصومات')
    err.code = 'DISCOUNT_APPROVAL_REQUIRED'
    throw err
  }
  const approver = EmployeeRepo.verifyOverridePin(pin, PERM.POS_DISCOUNT)
  if (!approver.valid) throw new Error('رمز الموافقة غير صحيح')
  const approverCap = approver.permissions?.includes(PERM.ALL) ? 100 : ownDiscountCapPct(approver.role)
  if (pct > approverCap) throw new Error(`الخصم (${pct.toFixed(1)}%) يتجاوز الحد المسموح للمعتمد (${approverCap}%)`)
  ActionLogRepo.write('DISCOUNT_OVERRIDE', JSON.stringify({
    approverId: approver.employeeId, requesterId: session.employeeId,
    pct: Math.round(pct * 10) / 10, amount: discAmount,
  }), approver.employeeId)
}

export function registerOrderHandlers() {
  handle('orders:create', (data) => {
    // Throws if shifts_required=true and no shift is open.
    requireActiveShiftIfNeeded()
    const validated = createOrderSchema.parse(data)
    const session = getSession()
    if (!session) throw new Error('يجب تسجيل الدخول لإتمام الطلب')
    validated.employeeId = session.employeeId

    enforceDiscountPolicy(validated, session)
    delete (validated as any).managerPin // policy input only — keep the repo payload clean

    // Always attach a shift so orders are never orphaned from Z-reports.
    // If no shift is open and shifts aren't required, auto-create a default one.
    let currentShift = ShiftRepo.getCurrent() as any
    if (!currentShift) {
      currentShift = ShiftRepo.open(session.employeeId, 0)
    }
    validated.shiftId = currentShift.id

    return OrderRepo.create(validated)
  }, [PERM.POS_ACCESS])

  handle('orders:list', (filters) => OrderRepo.list(filters), [PERM.TRANSACTIONS_VIEW_ALL, PERM.REPORTS_VIEW])

  handle('orders:get', (id: number) => {
    const session = getSession()
    const order = OrderRepo.getById(id) as any
    if (order && session && !hasPermission(session.permissions, [PERM.TRANSACTIONS_VIEW_ALL, PERM.REPORTS_VIEW])
      && order.employee_id !== session.employeeId) {
      throw new Error('UNAUTHORIZED')
    }
    return order
  }, [PERM.TRANSACTIONS_VIEW])

  /** Cashier-accessible: returns only the current session's employee orders */
  handle('orders:myOrders', (filters) => {
    const session = getSession()
    if (!session) throw new Error('UNAUTHORIZED')
    return OrderRepo.list({ ...filters, employeeId: session.employeeId })
  }, [PERM.POS_ACCESS, PERM.TRANSACTIONS_VIEW])

  /**
   * Void/correct: allowed directly for pos_void holders; anyone else needs a
   * valid override PIN from a pos_void holder — the action is then attributed
   * to the approver, with the requester recorded in the reason.
   */
  const resolveVoidActor = (managerPin: string | undefined | null): { actorId: number; requestNote: string } => {
    const session = getSession()
    if (!session) throw new Error('يجب تسجيل الدخول')
    if (hasPermission(session.permissions, [PERM.POS_VOID])) {
      return { actorId: session.employeeId, requestNote: '' }
    }
    if (!managerPin) {
      const err: any = new Error('هذه العملية تتطلب موافقة صاحب صلاحية الإلغاء')
      err.code = 'VOID_APPROVAL_REQUIRED'
      throw err
    }
    const approver = EmployeeRepo.verifyOverridePin(managerPin, PERM.POS_VOID)
    if (!approver.valid || !approver.employeeId) throw new Error('رمز الموافقة غير صحيح')
    return { actorId: approver.employeeId, requestNote: ` (بطلب من ${session.name})` }
  }

  handle('orders:void', (orderId: number, reason: string, managerPin?: string) => {
    const { actorId, requestNote } = resolveVoidActor(managerPin)
    return OrderRepo.voidOrder(orderId, actorId, `${reason || ''}${requestNote}`)
  }, [])

  handle('orders:correct', (orderId: number, reason: string, correctedItems: any[], managerPin?: string) => {
    const { actorId, requestNote } = resolveVoidActor(managerPin)
    return OrderRepo.correctOrder(orderId, actorId, `${reason || ''}${requestNote}`, correctedItems)
  }, [])

  handle('orders:salesSummary', (filters) => OrderRepo.salesSummary(filters), [PERM.REPORTS_VIEW])
  handle('orders:itemRanking', (filters) => OrderRepo.itemRanking(filters), [PERM.REPORTS_VIEW])
  handle('orders:profitByItem', (filters) => OrderRepo.profitByItem(filters), [PERM.REPORTS_VIEW])
}
