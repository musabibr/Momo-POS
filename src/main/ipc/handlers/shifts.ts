import { handle, requireActiveShiftAlways } from '../helpers'
import { ShiftRepo } from '../../db/repositories/ShiftRepo'
import { CashRepo } from '../../db/repositories/CashRepo'
import { SettingsRepo } from '../../db/repositories/SettingsRepo'
import { pettyCashSchema, expenseSchema } from '../schemas'
import { getSession } from '../../session'
import { PERM, descendants } from '@shared/permissions'

// Any shift/cash permission (the group or any sub-permission).
const SHIFT_ANY = descendants(PERM.SHIFT_MANAGE)
// Shift-related reads: anyone operating a shift, or a reports viewer.
const SHIFT_READ = [...SHIFT_ANY, PERM.REPORTS_VIEW]

export function registerShiftHandlers() {
  handle('shifts:open', (openFloat: number) => {
    const existing = ShiftRepo.getCurrent() as any
    if (existing) {
      const err: any = new Error('SHIFT_ALREADY_OPEN')
      err.code = 'SHIFT_ALREADY_OPEN'
      throw err
    }
    const session = getSession()
    if (!session) throw new Error('يجب تسجيل الدخول لفتح وردية')
    return ShiftRepo.open(session.employeeId, openFloat)
  }, [PERM.SHIFT_OPEN_CLOSE])

  handle('shifts:close', (shiftId: number, closeFloat: number) => ShiftRepo.close(shiftId, closeFloat), [PERM.SHIFT_OPEN_CLOSE])
  handle('shifts:getCurrent', () => ShiftRepo.getCurrent(), [])
  handle('shifts:list', () => ShiftRepo.list(), SHIFT_READ)
  handle('shifts:listPaginated', (page: number, pageSize: number, filters: any) => ShiftRepo.listPaginated(page, pageSize, filters), SHIFT_READ)

  handle('shifts:updateOpenFloat', (shiftId: number, newFloat: number, reason: string) => {
    const session = getSession()
    if (!session) throw new Error('يجب تسجيل الدخول')
    return ShiftRepo.updateOpenFloat(shiftId, newFloat, session.employeeId, reason)
  }, [PERM.SHIFT_FLOAT_EDIT])
}

export function registerCashHandlers() {
  handle('cash:getRevenueSummary', (shiftId?: number) => CashRepo.getRevenueSummary(shiftId), SHIFT_READ)
  handle('cash:getBankBreakdown', (shiftId?: number) => CashRepo.getBankBreakdown(shiftId), SHIFT_READ)

  handle('cash:logPettyCash', (type: string, amount: number, reason: string, shiftId?: number) => {
    const shift = requireActiveShiftAlways()
    const session = getSession()
    const actualShiftId = shiftId ?? shift.id
    const actualEmployeeId = session?.employeeId ?? undefined
    pettyCashSchema.parse({ type, amount, reason, shiftId: actualShiftId, employeeId: actualEmployeeId })
    return CashRepo.logPettyCash(type, amount, reason, actualShiftId, actualEmployeeId)
  }, [PERM.SHIFT_PETTY_CASH])

  handle('cash:listPettyCash', (shiftId?: number) => CashRepo.listPettyCash(shiftId), SHIFT_READ)

  handle('cash:logExpense', (amount: number, category: string, note: string, shiftId?: number) => {
    const shift = requireActiveShiftAlways()
    const session = getSession()
    const actualShiftId = shiftId ?? shift.id
    const actualEmployeeId = session?.employeeId ?? undefined
    expenseSchema.parse({ amount, category, note, shiftId: actualShiftId, employeeId: actualEmployeeId })
    return CashRepo.logExpense(amount, category, note, actualShiftId, actualEmployeeId)
  }, [PERM.SHIFT_EXPENSES])

  handle('cash:listExpenses', (shiftId?: number) => CashRepo.listExpenses(shiftId), SHIFT_READ)
  handle('cash:getZReportData', (shiftId: number) => CashRepo.getZReportData(shiftId), SHIFT_READ)
  handle('cash:expensesSummary', (filters) => CashRepo.expensesSummary(filters), SHIFT_READ)

  // Expense categories — stored as JSON array in settings
  handle('settings:getExpenseCategories', () => {
    const raw = SettingsRepo.get('expense_categories')
    if (!raw) return ['عام', 'إيجار', 'كهرباء', 'ماء', 'صيانة', 'رواتب', 'مواد خام', 'تسويق', 'أخرى']
    try { return JSON.parse(raw) } catch { return ['عام'] }
  }, SHIFT_ANY)

  handle('settings:setExpenseCategories', (cats: string[]) => {
    SettingsRepo.set('expense_categories', JSON.stringify(cats))
    return cats
  }, [PERM.SHIFT_EXPENSES])

  // Withdrawal reasons — stored as JSON array in settings
  handle('settings:getWithdrawReasons', () => {
    const raw = SettingsRepo.get('withdraw_reasons')
    if (!raw) return ['مصاريف يومية', 'توصيل طلبات', 'شراء مواد', 'صرف راتب', 'أخرى']
    try { return JSON.parse(raw) } catch { return ['أخرى'] }
  }, SHIFT_ANY)

  handle('settings:setWithdrawReasons', (reasons: string[]) => {
    SettingsRepo.set('withdraw_reasons', JSON.stringify(reasons))
    return reasons
  }, [PERM.SHIFT_PETTY_CASH])
}
