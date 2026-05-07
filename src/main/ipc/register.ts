/**
 * register.ts — Thin orchestrator.
 *
 * All domain logic has been extracted into focused handler modules under
 * `./handlers/`. This file simply imports and calls each registration
 * function so that `main.ts` only needs a single `registerAllIpc()` call.
 */
import { ipcMain } from 'electron'
import { registerSessionHandlers } from './handlers/session'
import { registerMenuHandlers } from './handlers/items'
import { registerOrderHandlers } from './handlers/orders'
import { registerInventoryHandlers } from './handlers/inventory'
import { registerProcurementHandlers } from './handlers/procurement'
import { registerKitchenHandlers } from './handlers/kitchen'
import { registerCustomerHandlers } from './handlers/customers'
import { registerEmployeeHandlers } from './handlers/employees'
import { registerShiftHandlers, registerCashHandlers } from './handlers/shifts'
import { registerReportHandlers, registerSettingsHandlers, registerActionLogHandlers } from './handlers/settings'
import { EmployeeRepo } from '../db/repositories/EmployeeRepo'
import { SettingsRepo } from '../db/repositories/SettingsRepo'

export function registerAllIpc(): void {
  // ── System-level check (ungated, registered first) ──
  // Uses a dedicated setting `setup_completed` as the primary signal,
  // with employees count as fallback. This ensures the wizard always
  // shows on a truly fresh install and never re-appears after completion.
  ipcMain.handle('system:isSetupRequired', async () => {
    try {
      const setupDone = SettingsRepo.get('setup_completed')
      if (setupDone === 'true') return { data: false }
      const employees = EmployeeRepo.list()
      return { data: !employees || employees.length === 0 }
    } catch {
      return { data: true } // on error, assume first run
    }
  })

  registerSessionHandlers()
  registerMenuHandlers()
  registerOrderHandlers()
  registerInventoryHandlers()
  registerProcurementHandlers()
  registerKitchenHandlers()
  registerCustomerHandlers()
  registerEmployeeHandlers()
  registerShiftHandlers()
  registerCashHandlers()
  registerReportHandlers()
  registerSettingsHandlers()
  registerActionLogHandlers()

  console.log('[IPC] All handlers registered')
}
