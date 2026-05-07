/**
 * register.ts — Thin orchestrator.
 *
 * All domain logic has been extracted into focused handler modules under
 * `./handlers/`. This file simply imports and calls each registration
 * function so that `main.ts` only needs a single `registerAllIpc()` call.
 */
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

export function registerAllIpc(): void {
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
