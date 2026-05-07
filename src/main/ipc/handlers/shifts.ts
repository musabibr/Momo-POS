import { handle, requireActiveShiftAlways } from '../helpers'
import { ShiftRepo } from '../../db/repositories/ShiftRepo'
import { CashRepo } from '../../db/repositories/CashRepo'
import { SettingsRepo } from '../../db/repositories/SettingsRepo'
import { pettyCashSchema, expenseSchema } from '../schemas'
import { getSession } from '../../session'

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
  }, ['admin', 'manager', 'cashier'])

  handle('shifts:close', (shiftId: number, closeFloat: number) => ShiftRepo.close(shiftId, closeFloat), ['admin', 'manager'])
  handle('shifts:getCurrent', () => ShiftRepo.getCurrent(), ['admin', 'manager', 'cashier', 'kitchen'])
  handle('shifts:list', () => ShiftRepo.list(), ['admin', 'manager'])
  handle('shifts:listPaginated', (page: number, pageSize: number, filters: any) => ShiftRepo.listPaginated(page, pageSize, filters), ['admin', 'manager'])

  handle('shifts:updateOpenFloat', (shiftId: number, newFloat: number, reason: string) => {
    const session = getSession()
    if (!session) throw new Error('يجب تسجيل الدخول')
    return ShiftRepo.updateOpenFloat(shiftId, newFloat, session.employeeId, reason)
  }, ['admin', 'manager'])
}

export function registerCashHandlers() {
  handle('cash:getRevenueSummary', (shiftId?: number) => CashRepo.getRevenueSummary(shiftId), ['admin', 'manager', 'cashier'])
  handle('cash:getBankBreakdown', (shiftId?: number) => CashRepo.getBankBreakdown(shiftId), ['admin', 'manager'])

  handle('cash:logPettyCash', (type: string, amount: number, reason: string, shiftId?: number) => {
    const shift = requireActiveShiftAlways()
    const session = getSession()
    const actualShiftId = shiftId ?? shift.id
    const actualEmployeeId = session?.employeeId ?? undefined
    pettyCashSchema.parse({ type, amount, reason, shiftId: actualShiftId, employeeId: actualEmployeeId })
    return CashRepo.logPettyCash(type, amount, reason, actualShiftId, actualEmployeeId)
  }, ['admin', 'manager', 'cashier'])

  handle('cash:listPettyCash', (shiftId?: number) => CashRepo.listPettyCash(shiftId), ['admin', 'manager', 'cashier'])

  handle('cash:logExpense', (amount: number, category: string, note: string, shiftId?: number) => {
    const shift = requireActiveShiftAlways()
    const session = getSession()
    const actualShiftId = shiftId ?? shift.id
    const actualEmployeeId = session?.employeeId ?? undefined
    expenseSchema.parse({ amount, category, note, shiftId: actualShiftId, employeeId: actualEmployeeId })
    return CashRepo.logExpense(amount, category, note, actualShiftId, actualEmployeeId)
  }, ['admin', 'manager', 'cashier'])

  handle('cash:listExpenses', (shiftId?: number) => CashRepo.listExpenses(shiftId), ['admin', 'manager', 'cashier'])
  handle('cash:getZReportData', (shiftId: number) => CashRepo.getZReportData(shiftId), ['admin', 'manager'])
  handle('cash:expensesSummary', (filters) => CashRepo.expensesSummary(filters), ['admin', 'manager'])

  // Expense categories — stored as JSON array in settings
  handle('settings:getExpenseCategories', () => {
    const raw = SettingsRepo.get('expense_categories')
    if (!raw) return ['عام', 'إيجار', 'كهرباء', 'ماء', 'صيانة', 'رواتب', 'مواد خام', 'تسويق', 'أخرى']
    try { return JSON.parse(raw) } catch { return ['عام'] }
  }, ['admin', 'manager', 'cashier'])

  handle('settings:setExpenseCategories', (cats: string[]) => {
    SettingsRepo.set('expense_categories', JSON.stringify(cats))
    return cats
  }, ['admin', 'manager'])

  // Withdrawal reasons — stored as JSON array in settings
  handle('settings:getWithdrawReasons', () => {
    const raw = SettingsRepo.get('withdraw_reasons')
    if (!raw) return ['مصاريف يومية', 'توصيل طلبات', 'شراء مواد', 'صرف راتب', 'أخرى']
    try { return JSON.parse(raw) } catch { return ['أخرى'] }
  }, ['admin', 'manager', 'cashier'])

  handle('settings:setWithdrawReasons', (reasons: string[]) => {
    SettingsRepo.set('withdraw_reasons', JSON.stringify(reasons))
    return reasons
  }, ['admin', 'manager'])
}
