import { handle } from '../helpers'
import { getSession } from '../../session'
import { ReportRepo } from '../../db/repositories/ReportRepo'
import { SettingsRepo } from '../../db/repositories/SettingsRepo'
import { ActionLogRepo } from '../../db/repositories/ActionLogRepo'
import { EmployeeRepo } from '../../db/repositories/EmployeeRepo'
import { setSettingSchema } from '../schemas'

export function registerReportHandlers() {
  handle('reports:salesSummary', (filters) => ReportRepo.salesSummary(filters), ['admin', 'manager'])
  handle('reports:hourlySales', (filters) => ReportRepo.hourlySales(filters), ['admin', 'manager'])
  handle('reports:itemRanking', (filters) => ReportRepo.itemRanking(filters), ['admin', 'manager'])
  handle('reports:paymentBreakdown', (filters) => ReportRepo.paymentBreakdown(filters), ['admin', 'manager'])
  handle('reports:inventoryStats', (filters) => ReportRepo.inventoryStats(filters), ['admin', 'manager'])
  handle('reports:employeeStats', (filters) => ReportRepo.employeeStats(filters), ['admin', 'manager'])
  handle('reports:customerStats', (filters) => ReportRepo.customerStats(filters), ['admin', 'manager'])
}

const ALLOWED_SETTING_KEYS = new Set([
  'restaurant_name', 'currency', 'tax_rate', 'currency_symbol',
  'cashier_max_discount_pct', 'manager_max_discount_pct',
  'inactivity_lock_minutes', 'shifts_required', 'require_void_reason',
  'loyalty_rate', 'loyalty_redemption_value', 'auto_vip_threshold',
  'enforce_shift_required', 'default_kitchen_printer', 'default_receipt_printer',
  'receipt_header', 'receipt_footer', 'logo_path',
  'backup_usb_path', 'backup_schedule', 'last_backup_at',
  'expense_categories', 'withdraw_reasons', 'banks',
])

export function registerSettingsHandlers() {
  // settings:get and getBanks are un-gated — POS reads them pre-session
  handle('settings:get', (key: string) => SettingsRepo.get(key))
  handle('settings:set', (key: string, value: string) => {
    // Allow during setup wizard (0 or 1 employees — admin just created, no session yet)
    const isSetupPhase = EmployeeRepo.list().length <= 1
    const session = getSession()
    if (!isSetupPhase && (!session || (!session.permissions?.includes('*') && session.role !== 'admin' && !session.permissions?.includes('admin')))) {
      throw new Error('UNAUTHORIZED')
    }
    if (!ALLOWED_SETTING_KEYS.has(key)) throw new Error(`مفتاح إعدادات غير مسموح: ${key}`)
    setSettingSchema.parse({ key, value })
    return SettingsRepo.set(key, value)
  })
  handle('settings:getAll', () => SettingsRepo.getAll(), ['admin'])
  handle('settings:getBanks', () => SettingsRepo.getBanks())
  handle('settings:setBanks', (banks: string[]) => SettingsRepo.setBanks(banks), ['admin'])
}

export function registerActionLogHandlers() {
  handle('actionLog:list', (filters: any) => ActionLogRepo.list(filters), ['admin'])
  handle('actionLog:write', (action: string, detail: any, employeeId?: number) =>
    ActionLogRepo.write(action, detail, employeeId), ['admin', 'manager', 'cashier'])
}
